import * as PIXI from "pixi.js";
import { PixiApp } from "../core/PixiApp"; // 如果需要直接访问屏幕尺寸等，可能会用到

export class BackgroundElement extends PIXI.Container {
  public sprite: PIXI.Sprite;
  private id: string;

  // 摇摆效果参数
  public isSwaying: boolean = false; // 是否正在摇摆
  private swayMaxAngleRad: number = 0; // 最大摇摆角度（弧度）
  private swayPeriodMs: number = 1000; // 一个完整摇摆周期的时长（毫秒）
  private swayTime: number = 0; // 当前在摇摆周期中的时间
  private originalRotation: number = 0; // 原始旋转角度

  // 循环移动参数
  public isLoopingMovement: boolean = false; // 是否正在循环移动
  private moveSpeed: PIXI.Point = new PIXI.Point(0, 0); // 移动速度（像素/秒）
  private loopBoundary: {
    // 循环边界，用于重置位置
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  } = {};
  private initialPosition: PIXI.Point = new PIXI.Point(0, 0); // 初始位置
  private loopWidth: number = 0; // 水平循环的移动宽度
  private loopHeight: number = 0; // 垂直循环的移动高度

  constructor(id: string, texture: PIXI.Texture) {
    super();
    this.id = id;
    this.label = id; // 用于调试
    this.sprite = new PIXI.Sprite(texture);
    this.addChild(this.sprite);
  }

  /**
   * 开始摇摆动画（例如树枝在风中摇曳）。
   * @param maxAngleDegrees 最大摇摆角度（度），相对于原始旋转角度。
   * @param periodMs 一个完整摇摆周期的时长（毫秒），例如正弦波周期。
   */
  public startSwayingEffect(maxAngleDegrees: number, periodMs: number): void {
    this.originalRotation = this.sprite.rotation;
    this.swayMaxAngleRad = maxAngleDegrees * (Math.PI / 180); // 转换为弧度
    this.swayPeriodMs = periodMs;
    this.swayTime = Math.random() * periodMs; // 随机起始相位
    this.isSwaying = true;
  }

  public stopSwayingEffect(): void {
    this.isSwaying = false;
    this.sprite.rotation = this.originalRotation; // 重置为原始旋转角度
  }

  /**
   * 开始循环移动（例如云彩在天空中滚动）。
   * @param speed 移动速度，格式为 {x, y}，单位为像素/秒。
   * @param loopWidth 移动区域的总宽度，在循环前（用于水平移动）。
   * @param loopHeight 移动区域的总高度，在循环前（用于垂直移动）。
   */
  public startLoopingMovement(
    speed: { x: number; y: number },
    loopWidth: number,
    loopHeight: number = 0
  ): void {
    this.moveSpeed.set(speed.x, speed.y);
    this.initialPosition.copyFrom(this.sprite.position);
    this.loopWidth = loopWidth; // 这通常是精灵本身用于循环的范围
    this.loopHeight = loopHeight;
    this.isLoopingMovement = true;

    // 示例：如果云彩（宽度 W）从 X_initial 向左移动到 X_initial - W，然后重置到 X_initial。
    // MainScene 中提供的 loopWidth 是 app.screen.width * 1.5，用于一个宽度也是屏幕 1.5 倍的精灵。
    // 这意味着精灵移动其全部宽度然后再多一些。我们将在 update 中优化逻辑。
  }

  public stopLoopingMovement(): void {
    this.isLoopingMovement = false;
    // 可选地重置到初始位置，或让它停在当前位置。
    // this.sprite.position.copyFrom(this.initialPosition);
  }

  public updateAnimation(deltaMS: number): void {
    if (this.isSwaying) {
      this.swayTime = (this.swayTime + deltaMS) % this.swayPeriodMs;
      const swayRatio = this.swayTime / this.swayPeriodMs;
      this.sprite.rotation =
        this.originalRotation +
        Math.sin(swayRatio * Math.PI * 2) * this.swayMaxAngleRad;
    }

    if (this.isLoopingMovement) {
      const deltaSeconds = deltaMS / 1000;
      this.sprite.x += this.moveSpeed.x * deltaSeconds;
      this.sprite.y += this.moveSpeed.y * deltaSeconds;

      // 基于初始位置和 loopWidth/Height 的循环逻辑
      // 假设 loopWidth 是重置前要移动的总距离。
      // 对于向左移动的云彩：initialX 是右边缘，向左移动 loopWidth，然后重置。
      if (this.moveSpeed.x < 0) {
        // 向左移动
        if (this.sprite.x < this.initialPosition.x - this.loopWidth) {
          this.sprite.x += this.loopWidth;
          // 如果有多个元素用于无缝滚动，也需要调整其他元素
        }
      } else if (this.moveSpeed.x > 0) {
        // 向右移动
        if (this.sprite.x > this.initialPosition.x + this.loopWidth) {
          this.sprite.x -= this.loopWidth;
        }
      }

      if (this.moveSpeed.y < 0) {
        // 向上移动
        if (this.sprite.y < this.initialPosition.y - this.loopHeight) {
          this.sprite.y += this.loopHeight;
        }
      } else if (this.moveSpeed.y > 0) {
        // 向下移动
        if (this.sprite.y > this.initialPosition.y + this.loopHeight) {
          this.sprite.y -= this.loopHeight;
        }
      }
    }
  }
}
