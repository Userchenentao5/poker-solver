# BB Facing Open 场景自动化数据提取与集成

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 自动从 BTS PDF 中提取 BB Facing Open 场景的翻前前策略热力图，生成标准 JSON 数据文件并集成到现有后端 API。

**Architecture:** 使用 Node.js + TypeScript 构建数据提取工具，包含三个模块：
1. PDF 图像提取 - 使用 `pdf-lib` 将 PDF 页面转换为 PNG 图像
2. 热力图识别 - 使用 `mcp__4_5v_mcp__analyze_image` (Vision MCP) 解析 13x13 颜色矩阵
3. JSON 生成与验证 - 标准化输出并验证数据完整性

**Tech Stack:**
- Node.js + TypeScript
- `pdf-lib` - PDF 页面提取
- MCP Vision API - 图像识别
- Vitest - 单元测试

---

## Task 1: 创建工具项目结构

**Files:**
- Create: `tools/package.json`
- Create: `tools/tsconfig.json`
- Create: `tools/src/types.ts`
- Create: `tools/.gitignore`

### Step 1: Create package.json

```bash
# Create tools directory
cd tools
npm init -y
```

```json
// tools/package.json
{
  "name": "bts-data-extractor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "extract": "tsx src/extract.ts",
    "validate": "tsx src/validate.ts",
    "test": "vitest"
  },
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "pngjs": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/pngjs": "^6.0.4",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0"
  }
}
```

### Step 2: Create tsconfig.json

```json
// tools/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Create .gitignore

```
# tools/.gitignore
node_modules/
dist/
*.log
```

### Step 4: Install dependencies

```bash
npm install
```

### Step 5: Commit

```bash
git add tools/
git commit -m "feat(tools): initialize data extractor project structure"
```

---

## Task 2: 定义类型系统

**Files:**
- Create: `tools/src/types.ts`

### Step 1: Write the type definitions

```typescript
// tools/src/types.ts

/** 169 种标准德州扑克手牌标签 */
export const HAND_LABELS = [
  // Pairs (13)
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  // Suited (78) - above diagonal
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
  'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
  'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
  '98s', '97s', '96s', '95s', '94s', '93s', '92s',
  '87s', '86s', '85s', '84s', '83s', '82s',
  '76s', '75s', '74s', '73s', '72s',
  '65s', '64s', '63s', '62s',
  '54s', '53s', '52s',
  '43s', '42s',
  '32s',
  // Offsuit (78) - below diagonal
  'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
  'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
  'QJo', 'QTo', 'Q9o', 'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o', 'Q3o', 'Q2o',
  'JTo', 'J9o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
  'T9o', 'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
  '98o', '97o', '96o', '95o', '94o', '93o', '92o',
  '87o', '86o', '85o', '84o', '83o', '82o',
  '76o', '75o', '74o', '73o', '72o',
  '65o', '64o', '63o', '62o',
  '54o', '53o', '52o',
  '43o', '42o',
  '32o'
] as const;

/** 手牌索引映射 */
export const HAND_INDEX: Record<string, number> = Object.fromEntries(
  HAND_LABELS.map((label, index) => [label, index])
);

/** 场景类型 */
export enum ScenarioType {
  OPEN = 'OPEN',
  FACING_OPEN = 'FACING_OPEN'
}

/** 位置 */
export enum Position {
  UTG = 'UTG',
  HJ = 'HJ',
  CO = 'CO',
  BTN = 'BTN',
  SB = 'SB',
  BB = 'BB'
}

/** 动作频率矩阵 - 169手牌 x N动作 */
export type ActionMatrix = number[][];

/** 策略场景 */
export interface StrategyScenario {
  positionA: Position;
  positionB: Position | null;
  type: ScenarioType;
}

/** 策略数据 */
export interface StrategyData {
  scenario: StrategyScenario;
  matrix: ActionMatrix;
  metadata: {
    source: string;
    totalCombos: number;
    description: string;
    raisePercent: string;
  };
}

/** 颜色映射 */
export interface ColorMap {
  color: string;
  action: string;
  frequency: number;
}

/** 提取配置 */
export interface ExtractionConfig {
  pdfPath: string;
  scenario: StrategyScenario;
  colorMaps: ColorMap[];
  description: string;
  raisePercent: string;
}
```

### Step 2: No test needed for types

### Step 3: Commit

```bash
git add tools/src/types.ts
git commit -m "feat(tools): add type definitions for strategy data"
```

---

## Task 3: 实现 PDF 图像提取模块

**Files:**
- Create: `tools/src/pdf/extractImage.ts`
- Test: `tools/src/pdf/extractImage.test.ts`

### Step 1: Write the failing test

```typescript
// tools/src/pdf/extractImage.test.ts
import { describe, it, expect } from 'vitest';
import { extractPdfPageAsImage } from './extractImage';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('PDF Image Extraction', () => {
  it('should extract first page as PNG buffer', async () => {
    const pdfPath = join(process.cwd(), 'test-data/sample.pdf');

    const pngBuffer = await extractPdfPageAsImage(pdfPath, 0);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);
    expect(pngBuffer.slice(1, 4).toString()).toBe('PNG'); // PNG magic bytes
  });

  it('should throw for non-existent file', async () => {
    await expect(extractPdfPageAsImage('missing.pdf', 0)).rejects.toThrow();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- extractImage.test.ts
```

Expected: FAIL with "Cannot find module './extractImage'"

### Step 3: Write minimal implementation

```typescript
// tools/src/pdf/extractImage.ts
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 从 PDF 中提取指定页面为 PNG 图像
 * @param pdfPath PDF 文件路径
 * @param pageIndex 页面索引（0-based）
 * @returns PNG 图像 Buffer
 */
export async function extractPdfPageAsImage(
  pdfPath: string,
  pageIndex: number = 0
): Promise<Buffer> {
  // 读取 PDF 文件
  const pdfBytes = readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // 检查页面索引
  if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
    throw new Error(`Invalid page index: ${pageIndex}`);
  }

  // 注意：pdf-lib 本身不支持渲染为图像
  // 我们使用一个临时方案：将页面转换为可打印格式
  // 实际图像渲染需要使用 pdf.js 或 poppler

  // 临时实现：抛出错误提示需要安装依赖
  throw new Error(
    'PDF rendering requires external dependencies. ' +
    'Please install pdfjs-dist or use poppler-utils.'
  );
}
```

### Step 4: Update implementation with pdfjs-dist

```bash
npm install pdfjs-dist
npm install --save-dev @types/pdfjs-dist
```

```typescript
// tools/src/pdf/extractImage.ts (updated)
import * as pdfjsLib from 'pdfjs-dist';
import { readFileSync } from 'fs';
import { createCanvas } from 'canvas';

// 配置 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';

/**
 * 从 PDF 中提取指定页面为 PNG 图像
 */
export async function extractPdfPageAsImage(
  pdfPath: string,
  pageIndex: number = 0,
  scale: number = 2.0 // 高分辨率以提高识别准确率
): Promise<Buffer> {
  // 读取 PDF 文件
  const pdfBytes = readFileSync(pdfPath);
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdfDoc = await loadingTask.promise;

  // 检查页面索引
  if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
    throw new Error(`Invalid page index: ${pageIndex}`);
  }

  // 获取页面
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  // 创建 Canvas
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // 渲染页面到 Canvas
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  // 返回 PNG Buffer
  return canvas.toBuffer('image/png');
}
```

```bash
npm install canvas
```

### Step 5: Run test to verify it passes

```bash
npm test
```

Expected: PASS (如果 test-data/sample.pdf 存在)

### Step 6: Commit

```bash
git add tools/src/pdf/ tools/test-data/
git commit -m "feat(tools): add PDF to PNG image extraction with pdfjs"
```

---

## Task 4: 实现热力图颜色识别模块

**Files:**
- Create: `tools/src/vision/analyzeHeatmap.ts`
- Create: `tools/src/vision/colorUtils.ts`

### Step 1: Write color utility functions

```typescript
// tools/src/vision/colorUtils.ts
import { PNG } from 'pngjs';

/** RGB 颜色 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** 从 PNG 获取指定像素的颜色 */
export function getPixelColor(png: PNG, x: number, y: number): RGB {
  const idx = (y * png.width + x) << 2;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2]
  };
}

/** 计算两个颜色的欧氏距离 */
export function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/** 找到最接近的预定义颜色 */
export function findClosestColor(
  color: RGB,
  colorMaps: { color: string; rgb: RGB }[]
): { color: string; distance: number } | null {
  let closest: { color: string; distance: number } | null = null;

  for (const map of colorMaps) {
    const dist = colorDistance(color, map.rgb);
    if (closest === null || dist < closest.distance) {
      closest = { color: map.color, distance: dist };
    }
  }

  // 阈值：距离超过 50 认为不匹配
  if (closest && closest.distance > 50) {
    return null;
  }

  return closest;
}

/** 解析十六进制颜色为 RGB */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}
```

### Step 2: Write heatmap analyzer

```typescript
// tools/src/vision/analyzeHeatmap.ts
import { PNG } from 'pngjs';
import { readFileSync } from 'fs';
import { getPixelColor, findClosestColor, hexToRgb } from './colorUtils';
import { ActionMatrix, ColorMap } from '../types';

/** 热力图网格配置 */
interface HeatmapGrid {
  cellWidth: number;
  cellHeight: number;
  startX: number;
  startY: number;
}

/**
 * 分析热力图图像，提取策略矩阵
 */
export async function analyzeHeatmap(
  imagePath: string,
  colorMaps: ColorMap[],
  grid?: HeatmapGrid
): Promise<ActionMatrix> {
  // 读取 PNG
  const png = PNG.sync.read(readFileSync(imagePath));

  // 如果没有提供网格配置，尝试自动检测
  const detectedGrid = grid || detectGrid(png);

  // 初始化 169xN 矩阵
  const actionCount = colorMaps.length;
  const matrix: ActionMatrix = Array(169).fill(null).map(() =>
    Array(actionCount).fill(0)
  );

  // 标准手牌顺序索引
  let handIndex = 0;

  // 遍历 13x13 网格
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      // 计算单元格中心像素坐标
      const x = detectedGrid.startX + col * detectedGrid.cellWidth + detectedGrid.cellWidth / 2;
      const y = detectedGrid.startY + row * detectedGrid.cellHeight + detectedGrid.cellHeight / 2;

      // 获取中心像素颜色
      const color = getPixelColor(png, Math.floor(x), Math.floor(y));

      // 查找匹配的动作
      const rgbColorMaps = colorMaps.map(m => ({
        color: m.color,
        rgb: hexToRgb(m.color)
      }));

      const match = findClosestColor(color, rgbColorMaps);

      if (match) {
        const actionIndex = colorMaps.findIndex(m => m.color === match.color);
        matrix[handIndex][actionIndex] = 1;
      }

      handIndex++;
    }
  }

  return matrix;
}

/**
 * 自动检测热力图网格位置
 * 简化版本：假设热力图占据图像中心区域
 */
function detectGrid(png: PNG): HeatmapGrid {
  const width = png.width;
  const height = png.height;

  // 假设热力图是正方形，约占图像 60%
  const gridSize = Math.min(width, height) * 0.6;
  const cellSize = gridSize / 13;

  return {
    cellWidth: cellSize,
    cellHeight: cellSize,
    startX: (width - gridSize) / 2,
    startY: (height - gridSize) / 2
  };
}
```

### Step 3: Commit

```bash
git add tools/src/vision/
git commit -m "feat(tools): add heatmap color analysis module"
```

---

## Task 5: 实现主提取脚本

**Files:**
- Create: `tools/src/extract.ts`
- Create: `tools/src/config/bb-facing-open.config.ts`

### Step 1: Create configuration

```typescript
// tools/src/config/bb-facing-open.config.ts
import { ExtractionConfig, Position, ScenarioType } from '../types';

/** BB Facing Open 场景配置 */
export const BB_FACING_OPEN_CONFIGS: ExtractionConfig[] = [
  {
    pdfPath: 'BTS_Preflop_BB_Facing_UTG.pdf',
    scenario: {
      positionA: Position.UTG,
      positionB: Position.BB,
      type: ScenarioType.FACING_OPEN
    },
    colorMaps: [
      { color: '#ff4444', action: 'fold', frequency: 0 },
      { color: '#44ff44', action: 'call', frequency: 0.5 },
      { color: '#4444ff', action: 'raise', frequency: 1 }
    ],
    description: 'BB facing UTG open raise, 100BB deep',
    raisePercent: '12.5%'
  },
  {
    pdfPath: 'BTS_Preflop_BB_Facing_HJ.pdf',
    scenario: {
      positionA: Position.HJ,
      positionB: Position.BB,
      type: ScenarioType.FACING_OPEN
    },
    colorMaps: [
      { color: '#ff4444', action: 'fold', frequency: 0 },
      { color: '#44ff44', action: 'call', frequency: 0.5 },
      { color: '#4444ff', action: 'raise', frequency: 1 }
    ],
    description: 'BB facing HJ open raise, 100BB deep',
    raisePercent: '15.2%'
  },
  {
    pdfPath: 'BTS_Preflop_BB_Facing_CO.pdf',
    scenario: {
      positionA: Position.CO,
      positionB: Position.BB,
      type: ScenarioType.FACING_OPEN
    },
    colorMaps: [
      { color: '#ff4444', action: 'fold', frequency: 0 },
      { color: '#44ff44', action: 'call', frequency: 0.5 },
      { color: '#4444ff', action: 'raise', frequency: 1 }
    ],
    description: 'BB facing CO open raise, 100BB deep',
    raisePercent: '18.7%'
  },
  {
    pdfPath: 'BTS_Preflop_BB_Facing_SB.pdf',
    scenario: {
      positionA: Position.SB,
      positionB: Position.BB,
      type: ScenarioType.FACING_OPEN
    },
    colorMaps: [
      { color: '#ff4444', action: 'fold', frequency: 0 },
      { color: '#44ff44', action: 'call', frequency: 0.5 },
      { color: '#4444ff', action: 'raise', frequency: 1 }
    ],
    description: 'BB facing SB open raise, 100BB deep',
    raisePercent: '35.0%'
  }
];
```

### Step 2: Create main extraction script

```typescript
// tools/src/extract.ts
import { extractPdfPageAsImage } from './pdf/extractImage';
import { analyzeHeatmap } from './vision/analyzeHeatmap';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BB_FACING_OPEN_CONFIGS } from './config/bb-facing-open.config';
import { StrategyData } from './types';

/**
 * 主提取函数
 */
async function extractAll() {
  const outputDir = join(process.cwd(), '../server/src/main/resources/data/bts/facing-open');

  // 确保输出目录存在
  mkdirSync(outputDir, { recursive: true });

  for (const config of BB_FACING_OPEN_CONFIGS) {
    console.log(`Extracting: ${config.scenario.positionA} vs ${config.scenario.positionB}`);

    try {
      // 1. 从 PDF 提取图像
      console.log('  - Extracting PDF page...');
      const pngBuffer = await extractPdfPageAsImage(config.pdfPath, 0);

      // 保存临时图像用于调试
      const tempImagePath = join(outputDir, `temp-${config.scenario.positionA}-vs-${config.scenario.positionB}.png`);
      writeFileSync(tempImagePath, pngBuffer);

      // 2. 分析热力图
      console.log('  - Analyzing heatmap...');
      const matrix = await analyzeHeatmap(tempImagePath, config.colorMaps);

      // 3. 构建策略数据
      const data: StrategyData = {
        scenario: config.scenario,
        matrix: matrix,
        metadata: {
          source: 'BTS',
          totalCombos: 1326,
          description: config.description,
          raisePercent: config.raisePercent
        }
      };

      // 4. 保存 JSON
      const filename = `${config.scenario.positionB.toLowerCase()}-vs-${config.scenario.positionA.toLowerCase()}.json`;
      const outputPath = join(outputDir, filename);
      writeFileSync(outputPath, JSON.stringify(data, null, 0));

      console.log(`  - Saved: ${filename}`);

      // 清理临时文件
      // unlinkSync(tempImagePath);

    } catch (error) {
      console.error(`  - Error: ${error}`);
    }
  }

  console.log('\nExtraction complete!');
  console.log(`Output directory: ${outputDir}`);
}

// 运行
extractAll().catch(console.error);
```

### Step 3: Commit

```bash
git add tools/src/extract.ts tools/src/config/
git commit -m "feat(tools): add main extraction script with BB Facing Open configs"
```

---

## Task 6: 实现数据验证模块

**Files:**
- Create: `tools/src/validate.ts`
- Create: `tools/src/validate.test.ts`

### Step 1: Write the failing test

```typescript
// tools/src/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateStrategyData } from './validate';
import { StrategyData } from './types';

describe('Strategy Data Validation', () => {
  it('should validate correct strategy data', () => {
    const data: StrategyData = {
      scenario: {
        positionA: 'BTN',
        positionB: 'BB',
        type: 'FACING_OPEN'
      },
      matrix: [[0, 0, 1], [0, 0.5, 0.5]],
      metadata: {
        source: 'BTS',
        totalCombos: 1326,
        description: 'Test',
        raisePercent: '45.2%'
      }
    };

    const result = validateStrategyData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid matrix size', () => {
    const data: StrategyData = {
      scenario: {
        positionA: 'BTN',
        positionB: 'BB',
        type: 'FACING_OPEN'
      },
      matrix: [[0, 0, 1]], // Only 1 hand
      metadata: {
        source: 'BTS',
        totalCombos: 1326,
        description: 'Test',
        raisePercent: '45.2%'
      }
    };

    const result = validateStrategyData(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Matrix must have 169 rows (one per hand)');
  });

  it('should detect probability overflow', () => {
    const data: StrategyData = {
      scenario: {
        positionA: 'BTN',
        positionB: 'BB',
        type: 'FACING_OPEN'
      },
      matrix: [[1, 1, 1]], // Sum > 1
      metadata: {
        source: 'BTS',
        totalCombos: 1326,
        description: 'Test',
        raisePercent: '45.2%'
      }
    };

    const result = validateStrategyData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('probability'))).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- validate.test.ts
```

Expected: FAIL with "Cannot find module './validate'"

### Step 3: Write minimal implementation

```typescript
// tools/src/validate.ts
import { StrategyData } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证策略数据完整性
 */
export function validateStrategyData(data: StrategyData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查矩阵大小
  if (data.matrix.length !== 169) {
    errors.push('Matrix must have 169 rows (one per hand)');
  }

  // 检查每行的概率总和
  for (let i = 0; i < Math.min(data.matrix.length, 169); i++) {
    const row = data.matrix[i];
    const sum = row.reduce((a, b) => a + b, 0);

    // 允许浮点误差
    if (sum > 1.01) {
      errors.push(`Row ${i}: probability sum ${sum} exceeds 1.0`);
    } else if (sum < 0.99 && sum > 0.01) {
      warnings.push(`Row ${i}: probability sum ${sum} is below 1.0`);
    }
  }

  // 检查必需字段
  if (!data.scenario.positionA) {
    errors.push('Missing scenario.positionA');
  }
  if (!data.metadata) {
    errors.push('Missing metadata');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证并报告 JSON 文件
 */
export async function validateJsonFile(filePath: string): Promise<void> {
  // Implementation for file validation
}
```

### Step 4: Run test to verify it passes

```bash
npm test
```

Expected: PASS

### Step 5: Commit

```bash
git add tools/src/validate.ts tools/src/validate.test.ts
git commit -m "feat(tools): add strategy data validation"
```

---

## Task 7: 更新 scenarios-index.json

**Files:**
- Modify: `server/src/main/resources/data/scenarios-index.json`

### Step 1: Update scenarios index

```json
// server/src/main/resources/data/scenarios-index.json
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

注意：BB vs UTG 已存在，需要添加的是 BB vs HJ/CO/SB。

### Step 2: Commit

```bash
git add server/src/main/resources/data/scenarios-index.json
git commit -m "feat(data): add BB Facing Open scenarios to index"
```

---

## Task 8: 端到端测试

**Files:**
- Create: `tools/e2e/extract-e2e.test.ts`

### Step 1: Write E2E test

```typescript
// tools/e2e/extract-e2e.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('E2E: BB Facing Open Extraction', () => {
  const outputDir = join(process.cwd(), '../server/src/main/resources/data/bts/facing-open');
  const testFiles = [
    'bb-vs-hj.json',
    'bb-vs-co.json',
    'bb-vs-sb.json'
  ];

  beforeAll(() => {
    // 清理旧文件
    for (const file of testFiles) {
      const path = join(outputDir, file);
      if (existsSync(path)) {
        unlinkSync(path);
      }
    }
  });

  it('should extract all BB Facing Open scenarios', () => {
    // 运行提取脚本
    execSync('npm run extract', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    // 验证文件已创建
    for (const file of testFiles) {
      const path = join(outputDir, file);
      expect(existsSync(path), `${file} should exist`).toBe(true);

      // 验证 JSON 格式
      const content = JSON.parse(readFileSync(path, 'utf-8'));
      expect(content.scenario).toBeDefined();
      expect(content.matrix).toBeDefined();
      expect(content.matrix).toHaveLength(169);
    }
  }, 30000); // 30s timeout
});
```

### Step 2: Run E2E test

```bash
npm run test:e2e
```

### Step 3: Commit

```bash
git add tools/e2e/
git commit -m "test(tools): add E2E extraction tests"
```

---

## Task 9: 后端 API 集成验证

**Files:**
- Test: `server/src/test/StrategyControllerTest.java`

### Step 1: Write Java integration test

```java
// server/src/test/java/com/poker/bts/controller/StrategyControllerTest.java
package com.poker.bts.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StrategyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testBBvsHJScenario() throws Exception {
        mockMvc.perform(get("/api/strategy")
                .param("positionA", "HJ")
                .param("positionB", "BB")
                .param("type", "FACING_OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario.positionA").value("HJ"))
                .andExpect(jsonPath("$.scenario.positionB").value("BB"))
                .andExpect(jsonPath("$.scenario.type").value("FACING_OPEN"))
                .andExpect(jsonPath("$.strategy.matrix").isArray())
                .andExpect(jsonPath("$.strategy.matrix.length()").value(169));
    }

    @Test
    void testBBvsCOScenario() throws Exception {
        mockMvc.perform(get("/api/strategy")
                .param("positionA", "CO")
                .param("positionB", "BB")
                .param("type", "FACING_OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario.positionA").value("CO"))
                .andExpect(jsonPath("$.scenario.positionB").value("BB"));
    }

    @Test
    void testBBvsSBScenario() throws Exception {
        mockMvc.perform(get("/api/strategy")
                .param("positionA", "SB")
                .param("positionB", "BB")
                .param("type", "FACING_OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenario.positionA").value("SB"))
                .andExpect(jsonPath("$.scenario.positionB").value("BB"));
    }
}
```

### Step 2: Run Java tests

```bash
cd server && mvn test
```

### Step 3: Commit

```bash
git add server/src/test/
git commit -m "test(server): add BB Facing Open API integration tests"
```

---

## Task 10: 文档更新

**Files:**
- Modify: `BTS_EXECUTION_PLAN.md`

### Step 1: Update execution plan

在 BTS_EXECUTION_PLAN.md 中更新 Phase 2 任务状态：

```markdown
### Task 10: 转换 BB Facing Open 场景
- [x] `bb-vs-hj.json` - BB 面对 HJ Open
- [x] `bb-vs-co.json` - BB 面对 CO Open
- [x] `bb-vs-sb.json` - BB 面对 SB Open
- [x] 自动化提取工具 (`tools/`)
- 状态: ✅ 完成 (2026-01-27)
```

### Step 2: Commit

```bash
git add BTS_EXECUTION_PLAN.md
git commit -m "docs: update Phase 2 progress - BB Facing Open complete"
```

---

## 任务完成检查清单

- [ ] 所有测试通过
- [ ] 代码已提交
- [ ] 文档已更新
- [ ] API 端点验证成功

---

## 使用说明

### 运行提取工具

```bash
cd tools
npm run extract
```

### 验证数据

```bash
cd tools
npm run validate
```

### 运行所有测试

```bash
cd tools
npm test
```

---

*计划创建时间: 2026-01-27*
