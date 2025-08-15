import { NextRequest } from "next/server";
import { z } from "zod";
import { createOpenAIClient, getDefaultModel } from "@/lib/ai";
import { searchPOI, parseLocation } from "@/lib/amap-server";

/**
 * 请求参数验证模式
 */
const RequestSchema = z.object({
  prompt: z.string().min(1, "旅游需求不能为空").max(1000, "旅游需求过长"),
  city: z.string().optional(),
});

/**
 * POI结果类型
 */
type PoiResult = {
  name: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
};

/**
 * 清理文本中的markdown格式
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // 移除 **粗体**
    .replace(/\*([^*]+)\*/g, '$1')         // 移除 *斜体*
    .replace(/^#+\s*/gm, '')               // 移除标题标记 # ## ###
    .replace(/```[\s\S]*?```/g, '')        // 移除代码块
    .replace(/`([^`]+)`/g, '$1')           // 移除行内代码
    .replace(/^\s*[-*+]\s+/gm, '• ')       // 将列表标记替换为项目符号
    .replace(/^\s*\d+\.\s+/gm, '')         // 移除数字列表标记
    .trim();
}

/**
 * 处理AI错误
 */
function handleAIError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : "未知错误";
  
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return "AI响应超时，请稍后重试";
  }
  if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    return "AI服务认证失败，请检查API密钥配置";
  }
  if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
    return "AI服务请求过于频繁，请稍后重试";
  }
  if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
    return "网络连接失败，请检查网络设置";
  }
  
  return `AI服务错误: ${errorMessage}`;
}

/**
 * 从用户输入中提取省份或城市信息
 */
function extractRegionFromPrompt(prompt: string): string | undefined {
  // 中国省份列表
  const provinces = [
    '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
    '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
    '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃',
    '青海', '宁夏', '新疆', '内蒙古', '台湾', '香港', '澳门'
  ];
  
  // 主要城市列表
  const cities = [
    '深圳', '杭州', '南京', '苏州', '成都', '西安', '武汉', '长沙', '郑州',
    '济南', '青岛', '大连', '沈阳', '哈尔滨', '长春', '石家庄', '太原',
    '呼和浩特', '南昌', '合肥', '福州', '厦门', '南宁', '海口', '昆明',
    '贵阳', '拉萨', '兰州', '西宁', '银川', '乌鲁木齐'
  ];
  
  // 先检查省份
  for (const province of provinces) {
    if (prompt.includes(province)) {
      return province;
    }
  }
  
  // 再检查城市
  for (const city of cities) {
    if (prompt.includes(city)) {
      return city;
    }
  }
  
  return undefined;
}

/**
 * 从用户输入中提取基础关键词（AI失败时的降级处理）
 */
function extractBasicKeywords(prompt: string): string[] {
  // 简单的关键词提取逻辑
  const commonPlaces = ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '西安', '重庆'];
  const keywords: string[] = [];
  
  for (const place of commonPlaces) {
    if (prompt.includes(place)) {
      keywords.push(place);
    }
  }
  
  if (keywords.length === 0) {
    keywords.push(prompt.slice(0, 10)); // 使用前10个字符作为关键词
  }
  
  return keywords.slice(0, 5);
}

/**
 * AI旅游规划API端点
 * 接收用户的旅游需求，生成行程规划并搜索相关地点
 */
export async function POST(req: NextRequest) {
  try {
    // 解析和验证请求参数
    const json = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(json);
    
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(", ");
      return Response.json({ 
        error: `请求参数错误: ${errors}` 
      }, { status: 400 });
    }

    const { prompt, city } = parsed.data;

    // 从用户输入中提取地区信息
    const extractedRegion = extractRegionFromPrompt(prompt);
    const searchCity = city || extractedRegion; // 优先使用传入的city参数，否则使用提取的地区

    console.log("地区信息:", { 
      userInput: prompt, 
      extractedRegion, 
      providedCity: city, 
      finalSearchCity: searchCity 
    });

    // 初始化结果
    let plan: { title: string; description?: string; keywords?: string[] } = { 
      title: "AI旅游规划" 
    };
    let aiError: string | undefined;
    
    // AI行程规划处理
    try {
      console.log("开始AI行程规划...", { 
        prompt: prompt.substring(0, 50) + "...", 
        city,
        timestamp: new Date().toISOString()
      });
      
      const openai = createOpenAIClient();
      const model = getDefaultModel();
      
      // 优化：单次AI调用同时生成行程和景点
      const systemPrompt = `你是专业的中文旅游规划师。请仔细分析用户的需求，特别注意用户指定的地区或省份。

重要规则：
- 如果用户明确指定了省份、城市或地区，必须只推荐该地区内的景点
- 景点名称要准确、具体，便于地图搜索

请按以下格式回答（不要使用markdown）：

标题：[一个吸引人的行程标题]

行程安排：
[详细的景点、交通、餐饮建议，控制在300字内]

关键景点：[景点1,景点2,景点3,景点4,景点5]

注意事项：[简要的实用建议]`;
      
      console.log("发送AI请求 - 生成行程规划和景点...");
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800, // 减少token数量
      }, {
        timeout: 25000, // 减少到25秒超时，适应Netlify限制
      });
      
      const responseText = response.choices?.[0]?.message?.content || "";
      
      // 解析响应
      const titleMatch = responseText.match(/标题：(.+)/);
      const planMatch = responseText.match(/行程安排：([\s\S]*?)关键景点：/);
      const keywordMatch = responseText.match(/关键景点：(.+)/);
      
      const planTitle = titleMatch?.[1]?.trim() || "旅游行程规划";
      const planText = planMatch?.[1]?.trim() || responseText;
      const keywordText = keywordMatch?.[1]?.trim() || "";
      
      const keywords = keywordText
        .split(/[,，、\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length < 30)
        .slice(0, 8);
      
      // 清理文本中的markdown格式
      const cleanedTitle = cleanMarkdown(planTitle);
      const cleanedDescription = cleanMarkdown(planText);
      
      plan = { 
        title: cleanedTitle, 
        description: cleanedDescription, 
        keywords 
      };
      
      console.log("AI处理完成", { 
        title: plan.title, 
        keywordCount: keywords.length,
        keywords 
      });
      
    } catch (error) {
      console.error("AI处理失败:", error);
      aiError = handleAIError(error);
      
      // AI失败时的降级处理
      plan.keywords = extractBasicKeywords(prompt);
    }

    // POI搜索和坐标获取
    const results: PoiResult[] = [];
    const keywords = plan.keywords || [];
    
    console.log("提取的关键词:", keywords);
    
    // 添加延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // 串行搜索关键词，避免触发API限制
    for (const keyword of keywords) {
      try {
        console.log(`搜索关键词: ${keyword}`);
        
        // 在请求之间添加延迟，避免触发QPS限制
        if (results.length > 0) {
          await delay(500); // 500ms延迟
        }
        
        const pois = await searchPOI(keyword, searchCity);
        console.log(`${keyword} 搜索结果: ${pois.length} 个POI`);
        
        if (pois.length > 0) {
          const poi = pois[0]; // 取第一个结果
          const location = parseLocation(poi.location);
          
          if (location) {
            console.log(`${poi.name} 坐标来源: location字段`, location);
            results.push({
              name: poi.name,
              city: poi.cityname || searchCity,
              address: poi.address,
              lat: location.lat,
              lng: location.lng,
            });
            console.log(`添加POI: ${poi.name}`, { lat: location.lat, lng: location.lng });
          }
        } else {
          console.log(`关键词 ${keyword} 没有找到有效POI`);
        }
        
      } catch (error) {
        console.error(`搜索关键词 ${keyword} 失败:`, error);
        
        // 如果是API限制错误，等待更长时间后重试
        if (error instanceof Error && error.message.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
          console.log(`检测到API限制，等待2秒后继续...`);
          await delay(2000);
        }
        
        continue; // 继续搜索下一个关键词
      }
    }
    
    console.log("最终POI结果:", results.length, "个地点");

    return Response.json({
      title: plan.title,
      description: plan.description,
      pois: results,
      error: aiError,
    });

  } catch (error) {
    console.error("API处理失败:", error);
    
    const errorMessage = error instanceof Error ? error.message : "服务器内部错误";
    
    return Response.json({
      error: `服务暂时不可用: ${errorMessage}`,
      title: "旅游规划",
      description: "抱歉，服务暂时不可用，请稍后重试。",
      pois: [],
    }, { status: 500 });
  }
}