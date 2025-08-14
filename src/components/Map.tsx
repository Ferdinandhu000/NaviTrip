"use client";
import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

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

export default function Map({ markers, className, mapStyleId = "amap://styles/macaron" }: { markers: MarkerData[]; className?: string; mapStyleId?: string }) {
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

        const ns = (await AMapLoader.load({
          key,
          version: "2.0",
          plugins: ["AMap.ToolBar", "AMap.Driving", "AMap.Polyline"],
        }).catch((loadError) => {
          console.error("高德地图SDK加载失败:", loadError);
          // 检查常见错误类型
          if (loadError.message?.includes('INVALID_USER_KEY')) {
            throw new Error("API密钥无效，请检查NEXT_PUBLIC_AMAP_JS_KEY配置");
          } else if (loadError.message?.includes('INVALID_USER_DOMAIN')) {
            throw new Error("域名未在白名单中，请在高德控制台添加 localhost:3000");
          } else if (loadError.message?.includes('DAILY_QUERY_OVER_LIMIT')) {
            throw new Error("API调用次数超限，请检查配额或稍后重试");
          }
          throw loadError;
        })) as unknown as AMapNamespace;

        if (cancelled) return;

        console.log("高德地图SDK加载成功，创建地图实例...");
        amapNsRef.current = ns;
        mapInstance.current = new ns.Map(mapRef.current, {
          viewMode: "2D",
          zoom: 4,
          center: [116.397428, 39.90923],
          mapStyle: mapStyleId,
        });

        console.log("地图创建成功！");
        setIsLoading(false);
        
        // 添加地图加载完成事件监听
        mapInstance.current.on?.('complete', () => {
          console.log("地图瓦片加载完成");
        });
        
        // 添加地图错误事件监听
        mapInstance.current.on?.('error', (err: unknown) => {
          console.error("地图加载错误:", err);
          setMapError("地图瓦片加载失败，请检查网络连接");
        });
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
    
    // 创建自定义标记图标（小球样式）
    const createCustomIcon = (index: number, isStart = false, isEnd = false) => {
      let color = '#1890ff'; // 蓝色 - 途径点
      
      if (isStart) {
        color = '#52c41a'; // 绿色 - 起点
      } else if (isEnd) {
        color = '#f5222d'; // 红色 - 终点
      }
      
      const svg = `
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="6" fill="white" opacity="0.3"/>
        </svg>
      `;
      
      return new AMap.Icon({
        image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        size: [24, 24],
        imageSize: [24, 24]
      });
    };

    // 创建标记点
    markers.forEach((m, index) => {
      const isStart = index === 0;
      const isEnd = index === markers.length - 1 && markers.length > 1;
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
          }
        });
      }
    }

    map.add(created);
    overlaysRef.current = created;
    
    // 延迟设置视图，等待路线加载
    setTimeout(() => {
      map.setFitView();
    }, 1000);
    return () => {
      if (created.length) {
        map.remove(created);
      }
    };
  }, [markers]);

  return (
    <div className="relative h-full">
      <div ref={mapRef} className={className || "w-full h-full"} />
      
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
                <li>3. 检查域名是否在白名单中</li>
                <li>4. 查看浏览器控制台的详细错误信息</li>
              </ol>
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


