---
name: sensitive-files
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: (\.env$|credentials|\.pem$|\.key$|private|secret|config\.local\.(json|js|ts)$|\.claude/settings\.local\.json$)
---

##  敏感文件检测

正在编辑包含敏感信息的配置文件！

### 检测到的文件类型
- `.env` - 环境变量（可能包含 API 密钥、数据库凭证）
- `credentials` - 凭证文件
- `.pem/.key` - 私钥文件
- `private/secret` - 私有/秘密配置
- `config.local.*` - 本地配置文件
- `.claude/settings.local.json` - Claude 本地设置

### 安全建议
1. **确保 .gitignore 包含这些文件**
   ```gitignore
   .env
   *.local.*
   credentials*
   *.pem
   *.key
   ```

2. **不要提交到版本控制**
   - 检查 `git status` 确认这些文件未被追踪
   - 使用 `git rm --cached` 移除已提交的敏感文件

3. **使用环境变量替代硬编码**
   ```typescript
   // 坏
   const apiKey = "sk-1234567890"

   // 好
   const apiKey = process.env.API_KEY
   ```

4. **提供示例文件**
   ```bash
   cp .env .env.example
   # 然后编辑 .env.example，替换敏感值为占位符
   ```

**如果只是本地开发配置且已正确忽略，可以继续。**
