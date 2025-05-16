"use client";
import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { GameManager } from "../game-back/GameManager";

export default function PixiCanvas({
  width = 1024,
  height = 480,
}: {
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    // 只在客户端渲染
    if (typeof window === "undefined" || !canvasRef.current) return;

    // 创建 Pixi Application
    const app = new Application();

    // 清理函数 - 稍后会返回
    let cleanup = () => {};

    // 异步初始化应用
    (async () => {
      try {
        // 使用新版 API 初始化应用程序
        await app.init({
          width,
          height,
          backgroundColor: 0xf0f0f0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        // 现在使用 app.canvas 替代 app.view
        canvasRef.current?.appendChild(app.canvas);
        appRef.current = app;

        // 初始化游戏管理器
        const gameManager = new GameManager(app);
        gameManagerRef.current = gameManager;

        // 启动游戏
        await gameManager.initialize().catch(console.error);

        // 更新清理函数
        cleanup = () => {
          app.destroy();
          if (canvasRef.current) canvasRef.current.innerHTML = "";
        };
      } catch (error) {
        console.error("初始化 PixiJS 应用失败:", error);
      }
    })();

    // 清理
    return () => cleanup();
  }, [width, height]);

  return (
    <div
      ref={canvasRef}
      style={{ width, height, margin: "0 auto", touchAction: "none" }}
    />
  );
}
