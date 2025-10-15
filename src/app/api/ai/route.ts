import { NextRequest } from "next/server";
import { z } from "zod";
import { createOpenAIClient, getDefaultModel } from "@/lib/ai";
import { searchPOI, parseLocation } from "@/lib/amap-server";

type RegionLevel = 'province' | 'city';

type RegionMatch = {
  raw: string;
  name: string;
  level: RegionLevel;
};

type FollowUpSuggestion = {
  label: string;
  prompt: string;
};

const MUNICIPALITIES = new Set(['北京市', '天津市', '上海市', '重庆市']);
const MUNICIPALITY_SHORT_NAMES = new Set(['北京', '天津', '上海', '重庆']);

const PROVINCE_NORMALIZATION: Record<string, string> = {
  '北京': '北京市',
  '北京市': '北京市',
  '天津': '天津市',
  '天津市': '天津市',
  '上海': '上海市',
  '上海市': '上海市',
  '重庆': '重庆市',
  '重庆市': '重庆市',
  '内蒙古': '内蒙古自治区',
  '内蒙古自治区': '内蒙古自治区',
  '广西': '广西壮族自治区',
  '广西壮族自治区': '广西壮族自治区',
  '西藏': '西藏自治区',
  '西藏自治区': '西藏自治区',
  '宁夏': '宁夏回族自治区',
  '宁夏回族自治区': '宁夏回族自治区',
  '新疆': '新疆维吾尔自治区',
  '新疆维吾尔自治区': '新疆维吾尔自治区',
  '香港': '香港特别行政区',
  '香港特别行政区': '香港特别行政区',
  '澳门': '澳门特别行政区',
  '澳门特别行政区': '澳门特别行政区',
  '台湾': '台湾省',
  '台湾省': '台湾省',
};

const PROVINCE_SHORT_NAMES = new Set([
  '河北', '山西', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门', '台湾'
]);

const PROVINCE_CAPITALS: Record<string, string> = {
  '河北省': '石家庄',
  '山西省': '太原',
  '辽宁省': '沈阳',
  '吉林省': '长春',
  '黑龙江省': '哈尔滨',
  '江苏省': '南京',
  '浙江省': '杭州',
  '安徽省': '合肥',
  '福建省': '福州',
  '江西省': '南昌',
  '山东省': '济南',
  '河南省': '郑州',
  '湖北省': '武汉',
  '湖南省': '长沙',
  '广东省': '广州',
  '海南省': '海口',
  '四川省': '成都',
  '贵州省': '贵阳',
  '云南省': '昆明',
  '陕西省': '西安',
  '甘肃省': '兰州',
  '青海省': '西宁',
  '内蒙古自治区': '呼和浩特',
  '广西壮族自治区': '南宁',
  '西藏自治区': '拉萨',
  '宁夏回族自治区': '银川',
  '新疆维吾尔自治区': '乌鲁木齐',
  '台湾省': '台北',
  '香港特别行政区': '香港',
  '澳门特别行政区': '澳门',
};

const PROVINCE_CITY_SUGGESTIONS: Record<string, Array<{ city: string; reason: string }>> = {
  '河南省': [
    { city: '郑州', reason: '省会交通枢纽，可方便往返嵩山少林寺与黄河风景区' },
    { city: '洛阳', reason: '龙门石窟、洛邑古城等世界文化遗产集中' },
    { city: '开封', reason: '宋韵文化浓厚，清明上河园等夜游体验丰富' },
  ],
  '山东省': [
    { city: '济南', reason: '泉城风貌独特，大明湖与千佛山组合轻松游' },
    { city: '青岛', reason: '海滨城市，德式建筑与海鲜美食非常适合度假' },
    { city: '烟台', reason: '海岸线优美，可串联蓬莱阁等景点' },
  ],
  '浙江省': [
    { city: '杭州', reason: '西湖、灵隐寺等经典景点，适合慢节奏城市漫游' },
    { city: '宁波', reason: '港城风貌与东钱湖湿地资源兼具' },
    { city: '绍兴', reason: '鲁迅故里、水乡古镇体验原汁原味' },
  ],
  '江苏省': [
    { city: '南京', reason: '民国与六朝文化交织，城市景点覆盖面广' },
    { city: '苏州', reason: '园林世界遗产集中，拙政园、留园皆在市区内' },
    { city: '无锡', reason: '太湖风光宜人，可联游灵山大佛与拈花湾' },
  ],
  '广东省': [
    { city: '广州', reason: '岭南饮食与历史地标最集中，交通便捷' },
    { city: '深圳', reason: '现代都市体验丰富，适合亲子与主题乐园路线' },
    { city: '潮州', reason: '潮汕美食文化与古城风貌独特' },
  ],
  '四川省': [
    { city: '成都', reason: '美食、休闲与周边景区衔接最顺畅' },
    { city: '乐山', reason: '乐山大佛与峨眉山可在两日内打卡' },
    { city: '九寨沟', reason: '自然风光典型，适合深度自然主题行程' },
  ],
  '云南省': [
    { city: '昆明', reason: '春城四季如春，石林等景点距离适中' },
    { city: '大理', reason: '洱海与苍山构成经典慢旅行体验' },
    { city: '丽江', reason: '古城文化与玉龙雪山，自然与人文兼顾' },
  ],
  '海南省': [
    { city: '海口', reason: '进出岛交通最便捷，适合短途休闲' },
    { city: '三亚', reason: '度假酒店与海滩资源最丰富，适合海岛度假' },
    { city: '万宁', reason: '冲浪与轻户外体验热门，节奏更松弛' },
  ],
  '福建省': [
    { city: '厦门', reason: '鼓浪屿、曾厝垵等经典路线紧凑好逛' },
    { city: '泉州', reason: '海丝文化遗迹集中，适合历史主题旅行' },
    { city: '武夷山', reason: '世界自然与文化双遗产，适合生态主题行程' },
  ],
  '陕西省': [
    { city: '西安', reason: '兵马俑、城墙、博物馆等重磅景点集中' },
    { city: '延安', reason: '红色文化与黄土高原风貌鲜明' },
    { city: '汉中', reason: '三国文化与油菜花季出片景色兼备' },
  ],
};

const DEFAULT_CITY_SUGGESTIONS: Array<{ city: string; reason: string }> = [
  { city: '北京', reason: '历史地标与博物馆资源丰富，适合首访中国的旅行者' },
  { city: '上海', reason: '现代都市与海派文化交织，餐饮娱乐选择最多' },
  { city: '杭州', reason: '“上有天堂，下有苏杭”，自然与人文景观兼具' },
  { city: '成都', reason: '休闲城市节奏，川菜与熊猫基地广受欢迎' },
  { city: '西安', reason: '十三朝古都，体验中华文明源头最直接' },
];

function normalizeProvinceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (PROVINCE_NORMALIZATION[trimmed]) {
    return PROVINCE_NORMALIZATION[trimmed];
  }
  if (trimmed.endsWith('省') || trimmed.endsWith('自治区') || trimmed.endsWith('特别行政区')) {
    return trimmed;
  }
  return `${trimmed}省`;
}

function createRegionMatch(raw: string, level: RegionLevel): RegionMatch {
  const cleaned = raw.trim();
  if (level === 'province') {
    return {
      raw: cleaned,
      name: normalizeProvinceName(cleaned),
      level,
    };
  }
  const normalizedCity = cleaned.endsWith('市') ? cleaned.slice(0, -1) : cleaned;
  return {
    raw: cleaned,
    name: normalizedCity,
    level,
  };
}

function inferRegionLevel(text: string): RegionLevel {
  const trimmed = text.trim();
  if (!trimmed) return 'city';
  if (MUNICIPALITIES.has(trimmed) || MUNICIPALITY_SHORT_NAMES.has(trimmed)) {
    return 'city';
  }
  if (trimmed.endsWith('省') || trimmed.endsWith('自治区') || trimmed.endsWith('特别行政区')) {
    return 'province';
  }
  if (trimmed.endsWith('市') || trimmed.endsWith('州') || trimmed.endsWith('盟') || trimmed.endsWith('地区')) {
    return 'city';
  }
  if (PROVINCE_SHORT_NAMES.has(trimmed)) {
    return 'province';
  }
  return 'city';
}

function pickBestScope(candidates: RegionMatch[]): RegionMatch | undefined {
  if (!candidates.length) return undefined;
  const cityMatch = candidates.find(candidate => candidate.level === 'city');
  return cityMatch ?? candidates[0];
}

function sanitizeCityName(name: string): string {
  let cleaned = name.trim();
  // 去除常见的旅行语义后缀，避免出现“洛阳游/之旅”等
  cleaned = cleaned.replace(/(之旅|游玩|旅游|旅行|玩|游)$/g, '');
  // 标准化去除“市”以便匹配
  if (cleaned.endsWith('市')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * 使用AI从自然语言中抽取省/市级别目的地
 * 优先返回城市；无法确定时返回省份；失败返回undefined
 */
async function aiInferRegion(prompt: string): Promise<RegionMatch | undefined> {
  try {
    const openai = createOpenAIClient();
    const model = getDefaultModel();
    const system = [
      '你是地名抽取助手，只从用户话语中抽取与出行目的地相关的中国大陆省或市。',
      '规则：',
      '1) 只返回中国大陆的地名；',
      '2) 优先抽取城市，其次省份；仅返回一个最核心目的地；',
      "3) 以严格JSON返回：{\"name\":\"地名\",\"level\":\"city|province\"}",
      '4) 不要返回解释文本、不要Markdown、不要代码块。'
    ].join('\n');
    const user = `请从下面句子中抽取目的地：${prompt}`;

    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
    }, { timeout: 8000 });

    const text = resp.choices?.[0]?.message?.content?.trim() || '';
    try {
      const obj = JSON.parse(text) as { name?: string; level?: string };
      if (obj?.name && (obj.level === 'city' || obj.level === 'province')) {
        if (obj.level === 'city') {
          return createRegionMatch(obj.name, 'city');
        }
        return createRegionMatch(normalizeProvinceName(obj.name), 'province');
      }
    } catch {
      // 忽略JSON解析失败，回退到正则逻辑
    }
  } catch (e) {
    // AI超时或错误时回退
    console.log('AI地名抽取失败，回退到规则解析');
  }
  return undefined;
}

function createSuggestionPrompt(city: string): FollowUpSuggestion {
  const label = city.endsWith('市') ? city : city;
  return {
    label,
    prompt: `我想重点安排在${city}游玩，请以${city}为核心帮我规划详细行程`,
  };
}

function buildGeneralClarification(): { message: string; suggestions: FollowUpSuggestion[] } {
  const suggestionItems = DEFAULT_CITY_SUGGESTIONS.map(item => `${item.city}——${item.reason}`).map((text, index) => `${index + 1}. ${text}`);
  const suggestions = DEFAULT_CITY_SUGGESTIONS.map(item => createSuggestionPrompt(item.city));
  const message = [
    '为了给出更精准的行程规划，请先明确要去的城市。',
    '',
    '可以参考以下热门城市：',
    suggestionItems.join('\n'),
    ''
  ].join('\n');

  return { message, suggestions };
}

function buildProvinceClarification(scope: RegionMatch): { message: string; suggestions: FollowUpSuggestion[] } {
  const provinceName = normalizeProvinceName(scope.name);
  const displayName = scope.raw || provinceName;
  const defaultCity = PROVINCE_CAPITALS[provinceName];
  const provinceSuggestions = PROVINCE_CITY_SUGGESTIONS[provinceName] ?? (defaultCity
    ? [{ city: defaultCity, reason: '省会城市交通最方便，玩乐资源集中' }]
    : []);

  const suggestionTexts = provinceSuggestions.map((item, index) => `${index + 1}. ${item.city}——${item.reason}`);
  const suggestions = provinceSuggestions.map(item => createSuggestionPrompt(item.city));

  const messageParts = [
    `当前范围为 ${displayName}，请先选择具体城市，以便为你生成更精确的行程安排。`,
  ];

  if (suggestionTexts.length) {
    messageParts.push('', '可以优先考虑以下城市：', suggestionTexts.join('\n'));
  } else if (defaultCity) {
    messageParts.push('', `可以先从省会 ${defaultCity} 开始，市内景点丰富且交通衔接友好。`);
    suggestions.push(createSuggestionPrompt(defaultCity));
  }

  return {
    message: messageParts.join('\n'),
    suggestions,
  };
}

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
 * 清理文本中的代码格式
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
function extractRegionFromPrompt(prompt: string): RegionMatch | undefined {
  const text = prompt.replace(/\s+/g, '');

  // 1) 直辖市（含简称）优先匹配
  for (const full of MUNICIPALITIES) {
    if (text.includes(full)) return createRegionMatch(full, 'city');
  }
  for (const short of MUNICIPALITY_SHORT_NAMES) {
    if (text.includes(short)) return createRegionMatch(short, 'city');
  }

  // 2) 明确的“X省/自治区/特别行政区”写法
  const explicitProvinceMatch = text.match(/([\u4e00-\u9fa5]{2,8})(省|自治区|特别行政区)/);
  if (explicitProvinceMatch) {
    const raw = explicitProvinceMatch[0];
    return createRegionMatch(raw, 'province');
  }

  // 2.5) 自然语言句式提取：在X游玩 / 以X为核心 / 去X玩 / 到X旅行 等
  const naturalCityPatterns: RegExp[] = [
    /在([\u4e00-\u9fa5]{2,8})(?:市)?(?:.*?)(?:游|玩|旅游|旅行)/, // 在洛阳游/玩/旅游/旅行
    /以([\u4e00-\u9fa5]{2,8})(?:市)?为核心/,                 // 以洛阳为核心
    /到([\u4e00-\u9fa5]{2,8})(?:市)?(?:.*?)(?:游|玩|旅游|旅行)/, // 到洛阳玩/旅行
    /去([\u4e00-\u9fa5]{2,8})(?:市)?(?:.*?)(?:游|玩|旅游|旅行)/, // 去洛阳玩
  ];
  for (const pattern of naturalCityPatterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return createRegionMatch(m[1], 'city');
    }
  }

  // 3) 省份简称匹配（如“河南”“浙江”“新疆”）
  for (const shortName of PROVINCE_SHORT_NAMES) {
    if (text.includes(shortName)) {
      // 统一成标准全称（如“河南省”“新疆维吾尔自治区”）
      const normalized = PROVINCE_NORMALIZATION[shortName] || `${shortName}省`;
      return createRegionMatch(normalized, 'province');
    }
  }

  // 4) 城市名：匹配类似“南京市”“南京”这样的写法
  const cityWithSuffix = text.match(/([\u4e00-\u9fa5]{2,8})市/);
  if (cityWithSuffix) {
    return createRegionMatch(cityWithSuffix[0], 'city');
  }
  // 无“市”后缀但疑似城市（长度2-4的汉字串 搭配常见旅行词）
  const cityCandidate = text.match(/([\u4e00-\u9fa5]{2,4})(之旅|旅游|旅行|玩|游|行|攻略|美食|景点)/);
  if (cityCandidate) {
    return createRegionMatch(cityCandidate[1], 'city');
  }

  // 4.5) 仅城市名本身（2-4个汉字，无任何后缀），用于“温州”“绍兴”等直接输入
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(text)) {
    return createRegionMatch(text, 'city');
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

    // 从用户输入中提取地区信息，并从聊天历史中推断原始地区
    // 先尝试AI抽取目的地，失败再回退到规则解析
    let extractedRegion = await aiInferRegion(prompt);
    if (!extractedRegion) {
      extractedRegion = extractRegionFromPrompt(prompt);
    }

    const scopeCandidates: RegionMatch[] = [];

    if (city) {
      const providedRegion = (await aiInferRegion(city)) || extractRegionFromPrompt(city) || createRegionMatch(city, inferRegionLevel(city));
      if (providedRegion) {
        scopeCandidates.push(providedRegion);
      }
    }

    if (extractedRegion) {
      scopeCandidates.push(extractedRegion);
    }

    if (chatHistory && chatHistory.length > 0) {
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (msg.type === 'user') {
            const historicalRegion = (await aiInferRegion(msg.content)) || extractRegionFromPrompt(msg.content);
          if (historicalRegion) {
            scopeCandidates.push(historicalRegion);
            if (historicalRegion.level === 'city') {
              break;
            }
          }
        }
      }

      if (!scopeCandidates.some(scope => scope.level === 'city')) {
        for (let i = chatHistory.length - 1; i >= 0; i--) {
          const msg = chatHistory[i];
          if (msg.type === 'ai' && msg.data?.pois && msg.data.pois.length > 0) {
            const firstPoi = msg.data.pois[0];
            if (firstPoi.city) {
              const poiRegion = (await aiInferRegion(firstPoi.city)) || extractRegionFromPrompt(firstPoi.city) || createRegionMatch(firstPoi.city, inferRegionLevel(firstPoi.city));
              if (poiRegion) {
                scopeCandidates.push(poiRegion);
                break;
              }
            }
          }
        }
      }
    }

    const searchScope = pickBestScope(scopeCandidates);

    console.log("地区识别:", {
      userInput: prompt,
      extractedRegion,
      providedCity: city,
      finalSearchScope: searchScope,
    });

    if (!searchScope) {
      const { message, suggestions } = buildGeneralClarification();
      return Response.json({
        // 不返回标题，避免UI出现多余标题栏
        description: message,
        pois: [],
        requiresLocation: true,
        suggestions,
      });
    }

    if (searchScope.level === 'province') {
      const { message, suggestions } = buildProvinceClarification(searchScope);
      return Response.json({
        description: message,
        pois: [],
        requiresLocation: true,
        suggestions,
      });
    }

    const searchCity = searchScope.level === 'city' ? sanitizeCityName(searchScope.name) : searchScope.name;
    const searchCityDisplay = searchScope.raw || searchScope.name;

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
      
      // 智能旅游规划prompt - 增强地区一致性
      let systemPrompt = `你是专业的旅游规划师。根据用户需求制定详细行程，提供完整的旅游规划服务。你能够基于对话历史提供上下文相关的回答。

核心要求：
- 仔细阅读对话历史，准确理解用户的具体需求
- 识别用户是否要求重新规划行程（关键词包括：重新规划、重新安排、换个地方、改变路线、重新设计、换条线路、重新来、再规划一个、重新制定、修改行程等）
- 如果是重新规划请求，必须提供新的景点和完整的新行程，并在回答末尾包含"关键景点："部分
- **重要：地区一致性保持** - 如果对话历史中显示用户之前咨询某个地区的旅游，在重新规划时必须保持在同一地区内推荐景点
- 如果是第一个问题（没有对话历史），这必然是全新的旅游规划请求
- 如果用户询问具体某天的行程（如"第三天的行程安排"、"第四天怎么玩"），请：
  1. 仔细查看对话历史中assistant角色的回复，找到完整的多日行程规划
  2. 在行程规划中查找"第X天"或"DayX"的具体内容
  3. 精确定位用户询问的那一天（第1天、第2天、第3天、第4天、第5天等）
  4. 提取该天的景点和活动安排
  5. 基于这些具体景点提供详细的时间、交通、用餐建议
  6. 绝对不要混淆不同天数的行程安排，也不要自己编造景点
- 如果是全新的旅游规划请求或重新规划请求，严格按用户指定地区推荐景点，景点名要准确
- 提供详细完整的规划内容，包括时间安排、交通建议、费用估算、实用贴士等`;

      // 如果检测到地区信息，在系统提示中强调
      if (searchCityDisplay) {
        systemPrompt += `\n\n**重要提示：当前的旅游规划需要严格限定在 ${searchCityDisplay} 地区内。所有推荐的景点、餐厅、住宿都必须位于 ${searchCityDisplay} 及其周边区域。不要推荐其他城市或地区的景点。**`;
      }
      
      systemPrompt += `

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

如果是新的旅游规划或重新规划：
标题：[简洁的行程标题]
📍 推荐景点：[详细的每日行程安排，包括具体时间、景点介绍、交通方式、费用估算等]
💡 实用贴士：[交通建议、注意事项、最佳游览时间等]
💰 费用预算：[详细的费用分解]
关键景点：[所有景点名称，用逗号分隔]

重要：
1. 对于重新规划请求，必须提供全新的景点和路线，不要重复之前的推荐
2. 必须在回答末尾包含"关键景点："部分，以便系统在地图上标记新的地点
3. 请提供详细、实用的规划内容，帮助用户获得最佳的旅游体验`;
      
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
        // 移除所有限制，让AI提供最详细完整的回复
      }, {
        timeout: 30000, // 增加到30秒超时，支持更详细的回复
      });
      
      const responseText = response.choices?.[0]?.message?.content || "";
      
      // 智能检测上下文查询类型和重新规划意图
      const isFirstQuestion = !chatHistory || chatHistory.length === 0;
      const hasPreviousPlan = chatHistory && chatHistory.some(msg => 
        msg.type === 'ai' && msg.data?.pois && msg.data.pois.length > 0
      );
      
      // 检测是否为重新规划意图
      const replanningKeywords = [
        '重新规划', '重新安排', '换个地方', '改变路线', '重新设计', 
        '换条线路', '重新来', '再规划一个', '重新制定', '修改行程',
        '换个行程', '另外规划', '重新推荐', '另外推荐', '换个方案'
      ];
      const isReplanning = replanningKeywords.some(keyword => prompt.includes(keyword));
      
      console.log("重新规划意图检测:", {
        用户输入: prompt,
        检测到的关键词: replanningKeywords.filter(keyword => prompt.includes(keyword)),
        是否重新规划: isReplanning,
        是否第一个问题: isFirstQuestion,
        是否有历史规划: hasPreviousPlan
      });
      
      // 上下文查询判断逻辑：
      // 1. 如果包含【详细规划】，明确是详细询问
      // 2. 如果是第一个问题，肯定是新规划
      // 3. 如果之前没有过POI数据，也视为新规划
      // 4. 如果检测到重新规划意图，则视为新规划
      // 5. 如果回复中没有标题和关键景点，且不是第一个问题，可能是详细询问
      const isContextualQuery = !isFirstQuestion && 
                                hasPreviousPlan && 
                                !isReplanning &&
                                (responseText.includes("【详细规划】") || 
                                 (!responseText.includes("标题：") && !responseText.includes("关键景点：")));
      
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
        // 标准新规划或重新规划：解析标准格式
        console.log("识别为新规划或重新规划，将搜索新的POI地点");
        const titleMatch = responseText.match(/标题：(.+)/);
        const keywordMatch = responseText.match(/关键景点：(.+)/);
        
        // 提取完整的规划内容
        let planContent = "";
        if (responseText.includes("📍 推荐景点：")) {
          const planMatch = responseText.match(/📍 推荐景点：([\s\S]*?)(?=关键景点：|$)/);
          planContent = planMatch?.[1]?.trim() || "";
        } else {
          // 如果没有标准格式，提取标题后的所有内容作为规划内容
          planContent = responseText.replace(/标题：[^\n]*\n?/, '').replace(/关键景点：[^\n]*/, '').trim();
        }
        
        planTitle = titleMatch?.[1]?.trim() || "旅游行程规划";
        planText = planContent || responseText;
        const keywordText = keywordMatch?.[1]?.trim() || "";
        
        // 改进关键词提取逻辑
        if (keywordText) {
          keywords = keywordText
            .split(/[,，、\n]/)
            .map(k => k.trim())
            .filter(k => k.length > 0 && k.length < 50)
            .slice(0, 15); // 增加到15个关键词
        } else {
          // 如果没有关键景点，尝试从规划内容中提取景点名称
          const poiPatterns = [
            /([^\n，。！？]{2,8}公园)/g,
            /([^\n，。！？]{2,8}寺)/g,
            /([^\n，。！？]{2,8}山)/g,
            /([^\n，。！？]{2,8}湖)/g,
            /([^\n，。！？]{2,8}宫)/g,
            /([^\n，。！？]{2,8}庙)/g,
            /([^\n，。！？]{2,8}博物馆)/g,
            /([^\n，。！？]{2,8}广场)/g,
            /([^\n，。！？]{2,8}门)/g,
            /([^\n，。！？]{2,8}街)/g
          ];
          
          const extractedKeywords = new Set<string>();
          poiPatterns.forEach(pattern => {
            const matches = planText.match(pattern);
            if (matches) {
              matches.forEach(match => {
                if (match.length >= 2 && match.length <= 8) {
                  extractedKeywords.add(match);
                }
              });
            }
          });
          
          keywords = Array.from(extractedKeywords).slice(0, 15);
        }
          
        console.log("解析的关键词:", keywords);
        console.log("原始关键词文本:", keywordText);
        console.log("提取的规划内容长度:", planContent.length);
      }
      
      console.log("解析的关键词:", keywords);
      
      // 清理文本中的代码格式
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
        
        // 优先级搜索策略：先尝试带城市前缀的精确搜索
        let allPois: any[] = [];
        let bestPoi = null;
        
        if (searchCity) {
          // 策癑1：带城市前缀的精确搜索
          console.log(`策癑1: 城市前缀搜索 - ${searchCity}${keyword}`);
          const cityPrefixPois = await searchPOI(`${searchCity}${keyword}`, searchCity);
          console.log(`城市前缀搜索结果: ${cityPrefixPois.length} 个POI`);
          
          if (cityPrefixPois.length > 0) {
            allPois = [...allPois, ...cityPrefixPois.map(poi => ({ ...poi, searchType: 'cityPrefix', score: 100 }))];
          }
          
          await delay(150);
          
          // 策癑2：常规搜索但严格过滤
          console.log(`策癑2: 常规搜索 - ${keyword}`);
          const regularPois = await searchPOI(keyword, searchCity);
          console.log(`常规搜索结果: ${regularPois.length} 个POI`);
          
          if (regularPois.length > 0) {
            allPois = [...allPois, ...regularPois.map(poi => ({ ...poi, searchType: 'regular', score: 50 }))];
          }
        } else {
          // 如果没有指定城市，只做常规搜索
          const regularPois = await searchPOI(keyword);
          allPois = [...allPois, ...regularPois.map(poi => ({ ...poi, searchType: 'regular', score: 50 }))];
        }
        
        console.log(`合并后总共 ${allPois.length} 个POI候选`);
        
        // 严格预过滤：只保留匹配城市的POI
        if (searchCity && allPois.length > 0) {
          const filteredPois = allPois.filter(poi => {
            const cityName = poi.cityname || '';
            const address = poi.address || '';
            
            // 精确匹配城市名
            if (cityName.includes(searchCity) || address.includes(searchCity)) {
              poi.score += 50; // 精确匹配加分
              return true;
            }
            
            // 处理特殊情况：如“丹东市”匹配“丹东”
            if (searchCity.endsWith('市')) {
              const cityShort = searchCity.slice(0, -1);
              if (cityName.includes(cityShort) || address.includes(cityShort)) {
                poi.score += 30; // 略低的匹配分数
                return true;
              }
            } else {
              const cityWithSuffix = searchCity + '市';
              if (cityName.includes(cityWithSuffix) || address.includes(cityWithSuffix)) {
                poi.score += 30;
                return true;
              }
            }
            
            // 特殊处理：东北地区的省份匹配
            if (['辽宁', '吉林', '黑龙江'].includes(searchCity)) {
              const provinceShort = searchCity.replace('省', '');
              if (cityName.includes(provinceShort) || address.includes(provinceShort)) {
                poi.score += 20;
                return true;
              }
            }
            
            console.log(`✗ 过滤掉不匹配的POI: ${poi.name} (城市: ${cityName}, 地址: ${address})`);
            return false;
          });
          
          console.log(`预过滤后: ${filteredPois.length}/${allPois.length} 个POI符合 ${searchCity} 地区要求`);
          allPois = filteredPois;
        }
        
        // 智能评分排序：按照精确度排序
        if (allPois.length > 0) {
          // 额外的评分标准
          allPois.forEach(poi => {
            // 关键词匹配度加分
            if (poi.name.includes(keyword)) {
              poi.score += 40; // 名称包含关键词
            }
            
            // 类型匹配加分
            const touristTypes = ['景区', '公园', '寺', '庙', '山', '湖', '河', '博物馆', '纪念馆', '广场', '古迹'];
            if (touristTypes.some(type => poi.type?.includes(type) || poi.name.includes(type))) {
              poi.score += 20; // 旅游相关类型加分
            }
            
            console.log(`POI评分: ${poi.name} = ${poi.score}分 (城市: ${poi.cityname}, 搜索类型: ${poi.searchType})`);
          });
          
          // 按照评分排序，选择最优结果
          allPois.sort((a, b) => b.score - a.score);
          bestPoi = allPois[0];
          
          console.log(`✓ 最优POI: ${bestPoi.name} (评分: ${bestPoi.score}, 城市: ${bestPoi.cityname}, 搜索方式: ${bestPoi.searchType})`);
        }
        
        // 多重验证机制：最终验证是否符合要求
        if (bestPoi && searchCity) {
          const cityName = bestPoi.cityname || '';
          const address = bestPoi.address || '';
          
          const isCityMatch = cityName.includes(searchCity) || 
                             address.includes(searchCity) ||
                             cityName.includes(searchCity.replace('市', '')) ||
                             address.includes(searchCity.replace('市', '')) ||
                             (searchCity.endsWith('市') && 
                              (cityName.includes(searchCity.slice(0, -1)) || address.includes(searchCity.slice(0, -1))));
          
          if (!isCityMatch) {
            console.log(`❌ 最终验证失败: ${bestPoi.name} 不属于 ${searchCity} 地区`);
            console.log(`POI城市: ${cityName}, POI地址: ${address}`);
            continue; // 零容忍策略：直接跳过
          }
        }
        
        // 只有找到匹配的POI才处理
        if (bestPoi) {
          const location = parseLocation(bestPoi.location);
          
          if (location) {
            console.log(`${bestPoi.name} 坐标来源: location字段`, location);
            const cleanedName = cleanPOIName(bestPoi.name);
            const normalizedAddress = Array.isArray(bestPoi.address)
              ? (bestPoi.address.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0).join('、') || undefined)
              : bestPoi.address;

            results.push({
              name: cleanedName,
              city: bestPoi.cityname || searchCity,
              address: normalizedAddress,
              lat: location.lat,
              lng: location.lng,
            });
            console.log(`✓ 添加POI: ${cleanedName} (原名: ${bestPoi.name}) (城市: ${bestPoi.cityname}), 评分: ${bestPoi.score}`);
          }
        } else {
          console.log(`⚠️ 关键词 "${keyword}" 最终没有找到在 ${searchCity} 地区的有效POI`);
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
