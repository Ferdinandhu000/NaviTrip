# 部署指南

## Vercel 部署 (推荐)

### 1. 准备工作
- 确保项目已推送到GitHub
- 注册Vercel账号

### 2. 导入项目
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 选择GitHub仓库
4. 导入项目

### 3. 配置环境变量
在Vercel项目设置中添加以下环境变量：

```bash
# AI服务配置
OPENAI_API_KEY=your_deepseek_or_openai_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1  # DeepSeek用户
OPENAI_MODEL=deepseek-chat

# 高德地图配置  
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_api_key
AMAP_WEB_KEY=your_amap_web_api_key
```

### 4. 部署设置
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 5. 域名配置
部署成功后：
1. 复制Vercel提供的域名
2. 在高德地图控制台添加该域名到白名单
3. 如使用自定义域名，同样需要添加到白名单

## 其他平台部署

### Netlify
1. 连接GitHub仓库
2. 构建命令：`npm run build`
3. 发布目录：`.next`
4. 配置环境变量

### Railway
1. 连接GitHub仓库
2. 添加环境变量
3. 自动部署

### Docker 部署
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 环境变量配置

### 必需变量
- `OPENAI_API_KEY`: AI服务API密钥
- `NEXT_PUBLIC_AMAP_JS_KEY`: 高德地图JS API密钥
- `AMAP_WEB_KEY`: 高德地图Web服务API密钥

### 可选变量
- `OPENAI_BASE_URL`: AI服务端点（DeepSeek用户必需）
- `OPENAI_MODEL`: AI模型名称
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`: 高德地图安全密钥

## 注意事项

1. **域名白名单**: 部署后必须在高德地图控制台添加域名
2. **HTTPS**: 生产环境建议使用HTTPS
3. **API配额**: 监控AI和地图API的使用量
4. **错误监控**: 建议集成错误监控服务

## 故障排除

### 常见问题
1. **地图不显示**: 检查域名是否在高德地图白名单中
2. **AI不响应**: 检查API密钥和端点配置
3. **构建失败**: 检查TypeScript类型错误

### 调试方法
1. 查看Vercel函数日志
2. 检查浏览器控制台错误
3. 验证环境变量配置
