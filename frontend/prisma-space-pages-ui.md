# 元象空间（PrismaSpace）UI 美学规范（细节与模块）

**版本**：1.1
**适用对象**：UI 设计师 / 前端开发
**适用范围**：各页面与运行时模块的细节落地（组件/布局/状态/动效）
**前置依赖**：必须先满足《UI 美学规范（全局项目视野）》中的层级边界与 tokens。

---

## 0. 通用细则（所有模块共用）

### 0.1 状态分层（避免噪声）

* **Default**：中性克制，几乎“看不见”。
* **Hover**：仅提升边框/阴影 1 级，不改变布局。
* **Active/Selected**：1px 品牌色描边 + 轻微背景提亮。
* **Focus**：品牌色 Focus Ring（可访问性）。
* **AI Running**：仅此状态允许 AI Glow（微弱渐变呼吸/流光）。

### 0.2 密度规则

* Marketing：舒展留白（卡片间距更大）。
* Platform：中等密度（表格/列表可读性优先）。
* Studio：高密度（信息尽可能在视野内）。

### 0.3 加载与反馈

* 模块级 Skeleton：严格拟合内容形状。
* 无全屏转圈；长耗时任务必须给出“进度/阶段”或流式输出。
* 402/403 在任何模块触发均使用同一套拦截模态（样式/文案/按钮一致）。

---

# 1) Marketing（门面）细节规范（重点：模板市场）

> **门面目标**：模板展示驱动转化。视觉像高质量 SaaS 模板 Marketplace，而不是 IDE。

## 1.1 首页 Home（/）

### A. 首屏固定骨架（建议）

1. **顶部导航（轻量）**

* 左：Logo + 一句话定位
* 中：Templates / Pricing / Docs / Community
* 右：Sign in + **Create Project（Primary CTA）**

2. **Hero（强动机）**

* 标题：从模板到可运行 AI 产品
* 副标题：可视化构建 + 工作流编排 + Agent 调试 + 数据/知识管理
* CTA：

  * 主：Create new project（Primary）
  * 次：Browse templates（Ghost/Outline）

3. **模板墙预览（首屏下半立刻出现）**

* 真实模板卡片网格（官方 + 社区）
* 桌面端建议 4–5 列

4. **价值证明区（真实界面截图）**

* 三张并列：UiApp Builder / Workflow Editor / Agent Debugger
* 截图承载框必须是“门面皮肤”（不要直接带 IDE 面板外观）

5. **社群与生态**

* 贡献模板入口
* 官方精选合集入口

### B. 门面核心组件：TemplateCard（必须统一）

**信息层级（从上到下）**

1. 封面：真实 UI 缩略图（16:10 或 4:3）
2. 标题：1 行省略
3. 标签：最多 3 个（场景/能力）
4. 指标：评分 / 使用量 / 最近更新（弱灰文本）

**交互**

* Hover：轻微放大 + 阴影提升（不超过 1 级）
* Hover 操作：Preview / Use template
* Click：进入详情 `/templates/:id`

### C. Create Project（门面最大转化入口）

* 位置：导航右侧、Hero、模板墙上方均出现
* 样式：完全一致（不做“活动款”）
* 动作：推荐打开创建向导浮层（减少跳转摩擦）

### D. AI Glow 在门面使用边界

* 仅用于：AI 推荐模板列表生成时（容器边框轻微紫粉呼吸）
* 禁止：按钮/大面积背景/装饰渐变

---

## 1.2 模板列表页 Templates（/templates）

### 两栏布局

* 左侧筛选栏（Sticky）：

  * 类目：官方/社区
  * 场景：客服/电商/内容/数据分析/研发工具…
  * 能力：UiApp / Workflow / Agent / DB / KB
  * 难度：入门/进阶/专家
  * 排序：Trending / New / Most used / Highest rated

* 右侧模板网格：

  * 支持无限滚动
  * Skeleton 覆盖卡片占位

### 关键交互

* 搜索框文案：支持语义提示：`Search templates… (e.g. “RAG onboarding bot”)`
* 筛选变化：即时刷新（避免整页闪烁）
* 卡片 hover：与首页一致（肌肉记忆）

---

## 1.3 模板详情页 Template Detail（/templates/:id）

### 信息结构（按转化排序）

1. 标题 + 官方/社区标识 + 使用量/评分
2. 主操作：Use this template（Primary） + Preview（Secondary）
3. 三段式介绍：

* **你会得到什么**：将创建的资源（UiApp/Workflow/Agent/DB/KB）用轻量图标阵列展示
* **适用人群与场景**：3–5 条
* **成本与限制提示**：可能触发 402 的操作提前提示（像专业平台）

4. 预览区：截图轮播（真实界面），可选 GIF
5. 作者卡（社区模板）：头像/贡献者/更多作品

---

## 1.4 定价页 Pricing（/pricing）

* 三列卡：Free / Pro / Team（按实际方案）
* 每列必须包含：

  * 核心配额（调用量/并发/项目数/协作人数）
  * 功能差异（对勾列表，避免长文）
  * CTA：Upgrade / Start free
* 下半：FAQ（重点解释 402：配额耗尽、余额不足、超额计费）

---

## 1.5 Auth（/signin /signup）

* 容器化卡片居中，背景 Zinc-50~100
* 旁侧/下方展示 3 个模板缩略图作为信任背书
* 注册成功：先进入 Onboarding，不要直接进 IDE

---

## 1.6 Onboarding（首次进入/空工作区）

**目标**：3 步把用户推到创建项目。

* Step 1：Start from template（默认推荐）/ Start blank
* Step 2：精选模板墙（12 个）+ 搜索跳 `/templates`
* Step 3：项目命名 + Workspace 归属

AI 推荐可选：生成时容器 AI Glow（轻微）

---

# 2) Platform（控制台）细节规范

> 平台层：清爽直观、容器化；强调 Workspace 归属；少用 IDE/AI 语义组件。

## 2.1 控制台首页/项目列表（/app）

* 顶部：Workspace 切换器（清晰展示团队/工作区）
* 主区：项目列表（表格/卡片视图切换）

  * 表格列：Last edited / Owner / Template / Status
  * 卡片：封面缩略图 + 最近活动
* 右上：Create project（持续强 CTA）
* 空状态：嵌入模板精选网格（空状态也能转化）

## 2.2 项目概览（/app/projects/:id）

**目的**：告诉用户下一步去哪里。

* 左：资源概览（UiApp / Workflow / Agent / DB / KB）资源卡
* 右：最近运行/发布状态（草稿 vs 发布）
* 底部：协作与权限说明（role gating），受限按钮禁用 + 解释文案，最终 403 拦截兜底

## 2.3 团队与成员管理（/app/team）

* 信息核心：角色/权限/计费主体
* 受限操作：禁用态 + 解释；依然保留 403 模态兜底

## 2.4 计费中心（/app/billing）

* KPI：调用量、余额、当月趋势（大数字 + sparkline）
* 可能触发 402 的动作：明确提示，并与 402 模态文案一致

---

# 3) Studio（IDE）细节规范（核心创作层）

> Studio：面板化无缝拼接、高密度沉浸、可拖拽分栏、岛屿工具栏。

## 3.1 Studio Shell（/studio/:projectId）

### 布局骨架

* 左：资源树（UiApp / Workflow / Agent / DB / KB）
* 中：编辑区（Tab 多开）
* 右：属性/配置/运行面板（可折叠）
* 顶：项目级工具栏（发布/运行/环境/协作）

### 专业效率入口（建议）

* **命令面板 Cmd+K**：统一入口（跳转资源、执行动作、搜索）

---

## 3.2 UiApp Builder（Visual Builder）

### 画布（Canvas）

* 背景：无限点阵（Dot Grid）或棋盘格（Checkerboard），明确“编辑区域”心智。

### 选中态 / Hover 态

* **Selected**：1px 品牌色实线边框 + 四角方形拖拽手柄（Handles）
* **Hover**：1px 品牌色虚线轮廓 + 组件类型标签（如 `Container`）

### 属性面板（右侧）

* 分组：Layout / Style / Data / Events
* 信息密度高但可扫读：标题弱、字段强；关键开关对齐

### 体验红线

* 预览必须“像素级一致”（所见即所得）

---

## 3.3 Workflow Editor（Node Graph）

### 节点（Nodes）

* 风格参考：Vue Flow + ai-elements
* 结构：

  * 头部：图标 + 标题；不同类型节点用不同头部色条区分
  * 端口：左入右出；连接点足够大，易点击
  * 状态灯：右上角微型指示灯

    * 灰：闲置
    * 蓝脉冲：运行中
    * 绿：成功
    * 红：报错

### 连线（Edges）

* 平滑贝塞尔曲线（Bezier）
* 运行时：连线上有微小光点移动，表示数据流方向

---

## 3.4 Agent Debugger（Chat Interface）

### 对话气泡

* User：极简（无背景或浅灰）
* Agent：包含头像，回复用 Markdown 渲染

### 思维链 / 工具调用 / 搜索动作（可观测但不打扰）

* 默认折叠在灰色 `details` 块中
* 展开可查看 JSON / Log
* 原则：**技术细节不干扰主对话流，但随时可查**

### 流式输出（SSE）

* Token 渐进展示
* 禁止长时间静默：无输出时给阶段提示（例如“检索中/调用工具中/生成中”）

---

## 3.5 TenantDB & Knowledge Base（Data Management）

### Data Grid（Spreadsheet 风格）

* 极高信息密度：行高 `h-8` 或 `h-10`
* 表头：灰底 + Sticky Header
* 单元格：Inline Edit（原位编辑）
* 字体：ID/Key/数值强制 Monospace

---

# 4) “门面 → IDE”跃迁体验（避免割裂）

> 用户从 SaaS 门面进入 Studio，必须感到“这是同一套系统”。

1. **Project Created 落地页**

* 展示：创建了哪些资源 + 下一步推荐（打开 UiApp / 运行 Workflow / 调试 Agent）
* 然后再进入 Studio

2. **Studio 首次打开空态**

* 左侧资源树高亮模板生成资源
* 中间给 Quick Actions 卡（Run / Preview / Publish）

3. **商业化/权限一致**

* Studio 内触发 402/403：使用与 Platform 相同组件/文案/按钮布局

---

## 5) 模块级验收 Checklist（逐模块必过）

* [ ] 状态层级清晰：Default/Hover/Selected/Focus/AI Running
* [ ] Skeleton 覆盖加载（形状匹配）
* [ ] 402/403 模态一致且强拦截
* [ ] Studio 面板无缝拼接 + 1px 边框分隔
* [ ] UiApp/Workflow/Chat/DB 细节符合本规范
* [ ] 门面不出现 IDE 密度与 ai-elements 默认外观

---

**一句话总结**：

> 门面像成熟 SaaS Marketplace，Studio 像专业 IDE；两者通过一致的 tokens 与业务态（402/403）被“同一系统感”连接起来。
