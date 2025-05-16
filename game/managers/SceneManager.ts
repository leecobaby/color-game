import { PixiApp } from "../core/PixiApp";
import { BaseScene } from "../scenes/BaseScene";
import * as PIXI from "pixi.js";

export class SceneManager {
  private static currentScene: BaseScene | null = null;
  private static pixiAppInstance: PixiApp;

  // 初始化方法，用于提供 PixiApp 实例，如果不直接在各处使用单例的 getInstance
  public static initialize(pixiApp: PixiApp): void {
    this.pixiAppInstance = pixiApp;
  }

  // 确保 PixiApp 实例可用
  private static getPixiApp(): PixiApp {
    if (!this.pixiAppInstance) {
      // 如果未初始化，则尝试获取实例，假设已在其他地方为 getInstance 提供了选项
      this.pixiAppInstance = PixiApp.getInstance();
      if (!this.pixiAppInstance) {
        throw new Error(
          "SceneManager: PixiApp 实例不可用。请先初始化 PixiApp 或将其传递给 SceneManager.initialize()。"
        );
      }
    }
    return this.pixiAppInstance;
  }

  public static async goToScene(
    NewSceneClass: new () => BaseScene
  ): Promise<void> {
    const app = this.getPixiApp().app;

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
