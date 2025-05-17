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
  const [showStartButton, setShowStartButton] = useState(true);

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

  const handleStartGame = () => {
    setShowStartButton(false);
    GameManager.startGame();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/90 text-white flex flex-col justify-center items-center text-2xl z-10">
          <div>[图片：可爱的小兔子加载图标]</div>
          <div>正在加载资源... {Math.round(loadingProgress * 100)}%</div>
          <div className="w-1/2 bg-gray-600 rounded-md mt-2.5">
            <div
              className="h-5 bg-green-500 rounded-md"
              style={{ width: `${loadingProgress * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {!isLoading && showStartButton && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            开始游戏
          </button>
        </div>
      )}

      <div
        ref={canvasRef}
        className="w-7xl h-[592px] mx-auto mt-20 touch-none"
      />
    </div>
  );
};

export default GameContainer;
