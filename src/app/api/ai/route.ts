import { NextRequest } from "next/server";
import { z } from "zod";
import { createOpenAIClient, getDefaultModel } from "@/lib/ai";
import { searchPOI, parseLocation } from "@/lib/amap-server";

/**
 * 聊天消息类型
 */
const ChatMessageSchema = z.object({
  type: z.enum(['user', 'ai']),
  content: z.string(),
  data: z.any().optional(),
});

/**
 * 请求参数验证模式
 */
const RequestSchema = z.object({
  prompt: z.string().min(1, "旅游需求不能为空").max(1000, "旅游需求过长"),
  city: z.string().optional(),
  chatHistory: z.array(ChatMessageSchema).optional(),
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
    .replace(/\[([^\]]+)\]/g, '$1')        // 移除方括号 [内容] → 内容
    .replace(/【([^】]+)】/g, '$1')         // 移除中文方括号 【内容】 → 内容
    .trim();
}

/**
 * 清理POI名称中的营业状态信息
 */
function cleanPOIName(name: string): string {
  return name
    .replace(/\(暂停开放\)/g, '')          // 移除(暂停开放)
    .replace(/\(已关闭\)/g, '')            // 移除(已关闭)
    .replace(/\(停业\)/g, '')              // 移除(停业)
    .replace(/\(装修中\)/g, '')            // 移除(装修中)
    .replace(/\(永久关闭\)/g, '')          // 移除(永久关闭)
    .replace(/\(临时关闭\)/g, '')          // 移除(临时关闭)
    .replace(/\(营业中\)/g, '')            // 移除(营业中)
    .replace(/\(24小时营业\)/g, '')        // 移除(24小时营业)
    .replace(/\(节假日休息\)/g, '')        // 移除(节假日休息)
    .replace(/\s+/g, ' ')                  // 清理多余空格
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
 * 检测用户输入是否为国内旅游
 */
function isInternationalTravel(prompt: string): boolean {
  // 国外城市和国家关键词
  const internationalKeywords = [
    // 热门国家
    '日本', '韩国', '泰国', '新加坡', '马来西亚', '印尼', '越南', '菲律宾', '缅甸', '柬埔寨', '老挝',
    '美国', '加拿大', '英国', '法国', '德国', '意大利', '西班牙', '荷兰', '瑞士', '奥地利', '俄罗斯',
    '澳大利亚', '新西兰', '印度', '巴基斯坦', '孟加拉', '斯里兰卡', '尼泊尔', '不丹', '马尔代夫',
    '土耳其', '伊朗', '伊拉克', '沙特', '阿联酋', '埃及', '摩洛哥', '南非', '肯尼亚', '坦桑尼亚',
    '巴西', '阿根廷', '智利', '秘鲁', '墨西哥', '古巴', '牙买加',
    
    // 热门国外城市
    '东京', '大阪', '京都', '横滨', '名古屋', '神户', '福冈', '札幌', '仙台', '广岛',
    '首尔', '釜山', '济州岛', '大邱', '仁川',
    '曼谷', '清迈', '普吉岛', '芭提雅', '华欣',
    '吉隆坡', '槟城', '兰卡威', '新加坡',
    '纽约', '洛杉矶', '拉斯维加斯', '旧金山', '芝加哥', '华盛顿', '波士顿', '迈阿密', '西雅图', '奥兰多',
    '伦敦', '巴黎', '罗马', '威尼斯', '佛罗伦萨', '巴塞罗那', '马德里', '阿姆斯特丹', '布鲁塞尔', '米兰',
    '柏林', '慕尼黑', '维也纳', '苏黎世', '莫斯科', '圣彼得堡', '布拉格', '布达佩斯',
    '悉尼', '墨尔本', '奥克兰', '布里斯班', '珀斯', '阿德莱德',
    '孟买', '新德里', '加尔各答', '班加罗尔', '金奈',
    '伊斯坦布尔', '安卡拉', '迪拜', '阿布扎比', '多哈', '科威特',
    '开罗', '亚历山大', '卡萨布兰卡', '马拉喀什',
    '里约热内卢', '圣保罗', '布宜诺斯艾利斯', '利马', '圣地亚哥',
    
    // 国外地区/州/省份
    '北海道', '本州', '四国', '九州', '冲绳',
    '加州', '纽约州', '佛州', '德州', '夏威夷',
    '巴厘岛', '爪哇岛', '苏门答腊',
    '西西里', '撒丁岛', '托斯卡纳',
    '巴伐利亚', '普罗旺斯', '安达卢西亚',
    '昆士兰', '新南威尔士', '维多利亚州',
    
    // 地区标识
    '欧洲', '北美', '南美', '非洲', '大洋洲', '中东', '东南亚', '南亚', '北欧', '西欧', '东欧',
    '出国', '国外', '海外', '境外', '签证', '护照', '免签', '落地签',
    
    // 特殊标识词
    '游轮', '邮轮', '国际航班', '跨国', '环球', '世界', '全球'
  ];
  
  // 检查是否包含国外关键词
  const lowerPrompt = prompt.toLowerCase();
  return internationalKeywords.some(keyword => 
    prompt.includes(keyword) || lowerPrompt.includes(keyword.toLowerCase())
  );
}

/**
 * 从用户输入中提取省份或城市信息
 */
function extractRegionFromPrompt(prompt: string): string | undefined {
  // 特殊地区映射
  const regionMappings: { [key: string]: string } = {
    '长三角': '江苏',
    '长江三角洲': '江苏', 
    '珠三角': '广东',
    '珠江三角洲': '广东',
    '京津冀': '北京',
    '环渤海': '北京',
    '粤港澳': '广东',
    '大湾区': '广东',
    '东北': '辽宁',
    '西北': '陕西',
    '西南': '四川',
    '华北': '北京',
    '华东': '江苏',
    '华南': '广东',
    '华中': '湖北'
  };
  
  // 先检查特殊地区
  for (const [region, mappedProvince] of Object.entries(regionMappings)) {
    if (prompt.includes(region)) {
      console.log(`检测到特殊地区: ${region} -> ${mappedProvince}`);
      return mappedProvince;
    }
  }
  
  // 中国省份列表
  const provinces = [
    '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
    '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
    '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃',
    '青海', '宁夏', '新疆', '内蒙古', '台湾', '香港', '澳门'
  ];
  
  // 主要城市列表（扩展版）
  const cities = [
    // 一线城市
    '深圳', '广州',
    // 新一线城市
    '杭州', '南京', '苏州', '成都', '西安', '武汉', '长沙', '郑州', '无锡', '宁波',
    // 二线城市
    '济南', '青岛', '大连', '沈阳', '哈尔滨', '长春', '石家庄', '太原', '呼和浩特',
    '南昌', '合肥', '福州', '厦门', '南宁', '海口', '昆明', '贵阳', '拉萨', '兰州',
    '西宁', '银川', '乌鲁木齐', '温州', '佛山', '东莞', '泉州', '惠州', '嘉兴',
    '烟台', '珠海', '镇江', '盐城', '金华', '台州', '绍兴', '湖州', '常州',
    // 热门旅游城市
    '桂林', '丽江', '大理', '三亚', '张家界', '九寨沟', '黄山', '泰山', '庐山',
    '峨眉山', '普陀山', '五台山', '华山', '衡山', '恒山', '嵩山', '武当山',
    '承德', '秦皇岛', '威海', '日照', '洛阳', '开封', '平遥', '凤凰', '阳朔'
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

    const { prompt, city, chatHistory } = parsed.data;

    // 检测是否为国外旅游
    if (isInternationalTravel(prompt)) {
      console.log("检测到国外旅游请求:", prompt);
      return Response.json({
        error: "抱歉，我们的旅游规划服务目前仅支持中国大陆地区。",
        title: "服务范围提醒",
        description: "我们专注于为您提供国内旅游的精准规划服务，包括景点推荐、路线规划、美食指南等。如需国内旅游规划，请重新输入您的需求。",
        pois: [],
      });
    }

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
      
      // 根据天数智能调整详细程度的prompt
      const systemPrompt = `你是旅游规划师。根据用户需求制定行程，注意控制回答长度避免超时。你能够基于之前的对话内容提供上下文相关的回答。

核心要求：
- 仔细阅读对话历史，准确理解用户的具体需求
- 如果用户询问具体某天的行程（如"第三天的行程安排"、"第四天怎么玩"），请：
  1. 仔细查看对话历史中assistant角色的回复，找到完整的多日行程规划
  2. 在行程规划中查找"第X天"或"DayX"的具体内容
  3. 精确定位用户询问的那一天（第1天、第2天、第3天、第4天、第5天等）
  4. 提取该天的景点和活动安排（如：玄武湖公园、湖南路美食街、鸡鸣寺、台城、狮子桥夜市等）
  5. 基于这些具体景点提供详细的时间、交通、用餐建议
  6. 绝对不要混淆不同天数的行程安排，也不要自己编造景点
- 如果是全新的旅游规划请求，严格按用户指定地区推荐景点，景点名要准确
- 景点总数控制在10个以内

重要提醒：
- 用户问第1天 → 回答第1天的安排
- 用户问第2天 → 回答第2天的安排
- 用户问第3天 → 回答第3天的安排
- 用户问第4天 → 回答第4天的安排
- 绝对不要弄错天数！

回答格式：

如果是询问具体某天的详细安排：
请严格按照对话历史中该天的安排来回答，格式如下：
【详细规划】第X天具体行程安排：
8:00-9:00 [具体活动]
9:00-12:00 [具体景点] - [游览建议]
12:00-13:00 [用餐建议]
13:00-17:00 [下午安排]
17:00-19:00 [晚餐和休息]
交通：[具体交通方案]
费用：[预估费用]
小贴士：[实用建议]

示例：如果对话历史中显示"第4天：自然人文 • 上午：玄武湖公园 • 中午：湖南路美食街 • 下午：鸡鸣寺+台城 • 晚上：狮子桥夜市"，
当用户询问"第4天的具体行程安排"时，你应该基于玄武湖公园、湖南路美食街、鸡鸣寺、台城、狮子桥夜市这些地点来制定详细安排。

如果是新的旅游规划：
标题：[简洁的行程标题]
[根据天数调整详细程度的每日安排]
[如果是4天以上行程，在结尾添加互动提示]
关键景点：[所有景点名称，用逗号分隔]`;
      
      // 构建包含上下文的消息历史
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // 如果有聊天历史，添加到消息中（不限制数量，测试完整上下文效果）
      if (chatHistory && chatHistory.length > 0) {
        for (const msg of chatHistory) {
          if (msg.type === 'user') {
            messages.push({ role: "user", content: msg.content });
          } else if (msg.type === 'ai') {
            messages.push({ role: "assistant", content: msg.content });
          }
        }
      }

      // 添加当前用户消息
      messages.push({ role: "user", content: prompt });

      console.log("发送AI请求 - 生成行程规划和景点...");
      console.log("当前用户问题:", prompt);
      console.log("消息历史详情:", {
        总消息数: messages.length,
        聊天历史条数: chatHistory?.length || 0,
        system消息: messages.filter(m => m.role === 'system').length,
        user消息: messages.filter(m => m.role === 'user').length,
        assistant消息: messages.filter(m => m.role === 'assistant').length,
        预估token数: messages.reduce((total, msg) => total + msg.content.length, 0)
      });
      
      // 打印聊天历史内容用于调试
      if (chatHistory && chatHistory.length > 0) {
        console.log("聊天历史内容:");
        chatHistory.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg.type}: ${msg.content.substring(0, 100)}...`);
        });
      }
      
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7, // 平衡创造性和一致性
        // 移除max_tokens限制，让AI充分发挥
      }, {
        timeout: 10000, // 10秒超时，确保长天数行程也能及时响应
      });
      
      const responseText = response.choices?.[0]?.message?.content || "";
      
      // 检测是否为上下文查询（详细询问某一天的行程安排）
      const isContextualQuery = responseText.includes("【详细规划】") || 
                                (!responseText.includes("标题：") && !responseText.includes("关键景点："));
      
      let planTitle: string;
      let planText: string;
      let keywords: string[] = [];
      
      if (isContextualQuery) {
        // 上下文查询：直接使用AI的回答，不搜索新的POI
        const detailMatch = responseText.match(/【详细规划】(.+?)：/);
        planTitle = detailMatch?.[1]?.trim() || "详细规划";
        planText = responseText.trim();
        keywords = []; // 不搜索新景点，保持现有地图标记
        console.log("检测到上下文查询，保持现有地图标记");
        console.log("响应文本包含【详细规划】:", responseText.includes("【详细规划】"));
        console.log("响应文本前100字符:", responseText.substring(0, 100));
      } else {
        // 标准新规划：解析标准格式
        const titleMatch = responseText.match(/标题：(.+)/);
        const keywordMatch = responseText.match(/关键景点：(.+)/);
        
        // 提取完整的规划内容（从推荐景点到关键景点之间的所有内容）
        const planMatch = responseText.match(/📍 推荐景点：([\s\S]*?)关键景点：/);
        
        planTitle = titleMatch?.[1]?.trim() || "旅游行程规划";
        planText = planMatch?.[1]?.trim() || responseText.replace(/标题：[^\n]*\n/, '').replace(/关键景点：[^\n]*/, '').trim();
        const keywordText = keywordMatch?.[1]?.trim() || "";
        
        keywords = keywordText
          .split(/[,，、\n]/)
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length < 50)
          .slice(0, 10);
          
        console.log("解析的关键词:", keywords);
        console.log("原始关键词文本:", keywordText);
      }
      
      console.log("解析的关键词:", keywords);
      
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
    
    // 如果是上下文查询，跳过POI搜索
    if (keywords.length === 0) {
      console.log("跳过POI搜索（上下文查询或无关键词）");
      return Response.json({
        title: plan.title,
        description: plan.description,
        pois: [],
        error: aiError
      });
    }
    
    // 添加延迟函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // 串行搜索关键词，避免触发API限制
    for (const keyword of keywords) {
      try {
        console.log(`搜索关键词: ${keyword}`);
        
        // 在请求之间添加延迟，避免触发QPS限制
        if (results.length > 0) {
          await delay(200); // 增加延迟，避免并发QPS超限
        }
        
        // 对于特殊景点名称，尝试多种搜索策略
        let pois = await searchPOI(keyword, searchCity);
        console.log(`${keyword} 搜索结果: ${pois.length} 个POI`);
        
        // 如果搜索结果为空或没有匹配城市的结果，尝试带城市前缀的搜索
        if (searchCity) {
          const hasMatchingCity = pois.some(poi => 
            poi.cityname?.includes(searchCity) || 
            poi.address?.includes(searchCity) ||
            poi.cityname?.includes(searchCity.replace('市', '')) ||
            poi.address?.includes(searchCity.replace('市', ''))
          );
          
          if (!hasMatchingCity) {
            await delay(100);
            console.log(`尝试带城市前缀搜索: ${searchCity}${keyword}`);
            const cityPrefixPois = await searchPOI(`${searchCity}${keyword}`, searchCity);
            console.log(`城市前缀搜索结果: ${cityPrefixPois.length} 个POI`);
            
            // 如果带城市前缀的搜索有结果，优先使用
            if (cityPrefixPois.length > 0) {
              pois = cityPrefixPois;
            }
          }
        }
        
        if (pois.length > 0) {
          // 如果用户指定了特定地区，严格匹配该地区的POI
          let selectedPoi = null;
          
          if (searchCity) {
            // 严格寻找城市名匹配的POI，支持多种匹配方式
            const cityMatchPoi = pois.find(poi => {
              const cityName = poi.cityname || '';
              const address = poi.address || '';
              
              // 精确匹配城市名
              if (cityName.includes(searchCity) || address.includes(searchCity)) {
                return true;
              }
              
              // 处理特殊情况：如"南京市"匹配"南京"
              if (searchCity.endsWith('市')) {
                const cityShort = searchCity.slice(0, -1);
                if (cityName.includes(cityShort) || address.includes(cityShort)) {
                  return true;
                }
              } else {
                const cityWithSuffix = searchCity + '市';
                if (cityName.includes(cityWithSuffix) || address.includes(cityWithSuffix)) {
                  return true;
                }
              }
              
              return false;
            });
            
            if (cityMatchPoi) {
              selectedPoi = cityMatchPoi;
              console.log(`✅ 为 ${keyword} 选择了城市匹配的POI: ${selectedPoi.name} (${selectedPoi.cityname})`);
            } else {
              console.log(`❌ ${keyword} 没有找到 ${searchCity} 地区的POI，跳过此关键词`);
              console.log(`可用POI城市: ${pois.map(p => p.cityname).join(', ')}`);
              continue; // 跳过不匹配城市的POI
            }
          } else {
            selectedPoi = pois[0]; // 如果没有指定城市，使用第一个结果
          }
          
          // 只有找到匹配的POI才处理
          if (selectedPoi) {
            const location = parseLocation(selectedPoi.location);
            
            if (location) {
              console.log(`${selectedPoi.name} 坐标来源: location字段`, location);
              const cleanedName = cleanPOIName(selectedPoi.name);
              results.push({
                name: cleanedName,
                city: selectedPoi.cityname || searchCity,
                address: selectedPoi.address,
                lat: location.lat,
                lng: location.lng,
              });
              console.log(`添加POI: ${cleanedName} (原名: ${selectedPoi.name}) (${selectedPoi.cityname})`, { lat: location.lat, lng: location.lng });
            }
          }
        } else {
          console.log(`⚠️ 关键词 "${keyword}" 最终没有找到有效POI`);
          console.log(`搜索城市: ${searchCity}`);
          console.log(`已找到的POI数量: ${results.length}`);
        }
        
      } catch (error) {
        console.error(`搜索关键词 ${keyword} 失败:`, error);
        
        // 如果是API限制错误，等待更长时间后重试
        if (error instanceof Error && error.message.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
          console.log(`检测到API限制，等待0.5秒后继续...`);
          await delay(500); // 增加等待时间，确保QPS恢复
        }
        
        continue; // 继续搜索下一个关键词
      }
    }
    
    // 最终验证：确保所有POI都符合指定地区
    let finalResults = results;
    if (searchCity && results.length > 0) {
      finalResults = results.filter(poi => {
        const isValidCity = poi.city?.includes(searchCity) || 
                           poi.city?.includes(searchCity.replace('市', '')) ||
                           poi.address?.includes(searchCity) ||
                           poi.address?.includes(searchCity.replace('市', ''));
        
        if (!isValidCity) {
          console.log(`🚫 最终验证：移除不符合地区要求的POI: ${poi.name} (${poi.city})`);
        }
        
        return isValidCity;
      });
      
      console.log(`✅ 最终验证完成：${finalResults.length}/${results.length} 个POI符合 ${searchCity} 地区要求`);
    }

    console.log("最终POI结果:", finalResults.length, "个地点");

    return Response.json({
      title: plan.title,
      description: plan.description,
      pois: finalResults,
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