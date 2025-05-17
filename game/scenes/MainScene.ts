import * as PIXI from "pixi.js";
import { BaseScene } from "./BaseScene";
import { AssetLoader } from "../managers/AssetLoader";
import { Character } from "../entities/Character";
import { BackgroundElement } from "../entities/BackgroundElement";
import { Palette, PaletteColorOption } from "../entities/Palette";
import { DrawingBoard } from "../entities/DrawingBoard";
import { AudioManager } from "../managers/AudioManager";
import { TaskManager, TaskStep, Task } from "../managers/TaskManager"; // 导入 TaskStep 和 Task
import GameEventEmitter from "../utils/GameEventEmitter";
import { ComplexFlower } from "../entities/complexFlower";
// AnimationManager 未在此处直接使用（根据文档），Character/Palette/DrawingBoard 内部使用它
// import { AnimationManager } from '../managers/AnimationManager';

export class MainScene extends BaseScene {
  private rabbit!: Character;
  private palette!: Palette;
  private drawingBoard!: DrawingBoard;

  private sky!: BackgroundElement;
  private clouds!: BackgroundElement;
  private tree!: BackgroundElement;
  private grass!: BackgroundElement;
  private bench!: BackgroundElement;
  private pond!: BackgroundElement;
  // private wildflowers: BackgroundElement[] = [];

  private activePondFrogs: Character[] = [];
  private complexFlowers: ComplexFlower[] = [];

  constructor() {
    super();
    this.label = "MainScene";
  }

  async onEnter(): Promise<void> {
    this.setupBackground();
    this.setupInteractiveElements(); // 创建它们，但它们最初可能隐藏
    this.setupCharacters(); // 兔子在此处创建，初始隐藏

    // 监听任务事件
    GameEventEmitter.on("TASK_STEP_START", this.handleTaskStepStart.bind(this));
    GameEventEmitter.on(
      "TASK_STEP_COMPLETE",
      this.handleTaskStepComplete.bind(this)
    );
    GameEventEmitter.on("TASK_COMPLETE", this.handleTaskComplete.bind(this));
    GameEventEmitter.on(
      "PALETTE_COLOR_SELECTED",
      this.handlePaletteColorSelected.bind(this)
    );

    // 初始游戏动画和语音，根据文档
    // 这假设 GameManager.startGame() 最终会调用 TaskManager.startNextTask()，
    // 并且第一个任务步骤可能是 "intro_welcome_rabbit"。
    // 如果兔子说话是第一件事，TaskManager 应通过 TASK_STEP_START 触发它。
    // 文档暗示兔子出现并说欢迎，然后第一个任务可能开始。
    // 假设第一个任务步骤处理兔子的介绍。
    // 目前，如果任务步骤未处理，请确保兔子对于任何初始动画都是可见的。
    // this.rabbit.show();
    // this.rabbit.playAnimation('welcome_anim', false, () => {
    //     this.rabbit.say('sfx_welcome', undefined, () => {});
    // });
    console.log("MainScene 进入。等待任务事件。");
  }

  setupBackground(): void {
    const appWidth = this.pixiApp.app.screen.width;
    const appHeight = this.pixiApp.app.screen.height;
    console.log("appWidth", appWidth);
    console.log("appHeight", appHeight);

    // 天空
    this.sky = new BackgroundElement("sky_bg", AssetLoader.getTexture("sky"));
    this.sky.sprite.anchor.set(0.5);
    this.sky.sprite.x = appWidth / 2;
    this.sky.sprite.y = appHeight / 2;
    this.world.addChild(this.sky);

    // // 云彩
    // const cloudsTexture = AssetLoader.getTexture("clouds");
    // this.clouds = new BackgroundElement("clouds_bg", cloudsTexture);
    // this.clouds.sprite.y = appHeight * 0.1;
    // this.clouds.sprite.width = appWidth * 1.5; // 更宽以便移动
    // this.clouds.sprite.height = cloudsTexture.height; // 保持纵横比或显式设置
    // this.world.addChild(this.clouds);
    // this.clouds.startLoopingMovement(
    //   { x: -30, y: 0 },
    //   this.clouds.sprite.width
    // ); // 速度 30像素/秒，循环自身宽度

    // 草地
    const grassTexture = AssetLoader.getTexture("grass");
    this.grass = new BackgroundElement("grass_bg", grassTexture);
    this.grass.sprite.width = appWidth + 240;
    this.grass.sprite.height = appHeight / 1.5;
    this.grass.sprite.anchor.set(0, 1);
    this.grass.sprite.x = -40;
    this.grass.sprite.y = appHeight;
    this.world.addChild(this.grass);

    // // 树
    // const treeTexture = AssetLoader.getTexture("tree");
    // this.tree = new BackgroundElement("tree_main", treeTexture);
    // this.tree.sprite.anchor.set(0.5, 1);
    // this.tree.sprite.x = appWidth * 0.25;
    // this.tree.sprite.y = appHeight - grassTexture.height * 0.05; // 略高于草地基线
    // this.tree.sprite.scale.set(0.9); // 示例缩放
    // this.world.addChild(this.tree);
    // this.tree.startSwayingEffect(1, 7000); // 1 度，7 秒周期

    // 长椅
    const benchTexture = AssetLoader.getTexture("bench");
    this.bench = new BackgroundElement("bench_item", benchTexture);
    this.bench.sprite.anchor.set(0.5, 1);
    this.bench.sprite.x = appWidth * 0.62;
    this.bench.sprite.y = appHeight - grassTexture.height * 0.48;
    this.bench.sprite.scale.set(0.6);
    this.world.addChild(this.bench);

    // 池塘
    const pondTexture = AssetLoader.getTexture("pond");
    this.pond = new BackgroundElement("pond_area", pondTexture);
    this.pond.sprite.anchor.set(0.5);
    this.pond.sprite.x = appWidth;
    this.pond.sprite.y = appHeight * 0.65;
    this.pond.sprite.scale.set(0.6);
    this.world.addChild(this.pond);

    // 野花
    // const wildflowerTexture = AssetLoader.getTexture("wildflower");
    // const wildflowerPositions = [
    //   { x: appWidth * 0.65, y: appHeight * 0.78, scale: 0.7 },
    //   { x: appWidth * 0.7, y: appHeight * 0.8, scale: 0.65 },
    //   { x: appWidth * 0.8, y: appHeight * 0.76, scale: 0.75 },
    // ];
    // wildflowerPositions.forEach((pos, index) => {
    //   const flower = new BackgroundElement(
    //     `wildflower_${index}`,
    //     wildflowerTexture
    //   );
    //   flower.sprite.anchor.set(0.5, 1);
    //   flower.sprite.position.set(pos.x, pos.y);
    //   flower.sprite.scale.set(pos.scale);
    //   flower.startSwayingEffect(
    //     3 + Math.random() * 2,
    //     3000 + Math.random() * 2000
    //   );
    //   this.world.addChild(flower);
    //   this.wildflowers.push(flower);
    // });
    this.createComplexFlowers();
  }

  setupCharacters(): void {
    this.rabbit = new Character("player_rabbit", "rabbit_spine");
    this.rabbit.spine!.scale.set(0.25); // 兔子变小一些
    this.rabbit.position.set(
      this.pixiApp.app.screen.width * 0.18,
      this.pixiApp.app.screen.height * 0.78
    );
    this.rabbit.visible = false; // 初始隐藏，任务将使其显示
    this.world.addChild(this.rabbit);
  }

  setupInteractiveElements(): void {
    this.palette = new Palette("color_palette");
    // 调色板位置应根据其需要出现的位置动态设置，或者如果它总是在一个地方出现则固定。
    // 示例：水平居中，朝向屏幕顶部/中间
    this.palette.position.set(
      this.pixiApp.app.screen.width / 2,
      this.pixiApp.app.screen.height * 0.4
    );
    this.palette.visible = false;
    this.world.addChild(this.palette);

    this.drawingBoard = new DrawingBoard("main_drawing_board");
    this.drawingBoard.visible = false;
    this.world.addChild(this.drawingBoard);
  }

  // PALETTE_COLOR_SELECTED 事件的监听器，用于准备 SHOW_DRAWING_BOARD 的选项
  handlePaletteColorSelected(selectedOption: PaletteColorOption): void {
    const currentStep = TaskManager.getCurrentStep();
    if (
      currentStep &&
      currentStep.action === "SHOW_PALETTE" &&
      currentStep.awaitsEvent === "PALETTE_COLOR_SELECTED"
    ) {
      // TaskManager 的 awaitsEvent 逻辑已处理将 eventData 传递给下一步骤的选项。
      // 此处理程序主要用于日志记录，或者如果 MainScene 需要在选择后立即执行特定操作
      // *在* TaskManager 前进之前。
      console.log("MainScene:收到 PALETTE_COLOR_SELECTED 事件", selectedOption);
    }
  }

  async handleTaskStepStart(stepData: TaskStep): Promise<void> {
    console.log(
      "MainScene: 任务步骤开始:",
      stepData.id,
      stepData.action,
      stepData.options
    );
    // 在尝试使用兔子之前确保它已创建
    if (
      !this.rabbit &&
      (stepData.action.includes("RABBIT") ||
        stepData.rabbitAnimation ||
        stepData.action === "SHOW_PALETTE" ||
        stepData.action === "SHOW_DRAWING_BOARD_FOR_COLORING")
    ) {
      // 如果当前步骤需要兔子，则设置角色
      this.setupCharacters();
    }
    if (!this.palette || !this.drawingBoard) {
      this.setupInteractiveElements();
    }

    switch (stepData.action) {
      case "RABBIT_SPEECH":
        this.rabbit.visible = true;
        if (
          stepData.rabbitAnimation &&
          this.rabbit.spine?.skeleton.data.findAnimation(
            stepData.rabbitAnimation
          )
        ) {
          this.rabbit.playAnimation(stepData.rabbitAnimation, false, () => {
            if (stepData.voiceOver) {
              AudioManager.playSFX(stepData.voiceOver, undefined, () => {
                GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
                  stepId: stepData.id,
                  action: stepData.action,
                });
              });
            } else {
              GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
                stepId: stepData.id,
                action: stepData.action,
              });
            }
          });
        } else if (stepData.voiceOver) {
          this.rabbit.say(stepData.voiceOver, undefined, () => {
            // 允许 say 在没有显式动画的情况下调用
            GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
              stepId: stepData.id,
              action: stepData.action,
            });
          });
        } else {
          // 如果没有动画且没有语音，则立即完成
          GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
            stepId: stepData.id,
            action: stepData.action,
          });
        }
        break;

      case "SHOW_PALETTE":
        this.rabbit.say(stepData.voiceOver || "sfx_select_color");
        // 如果是重复访问调色板，TaskManager 会传递过滤后的选项
        await this.palette.showWithOptions(
          stepData.options?.colors as PaletteColorOption[] // 类型断言，因为我们知道 options.colors 应该是 PaletteColorOption[]
        );
        // 操作完成由 TaskManager 通过 PALETTE_COLOR_SELECTED 事件处理
        break;

      case "SHOW_DRAWING_BOARD_FOR_COLORING":
        // 选项应由 TaskManager 从 PALETTE_COLOR_SELECTED 事件填充
        const colorOpt = stepData.options
          ?.selectedColorOption as PaletteColorOption; // 类型断言
        if (colorOpt && colorOpt.colorName && colorOpt.targetWord) {
          await this.drawingBoard.showForShape(
            colorOpt.colorName,
            colorOpt.targetWord
          );
          if (stepData.voiceOver) {
            this.rabbit.say(stepData.voiceOver);
          } else {
            // 如果此步骤没有特定的 voiceOver，则使用通用提示
            // this.rabbit.say(`sfx_lets_color_${colorOpt.targetWord}`); // 示例：需要 sfx_lets_color_frog 等。
          }
        } else {
          console.error(
            "MainScene: SHOW_DRAWING_BOARD 调用时缺少正确的颜色/形状选项",
            stepData.options
          );
          GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
            stepId: stepData.id,
            action: stepData.action,
            error: "缺少选项",
          });
        }
        break;

      case "ALL_COLORS_DONE_FOCUS_POND":
        await this.drawingBoard.hide();
        if (stepData.voiceOver) this.rabbit.say(stepData.voiceOver);
        await this.focusOn(this.pond, 1.0, 1.2);
        this.spawnPondFrogs((stepData.options?.count as number) || 3); // 类型断言或提供默认值
        break;

      default:
        console.warn(
          `MainScene: 任务步骤操作没有特定处理程序: ${stepData.action}`
        );
        if (!stepData.awaitsEvent && !stepData.nextStepDelay) {
          // 如果步骤既不等待事件也没有延迟，我们认为它需要一个操作完成信号才能继续。
          // 实际上，没有特定处理程序且不等待事件的步骤可能表示流程设计中的问题或遗漏。
          // 为安全起见，我们发出一个错误信号，以便 TaskManager 不会卡住，但应该审查这种情况。
          GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
            stepId: stepData.id,
            action: stepData.action,
            error: "没有处理程序且不等待事件",
          });
        }
        break;
    }
  }

  async handleTaskStepComplete(
    stepData: TaskStep,
    eventData?: unknown // 从 any 改为 unknown
  ): Promise<void> {
    console.log(
      "MainScene: 任务步骤完成:",
      stepData.id,
      stepData.action,
      eventData
    );

    if (stepData.action === "COLORING_COMPLETE") {
      this.rabbit.visible = true;
      this.rabbit.playAnimation("congrats_anim", false, () => {
        this.rabbit.say("sfx_congrats", undefined, () => {
          // 假设 eventData.options 存在且包含 colorNameSound
          const options = (
            eventData as { options?: { colorNameSound?: string } }
          )?.options;
          if (options?.colorNameSound) {
            AudioManager.playSFX(options.colorNameSound, undefined, () => {
              TaskManager.advanceToNextStepOrTask();
            });
          } else {
            TaskManager.advanceToNextStepOrTask();
          }
        });
      });
    } else if (stepData.action === "ALL_COLORS_DONE_FOCUS_POND") {
      // 此步骤操作的完成现在由 spawnPondFrogs 发出 TASK_STEP_ACTION_COMPLETE 处理
      // 因此 TaskManager 将收到该事件，然后发出 TASK_STEP_COMPLETE，再次调用此处理程序。
      // 然后此 else 分支将调用 advanceToNextStepOrTask。
      TaskManager.advanceToNextStepOrTask();
    } else {
      TaskManager.advanceToNextStepOrTask();
    }
  }

  handleTaskComplete(taskData: Task): void {
    // 从 any 改为 Task
    console.log("MainScene: 任务完成:", taskData.id);
    if (this.rabbit && taskData.id === "learn_colors_and_shapes") {
      this.rabbit.playAnimation("celebrate_anim", true);
    }
  }

  spawnPondFrogs(count: number): void {
    this.clearPondFrogs();
    AudioManager.playSFX("sfx_frogs_croak");
    let frogsAnimated = 0;
    const totalFrogs = count > 0 ? count : 0; // 确保 count 不是负数

    if (totalFrogs === 0) {
      // 如果不需要生成青蛙，也需要通知任务步骤操作完成
      const currentStep = TaskManager.getCurrentStep();
      if (currentStep && currentStep.action === "ALL_COLORS_DONE_FOCUS_POND") {
        GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
          stepId: currentStep.id,
          action: currentStep.action,
        });
      }
      return;
    }

    for (let i = 0; i < totalFrogs; i++) {
      const frog = new Character(`pond_frog_${i}`, "frog_spine");
      if (!frog.spine) continue;

      frog.spine.scale.set(0.15 + Math.random() * 0.05);
      const pondBounds = this.pond.sprite.getBounds();
      frog.position.set(
        pondBounds.x + pondBounds.width * (0.2 + Math.random() * 0.6), // 在池塘水平边界内随机
        pondBounds.y + pondBounds.height * (0.3 + Math.random() * 0.4) // 在池塘垂直边界内随机
      );
      frog.visible = true;
      this.world.addChild(frog);
      this.activePondFrogs.push(frog);

      frog.playAnimation("jump_in", false, () => {
        frogsAnimated++;
        frog.playAnimation("idle", true);
        if (frogsAnimated === totalFrogs) {
          // 所有青蛙动画完成后，通知任务步骤操作完成
          const currentStep = TaskManager.getCurrentStep();
          if (
            currentStep &&
            currentStep.action === "ALL_COLORS_DONE_FOCUS_POND"
          ) {
            GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
              stepId: currentStep.id,
              action: currentStep.action,
            });
          }
        }
      });
    }
  }

  clearPondFrogs(): void {
    this.activePondFrogs.forEach((frog) => {
      frog.destroy({ children: true, texture: false }); // 移除 baseTexture
    });
    this.activePondFrogs = [];
  }

  async onExit(): Promise<void> {
    // 移除事件监听器以避免内存泄漏和重复处理
    GameEventEmitter.off(
      "TASK_STEP_START",
      this.handleTaskStepStart.bind(this)
    );
    GameEventEmitter.off(
      "TASK_STEP_COMPLETE",
      this.handleTaskStepComplete.bind(this)
    );
    GameEventEmitter.off("TASK_COMPLETE", this.handleTaskComplete.bind(this));
    GameEventEmitter.off(
      "PALETTE_COLOR_SELECTED",
      this.handlePaletteColorSelected.bind(this)
    );

    this.clearPondFrogs();
    console.log("MainScene 退出。");
  }

  update(ticker: PIXI.Ticker): void {
    const deltaMS = ticker.deltaMS;
    if (this.tree?.isSwaying) this.tree.updateAnimation(deltaMS); // isSwaying 已公开
    // this.wildflowers.forEach((f) => {
    //   if (f.isSwaying) f.updateAnimation(deltaMS); // isSwaying 已公开
    // });
    if (this.clouds?.isLoopingMovement) this.clouds.updateAnimation(deltaMS); // isLoopingMovement 已公开

    // Spine 具有 autoUpdate=true 的实体不需要在此处手动更新，除非有特定逻辑。
    // DrawingBoard 如果需要（例如，画笔动画不与指针绑定），可能有其自己的更新逻辑
    this.drawingBoard?.update(ticker);

    // 更新复合花的动画
    if (this.complexFlowers) {
      this.complexFlowers.forEach((flower) => flower.update(deltaMS));
    }
  }

  createComplexFlowers(): void {
    const appWidth = this.pixiApp.app.screen.width;
    const appHeight = this.pixiApp.app.screen.height;

    // 定义几种不同类型的花
    const flowerTypes = [
      {
        name: "flower_0",
        stemTexture: "flower_part_stem",
        leafTextures: ["flower_part_leaf1"],
        leafPositions: [
          { x: -15, y: -50, angle: -20, scale: 0.8 },
          // { x: 10, y: -70, angle: 30, scale: 0.7 },
        ],
      },
      {
        name: "flower_1",
        stemTexture: "flower_part_stem",
        leafTextures: ["flower_part_leaf1", "flower_part_leaf2"],
        leafPositions: [
          { x: -12, y: -40, angle: -15, scale: 0.75 },
          // { x: 14, y: -60, angle: 25, scale: 0.7 },
          { x: -64, y: -50, angle: -15, scale: 0.5 },
        ],
      },
    ];

    // 花的位置
    const flowerPositions = [
      // { x: appWidth * 0.25, y: appHeight * 0.8, scale: 0.6, type: 0 },
      { x: appWidth * 0.8, y: appHeight * 0.52, scale: 0.3, type: 0 },
      { x: appWidth * 0.825, y: appHeight * 0.53, scale: 0.5, type: 1 },
      { x: appWidth * 0.9, y: appHeight * 0.46, scale: 0.55, type: 1 },
    ];

    // 创建花并添加到世界
    this.complexFlowers = [];

    flowerPositions.forEach((pos, index) => {
      const typeConfig = flowerTypes[pos.type];
      const flower = new ComplexFlower(`complex_flower_${index}`, typeConfig);

      // 设置位置和缩放
      flower.position.set(pos.x, pos.y);
      flower.scale.set(pos.scale);

      // 将整体设置为可排序（如果需要）
      flower.sortableChildren = true;

      // 启动摇摆动画
      flower.startSwaying(2 + Math.random() * 3, 2800 + Math.random() * 1500);

      // 添加到世界和跟踪数组
      this.world.addChild(flower);
      this.complexFlowers.push(flower);
    });
  }
}
