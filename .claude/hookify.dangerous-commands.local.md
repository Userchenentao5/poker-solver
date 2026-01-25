---
name: dangerous-commands
enabled: true
event: bash
action: warn
pattern: (rm\s+-rf|--force|dd\s+if=|mkfs|chmod\s+777|chown\s+root|:\(\)\s*{\s*:\|:\&\s*};:)
---

## ️  危险命令检测

检测到潜在危险的系统命令！

### 命令分析
- `rm -rf` - 递归强制删除，可能误删重要文件
- `dd if=` - 直接磁盘写入，可能破坏文件系统
- `mkfs` - 格式化文件系统，会清除所有数据
- `chmod 777` - 过于宽松的权限，存在安全风险
- `chown root` - 改变所有者，可能影响系统稳定性
- Fork bomb `:(){ :|:& };:` - 资源耗尽攻击

### 建议操作
1. **仔细检查目标路径** - 确认不会删除重要文件
2. **使用 --dry-run** - 先预览操作结果
3. **考虑替代方案** - 使用更安全的命令
4. **备份重要数据** - 操作前先备份

### 示例
```bash
# 危险
rm -rf /usr/local/*

# 安全
rm -rf ./temp_dir  # 限制范围
# 或
find ./temp_dir -delete  # 更明确的操作
```

**如果确认操作安全，可以继续执行。**
