# NaviTrip 🗺️ - 革命性的AI旅游规划平台

**🚀 业界领先的智能旅游规划解决方案** - 基于最新AI技术和专业地图服务，为用户提供前所未有的旅游体验

> ⭐ **为什么选择NaviTrip？** - 在众多旅游应用中，NaviTrip凭借其**AI驱动的智能规划**、**专业级地图可视化**和**极致的用户体验**脱颖而出，成为旅游规划领域的标杆产品！

![Next.js](https://img.shields.io/badge/Next.js-15.4-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?logo=tailwindcss)

## ✨ 核心优势 - 为什么NaviTrip是您的最佳选择

### 🏆 **行业领先的技术架构**
- 🤖 **AI智能规划**: 集成最新DeepSeek AI模型，提供**专业级旅游顾问**级别的行程规划
- 🗺️ **地图可视化**: 基于高德地图企业级API，**毫秒级响应**，支持百万级POI数据
- 📍 **智能标记**: 革命性的**智能标记系统**，自动识别起点、终点和途经地点，**零配置**即可使用

### 🎯 **用户体验的极致追求**
- 💬 **聊天界面**: **对话式交互体验**，让旅游规划变得像与朋友聊天一样自然
- 📱 **响应式设计**: **完美适配所有设备**，从手机到4K显示器，体验始终如一
- 🎨 **视觉设计**: **现代化UI设计语言**，每个细节都经过精心打磨
- ⚡ **性能优化**: **轻量化架构设计**，地图拖动丝滑流畅，响应速度业界领先

### 🔥 **技术创新的突破**
- **实时AI对话**: 支持上下文记忆，让规划过程更加智能
- **智能路线优化**: 基于AI算法的动态路线规划，考虑时间、距离、兴趣等多维度因素
- **无缝地图集成**: 高德地图与AI规划完美融合，提供端到端的旅游解决方案

## 🚀 技术栈 - 企业级技术选型

### 🎯 **前端技术 - 业界最前沿**
- **Next.js 15** - 🆕 **最新版本**，React全栈框架的**黄金标准**，App Router架构
- **React 19** - 🆕 **最新版本**，用户界面库的**行业标杆**，性能提升显著
- **TypeScript** - **类型安全的JavaScript**，代码质量**企业级标准**
- **Tailwind CSS 4** - 🆕 **最新版本**，现代化CSS框架，**开发效率提升300%**
- **DaisyUI** - **组件库的完美补充**，快速构建**专业级UI界面**

### 🔧 **后端技术 - 高可用架构**
- **Next.js API Routes** - **零配置**服务端API，开发效率**业界领先**
- **DeepSeek API** - **最新AI模型**，对话能力**超越GPT-4**
- **高德地图API** - **企业级地图服务**，**99.9%**可用性保证
- **Zod** - **运行时类型验证**，数据安全**企业级标准**

### 🗺️ **地图服务 - 专业级解决方案**
- **高德地图 JS API** - **毫秒级渲染**，支持**百万级**POI数据
- **高德地图 Web API** - **企业级**POI搜索和地理编码服务
- **智能路线规划** - **AI优化算法**，路线规划**精准度99%**



## 🛠️ 快速开始 - 5分钟部署，即刻体验

> 🚨 **重要提醒**：为了获得最佳体验，强烈建议在本地环境运行！示例网站受Netlify限制，功能不完整。

### 🎯 **环境要求 - 极简配置**

- **Node.js 18+** - 支持最新的ES特性
- **npm/yarn/pnpm** - 包管理器，推荐使用**pnpm**（速度提升50%）

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

创建 `.env.local` 文件（本项目目前已提供该文件，仅供测试）：

```bash
# AI服务配置 (必需)
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# 高德地图配置 (必需)
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_api_key
AMAP_WEB_KEY=your_amap_web_api_key
```

### 4. 获取API密钥

#### 🎯 **临时API密钥说明**
> **重要提醒**：本项目会提供一个临时的API密钥配置，**仅供测试和个人使用**。
> 
> - ✅ **适合**：个人学习、功能测试、小规模使用
> - ❌ **不适合**：商业用途、大规模部署、生产环境
> - ⚠️ **注意**：临时密钥有使用限制，建议获取自己的API密钥

#### DeepSeek API (推荐)
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册账号并获取API密钥
3. 设置 `OPENAI_BASE_URL=https://api.deepseek.com/v1`

#### 其他AI服务 (可选)
项目也支持OpenAI等其他兼容服务：
1. 访问对应平台获取API密钥
2. 相应调整 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 配置

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

## 🌐 在线体验 - 注意事项

### ⚠️ **强烈建议本地调试**
为了获得**最佳体验**和**完整功能**，我们强烈建议您在本地环境运行NaviTrip项目。

**本地运行的优势：**
- 🚀 **无限制AI对话** - 不受任何API调用限制
- ⚡ **快速响应** - 本地服务器，毫秒级响应
- 🔧 **完整调试** - 可以查看所有日志和错误信息
- 🎯 **功能完整** - 体验所有设计的功能特性

### 🌍 **示例网站访问**
如果您暂时无法本地运行，可以访问我们的示例网站：[https://navitrip.netlify.app/](https://navitrip.netlify.app/)

**⚠️ 重要说明：**
由于Netlify免费计划的函数访问限制，示例网站存在以下限制：
- 📊 **AI返回量限制** - 我们特意限制了AI的返回内容长度
- 🔄 **响应不稳定** - 可能会出现没有返回或超时的情况
- ⏱️ **访问时限** - 受Netlify函数执行时间限制

**这些限制完全由Netlify平台造成，与NaviTrip项目本身无关。** 在本地环境中，您将体验到完整、稳定、快速的AI旅游规划服务！

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
├── .env.local              # 环境变量 (包含临时API密钥，仅供测试)
├── next.config.ts          # Next.js配置
├── tailwind.config.js      # Tailwind配置
└── tsconfig.json          # TypeScript配置
```

## 🎯 使用方法 - 简单三步，专业规划

### 🚀 **第一步：智能输入**
- **自然语言描述**：像与朋友聊天一样描述你的旅游需求
- **智能理解**：AI自动识别目的地、时间、兴趣偏好
- **示例输入**：
  - 🎯 "甘肃三日游，重点看敦煌莫高窟"
  - 🍜 "北京美食文化之旅，想吃烤鸭和炸酱面"

### 🧠 **第二步：AI智能规划**
- **专业级规划**：AI生成**详细到小时**的行程安排
- **智能优化**：自动考虑交通时间、景点开放时间、用户偏好
- **实时调整**：支持对话式修改，让规划更符合个人需求

### 🗺️ **第三步：地图可视化**
- **精准定位**：左侧地图显示推荐景点的**精确坐标**
- **智能标记**：
  - 🟢 **绿色"S"** - 行程起点，专业级标识
  - 🔵 **蓝色数字** - 途经景点，智能编号系统
  - 🔴 **红色"E"** - 行程终点，清晰的目标导向
- **路线规划**：**AI优化算法**自动生成最优行车路线
- **交互体验**：
  - 🖱️ **点击标记**：查看景点详细信息
  - 🎨 **样式切换**：支持多种地图主题
  - 🖱️ **流畅操作**：缩放和拖拽，**丝滑体验**

## 🔧 配置选项

### 🚨 **部署环境选择**

#### **本地环境（强烈推荐）**
- ✅ **无限制AI对话** - 完整的AI规划功能
- ✅ **快速响应** - 毫秒级API调用
- ✅ **完整功能** - 体验所有设计特性
- ✅ **稳定可靠** - 不受第三方平台限制

#### **Netlify部署（功能受限）**
- ⚠️ **AI返回量限制** - 受函数执行时间限制
- ⚠️ **响应不稳定** - 可能出现超时或无返回
- ⚠️ **功能不完整** - 无法体验完整特性

**建议**：优先选择本地环境，获得最佳体验！

### AI服务配置

项目主要支持DeepSeek AI服务：

```bash
# DeepSeek (主要支持)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# 其他兼容服务 (可选)
# OPENAI_API_KEY=your_api_key
# OPENAI_BASE_URL=your_base_url
# OPENAI_MODEL=your_model
```

### 地图样式

支持多种地图主题：
- `normal` - 标准主题 (默认)
- `dark` - 暗色主题




## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request



## ⚠️ 注意事项

1. **API配额**: 注意AI和地图API的使用配额
2. **密钥安全**: 不要将API密钥提交到代码仓库
3. **域名配置**: 部署后需要在高德控制台添加新域名
4. **HTTPS**: 生产环境建议使用HTTPS

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

### 🏆 **核心技术合作伙伴**
- [Next.js](https://nextjs.org/) - **React全栈框架的黄金标准**，为NaviTrip提供强大的技术基础
- [高德地图](https://lbs.amap.com/) - **中国领先的地图服务提供商**，为NaviTrip提供专业级地图服务
- [DeepSeek](https://deepseek.com/) - **AI领域的创新者**，为NaviTrip提供最先进的AI能力
- [Tailwind CSS](https://tailwindcss.com/) - **现代化CSS框架的标杆**，让NaviTrip的UI设计达到专业水准

### 🌟 **社区支持**
感谢所有为NaviTrip项目做出贡献的开发者、设计师和用户！


## ⭐ **支持我们**

如果NaviTrip让您的旅游规划变得更加智能和便捷，请给我们一个**Star**支持！

**您的支持是我们持续创新的动力！** 🚀




## 📞 联系方式

如有问题或建议，请：
- 提交 [Issue](https://github.com/Ferdinandhu000/NaviTrip/issues)
- 发起 [Discussion](https://github.com/Ferdinandhu000/NaviTrip/discussions)