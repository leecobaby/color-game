import { PixiApp } from "../core/PixiApp";
import { BaseScene } from "../scenes/BaseScene";
import * as PIXI from "pixi.js";

export class SceneManager {
  private static currentScene: BaseScene | null = null;
  private static pixiAppInstance: PixiApp;
  private static initialized: boolean = false;

  // 初始化方法，用于提供PixiApp实例
  public static initialize(pixiApp: PixiApp): void {
    this.pixiAppInstance = pixiApp;
    this.initialized = true;
  }

  // 异步获取PixiApp实例
  private static async getPixiAppAsync(): Promise<PixiApp> {
    if (!this.pixiAppInstance || !this.initialized) {
      // 如果未初始化，则尝试异步获取实例
      try {
        this.pixiAppInstance = await PixiApp.getInstanceAsync();
        this.initialized = true;
      } catch (error) {
        console.error("SceneManager: 异步获取PixiApp实例失败", error);
        throw new Error(
          "SceneManager: PixiApp实例不可用。请先初始化PixiApp或将其传递给SceneManager.initialize()。"
        );
      }
    }
    return this.pixiAppInstance;
  }

  // 同步获取PixiApp实例（仅当已确保初始化完成时使用）
  private static getPixiApp(): PixiApp {
    if (!this.pixiAppInstance || !this.initialized) {
      throw new Error(
        "SceneManager: PixiApp实例尚未初始化。请先调用initialize()或使用getPixiAppAsync()。"
      );
    }
    return this.pixiAppInstance;
  }

  public static async goToScene(
    NewSceneClass: new () => BaseScene
  ): Promise<void> {
    // 使用异步方法获取PixiApp实例
    const pixiApp = await this.getPixiAppAsync();
    const app = pixiApp.app;

    if (this.currentScene) {
      await this.currentScene.onExit();
      app.stage.removeChild(this.currentScene);
      // 用户文档中的 destroy 选项对于选择性资源清理很有用。
      // 纹理和基础纹理通常是共享的，因此除非明确管理，否则 false 更安全。
      this.currentScene.destroy({
        children: true,
        texture: false,
      });
    }

    this.currentScene = new NewSceneClass();
    app.stage.addChild(this.currentScene);
    await this.currentScene.onEnter();
  }

  public static getCurrentScene(): BaseScene | null {
    return this.currentScene;
  }

  public static update(ticker: PIXI.Ticker): void {
    if (this.currentScene) {
      this.currentScene.update(ticker);
    }
  }

  // 可选：如果当前场景具有特定的 resize 处理程序，则调整其大小
  public static resize(width: number, height: number): void {
    if (
      this.currentScene &&
      typeof (this.currentScene as any).onResize === "function"
    ) {
      (this.currentScene as any).onResize(width, height);
    }
  }
}
