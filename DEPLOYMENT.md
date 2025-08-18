# 部署指南

## Netlify 部署 (推荐)

### 1. 连接仓库
1. 在 Netlify 后台选择 "New site from Git"
2. 连接 GitHub 并选择本项目仓库

### 2. 构建设置
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `18`

### 3. 环境变量
在 Netlify 的 Site settings → Environment variables 中添加：

```bash
# AI服务配置
OPENAI_API_KEY=your_deepseek_or_openai_api_key
OPENAI_BASE_URL=https://api.deepseek.com/v1  # DeepSeek用户
OPENAI_MODEL=deepseek-chat

# 高德地图配置  
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_api_key
AMAP_WEB_KEY=your_amap_web_api_key
```

### 4. 域名与白名单
部署成功后，将站点域名添加到高德地图控制台的白名单。

## 其他平台部署

### Railway
1. 连接GitHub仓库
2. 添加环境变量
3. 自动部署

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
1. 查看 Netlify build logs / function logs
2. 检查浏览器控制台错误
3. 验证环境变量配置
