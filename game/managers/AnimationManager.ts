// 假设你已经安装了 pixi-spine，例如通过 npm install @pixi-spine/all-4.1 (针对 Spine 4.1)
// 并且 TypeScript 正确识别了其类型。
// 请确保根据你的 pixi-spine 版本和设置从正确的路径导入 Spine。
import {
  Spine,
  IAnimationState,
  ITrackEntry,
  IEventData,
  ISkeleton,
} from "pixi-spine";

// 为清晰起见，重新定义一个更简单的监听器结构，匹配常见的 pixi-spine 用法。
// pixi-spine 中的 IAnimationStateListener 接口可能更复杂。
interface AnimationStateListener {
  event?: (entry: ITrackEntry, event: IEventData) => void;
  complete?: (entry: ITrackEntry) => void;
  start?: (entry: ITrackEntry) => void;
  end?: (entry: ITrackEntry) => void;
  dispose?: (entry: ITrackEntry) => void;
  interrupted?: (entry: ITrackEntry) => void;
}

export class AnimationManager {
  public static playAnimation(
    spineEntity: Spine,
    animationName: string,
    loop: boolean,
    trackIndex: number = 0
  ): ITrackEntry | null {
    if (
      !spineEntity ||
      !spineEntity.state ||
      !spineEntity.skeleton.data.findAnimation(animationName)
    ) {
      console.warn(
        `AnimationManager: 在骨骼数据中未找到动画 "${animationName}" 或 spine 实体/状态对于`,
        spineEntity,
        ` 无效`
      );
      return null;
    }
    return spineEntity.state.setAnimation(trackIndex, animationName, loop);
  }

  public static addAnimation(
    spineEntity: Spine,
    animationName: string,
    loop: boolean,
    trackIndex: number = 0,
    delay: number = 0
  ): ITrackEntry | null {
    if (
      !spineEntity ||
      !spineEntity.state ||
      !spineEntity.skeleton.data.findAnimation(animationName)
    ) {
      console.warn(
        `AnimationManager: 未找到动画 "${animationName}" 或 spine 实体对于 addAnimation 无效。`
      );
      return null;
    }
    return spineEntity.state.addAnimation(
      trackIndex,
      animationName,
      loop,
      delay
    );
  }

  public static setSkin(spineEntity: Spine, skinName: string): void {
    if (!spineEntity || !spineEntity.skeleton) {
      console.warn("AnimationManager: Spine 实体或骨架对于 setSkin 无效。");
      return;
    }
    try {
      spineEntity.skeleton.setSkinByName(skinName);
      spineEntity.skeleton.setSlotsToSetupPose(); // 更改皮肤后将插槽重置为设置姿势
    } catch (e) {
      console.error(`AnimationManager: 设置皮肤 "${skinName}" 时出错:`, e);
    }
  }

  public static getCurrentAnimationName(
    spineEntity: Spine,
    trackIndex: number = 0
  ): string | null {
    if (!spineEntity || !spineEntity.state) {
      console.warn(
        "AnimationManager: Spine 实体或状态对于 getCurrentAnimationName 无效。"
      );
      return null;
    }
    const currentTrackEntry = spineEntity.state.getCurrent(trackIndex);
    return currentTrackEntry ? currentTrackEntry.animation.name : null;
  }

  /**
   * 监听 Spine 动画中触发的特定自定义事件。
   * @param spineEntity Spine 实例。
   * @param eventName 要监听的事件名称。
   * @param callback 事件发生时的回调函数。
   */
  public static listenToAnimationEvent(
    spineEntity: Spine,
    eventName: string,
    callback: (entry: ITrackEntry, event: IEventData) => void
  ): AnimationStateListener {
    if (!spineEntity || !spineEntity.state) {
      console.warn(
        "AnimationManager: Spine 实体或状态对于 listenToAnimationEvent 无效。"
      );
      // 如果在没有有效实体的情况下调用，则返回一个虚拟监听器以避免错误
      return { event: () => {} };
    }
    const listener: AnimationStateListener = {
      event: (entry: ITrackEntry, event: IEventData) => {
        if (event.data.name === eventName) {
          callback(entry, event);
        }
      },
    };
    spineEntity.state.addListener(listener);
    return listener; // 返回监听器，以便以后需要时可以将其移除
  }

  /**
   * 当特定动画完成时执行回调。
   * @param spineEntity Spine 实例。
   * @param animationName 等待完成的动画名称。
   * @param callback 动画完成时的回调函数。
   * @param once 如果为 true，则在第一次完成后移除监听器。默认为 true。
   * @param trackIndex 要监视的轨道索引。如果未通过 animationName 检查指定，则默认为任何轨道。
   */
  public static onAnimationComplete(
    spineEntity: Spine,
    animationName: string, // 可以为 null 以监听轨道上任何动画的完成
    callback: (entry: ITrackEntry) => void,
    once: boolean = true
    // trackIndex?: number // 可选：如果你想非常具体地指定用于通用完成的轨道
  ): AnimationStateListener {
    if (!spineEntity || !spineEntity.state) {
      console.warn(
        "AnimationManager: Spine 实体或状态对于 onAnimationComplete 无效。"
      );
      return { complete: () => {} };
    }

    const listener: AnimationStateListener = {
      complete: (entry: ITrackEntry) => {
        // 如果提供了 animationName，则仅针对该动画触发。
        // 如果 entry.trackIndex 与指定的 trackIndex 匹配（如果提供）
        if (animationName === null || entry.animation.name === animationName) {
          callback(entry);
          if (once) {
            spineEntity.state.removeListener(listener);
          }
        }
      },
    };
    spineEntity.state.addListener(listener);
    return listener;
  }

  /**
   * 从动画状态中移除先前添加的监听器。
   * @param spineEntity Spine 实例。
   * @param listener 由 addListener 方法返回的监听器对象。
   */
  public static removeListener(
    spineEntity: Spine,
    listener: AnimationStateListener
  ): void {
    if (spineEntity && spineEntity.state && listener) {
      spineEntity.state.removeListener(listener);
    }
  }
}
