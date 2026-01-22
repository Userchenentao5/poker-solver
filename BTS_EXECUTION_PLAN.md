# BTS 翻牌前策略执行计划

> 本文件记录 BTS 翻牌前策略系统的实施进度

## 设计文档

`docs/plans/2026-01-22-bts-preflop-strategy-design.md`

## 目标

基于 Bluff The Spot (BTS) 翻牌前策略 PDF，构建预计算的 6 人桌 GTO 策略查询系统。

**核心变更**：
- 移除 Rust CFR 实时计算
- 改用预计算的 BTS 策略数据
- 后端作为数据查询服务
- 前端保留现有 UI 设计

---

## Phase 1: 核心场景 MVP (1-2 天)

### Task 1: 数据目录结构
- [x] 创建 `server/src/data/bts/` 目录
- [x] 创建 `open/` 和 `facing-open/` 子目录
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 2: 手动转换核心场景数据
- [x] `btn.json` - BTN Open Raising 范围
- [x] `bb-vs-btn.json` - BB 面对 BTN Open
- [x] `bb-vs-utg.json` - BB 面对 UTG Open
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 3: 实现 Strategy API
- [x] 创建 `server/src/routes/strategy.ts`
- [x] 实现 `GET /api/strategy` 端点
- [x] 实现场景数据加载逻辑
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 4: 实现 Scenarios API
- [x] 创建 `server/src/routes/scenarios.ts`
- [x] 实现 `GET /api/scenarios` 端点
- [x] 创建场景索引文件 `scenarios.json`
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 5: 前端场景选择器
- [x] 创建 `web/src/components/ScenarioSelector.tsx`
- [x] 实现位置和场景类型选择 UI
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 6: 前端 BTS Strategy Hook
- [x] 创建 `web/src/hooks/useBTSStrategy.ts`
- [x] 实现策略数据获取逻辑
- [x] 添加 loading/error 状态处理
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 7: 前端集成
- [x] 修改 `web/src/components/GameFlow.tsx`
- [x] 集成 ScenarioSelector 和 useBTSStrategy
- [x] 保留 useCfrStrategy 作为可选（模式切换）
- [x] 状态: ✅ 完成 (2026-01-22)

### Task 8: 端到端测试
- [x] 测试完整流程：选择场景 → 显示策略
- [x] 验证数据准确性
- [x] 修复发现的问题
- [x] 状态: ✅ 完成 (2026-01-22)

**测试结果**：
- ✅ /api/scenarios - 返回所有可用场景
- ✅ /api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN - 返回 BB vs BTN 策略
- ✅ /api/strategy?positionA=BTN&type=OPEN - 返回 BTN Open Raising 策略
- ✅ 数据格式正确（169x3 矩阵 + 动作标签 + 摘要）

---

## Phase 2: 扩展场景 (2-3 天)

### Task 9: 转换所有 Open Raising 场景
- [ ] `utg.json` - UTG Open Raising
- [ ] `hj.json` - HJ Open Raising
- [ ] `co.json` - CO Open Raising
- [ ] `sb.json` - SB Open Raising
- [ ] 状态: 待开始

### Task 10: 转换 BB Facing Open 场景
- [ ] `bb-vs-hj.json` - BB 面对 HJ Open
- [ ] `bb-vs-co.json` - BB 面对 CO Open
- [ ] `bb-vs-sb.json` - BB 面对 SB Open
- [ ] 状态: 待开始

### Task 11: 转换 SB Facing Open 场景
- [ ] `sb-vs-utg.json` - SB 面对 UTG Open
- [ ] `sb-vs-hj.json` - SB 面对 HJ Open
- [ ] `sb-vs-co.json` - SB 面对 CO Open
- [ ] `sb-vs-btn.json` - SB 面对 BTN Open
- [ ] 状态: 待开始

### Task 12: 转换其他位置 Facing Open 场景
- [ ] BTN vs UTG/HJ/CO
- [ ] CO vs UTG/HJ
- [ ] 状态: 待开始

### Task 13: 数据验证脚本
- [ ] 创建 `tools/validate-bts-data.ts`
- [ ] 实现概率总和检查
- [ ] 实现手牌完整性检查
- [ ] 状态: 待开始

### Task 14: API 测试
- [ ] 编写策略 API 单元测试
- [ ] 编写场景 API 单元测试
- [ ] 测试错误处理
- [ ] 状态: 待开始

### Task 15: 性能优化
- [ ] 添加响应缓存
- [ ] 优化数据加载
- [ ] 状态: 待开始

---

## Phase 3: 完整覆盖与优化 (1 周)

### Task 16: 完整场景覆盖
- [ ] 确认所有 BTS PDF 中的场景已转换
- [ ] 生成完整场景索引
- [ ] 状态: 待开始

### Task 17: 自动化数据转换
- [ ] 创建 `tools/convert-bts-data.ts`
- [ ] 实现自动解析 BTS PDF
- [ ] 状态: 待开始

### Task 18: 数据压缩
- [ ] 优化 JSON 数据大小
- [ ] 考虑使用二进制格式
- [ ] 状态: 待开始

### Task 19: 完整测试
- [ ] 端到端测试套件
- [ ] 用户验收测试
- [ ] 性能测试
- [ ] 状态: 待开始

### Task 20: 文档编写
- [ ] API 文档
- [ ] 用户使用指南
- [ ] 状态: 待开始

---

## 文件变更记录

### Phase 1 新增文件
```
server/src/data/bts/
├── open/
│   ├── btn.json
│   └── bb-vs-utg.json
└── facing-open/
    └── bb-vs-btn.json

server/src/
├── routes/
│   ├── strategy.ts
│   └── scenarios.ts
└── utils/
    └── dataLoader.ts

web/src/
├── components/
│   └── ScenarioSelector.tsx
├── hooks/
│   └── useBTSStrategy.ts
└── types/
    └── bts.ts
```

---

## 开发原则

- 遵循 TDD：先写测试，再写实现
- 保持前端 UI 设计不变
- 数据准确性优先于性能
- 分阶段验证，确保每阶段可交付

---

## 进度追踪

### Phase 1: 核心场景 MVP ✅ 完成 (2026-01-22)
- [x] Task 1: 数据目录结构
- [x] Task 2: 手动转换核心场景数据
- [x] Task 3: Strategy API
- [x] Task 4: Scenarios API
- [x] Task 5: 场景选择器
- [x] Task 6: BTS Strategy Hook
- [x] Task 7: 前端集成
- [x] Task 8: 端到端测试

### Phase 2: 扩展场景
- [ ] Task 9: 所有 Open Raising 场景
- [ ] Task 10: BB Facing Open 场景
- [ ] Task 11: SB Facing Open 场景
- [ ] Task 12: 其他位置 Facing Open
- [ ] Task 13: 数据验证脚本
- [ ] Task 14: API 测试
- [ ] Task 15: 性能优化

### Phase 3: 完整覆盖
- [ ] Task 16: 完整场景覆盖
- [ ] Task 17: 自动化数据转换
- [ ] Task 18: 数据压缩
- [ ] Task 19: 完整测试
- [ ] Task 20: 文档编写

---

*创建时间: 2026-01-22*
*最后更新: 2026-01-22*
