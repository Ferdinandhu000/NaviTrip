"use client";
import { useState } from "react";
import useSWRMutation from "swr/mutation";
import axios from "axios";
import { MapPin } from "lucide-react";

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

async function sendRequest(url: string, { arg }: { arg: { prompt: string; city?: string } }) {
  try {
    const { data } = await axios.post(url, arg, {
      timeout: 120000, // 增加到120秒超时
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data as AIResponse;
  } catch (error) {
    console.error('AI请求失败:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      }
      if (error.response?.status === 500) {
        throw new Error('服务器错误，请稍后重试');
      }
    }
    throw new Error('AI服务暂时不可用，请稍后重试');
  }
}

export default function Chat({ onMarkers }: { onMarkers: (m: Array<{ id: string; title: string; latitude: number; longitude: number }>) => void }) {
  const [prompt, setPrompt] = useState("");
  const [city, setCity] = useState("");
  const [localData, setLocalData] = useState<AIResponse | null>(null);
  const { trigger, isMutating, data } = useSWRMutation("/api/ai", sendRequest);

  const onSubmit = async () => {
    if (!prompt.trim()) return;
    
    console.log("🚀 开始提交请求:", { prompt, city });
    
    try {
      const resp = await trigger({ prompt, city: city || undefined });
      console.log("✅ API响应成功:", resp);
      console.log("📊 API返回的POI数据:", resp?.pois);
      
      if (!resp?.pois || !Array.isArray(resp.pois)) {
        console.error("❌ POI数据格式错误:", resp?.pois);
        return;
      }
      
      // 更新本地状态，确保UI重新渲染
      setLocalData(resp);
      
      const markers = resp.pois
        .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
        .map((p, idx) => ({ 
          id: `${idx}`, 
          title: p.name, 
          subtitle: [p.city, p.address].filter(Boolean).join(" · "), 
          latitude: p.lat as number, 
          longitude: p.lng as number 
        }));
      
      console.log("🎯 转换后的markers数据:", markers);
      console.log("📍 调用onMarkers，传递markers数量:", markers.length);
      
      onMarkers(markers);
      
      console.log("✅ 数据传递完成");
      
    } catch (error) {
      console.error("❌ 请求失败:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* 用户消息 */}
        {prompt && (localData || data) && (
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3">
              <p className="text-sm">{prompt}</p>
              {city && (
                <p className="text-xs text-blue-100 mt-1">📍 {city}</p>
              )}
            </div>
          </div>
        )}

        {/* AI回复消息 */}
        {(localData || data) && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">AI</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{(localData || data)?.title}</h3>
              </div>
              
              {(localData || data)?.description && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                  {(localData || data)?.description}
                </div>
              )}
              
              {(localData || data)?.pois?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    推荐地点 ({(localData || data)?.pois?.length})
                    {(localData || data)?.pois?.length > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        已规划路线
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {(localData || data)?.pois?.map((p: PoiData, i: number) => {
                      const isStart = i === 0;
                      const isEnd = i === (localData || data)?.pois?.length - 1 && (localData || data)?.pois?.length > 1;
                      
                      return (
                        <div 
                          key={i}
                          className="bg-white rounded-lg p-3 border border-gray-200 relative"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {isStart ? (
                                <span className="text-green-600 text-sm">🚩</span>
                              ) : isEnd ? (
                                <span className="text-red-600 text-sm">🏁</span>
                              ) : (
                                <span className="text-blue-600 text-sm">📍</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                {p.name}
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {isStart ? '起点' : isEnd ? '终点' : `第${i + 1}站`}
                                </span>
                              </div>
                              {(p.city || p.address) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {[p.city, p.address].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                          {i < ((localData || data)?.pois?.length || 0) - 1 && (
                            <div className="absolute left-6 bottom-0 w-0.5 h-3 bg-blue-300 transform translate-y-full"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {((localData || data)?.pois?.length || 0) > 1 && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg mt-2">
                      💡 地图上的蓝色线条显示推荐行程路线，点击标记查看详细信息
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {/* 加载状态 */}
        {isMutating && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">AI</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">正在规划行程...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 欢迎消息 */}
        {!data && !isMutating && (
          <div className="flex justify-center">
            <div className="text-center text-gray-500 py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">AI 旅游规划助手</h3>
              <p className="text-sm text-gray-500">告诉我你的旅游需求，我来为你规划完美行程</p>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4">
        <div className="space-y-3">
          {city && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <MapPin className="w-4 h-4" />
              <span>目标城市：{city}</span>
              <button 
                onClick={() => setCity("")}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-500"
                placeholder={city ? "描述你的旅游需求..." : "例如：京都三天美食文化混合行程"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={2}
                disabled={isMutating}
              />
              {!city && (
                <button
                  onClick={() => setCity("")}
                  className="absolute right-3 top-3 text-gray-400 hover:text-blue-500"
                  title="添加城市"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={onSubmit}
              disabled={isMutating || !prompt.trim()}
              className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isMutating ? (
                <span className="text-white text-xs">AI</span>
              ) : (
                <span className="text-white text-xs">AI</span>
              )}
            </button>
          </div>
          
          {!city && (
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                placeholder="目标城市（可选）"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isMutating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


