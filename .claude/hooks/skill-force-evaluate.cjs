#!/usr/bin/env node
/**
 * Skill Force Evaluate hook handler
 * 通用强制技能评估 - 适用于任何项目
 *
 * 设计原则：
 * - 不包含项目特定的对象（如"热力图"、"heatmap"）
 * - 使用通用动词和模式
 * - 可直接复用到其他项目
 * - 检测并跳过 slash command，让 Claude Code 直接执行
 */

const fs = require('fs');
const path = require('path');

const scriptDir = path.dirname(process.argv[1]);
const markdownFile = path.join(scriptDir, 'UserPromptSubmit.md');
const logDir = path.join(process.env.CLAUDE_PROJECT_DIR || path.join(scriptDir, '..', '..'), '.claude', 'logs');
const logFile = path.join(logDir, 'skill-assessment.log.jsonl');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // 忽略错误
  }
}

/**
 * 检测输入是否为 slash command
 * 匹配格式: /command (单个斜杠命令，不带路径格式)
 * 例如: /help, /commit, /clear
 * 不匹配: /path/to/file, 普通文本
 */
function isSlashCommand(input) {
  if (!input || typeof input !== 'string') return false;

  // 获取第一个单词（按空白字符分割）
  const firstWord = input.split(/\s/)[0];

  // 正则: 以 / 开头，后跟一个或多个非斜杠、非空白字符
  // 例如: /help, /commit, /clear
  // 不匹配: /usr/bin, /a/b (包含额外斜杠), hello (无斜杠前缀)
  return /^\/[^\/\s]+$/.test(firstWord);
}

/**
 * 简单的日志记录函数
 */
function logAssessment(userInput, triggeredSkills) {
  try {
    const avgConfidence = triggeredSkills.length > 0
      ? (triggeredSkills.reduce((sum, s) => sum + s.confidence, 0) / triggeredSkills.length)
      : 0;

    const entry = {
      timestamp: new Date().toISOString(),
      userInput: userInput,
      userInputLength: userInput.length,
      triggeredSkills: triggeredSkills,
      skillCount: triggeredSkills.length,
      averageConfidence: avgConfidence,
      finalDecision: null,  // 将由 AI 填充
      userFeedback: null
    };

    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logFile, logLine, 'utf-8');
  } catch (e) {
    console.error(`[WARN] Failed to log assessment: ${e.message}`);
  }
}

/**
 * 通用关键词 → Skill 映射规则
 *
 * 设计原则：
 * 1. 使用通用动词和模式，不包含项目特定对象
 * 2. 设置否定模式，排除查询类输入
 * 3. 给每个规则添加置信度评分
 */
const keywordSkillMap = [
  // ==================== 调试/修复 ====================
  {
    positive: [/^(修复|fix|调试|debug|解决)/i, /^(帮我|请)?(修复|fix|调试|debug)/i],
    descriptive: [/(没有|缺失|不显示|无法显示|找不到|看不到|不存在|出错了|有问题)/i],
    negative: [/^(查看|显示|列出|是什么|如何|怎么|what|how|list|show)/i],
    skill: "superpowers:systematic-debugging",
    reason: "检测到问题修复请求",
    confidence: 0.8
  },
  // ==================== 实现/开发 ====================
  {
    positive: [/^(实现|添加|新增|创建|implement|add|create|build|开发)/i],
    negative: [/^(查看|显示|列出|是什么|如何|怎么|what|how|list|show)/i],
    skill: "superpowers:test-driven-development",
    reason: "检测到功能实现请求",
    confidence: 0.7
  },
  // ==================== 前端设计 ====================
  {
    positive: [/^(优化|改进|调整|修改|设计|重新设计|更新)/i, /^(参考|模仿|借鉴)/i],
    negative: [/^(查看|显示|列出|是什么)/i],
    skill: "frontend-design",
    reason: "检测到前端 UI 工作需求",
    confidence: 0.7
  },
  // ==================== 创意探索 ====================
  {
    positive: [/^(设计|构思|探索|brainstorm|design)/i],
    negative: [],
    skill: "superpowers:brainstorming",
    reason: "检测到创意工作需求",
    confidence: 0.6
  },
  // ==================== 规划 ====================
  {
    positive: [/^(规划|计划|制定)/i, /^(如何|怎么).*?(实现|做|写)/i],
    negative: [/^(查看|显示|列出|是什么)/i],
    skill: "superpowers:writing-plans",
    reason: "检测到规划需求",
    confidence: 0.6
  },
  // ==================== 并行任务 ====================
  {
    positive: [/同时|并行|分别|各自|一起/, /和.*?同时|分别.*?和/],
    descriptive: [/多个.*?任务|.*?任务.*?和.*?任务/],
    negative: [],
    skill: "superpowers:dispatching-parallel-agents",
    reason: "检测到多个独立任务",
    confidence: 0.6
  },
  // ==================== 执行计划 ====================
  {
    positive: [/执行计划|按计划|按照计划|follow plan|execute plan/i],
    negative: [/^(查看|显示|列出|是什么)/i],
    skill: "superpowers:executing-plans",
    reason: "检测到执行现有计划请求",
    confidence: 0.7
  },
  // ==================== 完成分支 ====================
  {
    positive: [/完成开发|分支完成|合并分支|ready to merge|finish branch/i],
    negative: [],
    skill: "superpowers:finishing-a-development-branch",
    reason: "检测到开发分支完成场景",
    confidence: 0.7
  },
  // ==================== 代码审查 ====================
  {
    positive: [/审查代码|code review|检查代码|review/i],
    descriptive: [/反馈|意见|建议|comment|feedback/i],
    negative: [],
    skill: "superpowers:receiving-code-review",
    reason: "检测到接收代码审查反馈",
    confidence: 0.6
  },
  {
    positive: [/请求审查|请审查|review request|需要审查/i],
    negative: [],
    skill: "superpowers:requesting-code-review",
    reason: "检测到请求代码审查",
    confidence: 0.6
  },
  // ==================== 验证/测试 ====================
  {
    positive: [/验证|检查|测试|verify|test|确认/i],
    descriptive: [/是否完成|是否正确|有没有问题|确保/i],
    negative: [/^(查看|显示|列出|是什么)/i],
    skill: "superpowers:verification-before-completion",
    reason: "检测到任务完成前验证需求",
    confidence: 0.6
  },
  // ==================== Git Worktrees ====================
  {
    positive: [/隔离|独立|worktree|分离|并行开发/i],
    negative: [],
    skill: "superpowers:using-git-worktrees",
    reason: "检测到隔离开发需求",
    confidence: 0.6
  },
  // ==================== 创建技能 ====================
  {
    positive: [/创建技能|写技能|new skill|create skill/i],
    negative: [],
    skill: "superpowers:writing-skills",
    reason: "检测到创建新技能请求",
    confidence: 0.7
  },
  // ==================== 子代理驱动开发 ====================
  {
    positive: [/使用代理|使用子代理|subagent|独立代理|执行计划.*代理/i],
    descriptive: [/代理.*执行|子代理.*任务/],
    negative: [],
    skill: "superpowers:subagent-driven-development",
    reason: "检测到使用独立代理执行计划需求",
    confidence: 0.7
  },
  // ==================== 记录笔记 ====================
  {
    positive: [/记录|全局记录|项目记录|note|记录到|文档化/i],
    descriptive: [/问题|解决方案|常见问题|注意事项/i],
    negative: [],
    skill: "user-scope-note",
    reason: "检测到记录全局问题需求",
    confidence: 0.6
  },
  {
    positive: [/项目记录|project note|项目问题/i],
    negative: [],
    skill: "project-scope-note",
    reason: "检测到记录项目问题需求",
    confidence: 0.6
  }
];

/**
 * 评估用户输入，返回应触发的技能列表
 *
 * 优化策略：
 * 1. 先检查否定模式，如果匹配则跳过
 * 2. 再检查肯定模式（动作动词开头）
 * 3. 最后检查描述性模式（问题描述）
 * 4. 只返回置信度 >= 0.6 的技能
 */
function evaluateSkills(input) {
  const skills = [];

  for (const rule of keywordSkillMap) {
    // 检查否定模式
    const negativeMatch = rule.negative && rule.negative.some(pattern => pattern.test(input));
    if (negativeMatch) {
      continue; // 跳过此规则
    }

    // 检查肯定模式（动作动词开头）
    let positiveMatch = false;
    if (rule.positive) {
      positiveMatch = rule.positive.some(pattern => pattern.test(input));
    }

    // 检查描述性模式（问题描述）
    let descriptiveMatch = false;
    if (rule.descriptive) {
      descriptiveMatch = rule.descriptive.some(pattern => pattern.test(input));
    }

    if ((positiveMatch || descriptiveMatch) && rule.confidence >= 0.6) {
      skills.push({
        skill: rule.skill,
        reason: rule.reason,
        confidence: rule.confidence
      });
    }
  }

  // 按置信度排序
  return skills.sort((a, b) => b.confidence - a.confidence);
}

// 主处理逻辑
let userInput = "";

try {
  // 从 stdin 读取 JSON 数据
  let stdinData = "";

  process.stdin.on('data', (chunk) => {
    stdinData += chunk;
  });

  process.stdin.on('end', () => {
    try {
      // 尝试解析 stdin 的 JSON
      if (stdinData.trim()) {
        const inputData = JSON.parse(stdinData);

        // 根据 Claude Code 官方文档:
        // UserPromptSubmit hook 的字段是 "prompt"
        // 参考: https://gist.github.com/FrancisBourre/50dca37124ecc43eaf08328cdcccdb34
        userInput =
          inputData.prompt ||           // 官方字段名
          inputData.user_input ||       // 备用字段（兼容性）
          inputData.message ||          // 备用字段
          (typeof inputData === 'string' ? inputData : "");

        // Debug removed to avoid Claude Code interpreting as error
      }
    } catch (e) {
      // Debug removed to avoid Claude Code interpreting as error
    }

    // 如果没有获取到用户输入，尝试从命令行参数获取
    if (!userInput) {
      for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] && !process.argv[i].startsWith('-')) {
          userInput = process.argv[i];
          break;
        }
      }
    }

    // ========== Slash Command 检测 ==========
    // 如果是 slash command，直接跳过评估，让 Claude Code 执行
    if (isSlashCommand(userInput)) {
      // 返回空结果，不添加任何额外上下文
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: ""
        },
        systemMessage: ""
      }));
      return;
    }
    // ========================================

    // 读取基础指令
    const content = fs.readFileSync(markdownFile, 'utf-8');
    const instructionsMatch = content.match(/## Instructions\s*\n([\s\S]+?)(?=^##\s|\Z)/m);
    const baseInstructions = instructionsMatch ? instructionsMatch[1].trim() : content;

    // 评估用户输入
    const triggeredSkills = evaluateSkills(userInput);

    // 记录评估结果到日志
    if (userInput) {
      logAssessment(userInput, triggeredSkills);
    }

    let skillInstruction = "";
    let systemMessage = "";

    if (triggeredSkills.length > 0 && userInput) {
      // 生成建议指令（两阶段评估：Hook 筛选 → AI 最终判断）
      const skillList = triggeredSkills.map(s =>
        `- ${s.skill}: ${s.reason} (置信度: ${(s.confidence * 100).toFixed(0)}%)`
      ).join('\n│  ');

      skillInstruction = `

┌─────────────────────────────────────────────────────────────────┐
│  📊 Hook 初步评估结果 (两阶段评估: Hook 筛选 → AI 最终判断)      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户输入: "${userInput}"                                        │
│                                                                  │
│  Hook 建议激活的技能:                                             │
│  ${skillList}                                                    │
│                                                                  │
│  ⚠️ 重要: 请根据实际意图进行最终判断                              │
│  • 如果用户确实需要执行相应任务 → 激活技能                        │
│  • 如果用户只是询问/确认 → 不激活技能                            │
│                                                                  │
│  判断依据:                                                        │
│  • 动作动词 vs 查询词汇                                          │
│  • 上下文意图                                                    │
│  • 置信度评分                                                    │
│                                                                  │
│  如果决定激活，使用 Skill 工具:                                   │
│  <skill>                                                         │
│    ${triggeredSkills[0].skill}                                   │
│  </skill>                                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
`;

      const skillNames = triggeredSkills.map(s => s.skill).join('\`, \`');
      const avgConfidence = (triggeredSkills.reduce((sum, s) => sum + s.confidence, 0) / triggeredSkills.length * 100).toFixed(0);
      systemMessage = `\n📊 Hook 检测到 ${triggeredSkills.length} 个可能相关的技能 (平均置信度: ${avgConfidence}%): \`${skillNames}\`\n请根据用户实际意图决定是否激活。`;
    } else if (userInput) {
      // 没有触发技能但有用户输入
      // (no debug output)
    } else {
      // 没有获取到用户输入，返回通用指令
      skillInstruction = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 技能评估指令 (详见 CLAUDE.md 开头 MANDATORY 部分)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

在回复用户前，先执行技能评估：

1. 检查用户输入是否包含:
   修复/fix/bug  → superpowers:systematic-debugging
   实现/添加/创建  → superpowers:test-driven-development
   设计/优化/调整  → frontend-design
   设计/构思/探索  → superpowers:brainstorming
   规划/计划/如何  → superpowers:writing-plans
   同时/并行/分别  → superpowers:dispatching-parallel-agents
   执行计划  → superpowers:executing-plans
   完成分支/合并  → superpowers:finishing-a-development-branch
   审查反馈  → superpowers:receiving-code-review
   请求审查  → superpowers:requesting-code-review
   子代理/独立代理  → superpowers:subagent-driven-development
   验证/测试/确认  → superpowers:verification-before-completion
   隔离/worktree  → superpowers:using-git-worktrees
   创建技能  → superpowers:writing-skills
   记录问题  → user-scope-note / project-scope-note

2. 输出评估日志 (格式见 CLAUDE.md)

3. 如果有匹配技能 → 使用 Skill 工具激活

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    const additionalContext = baseInstructions + skillInstruction;

    const output = {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: additionalContext
      },
      systemMessage: systemMessage
    };

    console.log(JSON.stringify(output, null, 2));
  });

} catch (error) {
  console.error(JSON.stringify({
    systemMessage: `Hook error: ${error.message}`,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "Hook 执行出错"
    }
  }));
  process.exit(0);
}
