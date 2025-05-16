import * as PIXI from "pixi.js";
import { Spine, TrackEntry } from "@esotericsoftware/spine-pixi-v8";

import { AnimationManager } from "../managers/AnimationManager";
import { AudioManager } from "../managers/AudioManager";

export class Character extends PIXI.Container {
  public spine: Spine | null = null; // 如果加载失败，Spine 可能为 null
  public entityId: string;

  constructor(entityId: string, spineName: string, autoUpdate: boolean = true) {
    super();
    this.entityId = entityId;
    this.label = entityId; // 指定名称，方便在 Pixi 开发工具中调试

    try {
      const skeletonKey = `${spineName}_skel`;
      const atlasKey = `${spineName}_atlas`;

      console.log("atlasKey", PIXI.Assets.get(skeletonKey));

      this.spine = Spine.from({
        skeleton: skeletonKey,
        atlas: atlasKey,
        autoUpdate,
      });
      this.addChild(this.spine);
    } catch (error) {
      console.error(
        `Character: 为 \"${spineName}\" (skeletonKey: ${spineName}_skel, atlasKey: ${spineName}_atlas) 创建 Spine 实例失败 (实体 ID: ${entityId}):`,
        error
      );
    }
  }

  public playAnimation(
    animationName: string,
    loop: boolean,
    onComplete?: (entry: TrackEntry) => void,
    trackIndex: number = 0
  ): TrackEntry | null {
    if (!this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放动画，Spine 对象丢失。`
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
  ): TrackEntry | null {
    if (!this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法添加动画，Spine 对象丢失。`
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
        `Character ${this.entityId}: 无法设置皮肤，Spine 对象丢失。`
      );
      return;
    }
    AnimationManager.setSkin(this.spine, skinName);
  }

  public say(
    soundName: string,
    animationName?: string,
    onSoundComplete?: () => void,
    onAnimationComplete?: (entry: TrackEntry) => void
  ): void {
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, onAnimationComplete);
    } else if (animationName && !this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放 say() 的动画 ${animationName}，Spine 对象丢失。`
      );
    }
    AudioManager.playSFX(soundName, undefined, onSoundComplete);
  }

  public show(
    animationName?: string,
    onComplete?: (entry: TrackEntry) => void
  ): void {
    this.visible = true;
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, onComplete);
    } else if (animationName && !this.spine) {
      console.warn(
        `Character ${this.entityId}: 无法播放显示动画，Spine 对象丢失。`
      );
    }
    // TODO: 如果需要，添加出现时的缓动动画，例如 alpha 淡入
  }

  public hide(
    animationName?: string,
    onComplete?: (entry: TrackEntry) => void
  ): void {
    if (animationName && this.spine) {
      this.playAnimation(animationName, false, (entry) => {
        this.visible = false;
        if (onComplete) onComplete(entry);
      });
    } else {
      if (animationName && !this.spine) {
        console.warn(
          `Character ${this.entityId}: 无法播放隐藏动画，Spine 对象丢失。`
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
