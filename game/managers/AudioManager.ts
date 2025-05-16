import { Howl, Howler } from "howler";
import { AssetLoader } from "./AssetLoader";

interface ActiveSound {
  howl: Howl;
  id: number; // 本次播放的声音实例 ID
}

export class AudioManager {
  private static currentBGM: ActiveSound | null = null;
  private static currentBGMName: string | null = null;
  private static currentBGMVolume: number = 1;
  private static currentBGMLoop: boolean = true;
  private static activeSFX: Map<string, ActiveSound[]> = new Map(); // 用于跟踪同一音效的多个实例

  public static playBGM(
    name: string,
    loop: boolean = true,
    volume: number = 1
  ): void {
    this.stopBGM(); // 停止当前播放的任何背景音乐

    try {
      const sound = AssetLoader.getAudio(name);
      const soundId = sound.play();

      if (typeof soundId === "number") {
        sound.loop(loop, soundId);
        sound.volume(volume, soundId);
        this.currentBGM = { howl: sound, id: soundId };
        this.currentBGMName = name;
        this.currentBGMVolume = volume;
        this.currentBGMLoop = loop;
      } else {
        // Howler v2.2.0+ play() 如果音频上下文被锁定，可以返回一个解析为声音 ID 的 Promise。
        // 如果需要，处理这种情况，例如等待 Promise。
        // 为简单起见，这里我们假设它返回数字或需要用户交互来解锁。
        console.warn(`无法立即播放背景音乐 ${name}。音频上下文可能已锁定。`);
        this.currentBGMName = null;
      }
    } catch (error) {
      console.error(`播放背景音乐 ${name} 时出错:`, error);
      this.currentBGMName = null;
    }
  }

  public static stopBGM(): void {
    if (this.currentBGM) {
      this.currentBGM.howl.stop(this.currentBGM.id);
      this.currentBGM = null;
    }
    this.currentBGMName = null;
  }

  public static resumeBGM(): void {
    if (this.currentBGMName && !this.currentBGM) {
      this.playBGM(
        this.currentBGMName,
        this.currentBGMLoop,
        this.currentBGMVolume
      );
    } else if (
      this.currentBGM &&
      !this.currentBGM.howl.playing(this.currentBGM.id)
    ) {
      this.currentBGM.howl.play(this.currentBGM.id);
    }
  }

  public static getCurrentBGMName(): string | null {
    return this.currentBGMName;
  }

  public static playSFX(
    name: string,
    volume: number = 1,
    onEnd?: () => void
  ): void {
    try {
      const sound = AssetLoader.getAudio(name);
      const soundId = sound.play();

      if (typeof soundId === "number") {
        sound.volume(volume, soundId);
        sound.once(
          "end",
          () => {
            if (onEnd) {
              onEnd();
            }
            // 从 activeSFX 映射中清除
            const sfxInstances = this.activeSFX.get(name);
            if (sfxInstances) {
              const index = sfxInstances.findIndex((s) => s.id === soundId);
              if (index > -1) {
                sfxInstances.splice(index, 1);
                if (sfxInstances.length === 0) {
                  this.activeSFX.delete(name);
                }
              }
            }
          },
          soundId
        );

        // 跟踪活动的音效
        if (!this.activeSFX.has(name)) {
          this.activeSFX.set(name, []);
        }
        this.activeSFX.get(name)?.push({ howl: sound, id: soundId });
      } else {
        console.warn(`无法立即播放音效 ${name}。音频上下文可能已锁定。`);
      }
    } catch (error) {
      console.error(`播放音效 ${name} 时出错:`, error);
    }
  }

  public static stopSFX(name: string): void {
    const sfxInstances = this.activeSFX.get(name);
    if (sfxInstances) {
      sfxInstances.forEach((instance) => instance.howl.stop(instance.id));
      this.activeSFX.delete(name);
    }
  }

  public static stopAllSFX(): void {
    this.activeSFX.forEach((instances, name) => {
      instances.forEach((instance) => instance.howl.stop(instance.id));
    });
    this.activeSFX.clear();
  }

  // 可选：设置全局音量
  public static setGlobalVolume(volume: number): void {
    Howler.volume(volume);
  }

  // 可选：静音/取消静音所有声音
  public static mute(muted: boolean): void {
    Howler.mute(muted);
  }
}
