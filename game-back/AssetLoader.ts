import "@esotericsoftware/spine-pixi-v8";
import { Assets } from "pixi.js";

// 游戏中需要的资源
export const GAME_ASSETS = {
  // Spine动画
  frogSpine: {
    json: "/assets/spine_animations/frog.json",
    atlas: "/assets/spine_animations/frog.atlas",
    png: "/assets/spine_animations/frog.png",
  },
  flySpine: {
    json: "/assets/spine_animations/fly.json",
    atlas: "/assets/spine_animations/fly.atlas.txt",
    png: "/assets/spine_animations/fly.png",
  },
  flowerSpine: {
    json: "/assets/spine_animations/flower.json",
    atlas: "/assets/spine_animations/flower.atlas.txt",
    png: "/assets/spine_animations/flower.png",
  },
  // 后续可添加其他资源，如音频等
};

// 颜色配置
export const COLORS = {
  green: 0x4caf50,
  blue: 0x2196f3,
  yellow: 0xffeb3b,
  red: 0xf44336,
};

// 关卡配置（用于管理流程）
export const LEVELS = [
  {
    id: "green",
    name: "绿色",
    englishName: "Green",
    spineKey: "frogSpine",
    color: COLORS.green,
  },
  {
    id: "blue",
    name: "蓝色",
    englishName: "Blue",
    spineKey: "flySpine",
    color: COLORS.blue,
  },
  {
    id: "yellow",
    name: "黄色",
    englishName: "Yellow",
    spineKey: "flowerSpine",
    color: COLORS.yellow,
  },
  {
    id: "red",
    name: "红色",
    englishName: "Red",
    spineKey: "frogSpine",
    color: COLORS.red,
  }, // 暂用frog替代
];

// 资源加载函数
export async function loadGameAssets(): Promise<void> {
  try {
    // // 按照正确的格式加载所有资源
    // await Assets.init();

    // 注册所有资源 - 为每个Spine对象注册3个资源（json、atlas、png）
    const spineAssets = Object.entries(GAME_ASSETS).flatMap(([key, asset]) => [
      { alias: `${key}_json`, src: asset.json },
      { alias: `${key}_atlas`, src: asset.atlas },
      { alias: `${key}_png`, src: asset.png },
    ]);

    await Assets.load(spineAssets);
    console.log("所有资源加载完成");
  } catch (error) {
    console.error("资源加载错误:", error);
    throw error;
  }
}
