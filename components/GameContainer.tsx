import { Ticker } from "pixi.js";
import React, { useRef, useEffect, useState } from "react";

import { PixiApp } from "@/game/core/PixiApp";
import { GameManager } from "@/game/managers/GameManager";
import GameEventEmitter from "@/game/utils/GameEventEmitter";
import { MainScene } from "@/game/scenes/MainScene";

const GameContainer: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let pixiInst: PixiApp | null = null;
    let tickerListener: ((ticker: Ticker) => void) | null = null;

    const initPixiApp = async () => {
      if (canvasRef.current && !canvasRef.current.firstChild) {
        if (canvasRef.current.firstChild) {
          canvasRef.current.removeChild(canvasRef.current.firstChild);
        }
        PixiApp.destroyInstance();

        // 获取canvas容器的尺寸
        const canvasWidth = canvasRef.current.clientWidth;
        const canvasHeight = canvasRef.current.clientHeight;

        // 使用异步方法初始化PixiApp
        pixiInst = await PixiApp.getInstanceAsync({
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: 0x6495ed,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });
        console.log("pixiInst初始化完成", pixiInst);

        if (canvasRef.current) {
          canvasRef.current.appendChild(pixiInst.canvas);
        }

        // 使用初始化完成的PixiApp实例初始化GameManager
        await GameManager.init(
          pixiInst,
          (progress) => {
            setLoadingProgress(progress);
          },
          MainScene
        )
          .then(() => {
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("初始化GameManager时出错:", error);
            setIsLoading(false);
          });

        // 添加ticker监听器
        tickerListener = (ticker: Ticker) => GameManager.update(ticker);
        pixiInst.app.ticker.add(tickerListener);

        // 设置窗口大小调整处理
        const handleResize = () => {
          if (pixiInst && canvasRef.current) {
            const newWidth = canvasRef.current.clientWidth;
            const newHeight = canvasRef.current.clientHeight;
            pixiInst.resize(newWidth, newHeight);
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (pixiInst && tickerListener) {
            pixiInst.app.ticker.remove(tickerListener);
          }
          GameEventEmitter.removeAllListeners();
          PixiApp.destroyInstance();
        };
      }
    };

    // 执行异步初始化
    initPixiApp();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.9)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2em",
            zIndex: 100,
          }}
        >
          <div>[图片：可爱的小兔子加载图标]</div>
          <div>正在加载资源... {Math.round(loadingProgress * 100)}%</div>
          <div
            style={{
              width: "50%",
              backgroundColor: "#555",
              borderRadius: "5px",
              marginTop: "10px",
            }}
          >
            <div
              style={{
                width: `${loadingProgress * 100}%`,
                height: "20px",
                backgroundColor: "#4CAF50",
                borderRadius: "5px",
              }}
            ></div>
          </div>
        </div>
      )}
      <div ref={canvasRef} className="w-3/4 h-3/4 mx-auto touch-none" />
    </div>
  );
};

export default GameContainer;
