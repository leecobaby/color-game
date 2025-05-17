import { Howler } from "howler"; // 导入Howler用于全局控制方法
import { Ticker } from "pixi.js"; // 显式导入Ticker

import { AssetLoader, Asset } from "./AssetLoader";
import { SceneManager } from "./SceneManager";
import { TaskManager, Task } from "./TaskManager"; // Task接口可能在这里或全局定义
import { AudioManager } from "./AudioManager";
import { PixiApp } from "../core/PixiApp";
import GameEventEmitter from "../utils/GameEventEmitter";
// 导入初始场景 - 假设MainScene.ts将在src/game/scenes/中创建
// 目前，我们将使用占位符或期望它被定义
// import { MainScene } from '../scenes/MainScene';
// MainScene构造函数的占位符类型，当可用时替换为实际的MainScene导入
import { BaseScene } from "../scenes/BaseScene";

export enum GameState {
  SPLASH,
  LOADING,
  MENU, // 或者PRE_READY如果菜单是React UI的一部分
  READY, // 资源和任务已加载，准备开始游戏
  PLAYING,
  PAUSED,
  END, // 游戏结束或完成所有内容
}

export class GameManager {
  public static currentState: GameState = GameState.SPLASH;
  private static pixiAppInstance: PixiApp;

  public static async init(
    pixiApp: PixiApp, // 传入初始化的PixiApp实例
    onProgress: (progress: number) => void,
    initialSceneClass: new () => BaseScene // 传入初始场景的实际类
  ): Promise<void> {
    this.pixiAppInstance = pixiApp;
    this.currentState = GameState.LOADING;
    GameEventEmitter.emit("GAME_LOADING_START");
    onProgress(0);

    // 0. 初始化TaskManager事件监听器
    TaskManager.setupEventListeners();

    // 1. 定义要加载的资源（根据用户文档）
    // 注意：在TS中，'as const'对于类型是一个好习惯，这里Asset[]类型检查起到类似作用
    const assetsToLoad: Asset[] = [
      // BGM和音效 - 路径需要调整为实际的Sounds目录结构
      {
        name: "bgm_main",
        url: "assets/Sounds/BGM/mp3/Scene1.mp3",
        type: "audio",
      },
      {
        name: "vo_welcome",
        url: "assets/Sounds/VO/0001_Max is making a.wav", // 原路径: assets/audio/sfx/welcome_to_game.mp3
        type: "audio",
      },
      {
        name: "vo_0002",
        url: "assets/Sounds/VO/0002_Let’s draw and paint.wav", // 原路径: assets/audio/sfx/welcome_to_game.mp3
        type: "audio",
      },
      {
        name: "sfx_select_color",
        url: "assets/Sounds/SFX/0003_选颜色.wav", // 原路径: assets/audio/sfx/select_a_color.mp3
        type: "audio",
      },
      {
        name: "sfx_apple_pickup",
        url: "assets/Sounds/SFX/0006_摘苹果.wav", // 原路径: assets/audio/sfx/apple_pickup.mp3
        type: "audio",
      },
      {
        name: "sfx_frog_pickup",
        url: "assets/Sounds/SFX/0011_青蛙跳1.wav", // 原路径: assets/audio/sfx/frog_pickup.mp3
        type: "audio",
      },
      {
        name: "sfx_color_red",
        url: "assets/Sounds/SFX/0002_变色.wav", // 原路径: assets/audio/sfx/color_red.mp3
        type: "audio",
        // 注意：未找到颜色特定的音效，使用通用变色音效
      },
      {
        name: "sfx_color_green",
        url: "assets/Sounds/SFX/0002_变色.wav", // 原路径: assets/audio/sfx/color_green.mp3
        type: "audio",
        // 注意：未找到颜色特定的音效，使用通用变色音效
      },
      {
        name: "sfx_color_blue",
        url: "assets/Sounds/SFX/0002_变色.wav", // 原路径: assets/audio/sfx/color_blue.mp3
        type: "audio",
        // 注意：未找到颜色特定的音效，使用通用变色音效
      },
      {
        name: "sfx_color_yellow",
        url: "assets/Sounds/SFX/0002_变色.wav", // 原路径: assets/audio/sfx/color_yellow.mp3
        type: "audio",
        // 注意：未找到颜色特定的音效，使用通用变色音效
      },
      {
        name: "sfx_congrats",
        url: "assets/Sounds/SFX/0010_星星筒.wav", // 原路径: assets/audio/sfx/congratulations.mp3
        type: "audio",
        // 注意：未找到确切的祝贺音效，使用星星筒音效代替
      },
      {
        name: "sfx_frogs_croak",
        url: "assets/Sounds/SFX/0019_青蛙叫.wav", // 原路径: assets/audio/sfx/frogs_croaking.mp3
        type: "audio",
      },
      {
        name: "sfx_board_appear",
        url: "assets/Sounds/SFX/0002_画板.wav", // 原路径: assets/audio/sfx/board_appear.mp3
        type: "audio",
      },
      {
        name: "sfx_board_disappear",
        url: "assets/Sounds/SFX/0005_画线完成.wav", // 原路径: assets/audio/sfx/board_disappear.mp3
        type: "audio",
        // 注意：未找到确切的画板消失音效，使用画线完成音效代替
      },
      // 图片 - 路径需要调整为实际的Arts/Image目录结构
      {
        name: "sky",
        url: "assets/Arts/Image/图层 265底图.png", // 原路径: assets/images/sky.png
        type: "image",
      },
      {
        name: "clouds",
        url: "assets/Arts/Image/图层 269底图.png", // 原路径: assets/images/clouds.png
        type: "image",
        // 注意：未找到确切的云朵图片，使用底图代替
      },
      {
        name: "tree",
        url: "assets/Arts/Image/图层 309苹果树.png", // 原路径: assets/images/tree.png
        type: "image",
      },
      {
        name: "grass",
        url: "assets/Arts/Image/图层 274 拷贝底图.png", // 原路径: assets/images/grass.png
        type: "image",
      },
      {
        name: "bench",
        url: "assets/Arts/Image/长椅 拷贝长椅-小图.png", // 原路径: assets/images/bench.png
        type: "image",
      },
      {
        name: "pond",
        url: "assets/Arts/Image/图层 398 拷贝池塘-小图.png", // 原路径: assets/images/pond.png
        type: "image",
      },
      {
        name: "wildflower",
        url: "assets/Arts/Image/图层 1099花 拷贝 26.png", // 原路径: assets/images/wildflower.png
        type: "image",
      },
      {
        name: "palette_bg",
        url: "assets/Arts/Image/调色盘 拷贝 3调色盘.png", // 原路径: assets/images/palette_bg.png
        type: "image",
      },
      {
        name: "drawing_board_bg",
        url: "assets/Arts/word_board.png", // 原路径: assets/images/drawing_board_bg.png
        type: "image",
      },
      {
        name: "brush_static",
        url: "assets/Arts/Image/组 18画笔.png", // 原路径: assets/images/brush_static.png
        type: "image",
      },
      {
        name: "flower_part_stem",
        url: "assets/Arts/Image/图层 403草-1.png", // 原路径: assets/images/flower_part_stem.png
        type: "image",
      },
      {
        name: "flower_part_leaf1",
        url: "assets/Arts/Image/图层 402草-1.png",
        type: "image",
      },
      {
        name: "flower_part_leaf2",
        url: "assets/Arts/Image/图层 404草-1.png",
        type: "image",
      },
      {
        name: "frog_outline",
        url: "assets/Arts/Image/图层 2211青蛙画.png",
        type: "image",
      },
      {
        name: "frog_mask",
        url: "assets/Arts/Image/青蛙-蓝色 拷贝 12青蛙画.png",
        type: "image",
      },
      {
        name: "frog_overlay",
        url: "assets/Arts/frog_overlay.png",
        type: "image",
      },
      {
        name: "apple_outline",
        url: "assets/Arts/Image/图层 1099花 拷贝 26.png", // 原路径: assets/images/apple_outline.png
        type: "image",
      },
      // Spine角色和对象 - 路径需要调整为实际的spine_animations目录结构
      {
        name: "rabbit_spine",
        url: "assets/spine_animations/spineboy-pma.skel",
        type: "spine",
      },
      {
        name: "tree_spine",
        url: "assets/spine_animations/tree.json",
        type: "spine",
      },
      {
        name: "frog_spine",
        url: "assets/spine_animations/frog.json",
        type: "spine",
      },
      {
        name: "butterfly_spine",
        url: "assets/spine_animations/fly.json",
        type: "spine",
      },
      {
        name: "flower_spine",
        url: "assets/spine_animations/flower.json",
        type: "spine",
      },
      {
        name: "drawing_board_spine",
        url: "assets/spine_animations/paper.json",
        type: "spine",
      },
      // {
      //   name: "palette_spine",
      //   url: "assets/spine_animations/max/palette.json", // 原路径: assets/spine/palette/palette.json
      //   type: "spine",
      //   // 注意：未找到确切的palette.json文件，此处路径可能需要更新
      // },
      // {
      //   name: "brush_anim_spine",
      //   url: "assets/spine_animations/max/brush.json", // 原路径: assets/spine/brush_anim/brush_anim.json
      //   type: "spine",
      //   // 注意：未找到确切的brush.json文件，此处路径可能需要更新
      // },
    ];
    await AssetLoader.loadAssets(assetsToLoad, onProgress);
    onProgress(1); // 确保资源加载部分的进度达到100%
    console.log("所有资源已加载。");

    // 2. 加载任务数据
    try {
      const response = await fetch("assets/config/tasks.json");
      if (!response.ok) {
        throw new Error(`获取task.json失败: ${response.statusText}`);
      }
      const taskData = await response.json();
      // 假设tasks.json有一个顶级"tasks"数组，根据文档
      if (taskData && taskData.tasks) {
        TaskManager.loadTasks(taskData.tasks);
        console.log("任务数据已加载和解析。");
      } else {
        throw new Error("task.json格式不符合预期（缺少'tasks'数组）。");
      }
    } catch (error) {
      console.error("加载任务数据时出错:", error);
      // 处理关键错误 - 可能设置状态为错误状态
      // 目前，我们允许游戏继续到ready状态，但它不会有任务
      // 或者，重新抛出以被React中的更高级别错误处理程序捕获
      // throw error;
    }

    // 3. 初始化AudioManager（Howler.js通常在第一次播放或通过Howler.autoUnlock时使用全局上下文初始化）
    // 这里不需要显式初始化，因为AssetLoader处理声音加载

    // 4. 初始化SceneManager并设置初始场景
    SceneManager.initialize(this.pixiAppInstance);
    await SceneManager.goToScene(initialSceneClass); // 使用传入的初始场景类
    console.log("初始场景已设置。");

    this.currentState = GameState.READY;
    GameEventEmitter.emit("GAME_READY");
    console.log("游戏已准备就绪。");

    // 游戏可以通过UI按钮或自动启动
    // this.startGame();
  }

  public static startGame(): void {
    if (
      this.currentState === GameState.READY ||
      this.currentState === GameState.MENU
    ) {
      console.log("正在启动游戏...");
      this.currentState = GameState.PLAYING;
      AudioManager.playBGM("bgm_main", true);
      TaskManager.startNextTask(); // 开始第一个（或下一个可用）任务
      GameEventEmitter.emit("GAME_START");
    } else {
      console.warn(
        `Game cannot start from current state: ${this.currentState}`
      );
    }
  }

  public static pauseGame(): void {
    if (this.currentState === GameState.PLAYING) {
      this.currentState = GameState.PAUSED;
      this.pixiAppInstance.app.ticker.stop();
      AudioManager.pauseBGM();
      // Howler.pause(); // Pauses all Howler sounds
      GameEventEmitter.emit("GAME_PAUSED");
      console.log("Game PAUSED.");
    }
  }

  public static resumeGame(): void {
    if (this.currentState === GameState.PAUSED) {
      this.currentState = GameState.PLAYING;
      if (this.pixiAppInstance && this.pixiAppInstance.app.ticker) {
        this.pixiAppInstance.app.ticker.start();
      }

      // 不使用 Howler.unmute() 或直接播放，而是使用 AudioManager 的优化恢复方法
      // Howler.pause() 会全局暂停所有声音。对特定声音 ID 使用 Howler.play()
      // 如果声音是通过这种方式暂停的，应该可以恢复它
      // AudioManager.resumeBGM(); // 让 AudioManager 处理背景音乐恢复逻辑

      // 对于可能被浏览器暂停并通过用户交互解锁的通用音频上下文：
      if (Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().catch((e) => console.warn("恢复音频上下文失败", e));
      }
      // 然后，如果背景音乐正在播放，尝试恢复它
      AudioManager.resumeBGM();

      GameEventEmitter.emit("GAME_RESUMED");
      console.log("游戏已恢复。");
    }
  }

  public static update(ticker: Ticker): void {
    // 游戏全局更新可以放在这里，但通常委托给 SceneManager
    if (this.currentState === GameState.PLAYING) {
      SceneManager.update(ticker);
    }
    // 基于 ticker 的其他全局更新
  }
}
