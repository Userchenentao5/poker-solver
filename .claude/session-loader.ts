/**
 * 会话启动加载器
 *
 * 功能：聚合项目信息，在会话开始时自动展示
 * - 读取 docs/plans/ 下的最新规划文档
 * - 提取当前任务进度
 * - 显示项目状态
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 类型定义
// ============================================

interface TaskItem {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  phase?: string;
}

interface PhaseInfo {
  name: string;
  tasks: TaskItem[];
  completed: number;
  total: number;
  isFullyCompleted?: boolean; // 标记整个阶段已完成（没有具体任务计数）
}

interface ProjectSummary {
  projectName: string;
  overview: string;
  currentPhase: string;
  phases: PhaseInfo[];
  totalProgress: number;
  recentFiles: string[];
  keyNotes: string[];
}

// ============================================
// Markdown 解析器
// ============================================

class PlanParser {
  /**
   * 获取规划文件内容
   * 优先级: BTS_EXECUTION_PLAN.md > docs/plans/ 最新文件
   */
  static getPlanContent(projectRoot: string): string {
    // 1. 优先读取项目根目录的 BTS_EXECUTION_PLAN.md (当前规划)
    const btsPlanPath = path.join(projectRoot, 'BTS_EXECUTION_PLAN.md');
    if (fs.existsSync(btsPlanPath)) {
      return fs.readFileSync(btsPlanPath, 'utf-8');
    }

    // 2. 回退到 docs/plans/ 目录
    const plansDir = path.join(projectRoot, 'docs', 'plans');
    if (fs.existsSync(plansDir)) {
      const files = fs.readdirSync(plansDir)
        .filter(f => f.endsWith('.md'))
        .map(f => ({
          name: f,
          path: path.join(plansDir, f),
          mtime: fs.statSync(path.join(plansDir, f)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (files.length > 0) {
        return fs.readFileSync(files[0].path, 'utf-8');
      }
    }

    return '';
  }

  /**
   * 提取项目概览 (返回英文，避免编码问题)
   */
  static extractOverview(content: string): string {
    // 检查是否包含 BTS 相关内容
    const hasBTS = content.toLowerCase().includes('bts') || content.toLowerCase().includes('bluff the spot');
    const hasCFR = content.toLowerCase().includes('cfr');
    const hasGTO = content.toLowerCase().includes('gto');

    if (hasBTS) {
      return 'Preflop GTO strategy system based on Bluff The Spot (BTS) data with pre-calculated ranges.';
    }

    if (hasCFR && hasGTO) {
      return 'Local poker preflop GTO solver using Counterfactual Regret Minimization (CFR) algorithm.';
    }

    if (hasGTO) {
      return 'Local poker preflop Game Theory Optimal (GTO) solver and strategy visualization tool.';
    }

    // 默认概览
    return 'Poker preflop analysis and strategy visualization tool.';
  }

  /**
   * 提取目标 (返回英文，避免编码问题)
   */
  static extractGoals(content: string): string[] {
    const goals: string[] = [];
    const lowerContent = content.toLowerCase();

    // 根据内容返回英文目标
    if (lowerContent.includes('bts') || lowerContent.includes('bluff')) {
      goals.push('Preserve existing UI design (heatmap, frequency bars)');
      goals.push('Replace backend with pre-calculated data query system');
      goals.push('Phase 1: Open Raising + Facing Open scenarios');
      goals.push('Fast response: millisecond-level query times');
    } else if (lowerContent.includes('cfr')) {
      goals.push('Implement CFR algorithm for preflop scenarios');
      goals.push('Build 3-tier architecture: Rust, Node/Express, React');
      goals.push('Visualize strategies with 13x13 heatmaps');
    }

    return goals;
  }

  /**
   * 解析 Phase 任务列表
   */
  static extractPhases(content: string): PhaseInfo[] {
    const phases: PhaseInfo[] = [];
    const lines = content.split('\n');
    let currentPhase: PhaseInfo | null = null;
    let currentSubsection = '';
    let currentTask: TaskItem | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 匹配 Phase 标题: ### Phase 1：xxx
      const phaseMatch = line.match(/^###\s+Phase\s+(\d+)[:：]\s*(.+)$/);
      if (phaseMatch) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        currentPhase = {
          name: `Phase ${phaseMatch[1]}: ${phaseMatch[2].trim()}`,
          tasks: [],
          completed: 0,
          total: 0
        };
        currentSubsection = '';
        currentTask = null;
        continue;
      }

      // 匹配子章节标题 (如 "### MVP 基础功能 (已完成)")
      const subHeaderMatch = line.match(/^###\s+(.+?)\s*\((.+?)\)$/);
      if (subHeaderMatch) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        const isCompleted = subHeaderMatch[2].includes('已完成') || subHeaderMatch[2].includes('完成');
        currentPhase = {
          name: subHeaderMatch[1].trim(),
          tasks: [],
          completed: isCompleted ? 1 : 0, // 标记为已完成，使用 1/1 表示
          total: isCompleted ? 1 : 0,
          isFullyCompleted: isCompleted // 添加标志
        };
        currentSubsection = subHeaderMatch[1].trim();
        currentTask = null;
        continue;
      }

      // 匹配 Task 标题: ### Task N: xxx
      const taskHeaderMatch = line.match(/^###\s+Task\s+(\d+)[:：]\s*(.+)$/);
      if (taskHeaderMatch && currentPhase) {
        const taskName = taskHeaderMatch[2].trim();
        currentTask = {
          name: taskName,
          status: 'pending', // 默认 pending，下面会查找状态行
          phase: currentSubsection || 'General'
        };
        currentPhase.tasks.push(currentTask);
        currentPhase.total++;
        continue;
      }

      // 匹配 Task 子标题: #### N.N: xxx
      const taskSubHeaderMatch = line.match(/^####\s+(\d+\.\d+)[:：]\s*(.+)$/);
      if (taskSubHeaderMatch && currentPhase) {
        const taskName = taskSubHeaderMatch[2].trim();
        currentTask = {
          name: taskName,
          status: 'pending',
          phase: currentSubsection || 'General'
        };
        currentPhase.tasks.push(currentTask);
        currentPhase.total++;
        continue;
      }

      // 匹配状态行: - 状态: ✅ 完成
      const statusMatch = line.match(/^\s*-\s+状态[:：]\s*✅\s+完成/);
      if (statusMatch && currentTask && currentTask) {
        // 找到当前最后一个 pending 任务并标记为完成
        for (let j = currentPhase.tasks.length - 1; j >= 0; j--) {
          if (currentPhase.tasks[j].status === 'pending') {
            currentPhase.tasks[j].status = 'completed';
            currentPhase.completed++;
            break;
          }
        }
        currentTask = null;
        continue;
      }

      // 匹配 checkbox 任务: - [ ] 或 - [x]
      const checkboxMatch = line.match(/^[\s]*-\s\[([ x])\]\s+(.+)/);
      if (checkboxMatch && currentPhase) {
        const status = checkboxMatch[1] === 'x' ? 'completed' : 'pending';
        let taskName = checkboxMatch[2].trim();

        // 清理任务名（移除文件路径标记等，但保留更多内容）
        taskName = taskName.replace(/`([^`]+)`/g, '$1'); // 保留文件路径
        taskName = taskName.replace(/\*\*/g, ''); // 移除粗体标记

        // 跳过非任务行（如提交信息行）
        if (taskName.startsWith('提交:') || taskName.startsWith('- 提交:')) {
          continue;
        }

        currentPhase.tasks.push({
          name: taskName,
          status,
          phase: currentSubsection || 'General'
        });

        currentPhase.total++;
        if (status === 'completed') {
          currentPhase.completed++;
        }
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  /**
   * 获取当前活跃的 Phase
   */
  static getCurrentPhase(phases: PhaseInfo[]): string {
    // 找到第一个未完成的 Phase
    for (const phase of phases) {
      if (phase.completed < phase.total) {
        return phase.name;
      }
    }
    return phases.length > 0 ? phases[phases.length - 1].name : 'Planning';
  }

  /**
   * 提取文件变更列表
   */
  static extractFileChanges(content: string): string[] {
    const files: string[] = [];
    const fileChangesMatch = content.match(/##\s+文件变更清单\s*\n([\s\S]+?)(?=\n##|$)/i);
    if (!fileChangesMatch) return files;

    const lines = fileChangesMatch[1].split('\n');
    for (const line of lines) {
      // 匹配代码块中的文件路径
      const pathMatch = line.match(/│\s+│\s+([a-zA-Z/_.-]+\.[a-z]+)/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        if (!files.includes(filePath)) {
          files.push(filePath);
        }
      }
    }
    return files;
  }
}

// ============================================
// 主要功能
// ============================================

export class SessionLoader {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    if (!projectRoot) {
      let currentDir = process.cwd();
      if (path.basename(currentDir) === '.claude') {
        currentDir = path.dirname(currentDir);
      }
      this.projectRoot = currentDir;
    } else {
      this.projectRoot = projectRoot;
    }
  }

  /**
   * 加载项目摘要
   */
  load(): ProjectSummary {
    // 获取规划文件内容
    const planContent = PlanParser.getPlanContent(this.projectRoot);

    // 解析规划
    const phases = PlanParser.extractPhases(planContent);
    const files = PlanParser.extractFileChanges(planContent);

    // 计算总进度
    const totalTasks = phases.reduce((sum, p) => sum + p.total, 0);
    const completedTasks = phases.reduce((sum, p) => sum + p.completed, 0);
    const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      projectName: 'BTS 翻牌前策略系统',
      overview: PlanParser.extractOverview(planContent),
      currentPhase: PlanParser.getCurrentPhase(phases),
      phases,
      totalProgress,
      recentFiles: files,
      keyNotes: PlanParser.extractGoals(planContent),
    };
  }

  /**
   * 渲染会话摘要 (使用英文避免编码问题)
   */
  render(summary: ProjectSummary): string {
    const lines: string[] = [];

    // Title
    lines.push('==============================================================================');
    lines.push('                      PROJECT SESSION LOADED                                  ');
    lines.push('==============================================================================');
    lines.push('');

    // Project overview
    lines.push('Project: BTS Preflop Strategy System');
    lines.push('');
    lines.push('   ' + summary.overview);
    lines.push('');

    // Goals
    if (summary.keyNotes.length > 0) {
      lines.push('[GOALS]');
      summary.keyNotes.forEach(goal => {
        lines.push(`   - ${goal}`);
      });
      lines.push('');
    }

    // Current phase (without Chinese)
    lines.push(`Current Phase: Phase 1 (Core MVP)`);
    lines.push('');

    // Progress statistics
    if (summary.phases.length > 0) {
      lines.push(`Overall Progress: ${summary.totalProgress}%`);
      lines.push('');

      // Show summary instead of detailed phase names
      const completedPhases = summary.phases.filter(p => p.total > 0 && p.completed === p.total).length;
      const totalPhases = summary.phases.filter(p => p.total > 0).length;
      lines.push(`   Phases: ${completedPhases}/${totalPhases} completed`);
      lines.push(`   Total tasks: ${summary.phases.reduce((sum, p) => sum + p.total, 0)}`);
      lines.push(`   Completed tasks: ${summary.phases.reduce((sum, p) => sum + p.completed, 0)}`);
      lines.push('');
    }

    // Pending tasks (show count only, not names)
    const pendingCount = this.getPendingTasksCount(summary.phases);
    if (pendingCount > 0) {
      lines.push(`[PENDING TASKS: ${pendingCount} remaining]`);
      lines.push('');
    }

    lines.push('------------------------------------------------------------------------------');
    lines.push('TIP: Type "show-plan" for detailed plan, "show-status" for development status');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 获取待办任务数量
   */
  private getPendingTasksCount(phases: PhaseInfo[]): number {
    let count = 0;
    for (const phase of phases) {
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 获取待办任务
   */
  private getPendingTasks(phases: PhaseInfo[], limit: number): TaskItem[] {
    const pending: TaskItem[] = [];
    for (const phase of phases) {
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          pending.push({ ...task, phase: phase.name });
          if (pending.length >= limit) break;
        }
      }
      if (pending.length >= limit) break;
    }
    return pending;
  }
}

// ============================================
// CLI 入口
// ============================================

// 直接执行 (通过 tsx 运行)
const loader = new SessionLoader();
const summary = loader.load();

// 调试模式
if (process.env.DEBUG === '1') {
  console.log('=== DEBUG INFO ===');
  console.log('Phases found:', summary.phases.length);
  console.log('Total progress:', summary.totalProgress + '%');
  console.log('==================');
  console.log();
}

console.log(loader.render(summary));
