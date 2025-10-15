import { z } from "zod";

/**
 * 高德地图POI数据结构
 */
const PoiSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  // 高德偶尔返回 address 为数组，这里做联合类型兼容
  address: z.union([z.string(), z.array(z.string())]).optional(),
  location: z.string().optional(), // "lng,lat" 格式
  cityname: z.string().optional(),
  typecode: z.string().optional(),
  type: z.string().optional(),
});

/**
 * 高德地图API响应结构
 */
const GeoSchema = z.object({
  status: z.string(),
  info: z.string().optional(),
  count: z.string().optional(),
  pois: z.array(PoiSchema).optional(),
  geocodes: z.array(z.object({
    location: z.string().optional(),
    formatted_address: z.string().optional(),
  })).optional(),
});

export type AMapPoi = z.infer<typeof PoiSchema>;

/**
 * 高德地图错误代码映射
 */
const AMAP_ERROR_MESSAGES: Record<string, string> = {
  '10001': 'API密钥不正确或过期',
  '10002': '请求过于频繁',
  '10003': '访问已超出日配额',
  '10004': '单位时间内访问过于频繁',
  '10005': 'IP白名单出错，发送请求的服务器IP不在IP白名单内',
  '10006': '绑定域名出错，当前API的请求域名与绑定域名不符',
  '10007': '数字签名未通过验证',
  '10008': 'MD5安全码未通过验证',
  '10009': '请求key与绑定平台不符',
  '10010': 'IP访问超限',
  '10011': '服务不支持https请求',
  '10012': '权限不足，服务请求被拒绝',
  '10013': 'Key被删除',
  '20000': '请求参数非法',
  '20001': '缺少必填参数',
  '20002': '请求协议非法',
  '20003': '其他未知错误',
};

/**
 * 确保高德地图Web服务API密钥存在
 */
function ensureWebApiKey(): string {
  const key = process.env.AMAP_WEB_KEY;
  if (!key) {
    throw new Error("缺少高德地图Web服务API密钥，请设置环境变量 AMAP_WEB_KEY");
  }
  return key;
}

/**
 * 处理高德地图API错误
 */
function handleAmapError(status: string, info?: string): Error {
  const message = AMAP_ERROR_MESSAGES[status] || info || '未知错误';
  return new Error(`高德地图API错误 (${status}): ${message}`);
}

/**
 * 搜索POI（兴趣点）
 * @param keyword 搜索关键词
 * @param city 限定城市（可选）
 * @returns POI列表
 */
export async function searchPOI(keyword: string, city?: string): Promise<AMapPoi[]> {
  try {
    const key = ensureWebApiKey();
    const url = "https://restapi.amap.com/v3/place/text";
    const params = { 
      key, 
      keywords: keyword.trim(), 
      city: city?.trim(), 
      offset: 10, 
      page: 1, 
      extensions: "base" 
    };
    
    const queryString = new URLSearchParams({
      key: params.key,
      keywords: params.keywords,
      city: params.city || '',
      offset: params.offset.toString(),
      page: params.page.toString(),
      extensions: params.extensions
    }).toString();
    const fullUrl = `${url}?${queryString}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const parsed = GeoSchema.safeParse(data);
    if (!parsed.success) {
      console.error("高德地图API响应格式错误:", parsed.error);
      return [];
    }
    
    const { status, info, pois } = parsed.data;
    
    // 检查API状态
    if (status !== '1') {
      throw handleAmapError(status, info);
    }
    
    return pois || [];
    
  } catch (error) {
    console.error("高德地图POI搜索错误:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('未知错误');
  }
}

/**
 * 地理编码 - 将地址转换为经纬度坐标
 * @param address 地址
 * @param city 限定城市（可选）
 * @returns 坐标信息或null
 */
export async function geocode(address: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const key = ensureWebApiKey();
    const url = "https://restapi.amap.com/v3/geocode/geo";
    const params = { 
      key, 
      address: address.trim(), 
      city: city?.trim() 
    };
    
    const queryString = new URLSearchParams({
      key: params.key,
      address: params.address,
      city: params.city || ''
    }).toString();
    const fullUrl = `${url}?${queryString}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const parsed = GeoSchema.safeParse(data);
    if (!parsed.success) {
      console.error("高德地图地理编码API响应格式错误:", parsed.error);
      return null;
    }
    
    const { status, info, geocodes } = parsed.data;
    
    // 检查API状态
    if (status !== '1') {
      throw handleAmapError(status, info);
    }
    
    const location = geocodes?.[0]?.location;
    if (!location) return null;
    
    const [lngStr, latStr] = location.split(",");
    const lng = Number(lngStr);
    const lat = Number(latStr);
    
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    
    return null;
    
  } catch (error) {
    console.error("高德地图地理编码错误:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('未知错误');
  }
}

/**
 * 解析高德地图location字符串为坐标对象
 * @param location "lng,lat" 格式的字符串
 * @returns 坐标对象或null
 */
export function parseLocation(location?: string): { lat: number; lng: number } | null {
  if (!location) return null;
  
  const [lngStr, latStr] = location.split(",");
  const lng = Number(lngStr);
  const lat = Number(latStr);
  
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  
  return null;
}


