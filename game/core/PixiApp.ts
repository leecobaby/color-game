import * as PIXI from "pixi.js";
import { initDevtools } from "@pixi/devtools";

export class PixiApp {
  public app: PIXI.Application;
  private static instance: PixiApp;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor(options: Partial<PIXI.ApplicationOptions>) {
    // PIXI.GRAPHICS_CURVES 是 v7+ 版本 extras 的一部分，通常按需导入，或者在完整包中默认可用。
    // 对于 v8 版本，如果导入了 graphics 模块或完整的 pixi.js 包，它通常是可用的。
    // PIXI.settings.ROUND_PIXELS = true; // 在 v7 中已弃用，请使用 app.renderer.options.roundPixels = true 或在应用创建时设置。
    this.app = new PIXI.Application();
    initDevtools(this.app);

    // 设置初始化选项
    const appOptions: Partial<PIXI.ApplicationOptions> = {
      roundPixels: true,
      ...options,
    };

    // 创建初始化Promise并保存它
    this.initPromise = this.app
      .init(appOptions)
      .then(() => {
        this.initialized = true;
        console.log("PIXI应用初始化完成");
      })
      .catch((err) => {
        console.error("PIXI应用初始化失败:", err);
        throw err;
      });
  }

  /**
   * 获取PixiApp实例（单例模式）
   * @param options 应用选项
   * @returns Promise解析为PixiApp实例
   */
  public static async getInstanceAsync(
    options?: Partial<PIXI.ApplicationOptions>
  ): Promise<PixiApp> {
    if (!PixiApp.instance) {
      if (!options) {
        throw new Error("首次实例化PixiApp时需要提供选项。");
      }
      PixiApp.instance = new PixiApp(options);
      // 等待初始化完成
      await PixiApp.instance.waitForInit();
    } else if (!PixiApp.instance.initialized) {
      // 实例已存在但未完成初始化，等待完成
      await PixiApp.instance.waitForInit();
    }
    return PixiApp.instance;
  }

  /**
   * 同步获取实例的方法（仅当已初始化完成时使用）
   * @param options 应用选项
   * @returns PixiApp实例
   * @throws 如果实例不存在或未初始化完成
   */
  public static getInstance(
    options?: Partial<PIXI.ApplicationOptions>
  ): PixiApp {
    if (!PixiApp.instance) {
      if (!options) {
        throw new Error("首次实例化PixiApp时需要提供选项。");
      }
      PixiApp.instance = new PixiApp(options);
      console.warn(
        "警告：同步获取PixiApp实例时，初始化尚未完成。建议使用getInstanceAsync等待初始化。"
      );
    }
    return PixiApp.instance;
  }

  /**
   * 等待应用初始化完成
   * @returns 初始化完成的Promise
   */
  public async waitForInit(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    return this.initPromise || Promise.reject(new Error("初始化尚未开始"));
  }

  /**
   * 检查应用是否已初始化完成
   * @returns 初始化状态
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // 可选：用于清理的销毁实例方法，例如在React useEffect的返回函数中
  public static destroyInstance(): void {
    if (PixiApp.instance) {
      PixiApp.instance.app.destroy(true, {
        children: true,
        texture: true,
      });
      // @ts-expect-error // 忽略下一行的TypeScript检查
      PixiApp.instance = null;
    }
  }

  public get stage(): PIXI.Container {
    if (!this.initialized) {
      console.warn("警告：在初始化完成前访问stage属性。请先等待初始化。");
    }
    return this.app.stage;
  }

  public get canvas(): HTMLCanvasElement {
    if (!this.initialized) {
      console.warn("警告：在初始化完成前访问canvas属性。请先等待初始化。");
    }
    return this.app.canvas as HTMLCanvasElement;
  }

  public get renderer(): PIXI.Renderer {
    if (!this.initialized) {
      console.warn("警告：在初始化完成前访问renderer属性。请先等待初始化。");
    }
    return this.app.renderer;
  }

  public resize(width: number, height: number): void {
    if (!this.initialized) {
      console.warn("警告：在初始化完成前调用resize方法。请先等待初始化。");
    }
    this.app.renderer.resize(width, height);
    // 如果游戏逻辑依赖屏幕尺寸，您可能还需要更新它们
    // this.app.screen.width = width;
    // this.app.screen.height = height;
  }
}
