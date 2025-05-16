import { Container, Ticker, Point, DisplayObject, PointData } from "pixi.js";
import { PixiApp } from "../core/PixiApp";
// import { gsap } from 'gsap'; // 如果使用 GSAP 进行缓动动画，则取消注释此行

export abstract class BaseScene extends Container {
  public world: Container;
  protected pixiApp: PixiApp;

  constructor() {
    super();
    this.world = new Container();
    this.addChild(this.world);
    // 通常在需要时获取实例更安全，或者如果 SceneManager 用它创建场景则传递它。
    // 这里假设 PixiApp 在创建任何场景之前已初始化。
    this.pixiApp = PixiApp.getInstance();
  }

  abstract onEnter(): Promise<void>; // 当场景变为活动状态时调用
  abstract onExit(): Promise<void>; // 当场景即将被替换时调用
  abstract update(ticker: Ticker): void; // 游戏循环更新，ticker 提供增量时间

  /**
   * 将世界相机聚焦于目标点或显示对象。
   * @param target 要聚焦的 Point 或 DisplayObject 目标。
   * @param duration 聚焦动画的持续时间（秒）。0 表示立即聚焦。
   * @param zoomLevel 世界容器的期望缩放级别。
   * @param screenOffsetRatio 可选的屏幕中心偏移比率（例如 {x: 0, y: -0.1} 将焦点稍微向上移动）。
   * @returns 当聚焦动画完成时解析的 Promise。
   */
  public focusOn(
    target: Point | DisplayObject,
    duration: number = 0.5,
    zoomLevel: number = 1,
    screenOffsetRatio?: { x: number; y: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      const app = this.pixiApp.app;
      // let targetGlobalPos: Point; // 用于存储目标的全局位置

      // if (target instanceof DisplayObject) {
      //   target.updateTransform(); // 确保变换是最新的
      //   targetGlobalPos = target.getGlobalPosition(new Point());
      // } else {
      //   targetGlobalPos = target; // 如果是 Point，则假定目标已在全局坐标中
      // }

      const screenWidth = app.screen.width;
      const screenHeight = app.screen.height;

      let targetLocalPosInWorld: PointData;
      if (target instanceof DisplayObject) {
        // 获取目标在其父容器坐标系中的位置，然后转换为世界（场景的 world 容器）的局部坐标
        // 如果 DisplayObject 的 transform 未更新，getGlobalPosition 可能会给出旧值
        target.updateTransform();
        const globalPos = target.getGlobalPosition(new Point());
        targetLocalPosInWorld = this.world.toLocal(
          globalPos,
          undefined,
          undefined,
          false
        ); // 获取相对于 world 的局部坐标, 不跳过更新
      } else {
        // 如果 target 是 Point，则假定它表示世界容器内的坐标。
        targetLocalPosInWorld = target;
      }

      const offsetX = screenOffsetRatio ? screenWidth * screenOffsetRatio.x : 0;
      const offsetY = screenOffsetRatio
        ? screenHeight * screenOffsetRatio.y
        : 0;

      const targetWorldX =
        screenWidth / 2 - targetLocalPosInWorld.x * zoomLevel - offsetX;
      const targetWorldY =
        screenHeight / 2 - targetLocalPosInWorld.y * zoomLevel - offsetY;

      if (duration === 0) {
        this.world.position.set(targetWorldX, targetWorldY);
        this.world.scale.set(zoomLevel);
        resolve();
      } else {
        // 为简单起见，使用基本线性插值 (lerp)。如需更平滑效果，请替换为 GSAP 或其他缓动库。
        const startX = this.world.position.x;
        const startY = this.world.position.y;
        const startScaleX = this.world.scale.x;
        const startScaleY = this.world.scale.y;
        let elapsed = 0;

        const tweenTicker = (tickerTicker: Ticker) => {
          // Renamed ticker to tickerTicker to avoid conflict
          elapsed += tickerTicker.deltaMS; // 使用 deltaMS 进行基于时间的动画
          const progress = Math.min(elapsed / (duration * 1000), 1);

          this.world.position.x = startX + (targetWorldX - startX) * progress;
          this.world.position.y = startY + (targetWorldY - startY) * progress;
          this.world.scale.x =
            startScaleX + (zoomLevel - startScaleX) * progress;
          this.world.scale.y =
            startScaleY + (zoomLevel - startScaleY) * progress;

          if (progress === 1) {
            this.pixiApp.app.ticker.remove(tweenTicker);
            resolve();
          }
        };
        this.pixiApp.app.ticker.add(tweenTicker);
      }
    });
  }
}
