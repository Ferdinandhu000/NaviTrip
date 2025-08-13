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
      
      // 第一步：生成行程规划
      const systemPrompt = `你是专业的中文旅游规划师。请为用户提供简洁实用的旅游建议，包括：
1. 一个吸引人的行程标题
2. 详细的行程安排（景点、交通、餐饮建议）
3. 实用的预算参考
4. 注意事项

请用中文回答，语言简洁明了，不要使用markdown格式。`;
      
      console.log("发送AI请求 - 生成行程规划...");
      const planResponse = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }, {
        timeout: 15000,
      });
      
      const planText = planResponse.choices?.[0]?.message?.content || "";
      
      // 第二步：提取关键地点
      const keywordSystemPrompt = `从旅游行程描述中提取主要的景点、地标或目的地名称。
要求：
- 提取5-8个最重要的地点名称
- 只返回地点名称，用逗号分隔
- 不要包含形容词、介绍词
- 地点名称要准确、简洁
- 优先选择知名景点和地标`;
      
      console.log("发送AI请求 - 提取关键地点...");
      const keywordResponse = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: keywordSystemPrompt },
          { role: "user", content: planText },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }, {
        timeout: 10000,
      });
      
      const keywordText = keywordResponse.choices?.[0]?.message?.content || "";
      const keywords = keywordText
        .split(/[,，、\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length < 30)
        .slice(0, 8);
      
      // 清理文本中的markdown格式
      const cleanedTitle = cleanMarkdown(planText.split('\n')[0] || "旅游行程规划");
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
    
    // 并发搜索所有关键词
    const searchPromises = keywords.map(async (keyword) => {
      try {
        console.log(`搜索关键词: ${keyword}`);
        const pois = await searchPOI(keyword, city);
        console.log(`${keyword} 搜索结果: ${pois.length} 个POI`);
        
        if (pois.length > 0) {
          const poi = pois[0]; // 取第一个结果
          const location = parseLocation(poi.location);
          
          if (location) {
            console.log(`${poi.name} 坐标来源: location字段`, location);
            return {
              name: poi.name,
              city: poi.cityname || city,
              address: poi.address,
              lat: location.lat,
              lng: location.lng,
            };
          }
        }
        
        console.log(`关键词 ${keyword} 没有找到有效POI`);
        return null;
        
      } catch (error) {
        console.error(`搜索关键词 ${keyword} 失败:`, error);
        return null;
      }
    });
    
    // 等待所有搜索完成
    const searchResults = await Promise.all(searchPromises);
    
    // 过滤有效结果
    for (const result of searchResults) {
      if (result) {
        results.push(result);
        console.log(`添加POI: ${result.name}`, { lat: result.lat, lng: result.lng });
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