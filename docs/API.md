# BTS Preflop Strategy API

## Overview

BTS (Bluff The Spot) Preflop Strategy Backend API provides preflop GTO strategy data queries for 6-max No Limit Hold'em.

**Base URL**: `http://localhost:8080/api`

**Content-Type**: `application/json`

---

## API Endpoints

### 1. Get All Available Scenarios

获取所有可用的牌局场景列表。

**Endpoint**: `GET /api/scenarios`

**Authentication**: None required

**Request Parameters**: None

**Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

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

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `open` | `string[]` | 可以开池(Open)的位置列表 |
| `facingOpen` | `object` | 键为防守位置，值为可以面对的开池位置列表 |

---

### 2. Get Strategy Data

获取指定场景的策略数据。

**Endpoint**: `GET /api/strategy`

**Authentication**: None required

**Request Parameters** (Query String):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `positionA` | `string` | Yes | 主动位置 (发起动作的玩家) |
| `positionB` | `string` | Conditional | 被动位置 (FACING_OPEN 场景必需) |
| `type` | `string` | Yes | 场景类型: `OPEN` 或 `FACING_OPEN` |

**参数规则**:
- `type=OPEN` 时：只需要 `positionA`
- `type=FACING_OPEN` 时：必须提供 `positionA` 和 `positionB`

**Valid Position Values**: `UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`

**Valid Type Values**: `OPEN`, `FACING_OPEN`

#### Example Request 1: Open Raising (BTN opens)

```http
GET /api/strategy?positionA=BTN&type=OPEN
```

#### Example Request 2: Facing Open (BB facing BTN open)

```http
GET /api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN
```

---

#### Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "scenario": {
    "positionA": "BTN",
    "positionB": "BB",
    "type": "FACING_OPEN"
  },
  "strategy": {
    "matrix": [
      [0.0, 0.0, 1.0],
      [0.0, 0.5, 0.5],
      ...
    ],
    "actions": ["fold", "call", "raise"],
    "handLabels": ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22", "AKs", "AQs", ..., "32o"]
  },
  "summary": {
    "totalHands": 169,
    "raiseRange": "45.2%",
    "callRange": "30.1%",
    "foldRange": "24.7%"
  }
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `scenario.positionA` | `string` | 主动位置代码 |
| `scenario.positionB` | `string` | 被动位置代码 |
| `scenario.type` | `string` | 场景类型代码 |
| `strategy.matrix` | `number[][]` | 169x3 策略矩阵，每行代表一个手牌，三列分别是 fold/call/raise 频率 |
| `strategy.actions` | `string[]` | 动作名称数组，对应矩阵列 |
| `strategy.handLabels` | `string[]` | 169 个手牌标签，按标准顺序排列 |
| `summary.totalHands` | `number` | 总手牌数 (固定为 169) |
| `summary.raiseRange` | `string` | 加注范围百分比 |
| `summary.callRange` | `string` | 跟注范围百分比 |
| `summary.foldRange` | `string` | 弃牌范围百分比 |

**Hand Labels Order** (169 hands):
- Pairs (13): AA, KK, QQ, ..., 22
- Suited (78): AKs, AQs, ..., 32s (above diagonal)
- Offsuit (78): AKo, AQo, ..., 32o (below diagonal)

---

#### Error Responses

**400 Bad Request - Missing Required Parameters**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Missing required parameters: positionA, type"
}
```

**400 Bad Request - Missing positionB for FACING_OPEN**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Missing required parameter: positionB (required for FACING_OPEN scenarios)"
}
```

**400 Bad Request - Invalid Position**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Invalid parameters",
  "details": "Invalid position: XYZ"
}
```

**404 Not Found - Scenario Not Found**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
```

```json
{
  "error": "Scenario not found",
  "details": "No strategy data available for scenario: Scenario{BB vs UTG, FACING_OPEN}"
}
```

---

## Position Reference

| Code | Full Name | Description |
|------|-----------|-------------|
| `UTG` | Under the Gun | 第一个行动位置 |
| `HJ` | Hijack | UTG 后面的位置 |
| `CO` | Cutoff | 按钮前位置 |
| `BTN` | Button | 庄家位置 |
| `SB` | Small Blind | 小盲位置 |
| `BB` | Big Blind | 大盲位置 |

---

## Scenario Type Reference

| Code | Description |
|------|-------------|
| `OPEN` | Open Raising - 玩家 A 率先加注 |
| `FACING_OPEN` | Facing Open - 玩家 B 响应玩家 A 的开池 |

---

## Available Scenarios

### Open Raising (OPEN)

| Position A | Description |
|------------|-------------|
| UTG | UTG 率先加注 |
| HJ | HJ 率先加注 |
| CO | CO 率先加注 |
| BTN | 按钮率先加注 |
| SB | 小盲率先加注 |

### Facing Open (FACING_OPEN)

| Position B | Facing Position A | Description |
|------------|-------------------|-------------|
| BB | vs UTG, HJ, CO, BTN, SB | 大盲面对开池 |
| SB | vs UTG, HJ, CO, BTN | 小盲面对开池 |
| BTN | vs UTG, HJ, CO | 按钮面对开池 |
| CO | vs UTG, HJ | CO 面对开池 |
| HJ | vs UTG | HJ 面对开池 |

---

## Example Usage (JavaScript/Fetch)

```javascript
// Get all available scenarios
async function getScenarios() {
  const response = await fetch('http://localhost:8080/api/scenarios');
  const data = await response.json();
  return data;
}

// Get strategy for BB facing BTN open
async function getStrategy() {
  const params = new URLSearchParams({
    positionA: 'BTN',
    positionB: 'BB',
    type: 'FACING_OPEN'
  });

  const response = await fetch(`http://localhost:8080/api/strategy?${params}`);
  const data = await response.json();
  return data;
}

// Example: Render heatmap
async function renderHeatmap() {
  const data = await getStrategy();
  const { matrix, handLabels } = data.strategy;

  // matrix[i][0] = fold frequency for handLabels[i]
  // matrix[i][1] = call frequency for handLabels[i]
  // matrix[i][2] = raise frequency for handLabels[i]

  for (let i = 0; i < 169; i++) {
    const hand = handLabels[i];
    const foldFreq = matrix[i][0];
    const callFreq = matrix[i][1];
    const raiseFreq = matrix[i][2];
    // ... render logic
  }
}
```

---

## Example Usage (cURL)

```bash
# Get all scenarios
curl http://localhost:8080/api/scenarios

# Get BTN open strategy (OPEN type - no positionB needed)
curl "http://localhost:8080/api/strategy?positionA=BTN&type=OPEN"

# Get BB vs BTN facing open strategy (FACING_OPEN type - positionB required)
curl "http://localhost:8080/api/strategy?positionA=BTN&positionB=BB&type=FACING_OPEN"
```

---

## Caching

Strategy data is cached server-side using Caffeine cache. Subsequent requests for the same scenario will return cached results for improved performance.

---

## Rate Limiting

Currently no rate limiting is implemented.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2025-01 | `positionB` 参数改为可选：OPEN 场景不需要，FACING_OPEN 场景必需 |
| 1.0.0 | 2025-01 | Initial release |
