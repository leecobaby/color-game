import * as PIXI from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

import GameEventEmitter from "../utils/GameEventEmitter";
import { AnimationManager } from "../managers/AnimationManager";
import { TaskManager } from "../managers/TaskManager"; // 用于 TaskManager.getCurrentStep()
import { AssetLoader } from "../managers/AssetLoader"; // 仍然需要 AssetLoader.getTexture
import { AudioManager } from "../managers/AudioManager";

export class DrawingBoard extends PIXI.Container {
  private background: PIXI.Sprite | Spine | null = null;
  private drawingArea: PIXI.Container;
  private outlineSprite: PIXI.Sprite | null = null;
  private paintLayer: PIXI.Graphics;
  private brushSprite: PIXI.Sprite | null = null;
  private currentBrushColor: number = 0x000000;
  private isPainting: boolean = false;
  private maskShape: PIXI.Graphics | null = null; // 用作遮罩的 Graphics 对象

  // 完成度检查 (简化版)
  private totalPixelsInShape: number = 0; // 形状中的总像素 (此处用绘制次数代替)
  private paintedPixelsCount: number = 0; // 使用绘制动作的次数作为代理
  private paintActionsToComplete: number = 50; // 任意值：认为"完成"所需的绘制动作次数
  private readonly COMPLETION_THRESHOLD_ACTIONS = 50; // 示例：需要 50 次绘制动作

  private readonly BOARD_SPINE_NAME = "drawing_board_spine"; // 画板 Spine 资源名
  private readonly BRUSH_ANIM_SPINE_NAME = "brush_anim_spine"; // 画笔动画 Spine 资源名
  private readonly APPEAR_ANIM = "appear_anim"; // 出现动画名
  private readonly DISAPPEAR_ANIM = "disappear_anim"; // 消失动画名
  private readonly DRAW_OUTLINE_ANIM_PREFIX = "draw_"; // 例如 draw_frog_anim (绘制轮廓动画名前缀)

  private currentShapeNameKey: string | null = null; // 例如 'frog' (当前形状的键名)
  private currentShapeColorName: string | null = null; // 例如 'green' (当前形状的颜色名)

  constructor(id: string) {
    super();
    this.label = id;
    this.visible = false; // 初始隐藏

    try {
      const skeletonKey = `${this.BOARD_SPINE_NAME}_skel`;
      const atlasKey = `${this.BOARD_SPINE_NAME}_atlas`;
      if (PIXI.Assets.get(skeletonKey) && PIXI.Assets.get(atlasKey)) {
        this.background = Spine.from({
          skeleton: skeletonKey,
          atlas: atlasKey,
          autoUpdate: true,
        });
        this.addChild(this.background);
      } else {
        console.warn(
          `DrawingBoard: Spine 资源键 "${skeletonKey}" 或 "${atlasKey}" 未在 PIXI.Assets 缓存中找到。正在尝试静态背景。`
        );
        this.tryLoadStaticBackground();
      }
    } catch (e) {
      console.warn(
        `DrawingBoard: Spine 资源 \"${this.BOARD_SPINE_NAME}\" (keys: ${this.BOARD_SPINE_NAME}_skel, ${this.BOARD_SPINE_NAME}_atlas) 加载失败。正在尝试静态背景。`,
        e
      );
      this.tryLoadStaticBackground();
    }

    this.drawingArea = new PIXI.Container();
    // drawingArea 默认位于 DrawingBoard 的原点 (0,0)。
    // 其内容 (轮廓、paintLayer) 将相对于此原点定位。
    this.addChild(this.drawingArea);

    this.paintLayer = new PIXI.Graphics();
    this.drawingArea.addChild(this.paintLayer); // paintLayer 位于 drawingArea 内的 (0,0)

    try {
      const brushTexture = AssetLoader.getTexture("brush_static");
      this.brushSprite = new PIXI.Sprite(brushTexture);
      this.brushSprite.anchor.set(0.1, 0.9); // 调整锚点以模拟笔尖的感觉
      this.brushSprite.visible = false;
      this.brushSprite.scale.set(0.5); // 使画笔变小
      this.addChild(this.brushSprite); // 画笔在所有元素之上移动，添加到 `this`
    } catch (e) {
      console.warn(
        "DrawingBoard: 未找到静态画笔纹理 'brush_static'。", // 中文翻译
        e
      );
    }
  }

  public async showForShape(
    shapeColorName: string,
    shapeNameKey: string
  ): Promise<void> {
    if (this.visible) {
      console.log(
        "DrawingBoard.showForShape 在已可见时调用。将隐藏并重新显示。" // 中文翻译
      );
      await this.hide(); // 如果再次调用时已可见，确保状态干净
    }
    this.currentShapeNameKey = shapeNameKey;
    this.currentShapeColorName = shapeColorName;
    this.currentBrushColor = this.getColorValue(shapeColorName);
    this.paintedPixelsCount = 0;
    this.paintLayer.clear();
    this.paintLayer.alpha = 0.7; // 半透明颜料

    this.visible = true;
    if (
      this.background instanceof Spine &&
      this.background.skeleton.data.findAnimation(this.APPEAR_ANIM)
    ) {
      AnimationManager.playAnimation(this.background, this.APPEAR_ANIM, false);
      // 如果需要，等待背景动画，或继续
    }
    AudioManager.playSFX("sfx_board_appear"); // 根据 MainScene 逻辑

    // 播放画笔描绘轮廓动画
    try {
      const brushSkeletonKey = `${this.BRUSH_ANIM_SPINE_NAME}_skel`;
      const brushAtlasKey = `${this.BRUSH_ANIM_SPINE_NAME}_atlas`;

      if (PIXI.Assets.get(brushSkeletonKey) && PIXI.Assets.get(brushAtlasKey)) {
        const brushAnimSpine = Spine.from({
          skeleton: brushSkeletonKey,
          atlas: brushAtlasKey,
          autoUpdate: true,
        });
        const outlineAnimName = `${this.DRAW_OUTLINE_ANIM_PREFIX}${shapeNameKey}_anim`;
        if (brushAnimSpine.skeleton.data.findAnimation(outlineAnimName)) {
          this.drawingArea.addChild(brushAnimSpine);
          AnimationManager.playAnimation(
            brushAnimSpine,
            outlineAnimName,
            false
          );
          AnimationManager.onAnimationComplete(
            brushAnimSpine,
            outlineAnimName,
            () => {
              brushAnimSpine.destroy();
              this.setupPaintingEnvironment(shapeNameKey);
            },
            true
          );
        } else {
          console.warn(
            `DrawingBoard: 在 "${this.BRUSH_ANIM_SPINE_NAME}" 中未找到轮廓动画 "${outlineAnimName}"。跳过到绘画设置。` // 中文翻译
          );
          this.setupPaintingEnvironment(shapeNameKey);
        }
      } else {
        console.warn(
          `DrawingBoard: Spine 资源键 "${brushSkeletonKey}" 或 "${brushAtlasKey}" 未在 PIXI.Assets 缓存中找到。正在尝试静态画笔。`
        );
        this.setupPaintingEnvironment(shapeNameKey);
      }
    } catch (e) {
      console.error(
        `DrawingBoard: 加载或播放 ${shapeNameKey} 的画笔轮廓动画失败。`, // 中文翻译
        e
      );
      this.handleOutlineLoadError(shapeNameKey, e);
      return;
    }
  }

  private setupPaintingEnvironment(shapeNameKey: string): void {
    try {
      const outlineTextureName = `${shapeNameKey}_outline`;
      const outlineTexture = AssetLoader.getTexture(outlineTextureName);
      if (!this.outlineSprite) {
        this.outlineSprite = new PIXI.Sprite(outlineTexture);
        this.outlineSprite.anchor.set(0.5); // 使轮廓精灵自身居中
        this.drawingArea.addChildAt(this.outlineSprite, 0);
      } else {
        this.outlineSprite.texture = outlineTexture;
      }
      this.outlineSprite.position.set(0, 0); // 将轮廓定位在 drawingArea 的原点 (即 DrawingBoard 的原点)
      this.outlineSprite.visible = true;
    } catch (e) {
      console.error(
        `DrawingBoard: 加载 ${shapeNameKey} 的轮廓纹理失败。`, // 中文翻译
        e
      );
      return;
    }

    if (this.outlineSprite) {
      this.paintLayer.mask = this.outlineSprite; // 使用轮廓精灵作为遮罩
    } else {
      this.paintLayer.mask = null;
    }

    if (this.brushSprite) this.brushSprite.visible = true;
    this.totalPixelsInShape = this.COMPLETION_THRESHOLD_ACTIONS; // 基于绘制次数的完成阈值
    this.paintedPixelsCount = 0;

    this.drawingArea.eventMode = "static";
    this.drawingArea.cursor = "crosshair";
    // 使 drawingArea 覆盖 outlineSprite 的范围以进行交互
    if (this.outlineSprite) {
      const bounds = this.outlineSprite.getBounds();
      // 如果 drawingArea 自身的尺寸为 0x0 或太小，则为其设置 hitArea。
      // 这确保在轮廓的可视区域上捕获指针事件。
      // outlineSprite 的局部边界 (因为它锚定在 0.5 并在 drawingArea 的 0,0 处)
      const localBounds = this.outlineSprite.getLocalBounds();
      this.drawingArea.hitArea = new PIXI.Rectangle(
        localBounds.x,
        localBounds.y,
        localBounds.width,
        localBounds.height
      );
    }

    this.drawingArea.on("pointerdown", this.onPaintStart, this);
    this.drawingArea.on("pointerup", this.onPaintEnd, this);
    this.drawingArea.on("pointerupoutside", this.onPaintEnd, this);
    this.drawingArea.on("pointermove", this.onPaintMove, this);
    console.log("画板准备好进行绘画:", shapeNameKey);
  }

  private onPaintStart(event: PIXI.FederatedPointerEvent): void {
    const localPos = event.getLocalPosition(this.paintLayer);
    // 对于精灵遮罩，containsPoint 不能直接应用于精灵本身以判断其透明区域。
    // 交互在 drawingArea 上，paintLayer 和 outlineSprite (遮罩) 都在其中。
    // 我们假设如果 pointerdown 在 drawingArea 上，并且在常规边界内，则为有效开始。
    this.isPainting = true;
    this.paintAt(localPos);
    if (this.brushSprite)
      this.brushSprite.position.copyFrom(event.getLocalPosition(this)); // 画笔相对于 DrawingBoard 容器定位
  }

  private onPaintMove(event: PIXI.FederatedPointerEvent): void {
    const localPos = event.getLocalPosition(this.paintLayer);
    if (this.brushSprite)
      this.brushSprite.position.copyFrom(event.getLocalPosition(this));

    if (this.isPainting) {
      this.paintAt(localPos);
    }
  }

  private onPaintEnd(): void {
    this.isPainting = false;
  }

  private paintAt(position: PIXI.Point): void {
    this.paintLayer.beginFill(this.currentBrushColor); // Alpha 在 paintLayer 本身上设置
    this.paintLayer.drawCircle(position.x, position.y, 15); // 画笔大小
    this.paintLayer.endFill();

    this.paintedPixelsCount++;
    this.checkCompletion();
  }

  // 文档中的 isPointInMask 方法可能不直接适用于精灵遮罩。
  // 遮罩本身 (this.outlineSprite) 将裁剪 paintLayer。交互在 drawingArea 上。

  private checkCompletion(): void {
    const completionRatio =
      this.totalPixelsInShape > 0
        ? this.paintedPixelsCount / this.totalPixelsInShape
        : 0;
    GameEventEmitter.emit("DRAWING_PROGRESS", completionRatio);

    if (completionRatio >= 1) {
      // 根据笔画计数逻辑从 0.8 更改为 1
      this.drawingArea.eventMode = "none"; // 禁止进一步绘画
      this.drawingArea.off("pointerdown", this.onPaintStart, this);
      this.drawingArea.off("pointerup", this.onPaintEnd, this);
      this.drawingArea.off("pointerupoutside", this.onPaintEnd, this);
      this.drawingArea.off("pointermove", this.onPaintMove, this);
      if (this.brushSprite) this.brushSprite.visible = false;
      console.log("着色完成:", this.currentShapeNameKey);

      const currentStep = TaskManager.getCurrentStep();
      // 确保此 DrawingBoard 实例是应完成当前步骤的实例
      if (
        currentStep &&
        currentStep.action === "SHOW_DRAWING_BOARD_FOR_COLORING" &&
        currentStep.options?.shapeName === this.currentShapeNameKey
      ) {
        GameEventEmitter.emit("TASK_STEP_ACTION_COMPLETE", {
          stepId: currentStep.id, // 对 TaskManager 识别步骤很重要
          action: "COLORING_COMPLETE", // 自定义操作标识符
          options: {
            colorNameSound: `sfx_color_${this.currentShapeColorName}`,
            shapeName: this.currentShapeNameKey,
            colorName: this.currentShapeColorName,
          },
        });
      } else {
        console.warn(
          "DrawingBoard: 发出 COLORING_COMPLETE，但当前任务步骤不匹配或丢失。", // 中文翻译
          currentStep
        );
      }
    }
  }

  public async hide(): Promise<void> {
    if (!this.visible) return Promise.resolve();

    this.drawingArea.eventMode = "none";
    this.paintLayer.mask = null; // 在隐藏/销毁之前移除遮罩很重要
    if (this.brushSprite) this.brushSprite.visible = false;

    AudioManager.playSFX("sfx_board_disappear"); // 根据 MainScene 逻辑

    if (
      this.background instanceof Spine &&
      this.background.skeleton.data.findAnimation(this.DISAPPEAR_ANIM)
    ) {
      AnimationManager.playAnimation(
        this.background,
        this.DISAPPEAR_ANIM,
        false
      );
      await new Promise<void>((resolve) => {
        AnimationManager.onAnimationComplete(
          this.background as Spine,
          this.DISAPPEAR_ANIM,
          () => {
            this.visible = false;
            resolve();
          },
          true
        );
      });
    } else {
      this.visible = false;
    }
    GameEventEmitter.emit("DRAWING_BOARD_HIDDEN");
  }

  private getColorValue(colorName: string): number {
    switch (colorName.toLowerCase()) {
      case "red":
        return 0xff0000;
      case "green":
        return 0x00ff00;
      case "blue":
        return 0x0000ff;
      case "yellow":
        return 0xffff00;
      // 从 Palette 或共享工具中添加更多颜色
      default:
        return 0xcccccc;
    }
  }

  public update(ticker: PIXI.Ticker): void {
    // 如果需要，画板本身的任何每帧更新。
    // 例如，如果画笔有其自身的动画且不与指针绑定。
  }

  // 将静态背景加载逻辑提取到一个辅助方法中
  private tryLoadStaticBackground(): void {
    try {
      const bgTexture = AssetLoader.getTexture("drawing_board_bg");
      this.background = new PIXI.Sprite(bgTexture);
      this.background.anchor.set(0.5);
      this.background.position.set(0, 0);
      this.addChild(this.background);
    } catch (e2) {
      console.error(`DrawingBoard: 静态背景 'drawing_board_bg' 也未找到。`, e2);
      // 确保 this.background 为 null 或有一个明确的非 Spine 状态
      this.background = null;
    }
  }

  // 将轮廓加载错误处理提取到一个辅助方法中
  private handleOutlineLoadError(shapeNameKey: string, error: any): void {
    console.error(
      `DrawingBoard: 加载 ${shapeNameKey} 的轮廓纹理 \"${shapeNameKey}_outline\" 失败。绘画功能将受限。`,
      error
    );
    // 可以在此处发出事件或设置状态，以表明画板未正确初始化
    GameEventEmitter.emit("DRAWING_BOARD_INIT_ERROR", {
      shapeNameKey,
      error: `Failed to load outline texture ${shapeNameKey}_outline`,
    });
    // 确保画板隐藏或处于非交互状态
    this.visible = false;
  }
}
