# 元象空间（PrismaSpace）UI 美学规范（全局项目视野）

**版本**：1.1
**适用对象**：UI 设计师 / 前端开发
**适用范围**：Marketing（门面）+ Platform（控制台）+ Studio（IDE）全局一致性约束
**核心设计哲学**：**隐形界面，专业触感**（Invisible Interface, Professional Touch）

> 我们不制造绚丽的装饰，我们制造精密的仪器。界面应尽可能退后，让用户的“创造物”和“数据”成为视觉焦点。

---

## 0. 文档使用方式（必须遵守）

1. **先选层级，再做组件**：任何页面/模块开工前，先确认属于 **Marketing / Platform / Studio** 哪一层。
2. **两套视觉人格严格隔离**：

   * **Marketing / Platform**：留白、层级清晰、品牌化表达。
   * **Studio（IDE）**：高密度、沉浸、面板化，像 VS Code / Figma。
3. **优先用 Token，而不是“感觉”**：颜色、字号、圆角、边框、阴影、动效都必须从本文给的 tokens/规则落地。
4. **AI 语义必须可识别**：AI Glow 只能在“AI 正在思考/生成/执行流”出现，禁止装饰性滥用。

---

## 1. 信息架构与路由分区（全局约束）

将产品拆为三个顶层入口，防止“门面被工具感污染”：

1. **Marketing（门面）**：`/`、`/templates`、`/templates/:id`、`/pricing`、`/docs`、`/community`
2. **Platform（SaaS 控制台）**：`/app`、`/app/projects/:id`、`/app/team`、`/app/billing`
3. **Studio（IDE）**：`/studio/:projectId/...`（UiApp / Workflow / Agent / DB / KB）

**上下文一致性（必须）**：UI 始终明确“用户 → 团队 → 工作空间（Workspace）”三级上下文。切换团队即切换计费与权限边界。

---

## 2. 组件库使用边界（平台层克制，创作层强化）

### 2.1 禁止默认外溢原则（红线）

> **不要在 Marketing / Platform 的常规页面默认使用 `ai-elements-vue` 组件库。**

`ai-elements-vue` 适用于 **Studio/IDE/AI 语义**（Chat / Thought / ToolCall / Markdown / 工具态等）。直接用于门面会导致“工具感过强、气质割裂”。

### 2.2 落地策略

* **Marketing / Platform**：优先 **Shadcn / Reka-ui / Tailwind 基础组件** 或原生样式。
* **Studio（IDE）**：可使用 `ai-elements-vue` + Shadcn/Reka/Tailwind，并强化密度与 AI 状态表达。
* **一致性约束**：若 Platform 需复用少量 `ai-elements-vue`：

  1. 必须走统一样式适配层（tokens / class overrides）；
  2. 必须通过设计评审；
  3. 禁止带出 IDE 的默认密度与语义外观。

---

## 3. 设计 Tokens（全局默认）

> 本节定义“全局外观物理规律”。所有页面不得私自改写。

### 3.1 色彩系统：克制的中性色（Restrained Neutrals）

**Canvas/Surface（背景与承载面）**

* **禁止**：纯白 `#FFFFFF` 与纯黑 `#000000` 大面积使用。
* **Light Mode**：以 `Zinc-50 ~ Zinc-100` 为背景基调，柔和如纸。
* **Dark Mode**：以 `Zinc-950` 为底，`Zinc-900` 为面板，降低疲劳。

**Accent（品牌交互色）**

* **Deep Indigo**：`#6366f1`
* **只能用于**：Primary Button、Active State、Focus Ring。
* **面积红线**：屏幕同时出现的亮色区域 ≤ **5%**。

**AI Glow（AI 语义色）**

* 仅当 AI **思考 / 生成 / 执行流**时出现：紫-粉渐变的微弱暗示（边框呼吸、文字渐变、轻微流光）。
* 禁止用于装饰、背景大面积渐变、或在 Marketing 的按钮上“炫技”。

### 3.2 字体与排版（Typography）

**字体栈**

* UI：`Inter, system-ui, -apple-system`
* 代码/ID/Schema/DSL：`JetBrains Mono, Fira Code`

**层级控制（只用字重 + 灰度）**

* 一级信息：`font-semibold` + 高对比文本色
* 二级信息/标签：`font-medium` + 低灰度文本（降低存在感）

### 3.3 形状与质感（Shape & Texture）

* **圆角**：统一 `rounded-md`（4–6px）。

  * 用于：按钮、输入框、节点卡片。
  * 禁止：大圆角“幼态化”。
* **边框**：统一 1px 超细边框。

  * Light：`border-slate-200`
  * Dark：`border-slate-800`
* **去分割线化**：优先通过 Surface Elevation（背景微弱差异）划分区域，减少线条噪声。

---

## 4. 动效与反馈（全局交互统一）

### 4.1 微交互（Micro-interactions）

* **按钮按压感**：点击必须 `scale-95`。
* **加载**：必须使用 Skeleton，与内容形状匹配；禁止全屏 Loading 转圈。
* **流式优先**：AI 输出必须渐进式展示，避免长时间静默。

### 4.2 提示体系（Toast / Modal）

* 成功：右下角 Toast（绿）
* 网络波动/可恢复：右下角 Toast（黄）
* 失败：右下角 Toast（红，含可复制错误信息）
* **业务阻断（唯一允许打断）**：

  * **402（配额/余额不足）**：强拦截 Modal，引导升级/充值
  * **403（权限不足）**：强拦截 Modal，引导申请权限/查看说明

> **402/403 是业务态，不是异常。** 文案与样式需与 `/pricing`、`/app/billing` 保持一致。

---

## 5. 三层页面的全局外观策略

### 5.1 Marketing（门面）

**目标**：像“成熟 SaaS 的模板市场”，以模板展示驱动转化。

* 留白充足、层级清晰、组件语义通用。
* 主要视觉来自 **真实模板缩略图与产品截图**，避免插画堆砌。
* AI Glow 仅用于少量推荐/生成模块的“运行状态暗示”。

### 5.2 Platform（控制台）

**目标**：高效率管理与清晰的 Workspace 归属。

* 布局容器化：卡片与列表为主。
* 图标：优先 Lucide 线条图标，克制装饰。
* 指标：大数字 + 迷你趋势图（sparkline）。

### 5.3 Studio（IDE）

**目标**：沉浸式高密度工作台。

* 面板化无缝拼接：面板之间无间隙，通过 1px 边框分隔。
* 可折叠/可拖拽分栏：资源树、属性面板支持调整。
* 工具栏：岛屿式悬浮，半透明磨砂（Backdrop Blur）。

---

## 6. 全局组件清单（跨层复用的“稳定件”）

这些组件允许在三层复用，但必须按对应层级 token 呈现：

1. **Button（Primary/Secondary/Ghost）**：Primary 仅使用品牌色，其他为中性。
2. **Input / Select / Search**：对比度控制，聚焦环使用品牌色。
3. **Card / Panel**：统一 1px 边框 + 微 elevation。
4. **Toast / Modal**：提示体系统一；402/403 模态为商业化与权限的唯一拦截入口。
5. **Skeleton**：所有异步加载必须覆盖。

---

## 7. 设计验收 Checklist（上线前必过）

* [ ] 页面层级正确：Marketing/Platform/Studio 之一（无混搭）
* [ ] 品牌色亮色面积 ≤ 5%
* [ ] AI Glow 只在 AI 运行态出现
* [ ] 组件库边界合规：门面未默认使用 ai-elements-vue
* [ ] 加载为 Skeleton，按钮有 `scale-95`
* [ ] 402/403 以模态强拦截，其他错误尽量 Toast
* [ ] 字体：UI 与 Monospace 使用场景正确

---

**一句话总结**：

> **让 PrismaSpace 看起来像一个你愿意在里面工作 8 小时的工具。**
