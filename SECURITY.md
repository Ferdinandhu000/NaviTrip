# 🔐 NaviTrip 安全配置指南

## 📋 概述

本文档说明如何安全地配置 NaviTrip 项目，确保 API 密钥和敏感信息不会泄露到 GitHub 等公共代码仓库。

## ⚠️ 重要安全提醒

**🚨 绝对不要将真实的 API 密钥提交到 GitHub！**

- ❌ 不要在代码中硬编码 API 密钥
- ❌ 不要将 `.env.local` 文件提交到版本控制
- ❌ 不要在公开的文档中展示真实密钥
- ✅ 使用环境变量管理敏感信息
- ✅ 使用 `.env.example` 文件作为配置模板

## 🛡️ 安全配置步骤

### 1. 本地开发环境

1. **复制配置模板**：
   ```bash
   cp .env.example .env.local
   ```

2. **填入真实密钥**：
   编辑 `.env.local` 文件，替换占位符为真实的 API 密钥：
   ```bash
   # AI服务配置
   OPENAI_API_KEY=sk-your-real-api-key-here
   OPENAI_BASE_URL=https://api.deepseek.com/v1
   OPENAI_MODEL=deepseek-chat
   
   # 高德地图配置
   NEXT_PUBLIC_AMAP_JS_KEY=your-real-amap-js-key
   AMAP_WEB_KEY=your-real-amap-web-key
   ```

3. **验证 .gitignore**：
   确保 `.gitignore` 文件包含以下内容：
   ```
   # 环境变量文件
   .env*.local
   .env
   ```

### 2. GitHub 仓库安全

1. **检查提交历史**：
   ```bash
   # 检查是否意外提交了敏感文件
   git log --name-only | grep -E "\.env"
   ```

2. **如果已经提交了敏感信息**：
   ```bash
   # 从历史记录中完全删除敏感文件
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env.local' \
     --prune-empty --tag-name-filter cat -- --all
   
   # 强制推送更新远程仓库
   git push origin --force --all
   ```

### 3. 部署环境配置

本项目当前推荐部署到 Netlify。请在 Netlify 的项目设置中添加以下环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_AMAP_JS_KEY`
- `AMAP_WEB_KEY`

其他平台（Railway、自托管等）请参考各平台文档配置相应环境变量。

## 📁 项目文件说明

| 文件 | 用途 | 是否提交到 Git |
|------|------|----------------|
| `.env.example` | 配置模板，显示需要的环境变量 | ✅ 提交 |
| `.env.local` | 本地开发环境变量（包含真实密钥） | ❌ 不提交 |
| `.env` | 通用环境变量文件 | ❌ 不提交 |
| `.gitignore` | Git 忽略规则 | ✅ 提交 |

## 🔍 安全检查清单

在推送代码前，请确认：

- [ ] `.env.local` 文件未被 Git 跟踪
- [ ] 代码中没有硬编码的 API 密钥
- [ ] `.gitignore` 包含环境变量文件
- [ ] 提交历史中没有敏感信息
- [ ] 部署环境已正确配置环境变量

## 🚨 如果密钥泄露了怎么办？

1. **立即撤销泄露的密钥**：
   - DeepSeek: 访问 [DeepSeek 控制台](https://platform.deepseek.com/) 删除密钥
   - OpenAI: 访问 [OpenAI 控制台](https://platform.openai.com/) 撤销密钥
   - 高德地图: 访问 [高德开放平台](https://lbs.amap.com/) 重置密钥

2. **生成新的密钥**

3. **更新所有使用该密钥的环境**

4. **清理 Git 历史记录**（参考上面的步骤）

## 💡 最佳实践

1. **定期轮换密钥**：建议每 3-6 个月更换一次 API 密钥
2. **使用最小权限原则**：只给密钥分配必需的权限
3. **监控 API 使用情况**：定期检查 API 调用量和费用
4. **团队协作**：使用团队共享的密钥管理工具（如 1Password、Bitwarden）

## 📞 需要帮助？

如果您在配置过程中遇到问题：

1. 检查 [README.md](./README.md) 中的详细配置说明
2. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 中的部署指南
3. 在 GitHub Issues 中提问（注意不要泄露密钥）

---

**记住：安全无小事，保护好您的 API 密钥！** 🔐
