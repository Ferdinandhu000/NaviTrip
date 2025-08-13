"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Chat from "@/components/Chat";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [markers, setMarkers] = useState<Array<{ id: string; title: string; subtitle?: string; latitude: number; longitude: number }>>([]);
  const [styleId, setStyleId] = useState<string>("amap://styles/macaron");
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">AI 旅游规划</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium">地图样式:</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
            >
              <option value="amap://styles/macaron">macaron（鲜艳）</option>
              <option value="amap://styles/fresh">fresh（清新）</option>
              <option value="amap://styles/blue">blue（蓝系）</option>
              <option value="amap://styles/darkblue">darkblue（深蓝）</option>
              <option value="amap://styles/light">light（亮色）</option>
              <option value="amap://styles/whitesmoke">whitesmoke（清爽）</option>
              <option value="amap://styles/grey">grey（灰阶）</option>
              <option value="amap://styles/dark">dark（暗色）</option>
              <option value="amap://styles/normal">normal（标准）</option>
            </select>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧地图区域 */}
        <div className="flex-1 relative">
          <Map markers={markers} mapStyleId={styleId} className="w-full h-full" />
        </div>
        
        {/* 右侧聊天区域 */}
        <div className="w-96 border-l border-gray-200 bg-white flex-shrink-0">
          <Chat onMarkers={setMarkers} />
        </div>
      </div>
    </div>
  );
}
