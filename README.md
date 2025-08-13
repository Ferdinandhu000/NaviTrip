# NaviTrip 🗺️✈️

基于AI和高德地图的智能旅游规划应用，帮助用户快速生成个性化行程并在地图上可视化展示。

![Next.js](https://img.shields.io/badge/Next.js-15.4-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?logo=tailwindcss)

## ✨ 功能特点

- 🤖 **AI智能规划**: 使用DeepSeek/OpenAI生成个性化旅游行程
- 🗺️ **地图可视化**: 基于高德地图展示景点位置和路线规划
- 📍 **智能标记**: 自动标注起点、终点和途经地点
- 🛣️ **路线规划**: 自动生成景点间的最优行程路线
- 💬 **聊天界面**: 直观的对话式交互体验
- 📱 **响应式设计**: 完美适配桌面和移动设备

## 🚀 技术栈

### 前端
- **Next.js 15** - React全栈框架 (App Router)
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS 4** - 现代化CSS框架
- **Lucide React** - 精美的图标库

### 后端
- **Next.js API Routes** - 服务端API
- **OpenAI SDK** - AI对话服务
- **Axios** - HTTP客户端
- **Zod** - 运行时类型验证

### 地图服务
- **高德地图 JS API** - 地图渲染和交互
- **高德地图 Web API** - POI搜索和地理编码

### 开发工具
- **ESLint** - 代码质量检查
- **TypeScript** - 静态类型检查
- **SWR** - 数据获取和缓存

## 🛠️ 快速开始

### 环境要求

- Node.js 18+ 
- npm/yarn/pnpm

### 1. 克隆项目

```bash
git clone https://github.com/your-username/NaviTrip.git
cd NaviTrip
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 3. 环境配置

创建 `.env.local` 文件：

```bash
# AI服务配置 (必需)
OPENAI_API_KEY=your_openai_or_deepseek_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1  # DeepSeek用户
OPENAI_MODEL=deepseek-chat                   # 或 gpt-3.5-turbo

# 高德地图配置 (必需)
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_api_key
AMAP_WEB_KEY=your_amap_web_api_key
```

### 4. 获取API密钥

#### DeepSeek API (推荐)
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册账号并获取API密钥
3. 设置 `OPENAI_BASE_URL=https://api.deepseek.com/v1`

#### OpenAI API
1. 访问 [OpenAI平台](https://platform.openai.com/)
2. 创建API密钥
3. 不需要设置 `OPENAI_BASE_URL`

#### 高德地图API
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 创建应用获取以下密钥：
   - **JS API密钥**: 用于前端地图显示
   - **Web服务API密钥**: 用于后端POI搜索
3. 在控制台配置域名白名单：`localhost:3000`

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   │   ├── ai/            # AI规划接口
│   │   │   └── health/        # 健康检查
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx          # 首页
│   ├── components/            # React组件
│   │   ├── Chat.tsx          # 聊天交互组件
│   │   └── Map.tsx           # 地图显示组件
│   ├── lib/                  # 工具库
│   │   ├── ai.ts            # AI客户端配置
│   │   └── amap-server.ts   # 高德地图服务
│   └── types/               # TypeScript类型定义
│       └── plan.ts          # 旅游规划相关类型
├── public/                  # 静态资源
├── .env.local              # 环境变量 (需要创建)
├── next.config.ts          # Next.js配置
├── tailwind.config.js      # Tailwind配置
└── tsconfig.json          # TypeScript配置
```

## 🎯 使用方法

1. **输入旅游需求**: 在右侧聊天框中描述你的旅游计划
   - 例如："上海三日游，想去外滩、迪士尼、南京路"
   
2. **AI生成规划**: 系统自动生成详细的行程建议

3. **查看地图标记**: 左侧地图显示推荐景点的精确位置
   - 🟢 绿色"起" - 行程起点
   - 🔵 蓝色数字 - 途经景点  
   - 🔴 红色"终" - 行程终点

4. **路线规划**: 自动显示景点间的最优行车路线

5. **交互操作**: 
   - 点击地图标记查看详细信息
   - 切换地图样式
   - 缩放和拖拽地图

## 🔧 配置选项

### AI服务提供商

支持多种AI服务：

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# DeepSeek (推荐，成本更低)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### 地图样式

支持多种地图主题：
- `macaron` - 鲜艳主题 (默认)
- `fresh` - 清新主题
- `blue` - 蓝色主题
- `dark` - 暗色主题
- 更多样式...

## 🚀 部署

### Vercel (推荐)

1. Fork本项目到你的GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

### 其他平台

支持部署到任何支持Node.js的平台：
- Netlify
- Railway
- Heroku
- 自托管服务器

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📝 开发计划

- [ ] 支持多日行程规划
- [ ] 添加预算估算功能
- [ ] 集成天气信息
- [ ] 支持行程分享
- [ ] 移动端优化
- [ ] 离线地图支持

## ⚠️ 注意事项

1. **API配额**: 注意AI和地图API的使用配额
2. **密钥安全**: 不要将API密钥提交到代码仓库
3. **域名配置**: 部署后需要在高德控制台添加新域名
4. **HTTPS**: 生产环境建议使用HTTPS

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 优秀的React框架
- [高德地图](https://lbs.amap.com/) - 提供地图服务
- [DeepSeek](https://deepseek.com/) - 提供AI服务
- [Tailwind CSS](https://tailwindcss.com/) - 现代化CSS框架

---

如果这个项目对你有帮助，请给个⭐️支持一下！

## 📞 联系方式

如有问题或建议，请：
- 提交 [Issue](https://github.com/your-username/NaviTrip/issues)
- 发起 [Discussion](https://github.com/your-username/NaviTrip/discussions)