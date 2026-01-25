#!/usr/bin/env node
/**
 * Cleanup temporary files on session stop
 * 清理会话结束时产生的临时文件
 *
 * Windows 特有问题:
 * - nul 是 Windows 保留设备名，误操作会创建问题文件
 * - 需要使用特殊方式删除
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..');
const logDir = path.join(projectDir, '.claude', 'logs');
const logFile = path.join(logDir, 'cleanup.log.jsonl');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // 忽略
  }
}

/**
 * 记录清理日志
 */
function logCleanup(result) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      ...result
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (e) {
    // 忽略日志错误
  }
}

/**
 * 删除 Windows 保留设备名文件（如 nul）
 * Windows 中 nul, con, prn, aux 等是保留设备名
 * 需要使用 UNC 路径删除: \\?\D:\path\to\nul
 */
function removeWindowsReservedFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    // 使用 UNC 路径前缀
    const uncPath = '\\\\?\\' + absolutePath.replace(/\//g, '\\');

    if (fs.existsSync(uncPath)) {
      fs.unlinkSync(uncPath);
      return { success: true, path: filePath, method: 'UNC-path' };
    }
    return { success: false, path: filePath, reason: 'not-found' };
  } catch (e) {
    // 尝试使用 PowerShell 删除
    try {
      execSync(`powershell -Command "Remove-Item -LiteralPath '${filePath}' -Force -ErrorAction SilentlyContinue"`, {
        cwd: projectDir,
        stdio: 'ignore'
      });
      return { success: true, path: filePath, method: 'PowerShell' };
    } catch (psError) {
      return { success: false, path: filePath, reason: e.message };
    }
  }
}

/**
 * 扫描并清理项目中的临时文件
 */
function cleanupTempFiles() {
  const results = {
    filesRemoved: [],
    errors: [],
    startTime: Date.now()
  };

  // Windows 保留设备名列表
  const reservedNames = ['nul', 'con', 'prn', 'aux', 'com1', 'com2', 'com3', 'com4',
                         'lpt1', 'lpt2', 'lpt3', 'lpt4'];

  // 扫描项目目录（排除 node_modules 和 .git）
  function scanDirectory(dir, depth = 0) {
    if (depth > 5) return; // 限制深度

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // 跳过特定目录
        if (entry.isDirectory() &&
            (entry.name === 'node_modules' ||
             entry.name === '.git' ||
             entry.name === 'target' ||
             entry.name === 'dist' ||
             entry.name === '.next')) {
          continue;
        }

        if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          if (reservedNames.includes(lowerName)) {
            const result = removeWindowsReservedFile(fullPath);
            if (result.success) {
              results.filesRemoved.push(result);
            } else {
              results.errors.push(result);
            }
          }
        } else if (entry.isDirectory() && depth < 3) {
          scanDirectory(fullPath, depth + 1);
        }
      }
    } catch (e) {
      // 跳过无权限的目录
    }
  }

  scanDirectory(projectDir);

  results.duration = Date.now() - results.startTime;
  results.projectDir = projectDir;

  return results;
}

// 执行清理
const results = cleanupTempFiles();
logCleanup(results);

// 输出结果（静默模式，不打扰用户）
if (results.filesRemoved.length > 0) {
  console.error(`[Cleanup] Removed ${results.filesRemoved.length} temp file(s) in ${results.duration}ms`);
}

if (results.errors.length > 0) {
  console.error(`[Cleanup] ${results.errors.length} error(s) occurred`);
}
