import * as PIXI from "pixi.js";
import { AssetLoader } from "../managers/AssetLoader";

export class ComplexFlower extends PIXI.Container {
  private swayingAnimation: boolean = false;
  private swayingAngle: number = 0;
  private swayingSpeed: number = 0;
  private swayingAmplitude: number = 0;

  constructor(
    label: string,
    options: {
      stemTexture: string;
      leafTextures: string[];
      leafPositions?: {
        x: number;
        y: number;
        angle?: number;
        scale?: number;
      }[];
    }
  ) {
    super();
    this.label = label;

    // 创建茎干
    const stem = new PIXI.Sprite(AssetLoader.getTexture(options.stemTexture));
    stem.anchor.set(0.5, 1); // 底部中心作为锚点
    this.addChild(stem);

    // 创建叶片
    options.leafTextures.forEach((textureName, index) => {
      const leaf = new PIXI.Sprite(AssetLoader.getTexture(textureName));
      leaf.anchor.set(0.5, 0.5);

      // 设置位置、旋转、缩放（如果提供）
      const positionData = options.leafPositions?.[index] || { x: 0, y: 0 };
      leaf.position.set(positionData.x, positionData.y);
      if (positionData.angle !== undefined) {
        leaf.angle = positionData.angle;
      }
      if (positionData.scale !== undefined) {
        leaf.scale.set(positionData.scale);
      }

      this.addChild(leaf);
    });

    // 创建花朵
    // const flower = new PIXI.Sprite(
    //   AssetLoader.getTexture(options.flowerTexture)
    // );
    // flower.anchor.set(0.5, 0.5);
    // flower.position.set(0, -stem.height * 0.9); // 设置在茎的顶部
    // this.addChild(flower);

    // 设置整体锚点
    this.pivot.set(0, 0);
  }

  startSwaying(amplitude: number = 3, periodMs: number = 3000): void {
    this.swayingAnimation = true;
    this.swayingAmplitude = amplitude;
    this.swayingSpeed = (Math.PI * 2) / periodMs; // 计算角速度
    this.swayingAngle = 0;
  }

  stopSwaying(): void {
    this.swayingAnimation = false;
    this.angle = 0; // 重置角度
  }

  update(deltaMS: number): void {
    if (this.swayingAnimation) {
      this.swayingAngle += this.swayingSpeed * deltaMS;
      // 使用正弦函数生成摇摆运动
      this.angle = Math.sin(this.swayingAngle) * this.swayingAmplitude;
    }
  }
}
