#!/usr/bin/env python3
"""
Claude Code Hook: SessionStart Project Loader
==============================================
This hook runs at SessionStart to display project planning and progress.
It reads BTS_EXECUTION_PLAN.md and shows current status.

Configuration in .claude/settings.local.json:
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "python .claude/session_start_hook.py"
      }]
    }]
  }
}
"""

import json
import re
import sys
from pathlib import Path


def get_plan_content(project_root: Path) -> str:
    """Get the BTS execution plan content."""
    bts_plan_path = project_root / "BTS_EXECUTION_PLAN.md"
    if bts_plan_path.exists():
        return bts_plan_path.read_text(encoding="utf-8")

    # Fallback to docs/plans/
    plans_dir = project_root / "docs" / "plans"
    if plans_dir.exists():
        plan_files = list(plans_dir.glob("*.md"))
        if plan_files:
            # Get the most recently modified file
            latest = max(plan_files, key=lambda p: p.stat().st_mtime)
            return latest.read_text(encoding="utf-8")

    return ""


def extract_phases(content: str) -> list:
    """Extract phase information from the plan."""
    phases = []
    lines = content.split("\n")

    current_phase = None
    current_subsection = ""

    for line in lines:
        # Match Phase headers: ### Phase 1: xxx
        phase_match = re.match(r"^###\s+Phase\s+(\d+)[:：]\s*(.+)$", line)
        if phase_match:
            if current_phase:
                phases.append(current_phase)
            current_phase = {
                "name": f"Phase {phase_match.group(1)}: {phase_match.group(2).strip()}",
                "tasks": [],
                "completed": 0,
                "total": 0
            }
            current_subsection = ""
            continue

        # Match subsection headers: ### Section Name (status)
        sub_match = re.match(r"^###\s+(.+?)\s*\((.+?)\)$", line)
        if sub_match:
            if current_phase:
                phases.append(current_phase)
            is_completed = "已完成" in sub_match.group(2) or "完成" in sub_match.group(2)
            current_phase = {
                "name": sub_match.group(1).strip(),
                "tasks": [],
                "completed": 1 if is_completed else 0,
                "total": 1 if is_completed else 0,
                "isFullyCompleted": is_completed
            }
            current_subsection = sub_match.group(1).strip()
            continue

        # Match Task headers: ### Task N: xxx
        task_match = re.match(r"^###\s+Task\s+(\d+)[:：]\s*(.+)$", line)
        if task_match and current_phase:
            task_name = task_match.group(2).strip()
            current_phase["tasks"].append({
                "name": task_name,
                "status": "pending",
                "phase": current_subsection or "General"
            })
            current_phase["total"] += 1
            continue

        # Match checkbox tasks: - [ ] or - [x]
        checkbox_match = re.match(r"^\s*-\s\[([ x])\]\s+(.+)", line)
        if checkbox_match and current_phase:
            status = "completed" if checkbox_match.group(1) == "x" else "pending"
            task_name = checkbox_match.group(2).strip()

            # Clean up task name
            task_name = re.sub(r"`([^`]+)`", r"\1", task_name)
            task_name = task_name.replace("**", "")

            # Skip non-task lines
            if task_name.startswith("提交:") or task_name.startswith("- 提交:"):
                continue

            current_phase["tasks"].append({
                "name": task_name,
                "status": status,
                "phase": current_subsection or "General"
            })

            current_phase["total"] += 1
            if status == "completed":
                current_phase["completed"] += 1

        # Match status line: - 状态: ✅ 完成
        status_match = re.match(r"^\s*-\s+状态[:：]\s*✅\s+完成", line)
        if status_match and current_phase and current_phase["tasks"]:
            # Mark the last pending task as completed
            for task in reversed(current_phase["tasks"]):
                if task["status"] == "pending":
                    task["status"] = "completed"
                    current_phase["completed"] += 1
                    break

    if current_phase:
        phases.append(current_phase)

    return phases


def get_current_phase(phases: list) -> str:
    """Get the current active phase."""
    for phase in phases:
        if phase["completed"] < phase["total"]:
            return phase["name"]
    return phases[-1]["name"] if phases else "Planning"


def render_session_summary(project_root: Path) -> str:
    """Generate the session summary output."""
    plan_content = get_plan_content(project_root)
    phases = extract_phases(plan_content)

    # Calculate progress
    total_tasks = sum(p["total"] for p in phases)
    completed_tasks = sum(p["completed"] for p in phases)
    total_progress = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0)

    lines = []
    lines.append("=" * 78)
    lines.append("                           项目会话已加载                                    ")
    lines.append("=" * 78)
    lines.append("")
    lines.append("项目: BTS 翻牌前策略系统")
    lines.append("")
    lines.append("   基于 Bluff The Spot (BTS) 数据的翻牌前 GTO 策略系统")
    lines.append("   使用预计算的范围数据")
    lines.append("")
    lines.append("[目标]")
    lines.append("   - 保留现有 UI 设计（热力图、频率条）")
    lines.append("   - 替换后端为预计算数据查询系统")
    lines.append("   - 阶段 1: Open Raising + Facing Open 场景")
    lines.append("   - 快速响应: 毫秒级查询时间")
    lines.append("")
    lines.append("当前阶段: 阶段 1 (核心 MVP)")
    lines.append("")

    if phases:
        lines.append(f"总体进度: {total_progress}%")
        lines.append("")

        completed_phases = sum(1 for p in phases if p["total"] > 0 and p["completed"] == p["total"])
        total_phases = sum(1 for p in phases if p["total"] > 0)
        lines.append(f"   阶段: {completed_phases}/{total_phases} 已完成")
        lines.append(f"   总任务: {total_tasks}")
        lines.append(f"   已完成: {completed_tasks}")
        lines.append("")

    pending_count = sum(1 for p in phases for t in p["tasks"] if t["status"] == "pending")
    if pending_count > 0:
        lines.append(f"[待办任务: {pending_count} 个]")
        lines.append("")

    lines.append("-" * 78)
    lines.append("提示: 输入 \"show-plan\" 查看详细规划，\"show-status\" 查看开发状态")
    lines.append("")

    return "\n".join(lines)


def main():
    """Main entry point."""
    # Get project root (handle being in .claude directory)
    cwd = Path.cwd()
    if cwd.name == ".claude":
        project_root = cwd.parent
    else:
        project_root = cwd

    # Render and output
    output = render_session_summary(project_root)
    print(output)

    sys.exit(0)


if __name__ == "__main__":
    main()
