import * as PIXI from "pixi.js";
import { Spine, ITrackEntry } from "pixi-spine"; // 确保导入 Spine 和 ITrackEntry
import { AssetLoader } from "../managers/AssetLoader";
import { AnimationManager } from "../managers/AnimationManager";
import { AudioManager } from "../managers/AudioManager";

export class Character extends PIXI.Container {
  public spine: Spine | null = null; // 如果加载失败，Spine 可能为 null
  public entityId: string;

  constructor(entityId: string, spineName: string, autoUpdate: boolean = true) {
    super();
    this.entityId = entityId;
    this.name = entityId; // 指定名称，方便在 Pixi 开发工具中调试

    try {
      const spineData = AssetLoader.getSpineData(spineName);
      if (!spineData) {
        // AssetLoader.getSpineData 在找不到时应该抛出错误，但再次检查
        console.error(
          `Character: 未找到 "${spineName}" 的 Spine 数据！实体 ID: ${entityId}` // 中文翻译
        );
        return; // 如果 Spine 数据丢失，则提前退出
      }
      this.spine = new Spine(spineData);
      this.spine.autoUpdate = autoUpdate; // 通过构造函数控制 autoUpdate
      this.addChild(this.spine);
    } catch (error) {
      console.error(
        `Character: 为 "${spineName}" 创建 Spine 实例失败 (实体 ID: ${entityId}):`, // 中文翻译
        error
      );
      // this.spine 保持为 null
    }
  }

  public playAnimation(
    animationName: string,
    loop: boolean,
    onComplete?: (entry: ITrackEntry) => void,
    trackIndex: number = 0
  ): ITrackEntry | null {
    if (!this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放动画，Spine 对象丢失。` // 中文翻译
      );
      return null;
    }
    const trackEntry = AnimationManager.playAnimation(
      this.spine,
      animationName,
      loop,
      trackIndex
    );
    if (trackEntry && onComplete) {
      // 使用更稳健的方式处理特定轨道条目的完成
      const listener = AnimationManager.onAnimationComplete(
        this.spine,
        animationName,
        (entry) => {
          if (entry.trackIndex === trackEntry.trackIndex) {
            // 确保是相同的轨道和动画
            onComplete(entry);
            // 如果 `once` 为 true (默认值)，onAnimationComplete 会移除监听器
          }
        },
        true
      ); // `once` 默认为 true
    }
    return trackEntry;
  }

  public addAnimation(
    animationName: string,
    loop: boolean,
    delay: number = 0,
    trackIndex: number = 0
  ): ITrackEntry | null {
    if (!this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法添加动画，Spine 对象丢失。` // 中文翻译
      );
      return null;
    }
    return AnimationManager.addAnimation(
      this.spine,
      animationName,
      loop,
      trackIndex,
      delay
    );
  }

  public setSkin(skinName: string): void {
    if (!this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法设置皮肤，Spine 对象丢失。` // 中文翻译
      );
      return;
    }
    AnimationManager.setSkin(this.spine, skinName);
  }

  public say(
    soundName: string,
    animationName?: string,
    onSoundComplete?: () => void,
    onAnimationComplete?: (entry: ITrackEntry) => void
  ): void {
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, onAnimationComplete);
    } else if (animationName && !this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放 say() 的动画 ${animationName}，Spine 对象丢失。` // 中文翻译
      );
    }
    AudioManager.playSFX(soundName, undefined, onSoundComplete);
  }

  public show(
    animationName?: string,
    onComplete?: (entry: ITrackEntry) => void
  ): void {
    this.visible = true;
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, onComplete);
    } else if (animationName && !this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放显示动画，Spine 对象丢失。` // 中文翻译
      );
    }
    // TODO: 如果需要，添加出现时的缓动动画，例如 alpha 淡入
  }

  public hide(
    animationName?: string,
    onComplete?: (entry: ITrackEntry) => void
  ): void {
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, (entry) => {
        this.visible = false;
        if (onComplete) onComplete(entry);
      });
    } else {
      if (animationName && !this.spine) {
        console.warn(
          `Character ${this.entityId}: 无法播放隐藏动画，Spine 对象丢失。` // 中文翻译
        );
      }
      this.visible = false;
      // 如果提供了 onComplete 但没有动画，则立即调用它。
      // 但是，如果 onComplete 与动画绑定，这可能是意外的。
      // 考虑 onComplete 是否只应在 animationName 存在时调用。
    }
    // TODO: 如果需要，添加消失时的缓动动画，例如 alpha 淡出
  }

  // 获取轨道上当前动画名称的实用工具
  public getCurrentAnimationName(trackIndex: number = 0): string | null {
    if (!this.spine) return null;
    return AnimationManager.getCurrentAnimationName(this.spine, trackIndex);
  }
}
