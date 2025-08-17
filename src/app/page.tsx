"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Chat from "@/components/Chat";
import ThemeController from "@/components/ThemeController";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });



export default function Home() {
  const [markers, setMarkers] = useState<Array<{ id: string; title: string; subtitle?: string; latitude: number; longitude: number }>>([]);
  const [styleId, setStyleId] = useState<string>("amap://styles/normal");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [iconTop, setIconTop] = useState(20);
  const isIconDragging = useRef(false);
  const iconDragOffset = useRef(0);

  // 监听主题变化，自动切换地图样式
  useEffect(() => {
    const updateMapStyle = () => {
      const theme = document.documentElement.getAttribute("data-theme") || "light";
      const newStyle = theme === "dark" ? "amap://styles/darkblue" : "amap://styles/normal";
      setStyleId(newStyle);
    };

    // 初始设置
    updateMapStyle();

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateMapStyle();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);
  
  // 处理折叠后的对话框图标拖动
  const handleIconMouseDown = (e: React.MouseEvent) => {
    isIconDragging.current = true;
    iconDragOffset.current = e.clientY - iconTop;
    
    e.preventDefault();
  };
  
  const handleIconMouseMove = (e: MouseEvent) => {
    if (!isIconDragging.current) return;
    
    const newY = e.clientY - iconDragOffset.current;
    const viewportHeight = window.innerHeight;
    
    // 限制在垂直方向上拖动，并且不能超出视窗范围
    const boundedY = Math.max(24, Math.min(newY, viewportHeight - 72));
    
    setIconTop(boundedY);
    
    e.preventDefault();
  };
  
  const handleIconMouseUp = (e: MouseEvent) => {
    if (!isIconDragging.current) return;
    
    isIconDragging.current = false;
    
    e.preventDefault();
  };
  
  useEffect(() => {
    document.addEventListener('mousemove', handleIconMouseMove);
    document.addEventListener('mouseup', handleIconMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleIconMouseMove);
      document.removeEventListener('mouseup', handleIconMouseUp);
    };
  }, []);

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
              <p className="text-lg text-gray-900 dark:text-gray-100 font-normal">智能旅游规划助手</p>
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
              mapStyleId={styleId} 
              className="w-full h-full min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] rounded-2xl lg:rounded-3xl" 
            />
          </div>
        </section>
        
        {/* 右侧聊天区域 - 可折叠设计 */}
        {isChatOpen ? (
          <section className="w-full lg:w-[400px] xl:w-[420px] relative group flex-shrink-0 chat-container" aria-label="AI 旅游助手对话区域">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-purple-500/5 rounded-2xl lg:rounded-3xl"></div>
            <div className="relative h-full bg-base-100/40 backdrop-blur-lg rounded-2xl lg:rounded-3xl shadow-lg overflow-hidden transition-all duration-300">
              {/* 添加折叠按钮 */}
              <div className="absolute top-2 left-2 z-10 group">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="btn btn-xs btn-circle btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-100/50 transition-all duration-200"
                  aria-label="折叠聊天窗口"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* 自定义Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-base-300/90 text-base-content text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap backdrop-blur-sm">
                  点击折叠聊天窗口
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-base-300/90"></div>
                </div>
              </div>

              <Chat onMarkers={setMarkers} />
            </div>
          </section>
        ) : null}
      </main>
      
      {/* 折叠后的对话框图标 - 可拖动 */}
      {!isChatOpen && (
        <div 
          className="fixed right-4 bg-base-100/90 backdrop-blur-lg shadow-lg rounded-2xl p-3 cursor-grab border border-base-300/50 hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
          style={{ 
            top: `${iconTop}px`,
            cursor: 'grab',
            userSelect: 'none'
          }}
          onMouseDown={handleIconMouseDown}
          onClick={() => setIsChatOpen(true)}
          aria-label="打开聊天窗口"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-base-content hidden sm:block mr-1">AI助手</span>
          </div>
          
          {/* 悬停提示 */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-base-300/90 text-base-content text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap backdrop-blur-sm">
            点击打开聊天窗口
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-base-300/90"></div>
          </div>
        </div>
      )}
    </div>
  );
}