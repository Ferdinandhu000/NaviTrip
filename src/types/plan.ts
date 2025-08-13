/**
 * 地理坐标点
 */
export type GeoPoint = {
  latitude: number;
  longitude: number;
};

/**
 * 地点信息
 */
export type PlaceItem = {
  name: string;
  address?: string;
  city?: string;
  notes?: string;
  time?: string;
  location?: GeoPoint;
  type?: string; // 地点类型，如"景点"、"餐厅"、"酒店"
};

/**
 * 单日行程计划
 */
export type DayPlan = {
  date?: string;
  title?: string;
  items: PlaceItem[];
  budget?: number; // 预算
  notes?: string; // 备注
};

/**
 * 完整旅游计划
 */
export type TravelPlan = {
  title: string;
  description?: string;
  days: DayPlan[];
  totalBudget?: number;
  duration?: number; // 天数
  createdAt?: Date;
};

/**
 * 地图标记点
 */
export type Marker = {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  type?: 'start' | 'end' | 'waypoint'; // 标记类型
};

/**
 * API响应格式
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * POI搜索结果
 */
export type PoiSearchResult = {
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
  type?: string;
  distance?: number;
};

/**
 * AI规划请求
 */
export type PlanRequest = {
  prompt: string;
  city?: string;
  duration?: number;
  budget?: number;
  preferences?: string[];
};

/**
 * AI规划响应
 */
export type PlanResponse = {
  title: string;
  description?: string;
  pois: PoiSearchResult[];
  error?: string;
};


