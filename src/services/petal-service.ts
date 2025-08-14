import { MapService, MapInitOptions, MarkerOptions, PolylineOptions } from "../types/map-service";

export class PetalMapService implements MapService {
  name = "Petal Maps";
  private HMS: any = null;
  private map: any = null;

  async init(container: HTMLElement, options: MapInitOptions): Promise<any> {
    // Load Petal Maps SDK
    const key = process.env.NEXT_PUBLIC_HUAWEI_API_KEY;
    if (!key) {
      throw new Error("Missing Huawei API key");
    }

    // Initialize Huawei Maps SDK
    await this.loadHuaweiMapsScript(key);
    this.HMS = (window as any).HMS;

    const mapOptions = {
      center: { lat: options.center[1], lng: options.center[0] },
      zoom: options.zoom,
      mapStyle: options.mapStyle,
    };

    this.map = new this.HMS.Map(container, mapOptions);
    return this.map;
  }

  private loadHuaweiMapsScript(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://mapapi.cloud.huawei.com/mapjs/v1/api/js?key=${key}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Huawei Maps SDK"));
      document.head.appendChild(script);
    });
  }

  createMarker(options: MarkerOptions): any {
    return new this.HMS.Marker({
      position: { lat: options.position[1], lng: options.position[0] },
      title: options.title,
      map: this.map,
    });
  }

  createPolyline(options: PolylineOptions): any {
    const path = options.path.map(([lng, lat]) => ({ lat, lng }));
    return new this.HMS.Polyline({
      path,
      strokeColor: options.strokeColor,
      strokeWeight: options.strokeWeight,
      strokeOpacity: options.strokeOpacity,
      map: this.map,
    });
  }

  destroy(): void {
    if (this.map) {
      this.map.destroy();
    }
  }
}