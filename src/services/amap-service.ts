import AMapLoader from "@amap/amap-jsapi-loader";
import { MapService, MapInitOptions, MarkerOptions, PolylineOptions } from "../types/map-service";

export class AMapService implements MapService {
  name = "AutoNavi";
  private AMap: any = null;

  async init(container: HTMLElement, options: MapInitOptions) {
    const key = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
    if (!key) {
      throw new Error("Missing AutoNavi API key");
    }

    // Security configuration if needed
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;
    if (securityJsCode && typeof window !== "undefined") {
      (window as any)._AMapSecurityConfig = { securityJsCode };
    }

    this.AMap = await AMapLoader.load({
      key,
      version: "2.0",
      plugins: ["AMap.ToolBar", "AMap.Driving", "AMap.Polyline"],
    });

    return new this.AMap.Map(container, options);
  }

  createMarker(options: MarkerOptions) {
    return new this.AMap.Marker(options);
  }

  createPolyline(options: PolylineOptions) {
    return new this.AMap.Polyline(options);
  }

  setMapStyle(style: string) {
    this.map?.setMapStyle(style);
  }

  destroy() {
    this.map?.destroy();
  }
}