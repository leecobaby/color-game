import * as PIXI from "pixi.js";
import { Howl } from "howler";
// 必须在某处导入 pixi-spine，通常在主游戏文件或 PixiApp 中，
// 以便其资源解析器被注册。
// import 'pixi-spine'; // 或者特定的 spine 版本，如 '@pixi-spine/all-4.1' 或类似版本
// 目前，我们假设它在其他地方处理或类型是全局可用的。
import type { SpineData } from "pixi-spine"; // 假设 pixi-spine 提供了这个类型

export interface Asset {
  name: string;
  url: string;
  // 'type' 可用于自定义逻辑，但 PIXI.Assets 主要使用扩展名或显式加载器解析器。
  // 对于像 Spine 这样的资源，.json 扩展名是关键。对于音频，则取决于 Howler 的集成方式。
  // 我们将专门为 Howler 处理 'audio' 类型，其他类型则由 PIXI.Assets 处理。
  type: "image" | "spine" | "audio" | "font"; // 添加了 font 作为常见的资源类型
  // 特定资源类型的可选元数据，例如 Spine
  data?: any;
}

// 存储加载的 Howl 实例
const loadedAudio: Record<string, Howl> = {};

export class AssetLoader {
  // 如果需要直接访问缓存，可以使用 PIXI.Assets.cache，
  // 但通常首选 PIXI.Assets.get()。

  public static async loadAssets(
    assets: Asset[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const pixiAssetsToLoad: { alias: string; src: string; data?: any }[] = [];
    const audioAssetsToLoad: { name: string; url: string }[] = [];

    for (const asset of assets) {
      if (asset.type === "audio") {
        audioAssetsToLoad.push({ name: asset.name, url: asset.url });
      } else {
        // 对于 PIXI.Assets，'name' 是别名，'url' 是源路径。
        pixiAssetsToLoad.push({
          alias: asset.name,
          src: asset.url,
          data: asset.data,
        });
      }
    }

    let pixiProgress = 0;
    let audioProgress = 0;
    const totalPixiAssets = pixiAssetsToLoad.length;
    const totalAudioAssets = audioAssetsToLoad.length;
    const totalAssets = totalPixiAssets + totalAudioAssets;

    const updateOverallProgress = () => {
      if (onProgress && totalAssets > 0) {
        const overallProgress =
          (pixiProgress * totalPixiAssets + audioProgress * totalAudioAssets) /
          totalAssets;
        onProgress(overallProgress);
      }
    };

    // 加载 Pixi 资源
    if (totalPixiAssets > 0) {
      // 如果尚未添加，则将所有资源添加到 PIXI.Assets 清单中
      // 这允许稍后通过别名加载它们。
      pixiAssetsToLoad.forEach((asset) => {
        try {
          PIXI.Assets.add(asset);
        } catch (e) {
          console.warn(
            `资源 ${asset.alias} 可能已被添加或无效:`, // 中文翻译
            e
          );
        }
      });

      const assetNames = pixiAssetsToLoad.map((a) => a.alias);
      await PIXI.Assets.load(assetNames, (progress) => {
        pixiProgress = progress;
        updateOverallProgress();
      });
    }

    // 使用 Howler 加载音频资源
    if (totalAudioAssets > 0) {
      let loadedAudioCount = 0;
      await Promise.all(
        audioAssetsToLoad.map(
          (asset) =>
            new Promise<void>((resolve, reject) => {
              const sound = new Howl({
                src: [asset.url],
                onload: () => {
                  loadedAudio[asset.name] = sound;
                  loadedAudioCount++;
                  audioProgress = loadedAudioCount / totalAudioAssets;
                  updateOverallProgress();
                  resolve();
                },
                onloaderror: (id, error) => {
                  console.error(
                    `加载音频 ${asset.name} 从 ${asset.url} 失败:`, // 中文翻译
                    error
                  );
                  // 仍然 resolve，这样单个失败的音频不会阻塞所有其他音频
                  loadedAudioCount++; // 计为已处理
                  audioProgress = loadedAudioCount / totalAudioAssets;
                  updateOverallProgress();
                  reject(error); // 或者如果想忽略错误则 resolve
                },
              });
            })
        )
      );
    }
    if (onProgress) onProgress(1); // 确保进度达到 100%
  }

  public static getSpineData(name: string): SpineData {
    // PIXI.Assets.get() 返回加载的资源，对于 Spine 通常是 SpineData。
    const spineAsset = PIXI.Assets.get(name);
    if (!spineAsset) {
      throw new Error(
        `未找到名为 ${name} 的 Spine 数据。请确保已加载。` // 中文翻译
      );
    }
    // 实际类型可能是 ISkeletonData 或类似类型，具体取决于 pixi-spine 版本。
    // 如果已知，则转换为 any 或更具体的类型。
    return spineAsset as SpineData; // 用户之前使用 `any`，SpineData 更具体
  }

  public static getTexture(name: string): PIXI.Texture {
    const texture = PIXI.Assets.get(name);
    if (!texture || !(texture instanceof PIXI.Texture)) {
      throw new Error(
        `未找到名为 ${name} 的纹理，或者它不是 PIXI.Texture。请确保已作为图像加载。` // 中文翻译
      );
    }
    return texture;
  }

  public static getAudio(name: string): Howl {
    const sound = loadedAudio[name];
    if (!sound) {
      throw new Error(`未找到音频 ${name}。请确保已加载。`); // 中文翻译
    }
    return sound;
  }

  // 可选：如果需要，卸载资源
  public static async unloadAssets(assetNames: string[]): Promise<void> {
    // 卸载 Pixi 资源
    await PIXI.Assets.unload(assetNames);

    // 卸载 Howler 资源
    assetNames.forEach((name) => {
      if (loadedAudio[name]) {
        loadedAudio[name].unload();
        delete loadedAudio[name];
      }
    });
  }

  public static unloadAll(): void {
    PIXI.Assets.unloadBundle("all_assets_bundle_placeholder"); // 要求资源在 bundle 中加载
    // 或者，如果不使用 bundle，则遍历 PIXI.Assets.cache 并单独卸载
    // 对于 Howler:
    for (const name in loadedAudio) {
      loadedAudio[name].unload();
      delete loadedAudio[name];
    }
    // PIXI.Assets.reset(); // 重置 PIXI.Assets，卸载所有资源并移除所有加载器。请谨慎使用。
  }
}
