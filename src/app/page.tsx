"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Chat from "@/components/Chat";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [markers, setMarkers] = useState<Array<{ id: string; title: string; subtitle?: string; latitude: number; longitude: number }>>([]);
  const [styleId, setStyleId] = useState<string>("amap://styles/normal");
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">NaviTrip</span>
                <span className="text-gray-600 text-lg font-normal ml-2">智能旅游规划助手</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium">地图样式:</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
            >
              <option value="amap://styles/normal">normal（标准）</option>
              <option value="amap://styles/macaron">macaron（鲜艳）</option>
              <option value="amap://styles/fresh">fresh（清新）</option>
              <option value="amap://styles/blue">blue（蓝系）</option>
              <option value="amap://styles/darkblue">darkblue（深蓝）</option>
              <option value="amap://styles/light">light（亮色）</option>
              <option value="amap://styles/whitesmoke">whitesmoke（清爽）</option>
              <option value="amap://styles/grey">grey（灰阶）</option>
              <option value="amap://styles/dark">dark（暗色）</option>
            </select>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧地图区域 */}
        <div className="flex-1 relative">
          <Map markers={markers} mapStyleId={styleId} className="w-full h-full min-h-[400px]" />
        </div>
        
        {/* 右侧聊天区域 */}
        <div className="w-96 border-l border-gray-200 bg-white flex-shrink-0">
          <Chat onMarkers={setMarkers} />
        </div>
      </div>
    </div>
  );
}
