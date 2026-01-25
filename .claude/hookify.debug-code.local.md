---
name: debug-code
enabled: true
event: file
action: warn
conditions:
  - field: new_text
    operator: regex_match
    pattern: (console\.(log|debug|info|warn|error|table|trace)\(|debugger|print\(|console\.dir\(|console\.group)
---

##  调试代码检测

正在添加调试代码到项目中！

### 检测到的调试代码
- `console.log()` - 控制台日志
- `console.debug/info/warn/error` - 其他控制台输出
- `console.table/trace/dir/group` - 高级调试输出
- `debugger` - 断点调试语句
- `print()` - 打印语句

### 为什么要注意
- 调试代码不应提交到生产环境
- 可能暴露敏感信息（用户数据、API 响应等）
- 影响浏览器性能（大量日志时）
- 污染控制台输出

### 建议做法
1. **使用适当的日志库**
   ```typescript
   // 使用 pino、winston 等专业日志库
   import logger from './lib/logger'
   logger.info({ userId, action }, 'User performed action')
   ```

2. **环境变量控制**
   ```typescript
   const isDev = process.env.NODE_ENV === 'development'
   if (isDev) console.log('Debug info')
   ```

3. **提交前清理**
   ```bash
   # 搜索调试代码
   grep -r "console\.log" src/
   ```

4. **使用 ESLint 规则**
   ```json
   {
     "rules": {
       "no-console": "warn",
       "no-debugger": "error"
     }
   }
   ```

### 例外情况
如果是以下场景，可以忽略此警告：
- 新建的测试文件
- 日志库实现文件
- 专门的 debug 工具文件

**如果确认需要添加调试代码，请记住在提交前清理。**
