import * as PIXI from "pixi.js";
import { AssetLoader } from "../managers/AssetLoader";
import { Spine, ITrackEntry } from "pixi-spine";
import GameEventEmitter from "../utils/GameEventEmitter";
import { AnimationManager } from "../managers/AnimationManager";

// 此接口特定于 Palette 如何期望其选项。
// 它与 TaskManager 的 ColorOption 对齐，后者在 tasks.json 中用于 SHOW_PALETTE 操作。
export interface PaletteColorOption {
  colorName: string; // 例如 'red', 'green'
  targetWord: string; // 例如 'apple', 'frog' (用于上下文，调色板按钮不直接使用)
  targetShapeOutline?: string; // 画板轮廓纹理的名称
  spineName?: string; // 可选：按钮上图标的 Spine，或按钮动画本身的 Spine
  textureName?: string; // 可选：按钮上图标的静态纹理 (例如 'apple_icon')
  colorSound?: string; // 选择此颜色时播放的声音 (由 TaskManager/MainScene 使用)
}

export class Palette extends PIXI.Container {
  private backgroundSpine: Spine | null = null;
  private colorButtonsContainer: PIXI.Container;
  private currentOptions: PaletteColorOption[] = [];

  private readonly BUTTON_RADIUS = 40; // 按钮半径
  private readonly BUTTON_SPACING = 100; // 按钮间距
  private readonly PALETTE_SPINE_NAME = "palette_spine"; // 调色板自身的默认 Spine 资源名称
  private readonly APPEAR_ANIM = "appear_anim"; // 默认出现动画名称
  private readonly DISAPPEAR_ANIM = "disappear_anim"; // 默认消失动画名称

  constructor(id: string) {
    super();
    this.name = id;
    this.visible = false; // 初始隐藏

    this.colorButtonsContainer = new PIXI.Container();
    this.addChild(this.colorButtonsContainer);

    // 尝试加载调色板背景 Spine (如果可用)
    try {
      const paletteSpineData = AssetLoader.getSpineData(
        this.PALETTE_SPINE_NAME
      );
      if (paletteSpineData) {
        this.backgroundSpine = new Spine(paletteSpineData);
        this.backgroundSpine.autoUpdate = true;
        this.addChildAt(this.backgroundSpine, 0); // 将背景添加到按钮后面
      }
    } catch (e) {
      console.warn(
        `Palette: Spine 资源 "${this.PALETTE_SPINE_NAME}" 未找到或加载失败。调色板将没有背景动画。` // 中文翻译
      );
      // 可选：添加静态精灵背景作为后备
      // const bgTexture = AssetLoader.getTexture('palette_bg'); // 如果有静态背景图片
      // if (bgTexture) {
      //     const staticBg = new PIXI.Sprite(bgTexture);
      //     staticBg.anchor.set(0.5);
      //     this.addChildAt(staticBg, 0);
      // }
    }
  }

  public async showWithOptions(options: PaletteColorOption[]): Promise<void> {
    if (
      this.visible &&
      JSON.stringify(this.currentOptions) === JSON.stringify(options)
    ) {
      console.log("Palette.showWithOptions 在已可见时使用相同选项调用。");
      return;
    }
    this.currentOptions = options;
    this.colorButtonsContainer.removeChildren(); // 清除旧按钮

    this.visible = true;
    let mainShowPromise: Promise<void> = Promise.resolve();

    if (
      this.backgroundSpine &&
      this.backgroundSpine.skeleton.data.findAnimation(this.APPEAR_ANIM)
    ) {
      AnimationManager.playAnimation(
        this.backgroundSpine,
        this.APPEAR_ANIM,
        false
      );
      mainShowPromise = new Promise((resolve) => {
        AnimationManager.onAnimationComplete(
          this.backgroundSpine!,
          this.APPEAR_ANIM,
          () => resolve(),
          true
        );
      });
    }

    await mainShowPromise;
    // 在出现动画（如果有）完成后或立即创建按钮
    this.createColorButtons(options);
    GameEventEmitter.emit("PALETTE_SHOWN");
  }

  private createColorButtons(options: PaletteColorOption[]): void {
    options.forEach((option, index) => {
      const buttonContainer = new PIXI.Container();
      buttonContainer.name = `color_button_${option.colorName}`;

      // 简单的圆形颜色按钮
      const circle = new PIXI.Graphics();
      const colorValue = this.getColorValue(option.colorName);
      circle.beginFill(colorValue);
      circle.drawCircle(0, 0, this.BUTTON_RADIUS);
      circle.endFill();
      circle.lineStyle(3, 0x000000, 0.6);
      circle.drawCircle(0, 0, this.BUTTON_RADIUS);
      buttonContainer.addChild(circle);

      // 可选：向按钮添加图标 (Sprite 或 Spine)
      if (option.textureName) {
        try {
          const iconTexture = AssetLoader.getTexture(option.textureName);
          const iconSprite = new PIXI.Sprite(iconTexture);
          iconSprite.anchor.set(0.5);
          iconSprite.scale.set(
            Math.min(
              (this.BUTTON_RADIUS * 1.5) / iconSprite.width,
              (this.BUTTON_RADIUS * 1.5) / iconSprite.height
            )
          ); // 缩放以适应
          buttonContainer.addChild(iconSprite);
        } catch (e) {
          console.warn(
            `Palette: 加载图标纹理 ${option.textureName} 失败`, // 中文翻译
            e
          );
        }
      }
      // TODO: 如果颜色按钮本身是 Spine 动画，则添加 option.spineName 的逻辑

      // 定位按钮 (例如，水平排列)
      // 这种简单的布局将它们相对于 colorButtonsContainer 的原点定位。
      // colorButtonsContainer 本身可以在 Palette 容器内定位。
      buttonContainer.position.set(
        index * this.BUTTON_SPACING -
          ((options.length - 1) * this.BUTTON_SPACING) / 2,
        0
      );

      buttonContainer.eventMode = "static"; // PixiJS v8 事件模式
      buttonContainer.cursor = "pointer";
      buttonContainer.on("pointertap", () => this.onColorSelect(option));

      // 简单的悬停效果
      buttonContainer.on("pointerover", () => {
        buttonContainer.scale.set(1.1);
      });
      buttonContainer.on("pointerout", () => {
        buttonContainer.scale.set(1.0);
      });

      this.colorButtonsContainer.addChild(buttonContainer);
    });
    // 如果 backgroundSpine 存在且具有边界，则将按钮容器居中
    if (this.backgroundSpine) {
      // this.colorButtonsContainer.position.set(-this.colorButtonsContainer.width / 2, 0); // 根据需要调整
    }
  }

  private onColorSelect(selectedOption: PaletteColorOption): void {
    console.log("颜色已选择:", selectedOption.colorName);
    GameEventEmitter.emit("PALETTE_COLOR_SELECTED", selectedOption);
    this.hide();
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
      case "orange":
        return 0xffa500;
      case "purple":
        return 0x800080;
      case "pink":
        return 0xffc0cb;
      case "brown":
        return 0xa52a2a;
      case "black":
        return 0x000000;
      case "white":
        return 0xffffff;
      default:
        return 0xcccccc; // 默认灰色
    }
  }

  public async hide(): Promise<void> {
    if (!this.visible) return Promise.resolve();

    this.currentOptions = []; // 清除当前选项
    let mainHidePromise: Promise<void> = Promise.resolve();

    if (
      this.backgroundSpine &&
      this.backgroundSpine.skeleton.data.findAnimation(this.DISAPPEAR_ANIM)
    ) {
      AnimationManager.playAnimation(
        this.backgroundSpine,
        this.DISAPPEAR_ANIM,
        false
      );
      mainHidePromise = new Promise((resolve) => {
        AnimationManager.onAnimationComplete(
          this.backgroundSpine!,
          this.DISAPPEAR_ANIM,
          () => {
            this.visible = false;
            this.colorButtonsContainer.removeChildren(); // 隐藏后清理按钮
            resolve();
          },
          true
        );
      });
    } else {
      this.visible = false;
      this.colorButtonsContainer.removeChildren();
    }
    await mainHidePromise;
    GameEventEmitter.emit("PALETTE_HIDDEN");
  }
}
