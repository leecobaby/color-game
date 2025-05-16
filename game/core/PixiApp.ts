import * as PIXI from "pixi.js";

export class PixiApp {
  public app: PIXI.Application;
  private static instance: PixiApp;

  private constructor(options: Partial<PIXI.ApplicationOptions>) {
    // PIXI.GRAPHICS_CURVES 是 v7+ 版本 extras 的一部分，通常按需导入，或者在完整包中默认可用。
    // 对于 v8 版本，如果导入了 graphics 模块或完整的 pixi.js 包，它通常是可用的。
    // PIXI.settings.ROUND_PIXELS = true; // 在 v7 中已弃用，请使用 app.renderer.options.roundPixels = true 或在应用创建时设置。
    this.app = new PIXI.Application();

    // v8 版本在创建后使用选项进行初始化
    // v7+ 版本的常见做法是将选项直接传递给构造函数或 init()。
    // 构造函数签名为 `constructor(options?: Partial<ApplicationOptions>)`
    // 所以直接传递是可以的。
    // 让我们用用户提供的选项重新初始化，确保也设置了默认值。
    const appOptions: Partial<PIXI.ApplicationOptions> = {
      roundPixels: true, // PIXI.settings.ROUND_PIXELS 的替代方案
      ...options,
    };
    this.app.init(appOptions).catch(console.error); // init 返回一个 promise
  }

  public static getInstance(
    options?: Partial<PIXI.ApplicationOptions>
  ): PixiApp {
    if (!PixiApp.instance) {
      if (!options) {
        throw new Error("首次实例化 PixiApp 时需要提供选项。");
      }
      PixiApp.instance = new PixiApp(options);
    }
    return PixiApp.instance;
  }

  // 可选：用于清理的销毁实例方法，例如在 React useEffect 的返回函数中
  public static destroyInstance(): void {
    if (PixiApp.instance) {
      PixiApp.instance.app.destroy(true, {
        children: true,
        texture: true,
      });
      // @ts-expect-error // 忽略下一行的 TypeScript 检查
      PixiApp.instance = null;
    }
  }

  public get stage(): PIXI.Container {
    return this.app.stage;
  }

  public get view(): HTMLCanvasElement {
    return this.app.view as HTMLCanvasElement;
  }

  public get renderer(): PIXI.Renderer {
    return this.app.renderer;
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    // 如果游戏逻辑依赖屏幕尺寸，您可能还需要更新它们
    // this.app.screen.width = width;
    // this.app.screen.height = height;
  }
}
