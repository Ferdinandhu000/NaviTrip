"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Chat from "@/components/Chat";
import ThemeController from "@/components/ThemeController";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });



export default function Home() {
  const [markers, setMarkers] = useState<Array<{ id: string; title: string; subtitle?: string; latitude: number; longitude: number }>>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // 统一使用标准地图样式
  const mapStyleId = "amap://styles/normal";

  return (
    <div className="h-screen flex flex-col app-background">
      {/* 跳转链接 - 可访问性 */}
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>
      
      {/* 顶部导航栏 - 增强设计 */}
      <header className="navbar bg-base-100/80 backdrop-blur-xl border-b border-base-300/30 shadow-lg relative" role="banner">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-600/5"></div>
        <div className="navbar-start relative z-10">
          <div className="flex items-center pl-6">
            {/* Logo 图标 */}
            <div className="mr-3 p-2 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">NaviTrip</span>
              </h1>
              <p className="text-lg text-gray-900 dark:text-white font-normal">智能旅游规划助手</p>
            </div>
          </div>
        </div>
        <div className="navbar-end relative z-10 pr-6">
          <div className="flex items-center gap-3">
            <ThemeController />
          </div>
        </div>
      </header>

      {/* 主要内容区域 - 紧凑布局 */}
      <main id="main-content" className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3 lg:gap-4 main-layout" role="main">
        {/* 左侧地图区域 - 简洁设计 */}
        <section className="flex-1 relative group map-container" aria-label="旅游地图展示区域">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-2xl lg:rounded-3xl"></div>
          <div className="relative h-full bg-base-100/30 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-lg overflow-hidden transition-all duration-300">
            <Map 
              markers={markers} 
              mapStyleId={mapStyleId} 
              className="w-full h-full min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] rounded-2xl lg:rounded-3xl" 
            />
          </div>
        </section>
        
        {/* 右侧聊天区域 - 滑动折叠设计 */}
        <section className={`relative flex-shrink-0 chat-container transition-all duration-300 ease-out overflow-hidden ${
          isChatOpen 
            ? 'w-full lg:w-[400px] xl:w-[420px]' 
            : 'w-0 lg:w-0'
        }`} aria-label="AI 旅游助手对话区域">
          <div className={`w-[400px] xl:w-[420px] h-full relative group transition-all duration-300 ease-out ${
            isChatOpen 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-full opacity-0'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-500/5 rounded-2xl lg:rounded-3xl"></div>
            <div className="relative h-full bg-base-100/40 backdrop-blur-lg rounded-2xl lg:rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              {/* 折叠按钮 - 重新设计 */}
              <div className="absolute top-4 left-4 z-20">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="group/btn flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-200/30 dark:border-purple-700/30 rounded-xl px-3 py-2 transition-all duration-200 hover:shadow-md backdrop-blur-sm hover:scale-105 active:scale-95"
                  aria-label="隐藏聊天窗口"
                >
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 group-hover/btn:text-purple-700 dark:group-hover/btn:text-purple-300 transition-colors duration-200">隐藏</span>
                </button>
              </div>

              <Chat onMarkers={setMarkers} />
            </div>
          </div>
        </section>
      </main>
      
      {/* 折叠后的展开按钮 - 固定在右侧边缘 */}
      {!isChatOpen && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
          <button
            onClick={() => setIsChatOpen(true)}
            className="group/expand bg-purple-400 hover:bg-purple-500 text-white rounded-l-2xl pl-3 pr-4 py-6 transition-colors duration-200 hover:pr-5"
            aria-label="展开聊天窗口"
            style={{
              boxShadow: 'none',
              border: 'none',
              outline: 'none'
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              
              {/* AI文字横向排列，助手垂直排列 */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-0">
                  <span className="text-xs font-medium">A</span>
                  <span className="text-xs font-medium">I</span>
                </div>
                <span className="text-xs font-medium">助</span>
                <span className="text-xs font-medium">手</span>
              </div>
              
              {/* 状态指示器 */}
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}