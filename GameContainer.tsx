import React, { useRef, useEffect, useState } from "react";
import { PixiApp } from "./game/core/PixiApp";
import { GameManager } from "./game/managers/GameManager";
import GameEventEmitter from "./game/utils/GameEventEmitter";
import { MainScene } from "./game/scenes/MainScene";
import { Ticker } from "pixi.js";

const GameContainer: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let pixiInst: PixiApp | null = null;
    let tickerListener: ((ticker: Ticker) => void) | null = null;

    if (canvasRef.current && !canvasRef.current.firstChild) {
      if (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      PixiApp.destroyInstance();

      pixiInst = PixiApp.getInstance({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x6495ed,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      canvasRef.current.appendChild(pixiInst.view);

      GameManager.init(
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
          console.error("Error initializing GameManager:", error);
          setIsLoading(false);
        });

      tickerListener = (ticker: Ticker) => GameManager.update(ticker);
      pixiInst.app.ticker.add(tickerListener);

      const handleResize = () => {
        if (pixiInst) {
          pixiInst.resize(window.innerWidth, window.innerHeight);
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
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default GameContainer;
