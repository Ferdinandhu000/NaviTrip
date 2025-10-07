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
  Polyline: new (options: { path: LngLat[]; strokeColor?: string; strokeWeight?: number; strokeOpacity?: number; strokeStyle?: string }) => unknown;
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
  setCenter?: (center: LngLat) => void;
  setZoom?: (zoom: number) => void;
};

export default function Map({ markers, className, mapStyleId = "amap://styles/normal" }: { markers: MarkerData[]; className?: string; mapStyleId?: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<MapInstance | null>(null);
  const amapNsRef = useRef<AMapNamespace | null>(null);
  const overlaysRef = useRef<unknown[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 生成自然路径的辅助函数
  const generateNaturalPath = (start: LngLat, end: LngLat, index: number = 0): LngLat[] => {
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;
    
    // 计算距离和方向
    const deltaLng = endLng - startLng;
    const deltaLat = endLat - startLat;
    const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
    
    // 如果距离很短，使用直线
    if (distance < 0.005) {
      return [start, end];
    }
    
    // 生成更自然的路径点
    const path: LngLat[] = [start];
    const segments = Math.max(3, Math.floor(distance * 500)); // 根据距离动态调整段数
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      
      // 基础插值
      let lng = startLng + deltaLng * t;
      let lat = startLat + deltaLat * t;
      
      // 添加自然的偏移，模拟道路走向
      const offsetFactor = Math.sin(t * Math.PI) * Math.min(distance * 0.1, 0.005);
      
      // 根据索引交替偏移方向，避免重叠
      const direction = (index % 2 === 0) ? 1 : -1;
      
      // 垂直于主方向的偏移
      const perpLng = -deltaLat / distance * offsetFactor * direction;
      const perpLat = deltaLng / distance * offsetFactor * direction;
      
      lng += perpLng;
      lat += perpLat;
      
      // 添加小幅随机波动，使路径更自然
      const noise = 0.0002;
      lng += (Math.random() - 0.5) * noise;
      lat += (Math.random() - 0.5) * noise;
      
      path.push([lng, lat]);
    }
    
    path.push(end);
    return path;
  };

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
          // @ts-ignore
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

  // 使用防抖优化标记更新
  const [debouncedMarkers, setDebouncedMarkers] = useState(markers);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMarkers(markers);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [markers]);

  useEffect(() => {
    const map = mapInstance.current;
    const AMap = amapNsRef.current;
    
    if (!map || !AMap) {
      return;
    }
    
    // 清理旧覆盖物
    if (overlaysRef.current && (overlaysRef.current as unknown[]).length) {
      map.remove(overlaysRef.current as unknown[]);
      overlaysRef.current = null;
    }
    
    if (!debouncedMarkers?.length) {
      return;
    }

    const created: unknown[] = [];
    const bounds = new AMap.Bounds();
    
    // 恢复完整的标记图标效果
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
        imageSize: [32, 40]
      });
    };

    // 创建标记点
    debouncedMarkers.forEach((m, index) => {
      const isStart = index === 0;
      const isEnd = index === debouncedMarkers.length - 1 && debouncedMarkers.length > 1;
      
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

    // 创建路线连接（当有多个点时）
    if (debouncedMarkers.length > 1) {
      // 为每两个相邻的点创建弯曲路线
      for (let i = 0; i < debouncedMarkers.length - 1; i++) {
        const startPoint: LngLat = [debouncedMarkers[i].longitude, debouncedMarkers[i].latitude];
        const endPoint: LngLat = [debouncedMarkers[i + 1].longitude, debouncedMarkers[i + 1].latitude];
        
        // 生成自然路径
        const naturalPath = generateNaturalPath(startPoint, endPoint, i);
        
        // 创建简洁的路线（细一点、淡一点）
        const polyline = new AMap.Polyline({
          path: naturalPath,
          strokeColor: '#3b82f6',
          strokeWeight: 2,
          strokeOpacity: 0.6,
          strokeStyle: 'dashed'
        });
        
        created.push(polyline);
      }
    }



    map.add(created);
    overlaysRef.current = created;
    
    // 如果有标记点，自动调整视图以包含所有标记点
    if (debouncedMarkers.length > 0) {
      if (debouncedMarkers.length === 1) {
        // 单个标记点时，以该点为中心，适当缩放
        map.setCenter?.([debouncedMarkers[0].longitude, debouncedMarkers[0].latitude]);
        map.setZoom?.(13);
      } else {
        // 多个标记点时，使用requestAnimationFrame优化性能
        requestAnimationFrame(() => {
          setTimeout(() => {
            map.setFitView();
          }, 500); // 减少延迟时间
        });
      }
    }
    return () => {
      if (created.length) {
        map.remove(created);
      }
    };
  }, [debouncedMarkers]);

  return (
    <div className="relative h-full bg-transparent">
      <div 
        ref={mapRef} 
        className={`${className || "w-full h-full"} overflow-hidden`}
        style={{ minHeight: '400px', backgroundColor: 'transparent' }}
      />
      
      {/* 地图加载提示 */}
      {isLoading && (
        <div className="absolute inset-0 bg-transparent flex items-center justify-center">
          <div className="text-center bg-base-100/90 dark:bg-slate-600/90 backdrop-blur-sm rounded-lg p-4">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p className="text-base-content/70 text-sm">地图加载中...</p>
          </div>
        </div>
      )}
      
      {/* 地图加载错误 */}
      {mapError && (
        <div className="absolute inset-0 bg-transparent flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-base-100/95 dark:bg-slate-600/95 backdrop-blur-sm rounded-lg p-6">
            <div className="avatar mb-4">
              <div className="w-16 rounded-full bg-error/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-base-content mb-2">地图加载失败</h3>
            <p className="text-sm text-base-content/70 mb-4">{mapError}</p>
            
            <div className="alert alert-info text-left mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h4 className="font-bold">解决方案：</h4>
                <div className="text-xs mt-1 space-y-1">
                  <div>1. 检查 .env.local 文件中的 NEXT_PUBLIC_AMAP_JS_KEY</div>
                  <div>2. 确保API密钥有效且开启了JS API服务</div>
                  <div>3. 检查域名是否在白名单中 (localhost:3000)</div>
                  <div>4. 查看浏览器控制台的详细错误信息</div>
                  <div>5. 确保网络连接正常</div>
                </div>
              </div>
            </div>
            
            <div className="alert alert-warning text-left mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-bold">当前配置信息：</h4>
                <div className="text-xs mt-1 space-y-1">
                  <div>• API Key 前缀: {process.env.NEXT_PUBLIC_AMAP_JS_KEY ? process.env.NEXT_PUBLIC_AMAP_JS_KEY.substring(0, 8) + '...' : '未设置'}</div>
                  <div>• 安全域名: localhost:3000</div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              重新加载
            </button>
          </div>
        </div>
      )}
      
      {/* 标记点数量和路线提示 */}
      {markers.length > 0 && mapInstance.current && (
        <div className="absolute top-3 left-3 bg-base-100/90 dark:bg-slate-600/90 backdrop-blur-sm shadow-md border border-base-300/50 dark:border-slate-500/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            <span className="font-medium">{markers.length} 个地点</span>
          </div>
          {markers.length > 1 && (
            <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
              <div className="w-1 h-1 bg-primary/70 rounded-full"></div>
              <span>已规划路线</span>
            </div>
          )}
        </div>
      )}
      
      {/* 地图控制提示 */}
      {mapInstance.current && (
        <div className="absolute bottom-3 right-3 bg-base-100/90 dark:bg-slate-600/90 backdrop-blur-sm shadow-md border border-base-300/50 dark:border-slate-500/50 rounded-lg px-3 py-2">
          <div className="text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>起点</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-info rounded-full"></div>
                <span>途经</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-error rounded-full"></div>
                <span>终点</span>
              </div>
            </div>
            {markers.length > 1 && (
              <div className="flex items-center gap-2 pt-1 border-t border-base-300/30 dark:border-slate-500/30">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-info opacity-80" style={{borderTop: '2px dashed #3b82f6'}}></div>
                  <span>游览路线</span>
                </div>
              </div>
            )}
            <div className="opacity-70 text-[10px]">滚轮缩放 · 拖拽移动 · 点击查看详情</div>
          </div>
        </div>
      )}
    </div>
  );
}


