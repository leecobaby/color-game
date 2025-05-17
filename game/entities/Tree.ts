import * as PIXI from "pixi.js";
import { Spine, TrackEntry } from "@esotericsoftware/spine-pixi-v8";

import { AnimationManager } from "../managers/AnimationManager";
import { AudioManager } from "../managers/AudioManager";
import GameEventEmitter from "../utils/GameEventEmitter";

export class Tree extends PIXI.Container {
  private readonly IDLE_ANIM = "idle";
  private readonly WIND_ANIM = "wind";
  private readonly DROP_APPLE_ANIM = "drop_apple";
  private readonly SHAKE_ANIM = "shake";

  public entityId: string;
  public spine: Spine | null = null;
  private apples: PIXI.Container[] = [];
  private hasApples: boolean = true;

  constructor(id: string) {
    super();
    this.entityId = id;
    this.label = id; // 用于在DevTools中识别

    // 初始化Spine对象
    this.initSpine();

    // 监听交互事件
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.onTreeClick, this);
  }

  /**
   * 初始化Spine对象
   */
  private initSpine(): void {
    try {
      const skeletonKey = "tree_spine_skel";
      const atlasKey = "tree_spine_atlas";

      this.spine = Spine.from({
        skeleton: skeletonKey,
        atlas: atlasKey,
      });

      if (this.spine) {
        this.addChild(this.spine);
        // 打印所有动画名
        console.log(
          "tree_spine_skel",
          this.spine.state.data.skeletonData.animations
        );
        // 默认播放idle动画
        this.playIdle();
      } else {
        console.error(`Tree ${this.entityId}: 无法创建Spine实例，spine为null`);
      }
    } catch (error) {
      console.error(`Tree ${this.entityId}: 创建Spine实例失败:`, error);
      this.spine = null;
    }
  }

  /**
   * 播放树的空闲动画
   */
  public playIdle(): void {
    this.playAnimation("idle_tree", true);
  }

  /**
   * 播放风吹动画
   * @param onComplete 动画完成后的回调
   */
  public playWind(onComplete?: (entry: TrackEntry) => void): void {
    this.playAnimation(this.WIND_ANIM, false, onComplete);
  }

  /**
   * 播放掉落苹果动画
   * @param onComplete 动画完成后的回调
   */
  public dropApple(onComplete?: (entry: TrackEntry) => void): void {
    if (this.hasApples) {
      AudioManager.playSFX("sfx_apple_pickup");
      this.playAnimation(this.DROP_APPLE_ANIM, false, (entry) => {
        this.hasApples = false;
        if (onComplete) onComplete(entry);

        // 通知游戏事件系统苹果已掉落
        GameEventEmitter.emit("APPLE_DROPPED", {
          treeId: this.entityId,
        });
      });
    } else {
      // 如果没有苹果了，只是摇晃一下
      this.shake(onComplete);
    }
  }

  /**
   * 播放摇晃动画
   * @param onComplete 动画完成后的回调
   */
  public shake(onComplete?: (entry: TrackEntry) => void): void {
    this.playAnimation(this.SHAKE_ANIM, false, (entry) => {
      // 摇晃后恢复idle动画
      this.playIdle();
      if (onComplete) onComplete(entry);
    });
  }

  /**
   * 播放动画的通用方法
   * @param animationName 动画名称
   * @param loop 是否循环
   * @param onComplete 动画完成回调
   * @param trackIndex 轨道索引
   */
  private playAnimation(
    animationName: string,
    loop: boolean,
    onComplete?: (entry: TrackEntry) => void,
    trackIndex: number = 0
  ): TrackEntry | null {
    if (!this.spine) {
      console.warn(`Tree ${this.entityId}: 无法播放动画，Spine对象丢失。`);
      return null;
    }

    const trackEntry = AnimationManager.playAnimation(
      this.spine,
      animationName,
      loop,
      trackIndex
    );

    if (trackEntry && onComplete) {
      AnimationManager.onAnimationComplete(
        this.spine,
        animationName,
        (entry) => {
          if (entry.trackIndex === trackEntry.trackIndex) {
            onComplete(entry);
          }
        },
        true
      );
    }

    return trackEntry;
  }

  /**
   * 处理点击树的事件
   */
  private onTreeClick(): void {
    if (this.hasApples) {
      this.dropApple();
    } else {
      this.shake();
    }
  }

  /**
   * 重置树的状态（恢复苹果）
   */
  public reset(): void {
    this.hasApples = true;
    this.playIdle();
  }

  /**
   * 更新方法，可由场景的update调用
   * @param delta 帧间隔
   */
  public update(delta: number): void {
    // 可以在这里添加需要每帧更新的逻辑
  }
}
