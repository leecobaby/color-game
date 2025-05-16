import * as PIXI from "pixi.js";
import { Howl } from "howler";
// 必须在某处导入 pixi-spine，通常在主游戏文件或 PixiApp 中，
// 以便其资源解析器被注册。
// import 'pixi-spine'; // 或者特定的 spine 版本，如 '@pixi-spine/all-4.1' 或类似版本
// 目前，我们假设它在其他地方处理或类型是全局可用的。

export interface Asset {
  name: string; // 此名称将用作 PIXI.Assets 中的别名，或用于派生 Spine 资源的别名
  url: string;
  // 'type' 可用于自定义逻辑，但 PIXI.Assets 主要使用扩展名或显式加载器解析器。
  // 对于像 Spine 这样的资源，.json 扩展名是关键。对于音频，则取决于 Howler 的集成方式。
  // 我们将专门为 Howler 处理 'audio' 类型，其他类型则由 PIXI.Assets 处理。
  type: "image" | "spine" | "audio" | "font";
  // 对于 type: "spine", url 应指向 .json 或 .skel 文件。
  // .atlas 文件将被假定与 skeleton 文件同名（除了扩展名）并位于同一目录中。
  data?: any; // 可选的元数据，与 PIXI.Assets.add 的 data 字段对应
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
    const pixiAssetEntries: { alias: string; src: string; data?: any }[] = [];
    const audioAssetsToLoad: { name: string; url: string }[] = [];

    for (const asset of assets) {
      if (asset.type === "audio") {
        audioAssetsToLoad.push({ name: asset.name, url: asset.url });
      } else if (asset.type === "spine") {
        // Spine 资源需要加载 skeleton 文件和 atlas 文件
        // asset.name 将作为基础别名
        // asset.url 指向 skeleton 文件 (.json 或 .skel)

        const skeletonAlias = `${asset.name}_skel`; // 例如 'bunny_skel'
        const atlasAlias = `${asset.name}_atlas`; // 例如 'bunny_atlas'

        // 推断 atlas 文件的路径
        // 将 .json 或 .skel 替换为 .atlas
        const atlasUrl = asset.url.replace(/\.(json|skel)$/i, ".atlas");
        if (atlasUrl === asset.url) {
          console.warn(
            `AssetLoader: 无法从 ${asset.url} 推断 Spine atlas 文件的路径。跳过 ${asset.name} 的 atlas 加载。`
          );
        }

        pixiAssetEntries.push({
          alias: skeletonAlias,
          src: asset.url,
          data: asset.data, // 传递任何附加数据
        });
        pixiAssetEntries.push({
          alias: atlasAlias,
          src: atlasUrl,
          // data 通常不用于 atlas 文件本身，但为了以防万一
          data: asset.data
            ? { ...asset.data, spineAtlas: true }
            : { spineAtlas: true },
        });
      } else {
        // 对于其他 PIXI.Assets (image, font)
        pixiAssetEntries.push({
          alias: asset.name,
          src: asset.url,
          data: asset.data,
        });
      }
    }

    let pixiProgress = 0;
    let audioProgress = 0;
    const totalPixiAssets = pixiAssetEntries.length; // 现在基于条目数，而不是原始资源数
    const totalAudioAssets = audioAssetsToLoad.length;
    const totalOperations = totalPixiAssets + totalAudioAssets; // 总操作数

    const updateOverallProgress = () => {
      if (onProgress && totalOperations > 0) {
        // 计算已完成的 pixi 操作和音频操作的加权进度
        // 注意：PIXI.Assets.load 的 progress 是 0-1 范围内的已加载资源数/总资源数的比例
        // 我们这里有多个 PIXI.Assets.add 调用，然后一个 PIXI.Assets.load 调用
        // 进度应该反映加载操作本身
        const completedPixiOps = pixiProgress * totalPixiAssets;
        const completedAudioOps = audioProgress * totalAudioAssets;
        const overallProgress =
          (completedPixiOps + completedAudioOps) / totalOperations;
        onProgress(overallProgress);
      }
    };

    // 加载 Pixi 资源
    if (totalPixiAssets > 0) {
      pixiAssetEntries.forEach((entry) => {
        try {
          // 确保别名是唯一的，如果 PIXI.Assets.add 不处理重复添加的话
          // 但通常 PIXI.Assets.add 可以安全地多次调用相同的别名和 src（它会覆盖或忽略）
          PIXI.Assets.add(entry);
        } catch (e) {
          console.warn(`资源 ${entry.alias} 可能已被添加或无效:`, e);
        }
      });

      const assetAliasesToLoad = pixiAssetEntries.map((entry) => entry.alias);
      await PIXI.Assets.load(assetAliasesToLoad, (progress) => {
        // progress 是基于 assetAliasesToLoad 中项目数量的进度 (0 到 1)
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
                    `加载音频 ${asset.name} 从 ${asset.url} 失败:`,
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
      ).catch((error) => {
        console.warn("一个或多个音频资源加载失败，但加载过程将继续。", error);
      });
    }
    if (onProgress) onProgress(1); // 确保进度达到 100%
  }

  public static getTexture(name: string): PIXI.Texture {
    const texture = PIXI.Assets.get(name);
    if (!texture || !(texture instanceof PIXI.Texture)) {
      throw new Error(
        `未找到名为 ${name} 的纹理，或者它不是 PIXI.Texture。请确保已作为图像加载。`
      );
    }
    return texture;
  }

  public static getAudio(name: string): Howl {
    const sound = loadedAudio[name];
    if (!sound) {
      throw new Error(`未找到音频 ${name}。请确保已加载。`);
    }
    return sound;
  }

  // 可选：如果需要，卸载资源
  public static async unloadAssets(assetNames: string[]): Promise<void> {
    // 对于Spine资源，需要同时卸载 _skel 和 _atlas 别名
    const allAliasesToUnload: string[] = [];
    for (const name of assetNames) {
      // 假设如果 name 是一个spine资源的基础名，我们需要推断出 _skel 和 _atlas
      // 但更安全的是，调用者应该知道确切的别名。
      // 为了简单起见，这里我们只卸载提供的名字。
      // 如果一个名字是 'bunny' (spine基础名), 它不会自动卸载 'bunny_skel'。
      // 调用者在卸载时需要更明确。
      // 或者，我们可以检查 PIXI.Assets.cache 中是否存在 name_skel 等。
      allAliasesToUnload.push(name);
      // 如果要智能卸载 Spine 资源，需要一种方法来识别它们
      // 并添加对应的 _skel 和 _atlas 别名。
      // 例如，检查 PIXI.Assets.get(name + "_skel") 是否存在。
      if (PIXI.Assets.get(name + "_skel")) {
        allAliasesToUnload.push(name + "_skel");
      }
      if (PIXI.Assets.get(name + "_atlas")) {
        allAliasesToUnload.push(name + "_atlas");
      }
    }
    // 去重
    const uniqueAliases = [...new Set(allAliasesToUnload)];
    if (uniqueAliases.length > 0) {
      await PIXI.Assets.unload(uniqueAliases);
    }

    // 卸载 Howler 资源 (基于原始资源名称)
    assetNames.forEach((name) => {
      if (loadedAudio[name]) {
        loadedAudio[name].unload();
        delete loadedAudio[name];
      }
    });
  }

  public static async unloadAll(): Promise<void> {
    // 卸载所有 PIXI 资源。收集所有已知的别名。
    // PIXI.Assets.cache 包含所有缓存的资源，我们可以迭代它来获取所有别名，
    // 但 PIXI.Assets.unloadBundle('*') 或 PIXI.Assets.reset() 可能更简单。
    // 然而，没有一个通用的 'unload all' 捆绑包名，除非用户自己定义。
    // PIXI.Assets.reset() 会移除加载器等，可能过于激进。
    // 最安全的方法是迭代已知的 PIXI 资源并卸载它们。
    // 但由于我们通过 PIXI.Assets.add() 添加，所以可以调用 PIXI.Assets.unload(keys)。
    // 我们需要获取所有已添加资源的键。

    // 这是一个简化的版本，假设我们没有一个明确的列表。
    // 在实际应用中，你可能需要跟踪所有加载的别名。
    // PIXI.Assets.cache.getAliases() // 这个方法不存在
    // 我们可以尝试卸载在 pixiAssetEntries 中添加的别名，但这需要 AssetLoader 实例来存储它们。
    // 目前，我们只能卸载我们明确知道的音频。
    // 对于PIXI资源，如果没有全局列表，卸载所有可能会复杂。
    // PIXI.Assets.resolver.getBundleIds() 或类似的东西可能会有帮助，但没有标准方法。

    // 卸载 Howler 资源
    for (const name in loadedAudio) {
      loadedAudio[name].unload();
      delete loadedAudio[name];
    }
    // 对于 PIXI 资源，如果没有一个中心化的列表或 bundle，
    // 可能需要手动跟踪或依赖 PIXI.Assets.reset() (如果适用)。
    // 为了安全，我们不调用 reset()，除非明确指示。
    // await PIXI.Assets.unload([]); // 如果有一个所有已加载别名的列表，可以在这里使用。
    console.warn(
      "AssetLoader.unloadAll() for PIXI assets is partially implemented. Only audio is fully unloaded. For PIXI assets, consider using PIXI.Assets.reset() or manage aliases explicitly."
    );
  }
}
