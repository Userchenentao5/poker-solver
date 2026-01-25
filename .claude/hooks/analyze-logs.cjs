#!/usr/bin/env node
/**
 * 技能评估日志分析工具
 *
 * 用法:
 *   node analyze-logs.cjsls          # 列出最近的记录
 *   node analyze-logs.cjs stats      # 显示统计信息
 *   node analyze-logs.cjs clear      # 清空日志
 */

const fs = require('fs');
const path = require('path');

const logDir = path.join(process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..'), '.claude', 'logs');
const logFile = path.join(logDir, 'skill-assessment.log.jsonl');

function readLogs(limit = 50) {
  if (!fs.existsSync(logFile)) {
    return [];
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n').slice(-limit);

  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(e => e !== null);
}

function listLogs(limit = 20) {
  const logs = readLogs(limit);

  if (logs.length === 0) {
    console.log('📭 暂无日志记录');
    return;
  }

  console.log(`\n📋 最近 ${logs.length} 条评估记录:\n`);

  logs.forEach((entry, i) => {
    const skills = entry.triggeredSkills.map(s => s.skill.split(':').pop());
    const skillStr = skills.length > 0 ? skills.join(', ') : '(无)';

    console.log(`${i + 1}. [${entry.timestamp.slice(0, 19).replace('T', ' ')}] "${entry.userInput}"`);
    console.log(`   技能: ${skillStr} (${entry.skillCount} 个, 置信度: ${(entry.averageConfidence * 100).toFixed(0)}%)`);
    console.log('');
  });
}

function showStats() {
  const logs = readLogs(1000);

  if (logs.length === 0) {
    console.log('📭 暂无日志记录');
    return;
  }

  // 统计
  const stats = {
    total: logs.length,
    withSkills: logs.filter(e => e.skillCount > 0).length,
    withoutSkills: logs.filter(e => e.skillCount === 0).length,
    topSkills: {},
    avgConfidence: 0,
    recentDate: null
  };

  // 技能频率
  logs.forEach(entry => {
    entry.triggeredSkills.forEach(s => {
      const skill = s.skill.split(':').pop();
      stats.topSkills[skill] = (stats.topSkills[skill] || 0) + 1;
    });
  });

  // 平均置信度
  const withConf = logs.filter(e => e.averageConfidence > 0);
  if (withConf.length > 0) {
    stats.avgConfidence = withConf.reduce((sum, e) => sum + e.averageConfidence, 0) / withConf.length;
  }

  // 最近日期
  stats.recentDate = logs[logs.length - 1].timestamp;

  // 输出统计
  console.log('\n📊 技能评估统计\n');
  console.log(`总记录数: ${stats.total}`);
  console.log(`触发技能: ${stats.withSkills} (${(stats.withSkills / stats.total * 100).toFixed(1)}%)`);
  console.log(`未触发技能: ${stats.withoutSkills} (${(stats.withoutSkills / stats.total * 100).toFixed(1)}%)`);
  console.log(`平均置信度: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`最近记录: ${stats.recentDate.slice(0, 19).replace('T', ' ')}`);

  console.log('\n🔥 最常触发的技能:');
  Object.entries(stats.topSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([skill, count]) => {
      console.log(`  ${skill}: ${count} 次`);
    });
}

function clearLogs() {
  if (!fs.existsSync(logFile)) {
    console.log('📭 日志文件不存在');
    return;
  }

  // 备份
  const backupFile = logFile + '.backup';
  fs.copyFileSync(logFile, backupFile);

  // 清空
  fs.writeFileSync(logFile, '');

  console.log(`✅ 日志已清空 (备份: ${backupFile})`);
}

// 主函数
const command = process.argv[2] || 'list';

switch (command) {
  case 'list':
    const limit = parseInt(process.argv[3]) || 20;
    listLogs(limit);
    break;
  case 'stats':
    showStats();
    break;
  case 'clear':
    clearLogs();
    break;
  default:
    console.log(`
用法:
  node analyze-logs.cjs list [数量]   # 列出最近的记录
  node analyze-logs.cjs stats         # 显示统计信息
  node analyze-logs.cjs clear         # 清空日志
    `);
}
