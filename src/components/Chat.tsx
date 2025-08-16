"use client";
import { useState } from "react";

// 定义类型接口
interface PoiData {
  name: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
}

interface AIResponse {
  title: string;
  description?: string;
  pois: PoiData[];
  error?: string;
}

// 使用原生fetch替代axios，减少bundle大小
async function sendRequest(prompt: string, chatHistory?: Array<{ type: 'user' | 'ai'; content: string; data?: any }>): Promise<AIResponse> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, chatHistory }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('AI请求失败:', error);
    throw new Error('AI服务暂时不可用，请稍后重试');
  }
}

export default function Chat({ onMarkers }: { onMarkers: (m: Array<{ id: string; title: string; latitude: number; longitude: number }>) => void }) {
  const [prompt, setPrompt] = useState("");
  const [localData, setLocalData] = useState<AIResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai'; content: string; data?: AIResponse }>>([]);
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set());
  const [isMutating, setIsMutating] = useState(false);

  const onSubmit = async () => {
    if (!prompt.trim() || isMutating) return;
    
    const currentPrompt = prompt.trim();
    setLocalData(null);
    
    // 先保存当前聊天历史，然后添加用户消息
    const currentChatHistory = [...chatHistory, { type: 'user' as const, content: currentPrompt }];
    setChatHistory(currentChatHistory);
    setPrompt(""); // 立即清空输入框
    setIsMutating(true);
    
    try {
      const resp = await sendRequest(currentPrompt, chatHistory);
      
      if (!resp?.pois || !Array.isArray(resp.pois)) {
        return;
      }
      
      // 更新本地状态，确保UI重新渲染
      setLocalData(resp);
      
      // 添加AI回复到聊天记录
      const aiContent = resp.description || resp.title;
      setChatHistory(prev => [...prev, { type: 'ai', content: aiContent, data: resp }]);
      
      // 只有当返回了新的POI数据时才更新地图标记
      if (resp.pois.length > 0) {
        const markers = resp.pois
          .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
          .map((p, idx) => ({ 
            id: `${idx}`, 
            title: p.name, 
            subtitle: [p.city, p.address].filter(Boolean).join(" · "), 
            latitude: p.lat as number, 
            longitude: p.lng as number 
          }));
        
        onMarkers(markers);
      }
      
    } catch (error) {
      console.error("❌ 请求失败:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const toggleHistoryExpansion = (index: number) => {
    setExpandedHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-base-100/95 to-base-100/80 custom-scrollbar">
        {/* 聊天历史记录 - 显示所有历史对话 */}
        {chatHistory.map((message, index) => {
          // 如果是最新的AI回复且已经有详细数据，则不显示（会在下面显示详细版本）
          const isLatestAIResponse = index === chatHistory.length - 1 && message.type === 'ai' && localData && !isMutating;
          if (isLatestAIResponse) return null;
          
          return (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} chat-message-enter-${message.type === 'user' ? 'right' : 'left'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm border ${
              message.type === 'user' 
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-900 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/50' 
                : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-200/50 dark:border-slate-700/50'
            }`}>
              {message.type === 'user' ? (
                <div className="text-sm">{message.content}</div>
              ) : (
                <div className="text-sm">
                  {/* 未展开状态：只显示标题 */}
                  {!expandedHistory.has(index) && (
                    <div className="font-medium">{message.data?.title || message.content}</div>
                  )}
                  
                  {/* 展开状态：显示完整内容 */}
                  {expandedHistory.has(index) && (
                    <div>
                      <div className="font-medium mb-2">{message.data?.title || message.content}</div>
                      {message.data?.description && (
                        <div className="text-xs opacity-75 mb-2 whitespace-pre-line">{message.data.description}</div>
                      )}
                    </div>
                  )}
                  
                  {/* 展开/收起按钮 */}
                  {message.data?.pois && message.data.pois.length > 0 && (
                    <div>
                      <button 
                        onClick={() => toggleHistoryExpansion(index)}
                        className="text-xs opacity-60 hover:opacity-80 transition-opacity duration-200 flex items-center gap-1 mt-2"
                      >
                        <span>包含 {message.data.pois.length} 个推荐地点</span>
                        <svg 
                          className={`w-3 h-3 transition-transform duration-200 ${expandedHistory.has(index) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedHistory.has(index) && message.data?.pois && (
                        <div className="mt-2 space-y-1 border-t border-slate-200/50 dark:border-slate-600/50 pt-2">
                          {message.data.pois.map((poi: PoiData, poiIndex: number) => (
                            <div key={poiIndex} className="text-xs opacity-70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-current rounded-full flex-shrink-0"></div>
                              <span>{poi.name}</span>
                              {poi.city && <span className="opacity-50">· {poi.city}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        }).filter(Boolean)}

        {/* 当前最新的AI回复（详细版本） - 只有在不是历史记录时才显示 */}
        {localData && !isMutating && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.type === 'ai' && (
          <div className="flex justify-start chat-message-enter-left">
            <div className="max-w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-900/80 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 shadow-lg backdrop-blur-sm rounded-2xl px-4 py-3">
              <div className="font-medium mb-2 text-slate-800 dark:text-slate-200">{localData?.title}</div>
              
              {localData?.description && (
                <div className="text-sm whitespace-pre-wrap leading-relaxed mb-3 opacity-90 dark:opacity-90 text-slate-700 dark:text-slate-300">
                  {localData?.description}
                </div>
              )}
              
              {localData?.pois?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-normal text-slate-800 dark:text-slate-200">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    推荐地点 ({localData?.pois?.length || 0})
                    {(localData?.pois?.length || 0) > 1 && (
                      <div className="badge badge-primary badge-sm dark:text-white">
                        已规划路线
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {localData?.pois?.map((p: PoiData, i: number) => {
                      const isStart = i === 0;
                      const poisLength = localData?.pois?.length || 0;
                      const isEnd = i === poisLength - 1 && poisLength > 1;
                      
                      return (
                        <div 
                          key={i}
                          className="card card-compact bg-gradient-to-br from-base-100 to-base-200/50 dark:from-slate-700/80 dark:to-slate-800/60 border border-base-300/50 dark:border-slate-600/30 relative shadow-lg hover:shadow-xl transition-all duration-300 card-hover group"
                        >
                          {/* 装饰性渐变背景 */}
                          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${
                            isStart ? 'from-success/10 to-success/5' : 
                            isEnd ? 'from-error/10 to-error/5' : 
                            'from-info/10 to-info/5'
                          } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          
                          <div className="card-body relative z-10 p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shadow-md ${
                                  isStart ? 'bg-success/20 text-success border-2 border-success/30' : 
                                  isEnd ? 'bg-error/20 text-error border-2 border-error/30' : 
                                  'bg-info/20 text-info border-2 border-info/30'
                                }`}>
                                  {isStart ? '🚩' : isEnd ? '🏁' : (i + 1)}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h4 className="font-medium text-sm text-base-content dark:text-slate-200 group-hover:text-primary transition-colors duration-200">
                                    {p.name}
                                  </h4>
                                  <div className={`badge badge-xs ${
                                    isStart ? 'badge-success' : 
                                    isEnd ? 'badge-error' : 
                                    'badge-info'
                                  } dark:text-white shadow-sm !bg-opacity-100`}>
                                    {isStart ? '起点' : isEnd ? '终点' : `第${i + 1}站`}
                                  </div>
                                </div>
                                {(p.city || p.address) && (
                                  <div className="text-xs opacity-75 dark:opacity-80 text-base-content dark:text-slate-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {[p.city, p.address].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* 连接线 */}
                            {i < (localData?.pois?.length || 0) - 1 && (
                              <div className="absolute left-7 bottom-0 w-0.5 h-3 bg-gradient-to-b from-primary/40 to-primary/20 dark:from-primary/60 dark:to-primary/30 transform translate-y-full"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  

                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {/* 加载状态 */}
        {isMutating && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-sm">正在规划行程...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 欢迎消息 */}
        {chatHistory.length === 0 && !isMutating && (
          <div className="hero min-h-[120px]">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-lg font-medium text-base-content">AI 旅游规划助手</h1>
                <p className="py-1 text-base-content/70">告诉我你的旅游需求，我来为你规划完美行程</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 - 统一大框设计 */}
      <div className="border-t border-base-300/20 p-4 bg-gradient-to-t from-base-100/60 via-base-100/40 to-base-100/30 backdrop-blur-xl relative">
        {/* 多层装饰效果 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        <div className="relative z-10">
          {/* 统一的大框包裹所有组件 */}
          <div className="input-container bg-base-100/90 dark:bg-slate-800/95 backdrop-blur-md border-2 border-base-300/30 dark:border-slate-600/30 rounded-3xl shadow-lg p-4">
            {/* 输入框和按钮容器 */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  className="w-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-base-content dark:text-slate-300 placeholder:text-base-content/60 dark:placeholder:text-slate-500 text-sm leading-relaxed"
                  placeholder="✨ 描述你的旅游需求，例如：甘肃三日游、北京美食文化之旅..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={2}
                  disabled={isMutating}
                  style={{ minHeight: '2.5rem' }}
                />
              </div>
              
              {/* 圆形提交按钮 */}
              <button
                onClick={onSubmit}
                disabled={isMutating || !prompt.trim()}
                className={`circle-button flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  prompt.trim() && !isMutating
                    ? 'bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 text-purple-600 dark:text-purple-400 shadow-lg hover:shadow-xl hover:scale-110 border border-purple-200/50 dark:border-purple-700/30' 
                    : 'bg-base-300/50 text-base-content/40 cursor-not-allowed'
                } ${isMutating ? 'animate-pulse' : ''}`}
              >
                {isMutating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* 底部提示信息 */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-300/20 dark:border-slate-600/20">
              <div className="flex items-center gap-1.5 text-xs text-base-content/60 dark:text-slate-400">
                <kbd className="kbd kbd-xs bg-base-200/50 dark:bg-slate-700/50 text-base-content/70 dark:text-slate-300">Enter</kbd>
                <span>发送</span>
                <span className="text-base-content/40 dark:text-slate-500">•</span>
                <kbd className="kbd kbd-xs bg-base-200/50 dark:bg-slate-700/50 text-base-content/70 dark:text-slate-300">Shift</kbd>
                <span>+</span>
                <kbd className="kbd kbd-xs bg-base-200/50 dark:bg-slate-700/50 text-base-content/70 dark:text-slate-300">Enter</kbd>
                <span>换行</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>AI 助手在线</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


