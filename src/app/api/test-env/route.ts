import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 检查环境变量
    const envVars = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyPrefix: process.env.OPENAI_API_KEY ? 
        process.env.OPENAI_API_KEY.substring(0, 8) + "..." : "未设置",
      baseURL: process.env.OPENAI_BASE_URL || "未设置",
      model: process.env.OPENAI_MODEL || "未设置",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    return Response.json({
      success: true,
      message: "环境变量检查完成",
      data: envVars
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 });
  }
}


