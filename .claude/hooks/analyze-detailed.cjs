#!/usr/bin/env node
/**
 * 增强的日志分析工具 - 显示意图分类和匹配类型
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

function showDetailedStats() {
  const logs = readLogs(200);

  if (logs.length === 0) {
    console.log('📭 暂无日志记录');
    return;
  }

  // 统计各种维度
  const stats = {
    total: logs.length,
    intentTypes: {},
    matchTypes: {},
    skills: {},
    recentLogs: logs.slice(-5)
  };

  logs.forEach(entry => {
    // 意图类型统计
    if (entry.intentType) {
      stats.intentTypes[entry.intentType] = (stats.intentTypes[entry.intentType] || 0) + 1;
    }

    // 匹配类型统计
    if (entry.matchType) {
      stats.matchTypes[entry.matchType] = (stats.matchTypes[entry.matchType] || 0) + 1;
    }

    // 技能统计
    entry.triggeredSkills.forEach(s => {
      const skill = s.skill.split(':').pop();
      stats.skills[skill] = (stats.skills[skill] || 0) + 1;
    });
  });

  // 输出统计
  console.log('\n📊 技能评估详细统计\n');
  console.log(`总记录数: ${stats.total}\n`);

  console.log('🎯 意图类型分布:');
  Object.entries(stats.intentTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = (count / stats.total * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${pct}%)`);
    });

  console.log('\n🔍 匹配类型分布:');
  Object.entries(stats.matchTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const pct = (count / stats.total * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${pct}%)`);
    });

  console.log('\n🔥 最常触发的技能:');
  Object.entries(stats.skills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([skill, count]) => {
      console.log(`  ${skill}: ${count} 次`);
    });

  // 显示最近记录（带新字段）
  console.log('\n📋 最近记录 (带意图分类):');
  stats.recentLogs.forEach((entry, i) => {
    const skills = entry.triggeredSkills.map(s => s.skill.split(':').pop());
    const skillStr = skills.length > 0 ? skills.join(', ') : '(无)';
    const intent = entry.intentType || 'N/A';
    const match = entry.matchType || 'N/A';

    console.log(`\n${i + 1}. "${entry.userInput}"`);
    console.log(`   技能: ${skillStr}`);
    console.log(`   意图: ${intent} | 匹配: ${match}`);
  });
}

// 主函数
const command = process.argv[2] || 'detailed';

switch (command) {
  case 'detailed':
    showDetailedStats();
    break;
  default:
    console.log(`
用法:
  node analyze-detailed.cjs detailed    # 显示详细统计（含意图分类）
    `);
}
