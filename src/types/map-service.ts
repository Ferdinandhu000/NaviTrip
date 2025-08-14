export interface MapService {
  name: string;
  init: (container: HTMLElement, options: MapInitOptions) => Promise<any>;
  createMarker: (options: MarkerOptions) => any;
  createPolyline: (options: PolylineOptions) => any;
  setMapStyle?: (style: string) => void;
  destroy?: () => void;
}

export interface MapInitOptions {
  viewMode: string;
  zoom: number;
  center: [number, number];
  mapStyle?: string;
}

export interface MarkerOptions {
  position: [number, number];
  title?: string;
  icon?: any;
}

export interface PolylineOptions {
  path: [number, number][];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}