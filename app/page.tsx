"use client"; // GameContainer 需要客户端渲染

import Image from "next/image";
import GameContainer from "../GameContainer"; // 导入 GameContainer

export default function Home() {
  return (
    <GameContainer /> // 渲染 GameContainer
  );
}
