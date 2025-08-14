"use client";
import { useEffect, useRef, useState } from "react";

// 声明全局 AMap 类型
declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

type MarkerData = {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

type LngLat = [number, number];

type AMapNamespace = {
  Map: new (
    container: HTMLElement,
    options: { viewMode: string; zoom: number; center: LngLat; mapStyle?: string }
  ) => MapInstance;
  Marker: new (options: { position: LngLat; title?: string; icon?: unknown }) => unknown;
  Bounds: new () => { extend: (pos: LngLat) => void };
  InfoWindow: new (options: { content: string; offset?: unknown }) => unknown;
  Pixel: new (x: number, y: number) => unknown;
  Polyline: new (options: { path: LngLat[]; strokeColor?: string; strokeWeight?: number; strokeOpacity?: number }) => unknown;
  Icon: new (options: { image: string; size: [number, number]; imageSize: [number, number] }) => unknown;
  Driving: new (options?: { policy?: number }) => {
    search: (start: LngLat, end: LngLat, callback: (status: string, result: unknown) => void) => void;
  };
};

type MapInstance = {
  add: (overlays: unknown[]) => void;
  remove: (overlays: unknown[]) => void;
  setFitView: () => void;
  destroy?: () => void;
  setMapStyle?: (style: string) => void;
  on?: (event: string, callback: (data?: unknown) => void) => void;
};

export default function Map({ markers, className, mapStyleId = "amap://styles/normal" }: { markers: MarkerData[]; className?: string; mapStyleId?: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<MapInstance | null>(null);
  const amapNsRef = useRef<AMapNamespace | null>(null);
  const overlaysRef = useRef<unknown[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMapError(null);
    
    console.log("🗺️ Map组件 - 初始化地图，markers状态:", { 
      hasMapInstance: !!mapInstance.current, 
      markersCount: markers?.length || 0,
      markers: markers
    });
    
    (async () => {
      try {
        if (!mapRef.current || mapInstance.current) return;
        
        const key = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
        if (!key) {
          const error = "缺少高德地图API密钥，请在环境变量中配置 NEXT_PUBLIC_AMAP_JS_KEY";
          console.error(error);
          setMapError(error);
          setIsLoading(false);
          return;
        }

        console.log("开始加载高德地图...", { key: key.substring(0, 8) + "..." });

        // 如果你的高德 JS Key 开启了"安全密钥"，需要在加载前设置
        const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;
        if (securityJsCode && typeof window !== "undefined") {
          console.log("配置高德地图安全密钥...");
          // @ts-expect-error amap typing
          window._AMapSecurityConfig = { securityJsCode };
        }

                // 动态加载高德地图JS API
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${key}`;
        script.onload = () => {
          if (cancelled) return;
          
          if (mapRef.current && window.AMap) {
            console.log("高德地图SDK加载成功，创建地图实例...");
            amapNsRef.current = window.AMap;
            const center = [116.397428, 39.90923];
            
            try {
              mapInstance.current = new window.AMap.Map(mapRef.current, {
                zoom: 4,
                center: [104.066, 35.86], // 中国地理中心
                mapStyle: 'amap://styles/normal'
              });
              
              console.log("地图创建成功！");
              setIsLoading(false);
              
              // 添加地图加载完成事件监听
              if (mapInstance.current && mapInstance.current.on) {
                mapInstance.current.on('complete', () => {
                  console.log("地图瓦片加载完成");
                });
                
                // 添加地图错误事件监听
                mapInstance.current.on('error', (err: unknown) => {
                  console.error("地图加载错误:", err);
                  setMapError("地图瓦片加载失败，请检查网络连接");
                });
              }
            } catch (mapCreateError) {
              console.error("地图实例创建失败:", mapCreateError);
              setMapError("地图实例创建失败，请检查API密钥和配置");
              setIsLoading(false);
            }
          }
        };
        script.onerror = () => {
          console.error("高德地图SDK加载失败");
          setMapError("地图加载失败，请检查网络连接和API密钥配置");
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error("地图加载失败:", error);
        const errorMessage = error instanceof Error ? error.message : "地图加载失败，请检查网络连接和API密钥配置";
        setMapError(errorMessage);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.destroy?.();
        mapInstance.current = null;
      }
      amapNsRef.current = null;
    };
  }, []);

  // 样式切换
  useEffect(() => {
    if (!mapInstance.current) return;
    if (!mapStyleId) return;
    mapInstance.current.setMapStyle?.(mapStyleId);
  }, [mapStyleId]);

  useEffect(() => {
    const map = mapInstance.current;
    const AMap = amapNsRef.current;
    console.log("地图标记更新", { 
      hasMap: !!map, 
      hasAMap: !!AMap, 
      markersCount: markers?.length || 0,
      markers: markers
    });
    
    if (!map || !AMap) {
      console.log("地图或AMap未准备好");
      return;
    }
    
    // 清理旧覆盖物
    if (overlaysRef.current && (overlaysRef.current as unknown[]).length) {
      console.log("清理旧覆盖物", overlaysRef.current.length);
      map.remove(overlaysRef.current as unknown[]);
      overlaysRef.current = null;
    }
    
    if (!markers?.length) {
      console.log("没有标记点数据");
      return;
    }

    const created: unknown[] = [];
    const bounds = new AMap.Bounds();
    
    // 创建自定义标记图标（专用地图标记样式）
    const createCustomIcon = (index: number, isStart = false, isEnd = false) => {
      let color = '#1890ff'; // 蓝色 - 途径点
      let number = (index + 1).toString(); // 标记点编号
      
      if (isStart) {
        color = '#52c41a'; // 绿色 - 起点
        number = 'S';
      } else if (isEnd) {
        color = '#f5222d'; // 红色 - 终点
        number = 'E';
      }
      
      const svg = `
        <svg width="32" height="40" xmlns="http://www.w3.org/2000/svg">
          <!-- 阴影效果 -->
          <ellipse cx="16" cy="36" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
          
          <!-- 主要标记形状 -->
          <path d="M16 2 C8 2 2 8 2 16 C2 24 16 38 16 38 S30 24 30 16 C30 8 24 2 16 2 Z" 
                fill="${color}" stroke="white" stroke-width="2"/>
          
          <!-- 内部圆形背景 -->
          <circle cx="16" cy="16" r="10" fill="white"/>
          
          <!-- 编号或字母 -->
          <text x="16" y="21" text-anchor="middle" font-family="Arial, sans-serif" 
                font-size="12" font-weight="bold" fill="${color}">${number}</text>
        </svg>
      `;
      
      return new AMap.Icon({
        image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        size: [32, 40],
        imageSize: [32, 40],
        anchor: [16, 38] // 锚点设置在底部中心
      });
    };

    // 创建标记点
    markers.forEach((m, index) => {
      const isStart = index === 0;
      const isEnd = index === markers.length - 1 && markers.length > 1;
      console.log(`创建标记点 ${index + 1}/${markers.length}:`, {
        title: m.title,
        position: [m.longitude, m.latitude],
        isStart,
        isEnd
      });
      
      const icon = createCustomIcon(index, isStart, isEnd);
      
      const marker = new AMap.Marker({ 
        position: [m.longitude, m.latitude], 
        title: m.title,
        icon: icon
      });
      
      const html = `
        <div style="font-size:13px;line-height:1.4;min-width:180px;">
          <div style="font-weight:600;color:#1890ff;margin-bottom:4px;">
            ${isStart ? '🚩 起点' : isEnd ? '🏁 终点' : `📍 第${index + 1}站`}: ${m.title}
          </div>
          ${m.subtitle ? `<div style="color:#666;font-size:12px;">${m.subtitle}</div>` : ""}
          <div style="margin-top:6px;font-size:11px;color:#999;">
            点击查看详情 · ${isStart ? '旅程开始' : isEnd ? '旅程结束' : '途经地点'}
          </div>
        </div>
      `;
      
      const info = new AMap.InfoWindow({ 
        content: html, 
        offset: new AMap.Pixel(0, -35)
      });
      
      // @ts-expect-error amap typing
      marker.on?.("click", () => {
        // @ts-expect-error amap typing
        info.open(map, [m.longitude, m.latitude]);
      });
      
      created.push(marker);
      bounds.extend([m.longitude, m.latitude]);
    });

    // 如果有多个点，创建路线
    if (markers.length > 1) {
      console.log("创建路线，连接", markers.length, "个地点");
      
      // 动态加载 Driving 插件
      if (AMap && AMap.plugin) {
        AMap.plugin(['AMap.Driving'], () => {
          if (AMap.Driving) {
            try {
              // 创建驾车路线规划
              const driving = new AMap.Driving({
                policy: 0, // 最快路线
              });

              // 连接相邻的点
              for (let i = 0; i < markers.length - 1; i++) {
                const start: LngLat = [markers[i].longitude, markers[i].latitude];
                const end: LngLat = [markers[i + 1].longitude, markers[i + 1].latitude];
                
                driving.search(start, end, (status: string, result: unknown) => {
                  const routeResult = result as { routes?: Array<{ steps: Array<{ path: Array<{ lng: number; lat: number }> }> }> };
                  if (status === 'complete' && routeResult.routes && routeResult.routes.length > 0) {
                    const route = routeResult.routes[0];
                    const path: LngLat[] = [];
                    
                    route.steps.forEach((step) => {
                      step.path.forEach((point) => {
                        path.push([point.lng, point.lat]);
                      });
                    });
                    
                    if (path.length > 0) {
                      const polyline = new AMap.Polyline({
                        path: path,
                        strokeColor: '#1890ff',
                        strokeWeight: 4,
                        strokeOpacity: 0.8
                      });
                      
                      created.push(polyline);
                      map.add([polyline]);
                    }
                  } else {
                    console.log("路线规划失败:", status);
                  }
                });
              }
            } catch (drivingError) {
              console.error("创建路线规划失败:", drivingError);
              // 使用直线连接作为备用方案
              createStraightLines();
            }
          } else {
            console.log("AMap.Driving 插件加载失败，使用直线连接");
            createStraightLines();
          }
        });
      } else {
        console.log("AMap.plugin 不可用，使用直线连接");
        createStraightLines();
      }
      
      // 创建直线连接的辅助函数
      function createStraightLines() {
        for (let i = 0; i < markers.length - 1; i++) {
          const start: LngLat = [markers[i].longitude, markers[i].latitude];
          const end: LngLat = [markers[i + 1].longitude, markers[i + 1].latitude];
          
          const polyline = new AMap.Polyline({
            path: [start, end],
            strokeColor: '#1890ff',
            strokeWeight: 3,
            strokeOpacity: 0.6,
            strokeStyle: 'dashed'
          });
          
          created.push(polyline);
        }
      }
    }

    map.add(created);
    overlaysRef.current = created;
    
    // 如果有标记点，自动调整视图以包含所有标记点
    if (markers.length > 0) {
      if (markers.length === 1) {
        // 单个标记点时，以该点为中心，适当缩放
        map.setCenter([markers[0].longitude, markers[0].latitude]);
        map.setZoom(13);
      } else {
        // 多个标记点时，延迟设置视图以包含所有点，等待路线加载完成
        setTimeout(() => {
          map.setFitView();
        }, 1500);
      }
    }
    return () => {
      if (created.length) {
        map.remove(created);
      }
    };
  }, [markers]);

  return (
    <div className="relative h-full">
      <div 
        ref={mapRef} 
        className={className || "w-full h-full"}
        style={{ minHeight: '400px' }}
      />
      
      {/* 地图加载提示 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600 text-sm">地图加载中...</p>
          </div>
        </div>
      )}
      
      {/* 地图加载错误 */}
      {mapError && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">地图加载失败</h3>
            <p className="text-sm text-gray-600 mb-4">{mapError}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <p className="text-sm text-blue-800 font-medium mb-2">解决方案：</p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. 检查 .env.local 文件中的 NEXT_PUBLIC_AMAP_JS_KEY</li>
                <li>2. 确保API密钥有效且开启了JS API服务</li>
                <li>3. 检查域名是否在白名单中 (localhost:3000)</li>
                <li>4. 查看浏览器控制台的详细错误信息</li>
                <li>5. 确保网络连接正常</li>
              </ol>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left mt-3">
              <p className="text-sm text-yellow-800 font-medium mb-2">当前配置信息：</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• API Key 前缀: {process.env.NEXT_PUBLIC_AMAP_JS_KEY ? process.env.NEXT_PUBLIC_AMAP_JS_KEY.substring(0, 8) + '...' : '未设置'}</li>
                <li>• 安全域名: localhost:3000</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      )}
      
      {/* 标记点数量和路线提示 */}
      {markers.length > 0 && mapInstance.current && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="font-medium text-gray-700">{markers.length} 个推荐地点</span>
          </div>
          {markers.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
              <span>已规划行程路线</span>
            </div>
          )}
        </div>
      )}
      
      {/* 地图控制提示 */}
      {mapInstance.current && (
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full border border-white shadow-sm"></div>
                <span>起点</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>
                <span>途经</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm"></div>
                <span>终点</span>
              </div>
            </div>
            <div>滚轮缩放 · 拖拽移动 · 点击标记查看详情</div>
            {markers.length > 1 && (
              <div className="text-blue-600">蓝色线条为推荐行程路线</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


