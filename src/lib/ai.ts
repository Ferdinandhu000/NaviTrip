import OpenAI from "openai";

/**
 * 创建OpenAI客户端实例
 * 支持多种AI服务提供商，包括OpenAI和DeepSeek
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  
  if (!apiKey) {
    throw new Error("缺少AI API密钥，请设置环境变量 OPENAI_API_KEY");
  }
  
  // 确保DeepSeek使用正确的API端点
  const finalBaseURL = baseURL === 'https://api.deepseek.com' 
    ? 'https://api.deepseek.com/v1' 
    : baseURL;
  
  // 开发环境下输出配置信息
  if (process.env.NODE_ENV === 'development') {
    console.log("AI配置信息:", {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 8) + "...",
      baseURL: finalBaseURL || "默认OpenAI",
      model: getDefaultModel()
    });
  }
  
  return new OpenAI({ 
    apiKey, 
    baseURL: finalBaseURL,
    timeout: 180000, // 增加到180秒超时，支持更详细的回复
    maxRetries: 3   // 增加到最多重试3次
  });
}

/**
 * 获取默认AI模型
 */
export function getDefaultModel(): string {
  return process.env.OPENAI_MODEL || "deepseek-chat";
}

/**
 * AI服务提供商配置
 */
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek',
} as const;

/**
 * 检查当前使用的AI服务提供商
 */
export function getCurrentProvider(): string {
  const baseURL = process.env.OPENAI_BASE_URL;
  if (baseURL?.includes('deepseek.com')) {
    return AI_PROVIDERS.DEEPSEEK;
  }
  return AI_PROVIDERS.OPENAI;
}


