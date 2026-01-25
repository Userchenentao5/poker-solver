---
name: dangerous-code
enabled: true
event: file
action: warn
conditions:
  - field: new_text
    operator: regex_match
    pattern: (eval\(|new Function\(|innerHTML\s*=|outerHTML\s*=|dangerouslySetInnerHTML|document\.write\(|execScript\(|setInterval\([^,]*String|setTimeout\([^,]*String)
---

## ⚠️ 危险代码模式检测

检测到潜在的不安全代码模式！

### 检测到的危险模式

| 模式 | 风险等级 | 描述 |
|------|----------|------|
| `eval()` |  高 | 执行任意代码，XSS 风险 |
| `new Function()` |  高 | 动态代码执行，安全问题 |
| `innerHTML =` |  中 | XSS 攻击向量 |
| `outerHTML =` |  中 | XSS 攻击向量 |
| `dangerouslySetInnerHTML` |  中 | React XSS 风险 |
| `document.write()` |  高 | 覆盖文档，性能问题 |
| `execScript()` |  高 | 已弃用，仅 IE |
| `setInterval(String)` |  高 | 类似 eval |
| `setTimeout(String)` |  高 | 类似 eval |

### 安全替代方案

#### 1. 替代 `eval()` 和 `new Function()`
```javascript
// 危险
const result = eval('(' + userInput + ')')

// 安全 - 使用 JSON.parse
const result = JSON.parse(userInput)

// 或使用专门的解析库
import { parse } from 'some-parser'
const result = parse(userInput)
```

#### 2. 替代 `innerHTML`
```javascript
// 危险
element.innerHTML = userInput

// 安全 - 使用 textContent
element.textContent = userInput

// 或使用 DOM API
element.appendChild(document.createTextNode(userInput))

// 对于 HTML，先清理
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userInput)
```

#### 3. React 中替代 `dangerouslySetInnerHTML`
```jsx
// 危险
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 安全 - 使用 DOMPurify
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// 更安全 - 避免使用，直接渲染
<div>{userInput}</div>
```

#### 4. 替代字符串形式的 setTimeout/setInterval
```javascript
// 危险
setTimeout('alert("Hello")', 1000)

// 安全 - 使用函数
setTimeout(() => alert('Hello'), 1000)
```

### 必须使用时的注意事项

如果确实需要使用这些模式：
1. **输入验证** - 严格验证所有输入
2. **输出编码** - 对动态内容进行编码
3. **CSP 策略** - 配置内容安全策略
4. **代码审查** - 必须经过团队审查

**请确认是否有更安全的替代方案，或已采取适当的安全措施。**
