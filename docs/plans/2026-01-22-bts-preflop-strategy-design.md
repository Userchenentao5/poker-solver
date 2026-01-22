# BTS 翻牌前策略系统设计

## 概述

基于 Bluff The Spot (BTS) 翻牌前策略 PDF，构建一个预计算的 6 人桌 GTO 策略查询系统。用户选择位置对位场景（A 位置 vs B 位置），系统快速返回该场景下的策略数据。

### 目标

- **保留现有前端设计**：热力图、频率条等 UI 组件
- **重新设计后端服务**：从实时 CFR 计算改为预计算数据查询
- **第一阶段场景**：Open Raising + Facing Open
- **快速响应**：基于预计算数据，毫秒级响应

---

## 整体架构

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                        前端层                             │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ ScenarioSelector│  │ GameFlow + Heatmap + Bars    │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│                        服务层                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  GET /api/strategy?positionA=BTN&positionB=BB&... │  │
│  │  GET /api/scenarios                                │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ 读取
┌─────────────────────────────────────────────────────────┐
│                        数据层                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  bts/open/       - Open Ranging 策略数据           │  │
│  │  bts/facing-open/ - Facing Open 策略数据           │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 计算方式 | 预计算数据 | CFR 收敛需数小时，不适合实时计算 |
| 数据来源 | BTS PDF | 已验证的翻牌前策略体系 |
| 场景范围 | 第一阶段：Open + Facing Open | 覆盖 80% 常见翻牌前场景 |
| 数据格式 | JSON 文件 | 简单、易读、易版本控制 |

---

## 数据结构设计

### 位置定义

```typescript
enum Position {
  UTG = "UTG",   // Under the Gun
  HJ  = "HJ",    // Hijack
  CO  = "CO",    // Cutoff
  BTN = "BTN",   // Button
  SB  = "SB",    // Small Blind
  BB  = "BB"     // Big Blind
}
```

### 场景类型

```typescript
enum ScenarioType {
  OPEN        = "OPEN",         // A 位置率先加注，返回 A 的开牌范围
  FACING_OPEN = "FACING_OPEN"   // B 位置面对 A 的开牌，返回 B 的回应策略
}
```

### 场景标识

每个场景由三元组定义：`(positionA, positionB, scenarioType)`

**场景示例**：
- `(BTN, BB, OPEN)` → BTN 的 Open Raising 范围
- `(BTN, BB, FACING_OPEN)` → BB 面对 BTN Open 的回应策略
- `(UTG, BB, FACING_OPEN)` → BB 面对 UTG Open 的回应策略

### 策略数据格式

```typescript
interface StrategyData {
  scenario: {
    positionA: Position;
    positionB: Position;
    type: ScenarioType;
  };
  // 169 手牌 × 3 动作 (fold, call, raise)
  matrix: number[][];  // [169][3]
  // 元数据
  metadata: {
    source: string;           // "BTS"
    totalCombos: number;      // 1326
    description: string;      // "BB facing BTN open raise"
    handLabels: string[];     // ["AA", "KK", ...]
  };
}
```

---

## 数据存储设计

### 文件组织结构

```
server/src/data/
├── bts/
│   ├── open/
│   │   ├── utg.json          # UTG Open Raising 范围
│   │   ├── hj.json           # HJ Open Raising 范围
│   │   ├── co.json           # CO Open Raising 范围
│   │   ├── btn.json          # BTN Open Raising 范围
│   │   └── sb.json           # SB Open Raising 范围
│   └── facing-open/
│       ├── bb-vs-utg.json    # BB 面对 UTG Open
│       ├── bb-vs-hj.json     # BB 面对 HJ Open
│       ├── bb-vs-co.json     # BB 面对 CO Open
│       ├── bb-vs-btn.json    # BB 面对 BTN Open
│       ├── bb-vs-sb.json     # BB 面对 SB Open
│       ├── sb-vs-utg.json    # SB 面对 UTG Open (3bet)
│       ├── sb-vs-hj.json     # SB 面对 HJ Open
│       ├── sb-vs-co.json     # SB 面对 CO Open
│       ├── sb-vs-btn.json    # SB 面对 BTN Open
│       ├── btn-vs-utg.json   # BTN 面对 UTG Open
│       ├── btn-vs-hj.json    # BTN 面对 HJ Open
│       ├── btn-vs-co.json    # BTN 面对 CO Open
│       ├── co-vs-utg.json    # CO 面对 UTG Open
│       └── co-vs-hj.json     # CO 面对 HJ Open
└── scenarios.json            # 场景索引
```

### 单个数据文件格式

```json
{
  "scenario": {
    "positionA": "BTN",
    "positionB": "BB",
    "type": "FACING_OPEN"
  },
  "matrix": [
    [0.02, 0.45, 0.53],
    [0.01, 0.40, 0.59],
    [0.00, 0.35, 0.65],
    ...
  ],
  "metadata": {
    "source": "BTS",
    "totalCombos": 1326,
    "description": "BB facing BTN open raise, 100BB deep",
    "handLabels": [
      "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
      "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
      "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",
      "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
      "T9s", "T8s", "T7s", "T6s", "T5s", "T4s", "T3s", "T2s",
      "98s", "97s", "96s", "95s", "94s", "93s", "92s",
      "87s", "86s", "85s", "84s", "83s", "82s",
      "76s", "75s", "74s", "73s", "72s",
      "65s", "64s", "63s", "62s",
      "54s", "53s", "52s",
      "43s", "42s",
      "32s",
      "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
      "KQo", "KJo", "KTo", "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
      "QJo", "QTo", "Q9o", "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
      "JTo", "J9o", "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
      "T9o", "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
      "98o", "97o", "96o", "95o", "94o", "93o", "92o",
      "87o", "86o", "85o", "84o", "83o", "82o",
      "76o", "75o", "74o", "73o", "72o",
      "65o", "64o", "63o", "62o",
      "54o", "53o", "52o",
      "43o", "42o",
      "32o"
    ]
  }
}
```

### 场景索引文件

```json
{
  "open": ["UTG", "HJ", "CO", "BTN", "SB"],
  "facingOpen": {
    "BB": ["UTG", "HJ", "CO", "BTN", "SB"],
    "SB": ["UTG", "HJ", "CO", "BTN"],
    "BTN": ["UTG", "HJ", "CO"],
    "CO": ["UTG", "HJ"],
    "HJ": ["UTG"]
  }
}
```

---

## API 接口设计

### 获取场景策略

**端点**：`GET /api/strategy`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| positionA | string | 是 | 位置 A (UTG/HJ/CO/BTN/SB/BB) |
| positionB | string | 是 | 位置 B (UTG/HJ/CO/BTN/SB/BB) |
| type | string | 是 | 场景类型 (OPEN/FACING_OPEN) |

**示例请求**：
```
GET /api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN
```

**成功响应** (200 OK)：
```json
{
  "scenario": {
    "positionA": "BTN",
    "positionB": "BB",
    "type": "FACING_OPEN"
  },
  "strategy": {
    "matrix": [
      [0.02, 0.45, 0.53],
      [0.01, 0.40, 0.59],
      ...
    ],
    "actions": ["fold", "call", "raise"],
    "handLabels": ["AA", "KK", "QQ", ...]
  },
  "summary": {
    "totalHands": 169,
    "raiseRange": "23.5%",
    "callRange": "45.2%",
    "foldRange": "31.3%"
  }
}
```

**错误响应**：

404 Not Found - 场景不存在：
```json
{
  "error": "Scenario not found",
  "message": "No strategy data for positionA=UTG, positionB=UTG, type=OPEN",
  "availableScenarios": {
    "open": ["UTG", "HJ", "CO", "BTN", "SB"],
    "facingOpen": {
      "BB": ["UTG", "HJ", "CO", "BTN", "SB"],
      ...
    }
  }
}
```

400 Bad Request - 参数错误：
```json
{
  "error": "Invalid parameters",
  "details": "Invalid position: INVALID"
}
```

### 获取所有可用场景

**端点**：`GET /api/scenarios`

**响应** (200 OK)：
```json
{
  "open": ["UTG", "HJ", "CO", "BTN", "SB"],
  "facingOpen": {
    "BB": ["UTG", "HJ", "CO", "BTN", "SB"],
    "SB": ["UTG", "HJ", "CO", "BTN"],
    "BTN": ["UTG", "HJ", "CO"],
    "CO": ["UTG", "HJ"],
    "HJ": ["UTG"]
  }
}
```

---

## 前端集成设计

### 新增组件

**ScenarioSelector.tsx** - 场景选择器

```typescript
interface ScenarioSelectorProps {
  onScenarioChange: (scenario: {
    positionA: Position;
    positionB: Position;
    type: ScenarioType;
  }) => void;
  currentScenario?: Scenario;
}

// UI 布局
[位置 A 下拉] [vs] [位置 B 下拉] [场景类型: Open ▼]
```

### 现有组件修改

**GameFlow.tsx** - 主容器组件

```typescript
// 移除
- import { useCfrStrategy } from './hooks/useCfrStrategy';

// 新增
+ import { useBTSStrategy } from './hooks/useBTSStrategy';
+ import { ScenarioSelector } from './components/ScenarioSelector';

// 使用
const { strategy, loading, error } = useBTSStrategy(scenario);
```

**useBTSStrategy.ts** - 新的 Hook

```typescript
export function useBTSStrategy(scenario: Scenario) {
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/strategy?positionA=${scenario.positionA}&positionB=${scenario.positionB}&type=${scenario.type}`
        );
        if (!response.ok) throw new Error('Strategy not found');
        const data = await response.json();
        setStrategy(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [scenario]);

  return { strategy, loading, error };
}
```

### 数据流

```
用户在 ScenarioSelector 选择场景
        ↓
    onScenarioChange 触发
        ↓
    GameFlow 更新 scenario state
        ↓
    useBTSStrategy 发起 API 请求
        ↓
    /api/strategy 返回策略数据
        ↓
    更新 strategy state
        ↓
    Heatmap + FrequencyBars 重新渲染
```

---

## 数据转换逻辑

### 从 BTS PDF 到 JSON

**输入**：BTS PDF 中的策略表
**输出**：结构化的 JSON 策略文件

**转换流程**：

1. **数据提取**
   - 识别场景（位置、行动类型）
   - 提取手牌范围和行动频率
   - 解析百分比数据

2. **数据映射**
   ```typescript
   // BTS 格式示例：
   // "AA-99, AKs-AQs, KQs: raise 100%"
   // "JJ-66, AQs-ATs, KQs: call 60%, fold 40%"

   // 转换为 169×3 矩阵
   function convertBTSRangeToMatrix(btsRange: BTSRange): number[][] {
     const matrix = Array(169).fill(0).map(() => [0, 0, 0]);

     // 遍历 BTS 范围中的每个手牌
     for (const hand of btsRange.hands) {
       const index = HAND_LABELS.indexOf(hand);
       matrix[index] = [
         btsRange.foldPercent,
         btsRange.callPercent,
         btsRange.raisePercent
       ];
     }

     return matrix;
   }
   ```

3. **数据验证**
   ```typescript
   function validateMatrix(matrix: number[][]): ValidationResult {
     // 检查每行概率和是否为 1（或接近 1）
     for (let i = 0; i < matrix.length; i++) {
       const sum = matrix[i].reduce((a, b) => a + b, 0);
       if (Math.abs(sum - 1.0) > 0.01) {
         return { valid: false, error: `Row ${i} sum is ${sum}` };
       }
     }
     return { valid: true };
   }
   ```

### 实施策略

**Phase 1**：手动转换 MVP 场景
- BTN Open Raising
- BB vs BTN Open
- BB vs UTG Open

**Phase 2**：编写转换脚本
```typescript
// tools/convert-bts-data.ts
// 自动解析 BTS PDF，生成 JSON 文件
```

---

## 测试策略

### 数据验证测试

```typescript
describe('BTS Data Validation', () => {
  test('每个场景的概率总和为 1', () => {
    // 遍历所有场景文件
    // 验证每行概率和
  });

  test('手牌覆盖完整性', () => {
    // 确保所有 169 个手牌都有数据
  });

  test('与原始 BTS 数据对比', () => {
    // 抽样验证与 PDF 中的数据一致
  });
});
```

### API 测试

```typescript
describe('Strategy API', () => {
  test('返回正确的场景数据', async () => {
    const response = await fetch('/api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN');
    const data = await response.json();
    expect(data.strategy.matrix).toHaveLength(169);
  });

  test('处理不存在的场景', async () => {
    const response = await fetch('/api/strategy?positionA=INVALID&positionB=BB&type=OPEN');
    expect(response.status).toBe(404);
  });
});
```

### 前端集成测试

```typescript
describe('ScenarioSelector', () => {
  test('正确触发场景变化', () => {
    // 测试场景选择器交互
  });
});

describe('useBTSStrategy', () => {
  test('正确获取策略数据', async () => {
    // 测试 hook 功能
  });
});
```

---

## 实施计划

### Phase 1：核心场景 MVP (1-2 天)

**后端**：
- [ ] 创建 `server/src/data/bts/` 目录结构
- [ ] 手动转换 3 个核心场景数据
  - `btn.json` (BTN Open Raising)
  - `bb-vs-btn.json` (BB vs BTN Open)
  - `bb-vs-utg.json` (BB vs UTG Open)
- [ ] 实现 `/api/strategy` 端点
- [ ] 实现 `/api/scenarios` 端点
- [ ] 编写 API 测试

**前端**：
- [ ] 创建 `ScenarioSelector.tsx` 组件
- [ ] 创建 `useBTSStrategy.ts` hook
- [ ] 修改 `GameFlow.tsx` 集成新组件
- [ ] 测试端到端流程

### Phase 2：扩展场景 (2-3 天)

**数据转换**：
- [ ] 转换所有 Open Raising 场景
  - UTG, HJ, CO, BTN, SB
- [ ] 转换主要 Facing Open 场景
  - BB vs 所有位置
  - SB vs 所有位置
  - BTN vs UTG/HJ/CO
  - CO vs UTG/HJ

**功能增强**：
- [ ] 添加数据验证脚本
- [ ] 添加单元测试覆盖
- [ ] 性能优化（响应缓存）

### Phase 3：完整覆盖与优化 (1 周)

**完整数据**：
- [ ] 转换所有 BTS PDF 中的场景
- [ ] 生成完整场景索引

**优化**：
- [ ] 添加数据缓存层
- [ ] JSON 数据压缩
- [ ] API 响应时间优化

**测试与发布**：
- [ ] 完整的端到端测试
- [ ] 用户验收测试
- [ ] 文档编写

---

## 文件变更清单

### 新增文件

```
server/src/data/bts/
├── open/
│   ├── utg.json
│   ├── hj.json
│   ├── co.json
│   ├── btn.json
│   └── sb.json
└── facing-open/
    ├── bb-vs-utg.json
    ├── bb-vs-hj.json
    ├── bb-vs-co.json
    ├── bb-vs-btn.json
    ├── bb-vs-sb.json
    ├── sb-vs-utg.json
    ├── sb-vs-hj.json
    ├── sb-vs-co.json
    ├── sb-vs-btn.json
    ├── btn-vs-utg.json
    ├── btn-vs-hj.json
    ├── btn-vs-co.json
    ├── co-vs-utg.json
    └── co-vs-hj.json

server/src/
├── routes/
│   ├── strategy.ts          # 新增：策略查询 API
│   └── scenarios.ts         # 新增：场景列表 API
└── utils/
    └── dataLoader.ts        # 新增：数据加载工具

web/src/
├── components/
│   └── ScenarioSelector.tsx # 新增：场景选择器
├── hooks/
│   └── useBTSStrategy.ts    # 新增：BTS 策略 hook
└── types/
    └── bts.ts               # 新增：BTS 类型定义

tools/
└── convert-bts-data.ts      # 新增：BTS 数据转换脚本
```

### 修改文件

```
server/src/index.ts          # 新增路由：/api/strategy, /api/scenarios
web/src/components/GameFlow.tsx  # 集成 ScenarioSelector 和 useBTSStrategy
```

### 移除文件（可选）

```
solver/src/cfr.rs             # 不再需要 CFR 实现
solver/src/preflop.rs         # 不再需要 Preflop CFR
solver/src/preflop_optimized.rs  # 不再需要优化 CFR
web/src/hooks/useCfrStrategy.ts  # 替换为 useBTSStrategy
```

---

## 技术栈

### 后端

| 组件 | 技术 |
|------|------|
| API 框架 | Express + TypeScript |
| 数据存储 | JSON 文件 |
| 数据加载 | fs 模块 + 缓存 |

### 前端

| 组件 | 技术 |
|------|------|
| 框架 | React + TypeScript |
| HTTP 客户端 | Fetch API |
| 状态管理 | React hooks |

---

## 风险与挑战

### 数据准确性

**风险**：手动转换 BTS 数据可能出错
**缓解**：
- 编写验证脚本检查概率总和
- 与原始 PDF 数据对比验证
- 用户测试反馈

### 数据完整性

**风险**：BTS PDF 可能不包含所有场景
**缓解**：
- 优先实现常见场景
- 缺失场景返回明确错误信息
- 后续可扩展其他数据源

### 性能

**风险**：大量 JSON 文件可能影响加载速度
**缓解**：
- 按需加载（只加载请求的场景）
- 内存缓存已加载的数据
- 考虑使用数据库（SQLite）替代 JSON

---

## 未来扩展

### Phase 4+：更多场景

- Facing 3-Bet
- 4-Bet / Facing 4-Bet
- Squeeze 场景
- 多人底池场景

### Phase 4+：功能增强

- 策略对比（比较不同场景）
- 策略导出（导出为其他格式）
- 学习模式（训练用户记忆策略）

### Phase 4+：数据源扩展

- 支持其他策略源（GTO Wizard、PIO Solver）
- 用户自定义策略
- 策略版本管理

---

*文档创建时间：2026-01-22*
*设计者：Claude + 用户*
*状态：待审核*
