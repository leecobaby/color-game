import * as PIXI from "pixi.js";

export class PaintSystem {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private paintMask: PIXI.Graphics;
  private paintArea: PIXI.Graphics;
  private outline: PIXI.Graphics;
  private isPainting: boolean = false;
  private currentColor: number = 0x4caf50; // 默认绿色
  private completionCallback: (() => void) | null = null;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;

    // 创建绘画区域
    this.paintArea = new PIXI.Graphics();
    this.container.addChild(this.paintArea);

    // 创建轮廓
    this.outline = new PIXI.Graphics();
    this.container.addChild(this.outline);

    // 创建遮罩（限制绘画区域）
    this.paintMask = new PIXI.Graphics();
    this.container.addChild(this.paintMask);

    // 设置遮罩
    this.paintArea.mask = this.paintMask;

    // 设置交互
    this.setupInteraction();
  }

  // 设置轮廓（简单实现，后续会基于Spine动画生成真实轮廓）
  setOutline(shapeType: string): void {
    this.outline.clear();
    this.paintMask.clear();

    // 绘制轮廓
    this.outline.lineStyle(3, 0x000000);

    if (shapeType === "frog") {
      // 简单青蛙形状
      this.drawFrogShape(this.outline);
      this.drawFrogShape(this.paintMask, true);
    } else if (shapeType === "butterfly") {
      // 简单蝴蝶形状
      this.drawButterflyShape(this.outline);
      this.drawButterflyShape(this.paintMask, true);
    } else if (shapeType === "flower") {
      // 简单花朵形状
      this.drawFlowerShape(this.outline);
      this.drawFlowerShape(this.paintMask, true);
    } else {
      // 默认圆形
      this.outline.drawCircle(0, 0, 100);
      this.paintMask.beginFill(0xffffff);
      this.paintMask.drawCircle(0, 0, 100);
      this.paintMask.endFill();
    }
  }

  // 不同形状的绘制函数（简化版本，后续根据动画轮廓精确绘制）
  private drawFrogShape(graphics: PIXI.Graphics, fill: boolean = false): void {
    if (fill) graphics.beginFill(0xffffff);

    // 简化的青蛙形状
    graphics.drawEllipse(0, -20, 80, 50); // 头
    graphics.drawEllipse(0, 50, 100, 70); // 身体

    if (fill) graphics.endFill();
  }

  private drawButterflyShape(
    graphics: PIXI.Graphics,
    fill: boolean = false
  ): void {
    if (fill) graphics.beginFill(0xffffff);

    // 简化的蝴蝶形状
    graphics.drawEllipse(-50, -20, 40, 60);
    graphics.drawEllipse(50, -20, 40, 60);
    graphics.drawEllipse(0, 20, 20, 80);

    if (fill) graphics.endFill();
  }

  private drawFlowerShape(
    graphics: PIXI.Graphics,
    fill: boolean = false
  ): void {
    if (fill) graphics.beginFill(0xffffff);

    // 简化的花朵形状
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = Math.cos(angle) * 60;
      const y = Math.sin(angle) * 60;
      graphics.drawEllipse(x, y, 30, 40);
    }
    graphics.drawCircle(0, 0, 30);

    if (fill) graphics.endFill();
  }

  // 设置颜色
  setColor(color: number): void {
    this.currentColor = color;
  }

  // 设置完成回调
  setCompletionCallback(callback: () => void): void {
    this.completionCallback = callback;
  }

  // 绘画交互
  private setupInteraction(): void {
    this.container.eventMode = "static";

    // 鼠标/触摸按下时开始绘画
    this.container.on("pointerdown", this.startPainting.bind(this));

    // 鼠标/触摸移动时绘画
    this.container.on("pointermove", this.paint.bind(this));

    // 鼠标/触摸抬起时停止绘画
    this.container.on("pointerup", this.stopPainting.bind(this));
    this.container.on("pointerupoutside", this.stopPainting.bind(this));
  }

  // 开始绘画
  private startPainting(event: PIXI.FederatedPointerEvent): void {
    this.isPainting = true;
    this.paint(event);
  }

  // 绘画
  private paint(event: PIXI.FederatedPointerEvent): void {
    if (!this.isPainting) return;

    const point = this.container.toLocal(event.global);

    // 绘制颜色（画笔大小15像素）
    this.paintArea.beginFill(this.currentColor);
    this.paintArea.drawCircle(point.x, point.y, 15);
    this.paintArea.endFill();

    // 检查完成进度（简化版，实际应计算像素覆盖率）
    this.checkCompletion();
  }

  // 停止绘画
  private stopPainting(): void {
    this.isPainting = false;
  }

  // 检查完成进度（简化版）
  private checkCompletion(): void {
    // 这里应该计算实际的覆盖面积百分比
    // 简化版本：随机判断，约5%概率触发完成
    if (Math.random() < 0.001 && this.completionCallback) {
      this.completionCallback();
    }
  }

  // 重置绘画区域
  reset(): void {
    this.paintArea.clear();
    this.isPainting = false;
  }
}
