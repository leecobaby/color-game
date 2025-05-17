import GameEventEmitter from "../utils/GameEventEmitter";
import { AudioManager } from "./AudioManager";
import { AnimationManager } from "./AnimationManager";
// import { Character } from '../entities/Character'; // 假设 Character 类型将在 entities/Character.ts 中定义

// --- 基于 tasks.json 结构的接口定义 ---
interface ColorOption {
  colorName: string;
  targetWord: string;
  targetShapeOutline: string;
  spineName?: string;
  colorSound: string;
}

export interface TaskStep {
  id: string;
  action: string; // 例如 "RABBIT_SPEECH", "SHOW_PALETTE", "SHOW_DRAWING_BOARD_FOR_COLORING", "CHECK_REMAINING_TASK_ITEMS", "ALL_COLORS_DONE_FOCUS_POND"
  nextStepDelay?: number; // 自动进行到下一步骤前的延迟（毫秒）
  options?: {
    voiceOver?: string;
    rabbitAnimation?: string;
    colors?: ColorOption[];
    count?: number;
    selectedColorOption?: ColorOption;
    [key: string]: unknown;
  };
  awaitsEvent?: string; // 在继续之前等待的事件名称
  eventDataCheck?: { [key: string]: unknown }; // 可选：检查所等待事件中的特定数据
  itemListName?: string; // 对于 CHECK_REMAINING_TASK_ITEMS：当前任务上下文中保存项目列表的键
  sourceStepIdForItemlist?: string; // 对于 CHECK_REMAINING_TASK_ITEMS：定义原始列表的步骤 ID
  nextStepIfItemsRemain?: string; // 对于 CHECK_REMAINING_TASK_ITEMS：如果还有项目，则跳转到的步骤 ID
  nextStepIfNoItemsRemain?: string; // 对于 CHECK_REMAINING_TASK_ITEMS：如果没有项目了，则跳转到的步骤 ID
  isEndOfTask?: boolean;
  targetColorName?: string | null; // 为着色步骤动态填充
  completedItem?: unknown; // 可用于存储此步骤中完成的内容，例如所选颜色信息
}

export interface Task {
  id: string;
  name: string;
  steps: TaskStep[];
  // 任务实例的运行时状态
  _currentStepIndex?: number;
  _completedItems?: { [listName: string]: unknown[] }; // 跟踪 CHECK_REMAINING_TASK_ITEMS 等操作的已完成项目
  _dynamicStepData?: { [stepId: string]: Record<string, unknown> }; // 用于存储从事件传递到步骤的数据
}
// --- 接口定义结束 ---

export class TaskManager {
  private static tasks: Task[] = [];
  private static currentTask: Task | null = null;
  private static currentTaskIndex: number = -1; // this.tasks 数组中的索引
  // currentStepIndex 现在是 Task 对象实例的一部分，作为 _currentStepIndex

  private static isWaitingForEvent: boolean = false;
  private static awaitedEventName: string | null = null;
  private static awaitedEventCallback: ((eventData: unknown) => void) | null =
    null; // 参数类型从 any 改为 unknown

  public static loadTasks(taskData: Task[]): void {
    this.tasks = taskData.map((task) => ({
      ...task,
      _currentStepIndex: 0,
      _completedItems: {},
      _dynamicStepData: {},
    }));
    console.log("任务已加载:", this.tasks);
  }

  public static startNextTask(): void {
    if (
      this.currentTask &&
      this.currentTask._currentStepIndex !== undefined &&
      this.currentTask._currentStepIndex < this.currentTask.steps.length - 1 &&
      !this.currentTask.steps[this.currentTask._currentStepIndex].isEndOfTask
    ) {
      console.warn("无法启动下一个任务，当前任务尚未完成。");
      // 可选地，强制启动当前任务的待处理步骤
      // this.proceedToStep(this.currentTask.steps[this.currentTask._currentStepIndex]);
      return;
    }

    const nextTaskIndex = this.tasks.findIndex(
      (task, index) => index > this.currentTaskIndex && task.steps.length > 0
    );
    if (nextTaskIndex !== -1) {
      this.startTaskByIndex(nextTaskIndex);
    } else {
      console.log("所有任务已完成或没有更多可用任务。");
      GameEventEmitter.emit("ALL_TASKS_COMPLETE");
    }
  }

  public static startTaskById(taskId: string): void {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      this.startTaskByIndex(taskIndex);
    } else {
      console.error(`未找到 ID 为 "${taskId}" 的任务。`);
    }
  }

  private static startTaskByIndex(index: number): void {
    if (index < 0 || index >= this.tasks.length) {
      console.error(`任务索引 ${index} 超出范围。`);
      return;
    }
    this.currentTaskIndex = index;
    this.currentTask = {
      ...this.tasks[this.currentTaskIndex],
      _currentStepIndex: 0,
      _completedItems: {},
      _dynamicStepData: {},
    };
    console.log(`正在启动任务: ${this.currentTask.name}`);
    GameEventEmitter.emit("TASK_START", this.currentTask);
    if (this.currentTask.steps.length > 0) {
      this.proceedToStep(this.currentTask.steps[0]);
    } else {
      console.warn(`任务 ${this.currentTask.id} 没有步骤。`);
      this.handleTaskCompletion();
    }
  }

  private static proceedToStep(step: TaskStep): void {
    if (!this.currentTask || this.currentTask._currentStepIndex === undefined) {
      console.error("无法进行到步骤：当前任务或步骤索引未定义。");
      return;
    }
    console.log(`进行到步骤: ${step.id}`, step);
    this.isWaitingForEvent = false;
    this.awaitedEventName = null;
    this.awaitedEventCallback = null;

    // 如果此步骤有可用动态数据，则注入
    if (
      this.currentTask._dynamicStepData &&
      this.currentTask._dynamicStepData[step.id]
    ) {
      step.options = {
        ...step.options,
        ...(this.currentTask._dynamicStepData[step.id] as Record<
          string,
          unknown
        >),
      };
      // 可能会填充 targetColorName 或其他动态字段
      const dynamicData = this.currentTask._dynamicStepData[step.id];
      if (
        dynamicData &&
        (dynamicData.selectedColorOption as ColorOption)?.colorName
      ) {
        step.targetColorName = (
          dynamicData.selectedColorOption as ColorOption
        ).colorName;
      }
      // 存储触发此步骤的事件中已完成的项目信息
      if (dynamicData && dynamicData.completedItem) {
        step.completedItem = dynamicData.completedItem;
      }
    }

    GameEventEmitter.emit("TASK_STEP_START", step);

    // 如果步骤等待事件，则设置监听器并暂停
    if (step.awaitsEvent) {
      this.isWaitingForEvent = true;
      this.awaitedEventName = step.awaitsEvent;
      this.awaitedEventCallback = (eventData: any) => {
        // any 是为了兼容各种事件结构，后续处理时应做类型断言
        // 可选：根据 step.eventDataCheck 验证事件数据
        if (step.eventDataCheck) {
          let match = true;
          for (const key in step.eventDataCheck) {
            if (
              (eventData as Record<string, unknown>)[key] !==
              step.eventDataCheck[key]
            ) {
              match = false;
              break;
            }
          }
          if (!match) {
            console.log(
              `收到事件 ${step.awaitsEvent}，但数据检查失败。再次等待。`
            );
            return; // 继续等待
          }
        }
        GameEventEmitter.off(step.awaitsEvent!, this.awaitedEventCallback!); // 使用非空断言
        this.isWaitingForEvent = false;
        this.awaitedEventName = null;
        this.awaitedEventCallback = null;

        // 如果当前步骤导向另一个步骤，则为*下一个*步骤存储事件数据
        if (
          this.currentTask &&
          this.currentTask._currentStepIndex !== undefined
        ) {
          const nextStepIndex = this.currentTask._currentStepIndex + 1;
          if (nextStepIndex < this.currentTask.steps.length) {
            const nextStepId = this.currentTask.steps[nextStepIndex].id;
            if (!this.currentTask._dynamicStepData)
              this.currentTask._dynamicStepData = {};
            // 根据需要传递完整的 eventData 或特定部分
            this.currentTask._dynamicStepData[nextStepId] = {
              selectedColorOption: eventData, // eventData 可能包含 ColorOption
              completedItem: eventData,
            };
          }
        }
        // 当前步骤现在被视为完成，推进逻辑将处理下一个
        this.onStepActionComplete(step, eventData);
      };
      GameEventEmitter.on(step.awaitsEvent, this.awaitedEventCallback);
      console.log(`步骤 ${step.id} 正在等待事件: ${step.awaitsEvent}`);
    } else if (step.action === "CHECK_REMAINING_TASK_ITEMS") {
      this.handleCheckRemainingItems(step);
    } else {
      // 对于不等待事件且不是特殊处理程序的步骤，自动进行
      // 此类步骤的实际"完成"可能不明确，或与动画/延迟相关联
      // GameEventEmitter.emit('TASK_STEP_ACTION_COMPLETE', step); // 这应该由处理步骤操作的系统发出。
      // 目前，如果有延迟，我们使用它。否则，它意味着立即完成以进行流程控制。
      if (step.nextStepDelay) {
        setTimeout(() => {
          this.onStepActionComplete(step); // 修正：此处不应传递 eventData，因为它不是事件触发的
        }, step.nextStepDelay);
      } else {
        // 如果没有延迟且没有 awaitsEvent，则此步骤在流程目的上被视为逻辑上完成。
        // 实际的游戏操作（例如兔子说话）由 TASK_STEP_START 触发
        // 我们可能需要游戏系统（如 AnimationManager 或对话系统）发出特定事件
        // 来表示步骤操作的真正结束。
        // 目前，我们假设如果不等待，它会自动完成。
        // 这可能需要根据操作的处理方式进行细化。
        // 假设如果一个步骤不等待事件，其操作被视为
        // 立即完成或在其自身内部逻辑（例如，通过 TASK_STEP_START 事件播放动画）之后完成。
        // `onStepActionComplete` 应该由*执行*步骤操作的系统调用。
        // 对于 RABBIT_SPEECH，它将在语音和动画完成后执行。
        // 当前文档暗示 MainScene 处理 TASK_STEP_COMPLETE。
        // GameEventEmitter.on('TASK_STEP_ACTION_COMPLETE', this.onStepActionCompleteInternal.bind(this)); // 在构造函数/init 中
        // 目前，如果不等待，我们不在此处自动推进。依赖于外部发出 TASK_STEP_ACTION_COMPLETE
      }
    }
  }

  // 当步骤的*操作*被另一个系统（例如，着色后的 DrawingBoard，兔子语音+动画后的 MainScene）
  // 报告为完成时，或者由此管理器（如果是 awaitsEvent 步骤）调用此方法。
  public static onStepActionComplete(
    step: TaskStep,
    eventData?: unknown
  ): void {
    // 参数类型从 any 改为 unknown
    if (
      !this.currentTask ||
      this.currentTask._currentStepIndex === undefined ||
      this.currentTask.steps[this.currentTask._currentStepIndex].id !== step.id
    ) {
      console.warn(
        "onStepActionComplete 因意外步骤或无当前任务而被调用。",
        step,
        this.currentTask
      );
      return;
    }

    console.log(`步骤 ${step.id} 的操作已完成。事件数据:`, eventData);
    GameEventEmitter.emit("TASK_STEP_COMPLETE", step, eventData);

    // 如果适用，记录已完成的项目（例如，对于 CHECK_REMAINING_TASK_ITEMS）
    if (
      step.action === "SHOW_DRAWING_BOARD_FOR_COLORING" &&
      (step.options?.selectedColorOption as ColorOption) // 类型断言
    ) {
      const listName = "colors"; // 目前硬编码，理想情况下从步骤配置中获取
      if (!this.currentTask._completedItems)
        this.currentTask._completedItems = {};
      if (!this.currentTask._completedItems[listName])
        this.currentTask._completedItems[listName] = [];
      // 避免重复，尽管重新选择颜色的逻辑可能需要处理
      if (
        !(this.currentTask._completedItems[listName] as ColorOption[]).find(
          // 类型断言
          (item) =>
            item.colorName ===
            (step.options!.selectedColorOption as ColorOption).colorName
        )
      ) {
        (this.currentTask._completedItems[listName] as ColorOption[]).push(
          // 类型断言
          step.options!.selectedColorOption as ColorOption
        );
      }
    }
    // 在 TASK_STEP_COMPLETE 被 MainScene 等发出并处理后，MainScene 应调用 advanceToNextStepOrTask。
    // 原始文档暗示 MainScene 调用 TaskManager.advanceToNextStepOrTask()。
    // 因此，此函数的主要作用是发出 TASK_STEP_COMPLETE。
    // 推进逻辑分离到 advanceToNextStepOrTask() 中。
  }

  private static handleCheckRemainingItems(step: TaskStep): void {
    if (
      !this.currentTask ||
      !step.itemListName ||
      !step.sourceStepIdForItemlist
    ) {
      console.error("CHECK_REMAINING_TASK_ITEMS: 任务或步骤配置无效。", step);
      this.advanceToNextLogicalStep(); // 回退：尝试移动到下一个顺序步骤
      return;
    }

    const sourceStep = this.currentTask.steps.find(
      (s) => s.id === step.sourceStepIdForItemlist
    );
    if (
      !sourceStep ||
      !sourceStep.options ||
      !(sourceStep.options as Record<string, unknown>)[step.itemListName!] // 类型断言
    ) {
      console.error(
        `CHECK_REMAINING_TASK_ITEMS: 未找到源步骤 ${step.sourceStepIdForItemlist} 或项目列表 ${step.itemListName}。`
      );
      this.advanceToNextLogicalStep();
      return;
    }

    const totalItemsList: unknown[] = (
      sourceStep.options as Record<string, unknown>
    )[step.itemListName!] as unknown[]; // 类型断言
    const completedItemsList: unknown[] =
      (this.currentTask._completedItems
        ? (this.currentTask._completedItems[step.itemListName!] as unknown[]) // 类型断言
        : []) || [];

    console.log(
      `正在检查列表 '${step.itemListName}' 的剩余项目。总计: ${totalItemsList.length}, 已完成: ${completedItemsList.length}`
    );

    if (completedItemsList.length < totalItemsList.length) {
      if (step.nextStepIfItemsRemain) {
        // 在跳转之前，为目标步骤准备选项（例如，为调色板过滤剩余颜色）
        const remainingItems = (totalItemsList as ColorOption[]).filter(
          // 假设是 ColorOption 数组
          (item) =>
            !(completedItemsList as ColorOption[]).find(
              // 假设是 ColorOption 数组
              (cItem) => cItem.colorName === item.colorName
            ) // 假设按 colorName 比较
        );
        if (this.currentTask._dynamicStepData && step.nextStepIfItemsRemain) {
          // 这是针对我们即将跳转到的*下一个*步骤。
          this.currentTask._dynamicStepData[step.nextStepIfItemsRemain] = {
            [step.itemListName!]: remainingItems,
          };
        }
        this.jumpToStep(step.nextStepIfItemsRemain);
      } else {
        this.advanceToNextLogicalStep(); // 未定义特定跳转，按顺序进行
      }
    } else {
      if (step.nextStepIfNoItemsRemain) {
        this.jumpToStep(step.nextStepIfNoItemsRemain);
      } else {
        this.advanceToNextLogicalStep(); // 未定义特定跳转，按顺序进行
      }
    }
  }

  // 推进到下一个步骤或任务
  public static advanceToNextStepOrTask(): void {
    if (!this.currentTask || this.currentTask._currentStepIndex === undefined) {
      console.error("无法前进：没有当前任务或步骤索引。");
      return;
    }

    const currentStepConfig =
      this.currentTask.steps[this.currentTask._currentStepIndex];

    if (currentStepConfig.isEndOfTask) {
      this.handleTaskCompletion();
      return;
    }

    const nextStepIndex = this.currentTask._currentStepIndex + 1;
    if (nextStepIndex < this.currentTask.steps.length) {
      this.currentTask._currentStepIndex = nextStepIndex;
      this.proceedToStep(this.currentTask.steps[nextStepIndex]);
    } else {
      // 当前任务中没有更多步骤，实际上是任务结束
      this.handleTaskCompletion();
    }
  }

  // 这是一个直接的推进，通常由外部系统（如 MainScene）
  // 在处理完 TASK_STEP_COMPLETE 后调用。
  private static advanceToNextLogicalStep(): void {
    if (!this.currentTask || this.currentTask._currentStepIndex === undefined)
      return;

    const currentStep =
      this.currentTask.steps[this.currentTask._currentStepIndex];
    if (currentStep.isEndOfTask) {
      this.handleTaskCompletion();
    } else {
      const nextStepIndex = this.currentTask._currentStepIndex + 1;
      if (nextStepIndex < this.currentTask.steps.length) {
        this.currentTask._currentStepIndex = nextStepIndex;
        this.proceedToStep(
          this.currentTask.steps[this.currentTask._currentStepIndex]
        );
      } else {
        this.handleTaskCompletion(); // 如果没有更多步骤，则任务结束
      }
    }
  }

  private static jumpToStep(stepId: string): void {
    if (!this.currentTask || this.currentTask._currentStepIndex === undefined)
      return;

    const targetStepIndex = this.currentTask.steps.findIndex(
      (s) => s.id === stepId
    );
    if (targetStepIndex !== -1) {
      this.currentTask._currentStepIndex = targetStepIndex;
      this.proceedToStep(this.currentTask.steps[targetStepIndex]);
    } else {
      console.error(`无法跳转到步骤：在当前任务中未找到 ID "${stepId}"。`);
      this.advanceToNextLogicalStep(); // 回退
    }
  }

  private static handleTaskCompletion(): void {
    if (!this.currentTask) return;
    console.log(
      `任务 ${this.currentTask.id} (${this.currentTask.name}) 已完成。`
    );
    GameEventEmitter.emit("TASK_COMPLETE", this.currentTask);
    // currentTask 保持引用，直到下一个任务开始或所有任务完成
    // this.currentTask = null; // 不要立即置空，GameEventEmitter 监听器可能需要它
    this.startNextTask(); // 自动尝试启动列表中的下一个任务
  }

  public static getCurrentStep(): TaskStep | null {
    if (
      this.currentTask &&
      this.currentTask._currentStepIndex !== undefined &&
      this.currentTask.steps[this.currentTask._currentStepIndex]
    ) {
      return this.currentTask.steps[this.currentTask._currentStepIndex];
    }
    return null;
  }

  public static getCurrentTask(): Task | null {
    return this.currentTask;
  }

  // 初始化 TaskManager 操作的事件监听器
  // 此方法应调用一次，例如在 GameManager.init 中
  public static setupEventListeners(): void {
    // 此监听器至关重要。它允许外部系统（如 MainScene、DrawingBoard）
    // 发出步骤操作已完成的信号，然后允许 TaskManager
    // 通过 MainScene 中的处理程序调用其自己的 advanceToNextStepOrTask 方法。
    // 流程：
    // 1. TaskManager 发出 TASK_STEP_START。
    // 2. MainScene/其他系统处理操作（例如，播放兔子语音，显示画板）。
    // 3. 操作完成后，MainScene/其他系统发出 TASK_STEP_ACTION_COMPLETE。
    // 4. TaskManager.onStepActionComplete（如下）捕获此事件，发出 TASK_STEP_COMPLETE。
    // 5. MainScene 捕获 TASK_STEP_COMPLETE 并调用 TaskManager.advanceToNextStepOrTask()。

    // 监听外部系统完成步骤内操作的事件。
    GameEventEmitter.on(
      "TASK_STEP_ACTION_COMPLETE",
      (data: {
        stepId?: string;
        action: string;
        options?: Record<string, unknown> | any; // any 是临时的，最好具体化
        [key: string]: unknown; // 允许其他属性，类型为 unknown
      }) => {
        const currentStep = this.getCurrentStep();
        if (
          currentStep &&
          (currentStep.id === data.stepId || currentStep.action === data.action)
        ) {
          // 传递完成事件中的任何相关数据
          this.onStepActionComplete(currentStep, data.options || data);
        } else if (currentStep) {
          console.warn(
            `收到针对操作 '${data.action}' (stepId: ${data.stepId}) 的 TASK_STEP_ACTION_COMPLETE，但当前步骤是 '${currentStep.action}' (id: ${currentStep.id})。正在忽略。`
          );
        } else {
          console.warn(
            `收到针对操作 '${data.action}' 的 TASK_STEP_ACTION_COMPLETE，但没有当前步骤。正在忽略。`
          );
        }
      }
    );
  }
}
