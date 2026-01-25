# 开发注意事项与常见问题

> 本文件记录开发过程中频繁出现的问题、错误和注意事项，防止重复踩坑。

## 前端开发

### 热力图对齐问题 (★★★★ 高频)
**问题**: 13x13 热力图的单元格与 X/Y 轴标签不对齐

**根本原因**:
- 在 flex 布局中，所有元素必须使用**相同的尺寸计算方式**
- 如果标签用 `width: 48px`，单元格用 `flex: 1`，宽度会不一致

**正确做法**:
```css
/* 标签和单元格使用相同的 flex 属性 */
.heatmap-label {
  flex: 1 1 0;  /* grow, shrink, basis */
}

.heatmap-cell {
  flex: 1 1 0;  /* 与标签完全一致 */
}
```

**错误做法**:
```css
/* ❌ 错误：混合使用固定宽度和 flex */
.heatmap-label {
  width: 48px;       /* 固定宽度 */
}

.heatmap-cell {
  flex: 1;           /* 弹性宽度 */
}
```

**发生次数**: 3次+
**最后修复**: 2026-01-17

---

### CSS 变量命名冲突
**问题**: 添加新变量时与现有变量冲突

**检查方法**:
```bash
# 在 CSS 文件中搜索变量名
grep "variable-name" src/index.css
```

**建议**: 新增变量前先搜索确认没有命名冲突

---

## 后端开发

### ts-node 弃用警告
**问题**: `--experimental-loader` 已弃用

**解决方案**: 使用 `tsx` 替代 `ts-node/esm`

```json
// package.json
{
  "scripts": {
    "dev": "tsx src/index.ts",  // ✅ 正确
    // "dev": "node --loader ts-node/esm src/index.ts"  // ❌ 已弃用
  }
}
```

**相关文件**: `server/package.json`

---

## Git 相关

### npm 配置警告
**警告**: `npm warn Unknown user config "sass_binary_site"`

**原因**: npm 用户配置中有旧的 sass 配置

**清理方法**:
```bash
npm config delete sass_binary_site
```

**影响**: 无害，但在新版本 npm 中会失效

---

## 布局与样式

### flex: 1 的陷阱
**问题**: 使用 `flex: 1` 但元素没有正确收缩

**原因**: `flex: 1` 是 `flex: 1 1 0%` 的简写
- `flex-grow: 1` - 可以放大
- `flex-shrink: 1` - 可以收缩
- `flex-basis: 0%` - 初始大小为0

**正确写法**:
```css
/* 允许拉伸和收缩，无最小宽度 */
flex: 1 1 auto;

/* 不收缩，保持基础宽度 */
flex: 0 0 48px;

/* 允许收缩，从0开始计算 */
flex: 1 1 0;
```

---

### aspect-ratio 的限制
**问题**: 使用 `aspect-ratio: 1` 强制正方形，浪费横向空间

**解决方案**: 改用固定高度 + 动态宽度
```css
/* 正方形 - 浪费空间 */
aspect-ratio: 1;

/* 矩形 - 更好利用空间 */
height: 28px;
flex: 1 1 0;  /* 宽度自适应 */
```

---

## 组件开发

### 组件 props 类型定义
**注意**: 新增可选 props 时要提供默认值

```tsx
// ✅ 正确
type Props = {
  required: string;
  optional?: number;  // 可选
};

export default function Component({ required, optional = 0 }: Props) {
  // ...
}
```

---

## 调试技巧

### 布局问题排查
1. 使用浏览器开发工具的 Flexbox 指南
2. 检查元素的 `getComputedStyle()` 实际计算值
3. 查找是否有 `min-width`/`max-width` 限制

### 颜色调试
- 使用高对比度颜色确保可读性
- 浅色背景用深色文字，深色背景用浅色文字

---

## 记录规范

### 添加新问题条目
格式：
```markdown
### 问题标题 (★★ 优先级)
**问题**: 简短描述
**根本原因**: ...
**正确做法**: ...
**发生次数**: X次
**最后修复**: YYYY-MM-DD
```

**优先级说明**:
- ★★★★ 高频问题 (3次以上)
- ★★★ 中频问题 (2-3次)
- ★★ 低频问题 (1次)
- ★ 偶发问题 (首次)

---

最后更新: 2026-01-17
