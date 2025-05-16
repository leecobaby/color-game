import * as PIXI from "pixi.js";
import { Assets, Sprite } from "pixi.js";
import { loadGameAssets, LEVELS } from "./AssetLoader";
import { GAME_ASSETS } from "./AssetLoader";
import { PaintSystem } from "./PaintSystem";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class GameManager {
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private currentLevelIndex: number = 0;
  private currentSpine: Spine | null = null;

  // 游戏状态管理
  private paletteContainer: PIXI.Container;
  private canvasContainer: PIXI.Container;
  private brushContainer: PIXI.Container;
  private resultContainer: PIXI.Container;

  // 新增涂色系统相关代码
  private paintSystem: PaintSystem | null = null;

  constructor(app: PIXI.Application) {
    this.app = app;

    // 创建游戏容器
    this.gameContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameContainer);

    // 创建游戏UI容器
    this.paletteContainer = new PIXI.Container();
    this.canvasContainer = new PIXI.Container();
    this.brushContainer = new PIXI.Container();
    this.resultContainer = new PIXI.Container();

    this.gameContainer.addChild(this.canvasContainer);
    this.gameContainer.addChild(this.paletteContainer);
    this.gameContainer.addChild(this.brushContainer);
    this.gameContainer.addChild(this.resultContainer);

    // 设置容器位置
    this.canvasContainer.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2
    );
    this.canvasContainer.pivot.set(200, 150); // 画布中心点

    // 初始化调色板位置（右侧）
    this.paletteContainer.position.set(
      this.app.screen.width - 100,
      this.app.screen.height / 2
    );
  }

  // 初始化游戏
  async initialize(): Promise<void> {
    // 加载所有资源
    await loadGameAssets();

    // 创建调色板
    this.createPalette();

    // 初始化涂色系统
    // this.paintSystem = new PaintSystem(this.app, this.canvasContainer);

    // 开始第一关
    this.startLevel(0);
  }

  // 创建调色板UI
  private createPalette(): void {
    const paletteBackground = new PIXI.Graphics();
    paletteBackground.roundRect(-50, -100, 100, 200, 10);
    paletteBackground.fill({ color: 0xeae2d9, alpha: 1 });
    this.paletteContainer.addChild(paletteBackground);

    // 添加颜色按钮
    LEVELS.forEach((level, index) => {
      const button = new PIXI.Graphics();
      button.circle(0, -75 + index * 50, 20);
      button.fill({ color: level.color, alpha: 1 });

      // 设置交互
      button.eventMode = "static";
      button.cursor = "pointer";
      button.on("pointerdown", () => this.startLevel(index));

      this.paletteContainer.addChild(button);
    });
  }

  // 开始指定关卡
  private startLevel(levelIndex: number): void {
    this.currentLevelIndex = levelIndex;
    const level = LEVELS[levelIndex];

    console.log(`开始关卡: ${level.name}`);

    // 清除画布内容
    this.canvasContainer.removeChildren();

    // 创建画布背景
    // const canvasBackground = new PIXI.Graphics();
    // canvasBackground.roundRect(-200, -100, 800, 400, 5);
    // canvasBackground.fill({ color: 0xffffff, alpha: 1 });
    // this.canvasContainer.addChild(canvasBackground);

    // 加载并显示当前关卡的Spine动画
    this.loadSpineAnimation(level.spineKey);

    // 设置涂色系统
    if (this.paintSystem) {
      // 重置涂色系统
      this.paintSystem.reset();

      // 设置轮廓（根据关卡类型）
      if (level.id === "green") {
        this.paintSystem.setOutline("frog");
      } else if (level.id === "blue") {
        this.paintSystem.setOutline("butterfly");
      } else if (level.id === "yellow") {
        this.paintSystem.setOutline("flower");
      } else {
        this.paintSystem.setOutline("frog"); // 默认使用青蛙形状
      }

      // 设置颜色
      this.paintSystem.setColor(level.color);

      // 设置完成回调
      this.paintSystem.setCompletionCallback(() => {
        this.onLevelComplete();
      });
    }
  }

  // 加载Spine动画
  private async loadSpineAnimation(spineKey: string): Promise<void> {
    try {
      // 获取资源别名
      const jsonAlias = `${spineKey}_json`;
      const atlasAlias = `${spineKey}_atlas`;

      // 创建Spine实例 (新版本用法)
      this.currentSpine = Spine.from({
        skeleton: jsonAlias,
        atlas: atlasAlias,
      });

      if (!this.currentSpine) {
        console.error("无法创建Spine实例");
        return;
      }

      // 设置位置和缩放
      //   this.currentSpine.position.set(0, 0);
      //   this.currentSpine.x = this.app.screen.width / 2;
      //   this.currentSpine.y = this.app.screen.height / 2;
      this.currentSpine.scale.set(0.2);

      // 添加到容器
      this.canvasContainer.addChild(this.currentSpine);

      // 尝试播放动画
      const animations = this.currentSpine.state.data.skeletonData.animations;
      console.log("animations", animations);
      if (animations && animations.length > 0) {
        // 先查找idle动画
        const idleAnim = animations.find((a) => a.name.includes("idle"));
        if (idleAnim) {
          console.log("播放idle动画");
          //   this.currentSpine.state.setAnimation(0, idleAnim.name, true);
          this.currentSpine.state.setAnimation(0, animations[1].name, false);
        } else {
          console.log("播放第一个动画");
          // 否则播放第一个动画
          this.currentSpine.state.setAnimation(0, animations[0].name, true);
        }
      }

      console.log("Spine动画加载成功");
    } catch (error) {
      console.error("加载Spine动画失败:", error);
    }
  }

  // 添加关卡完成处理
  private onLevelComplete(): void {
    console.log(`关卡完成: ${LEVELS[this.currentLevelIndex].name}`);

    // 显示完成动画（简化版）
    const completionText = new PIXI.Text(
      `恭喜你学会了 ${LEVELS[this.currentLevelIndex].englishName}`,
      {
        fontSize: 24,
        fill: 0x333333,
      }
    );
    completionText.position.set(
      this.app.screen.width / 2 - completionText.width / 2,
      this.app.screen.height / 2 - 100
    );
    this.resultContainer.addChild(completionText);

    // 3秒后清除结果，进入下一关
    setTimeout(() => {
      this.resultContainer.removeChildren();

      // 前进到下一关或循环到第一关
      const nextLevelIndex = (this.currentLevelIndex + 1) % LEVELS.length;
      this.startLevel(nextLevelIndex);
    }, 3000);
  }
}
