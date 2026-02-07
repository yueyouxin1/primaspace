# 资源运行时面板前端架构指导（面向技术团队）

> 本文档用于指导前端技术团队在 **MVP 阶段** 设计与实现「资源运行时面板（Runtime Panel）」的整体技术架构与拆分原则，支撑未来资源/引擎能力的高速演进。

---

## 一、背景与设计目标

我们的产品具备明确的双重形态：

* **平台门面（SaaS）**：强调转化、模板展示、留白与品牌感
* **核心创作层（Studio / Runtime）**：强调高密度、可组合、专业 IDE 体验

“资源运行时面板”处于 **Studio 核心层**，其职责不是展示页面，而是：

> **承载资源的真实运行状态、交互语义与渲染结果**

该区域将长期面对以下变化：

* 资源类型增加（UiApp / Workflow / Agent / DB / KB …）
* 引擎执行模型演进（同步 / SSE / WebSocket / 多阶段）
* 商业化与权限策略加强（402 / 403）
* 协作、回放、调试等高级能力接入

因此，必须在 MVP 阶段就避免 UI 与运行逻辑的强耦合。

---

## 二、核心结论（强约束）

**资源运行时面板的核心交互与渲染逻辑，必须封装为纯粹的 Headless 包，由外部注入数据与事件。**

UI 层只负责：

* 布局
* 视觉风格
* 用户输入的采集与转发

不直接持有业务状态、不直接依赖后端 API 形态。

---

## 三、为什么必须 Headless（给工程决策者）

### 1. 避免两套视觉人格互相污染

同一套运行时能力未来需要被多处复用：

* Studio IDE 面板（高密度）
* 平台层只读预览（低密度）
* 模板市场 Demo / Preview
* 未来的 Embed / SDK

如果运行逻辑写死在 UI 组件中，将不可避免地产生分叉与重复实现。

### 2. 引擎与资源模型必然频繁变化

在 MVP → V1 阶段：

* API 返回结构
* 运行状态枚举
* 错误/拦截策略

都会快速调整。

Headless 层可以通过 Adapter 吞掉变化，避免前端每次重构渲染层。

### 3. IDE 级交互需要可测试、可回放

运行时面板涉及：

* 选区、拖拽、缩放
* 快捷键
* undo / redo
* 状态回放

这些逻辑**不适合散落在 UI 组件中**，而应集中在状态机/命令系统中，便于单测与复用。

---

## 四、推荐的三层架构

### 1️⃣ runtime-core（纯 Headless 包）

**职责**：

* 状态机（idle / running / error / blocked / readonly）
* 交互语义（select / drag / zoom / run / stop）
* 渲染模型生成（Render Model / Scene Graph）
* 命令系统（Command → State → Event）

**约束**：

* 不依赖 React / Vue
* 不依赖 API / Auth / Billing
* 可被单测

**对外接口示例**：

* `createRuntime(config)`
* `runtime.dispatch(command)`
* `runtime.subscribe(selector, callback)`
* `runtime.getRenderModel()`

---

### 2️⃣ runtime-adapters（数据接入层）

**职责**：

* API Response → 标准资源快照
* SSE / WebSocket → 标准运行事件
* 权限 / 计费 → Blocked Reason（402 / 403）

**特点**：

* 允许依赖请求库、鉴权逻辑
* 是唯一感知“后端形态”的前端层

---

### 3️⃣ runtime-ui（React / Vue 渲染层）

**职责**：

* 把 Render Model 映射为组件 / Canvas / SVG
* 采集用户输入（鼠标 / 键盘）并转成 Command
* 处理主题、布局、动画

**明确禁止**：

* 直接修改运行状态
* 直接依赖 API 数据结构

---

## 五、交互设计原则：命令驱动，而非状态直改

### 推荐模式

* UI → Core：发送 **Command**

  * `SelectNode(id)`
  * `Drag(dx, dy)`
  * `Run()`

* Core → UI：派发 **Event / RenderModel**

  * `renderModelChanged`
  * `selectionChanged`
  * `blocked(402)`

### 好处

* 天然支持快捷键、宏命令
* 易于协作（命令合并）
* 易于回放 / Debug

---

## 七、工程判断准则（写代码前先自检）

在写任何运行时相关代码前，请问自己一个问题：

> **这段逻辑，是“用户交互语义 / 运行一致性”吗？**

* 如果是 → 放到 runtime-core
* 如果只是“长什么样” → 放到 runtime-ui

---

## 八、总结（给全员共识）

* 资源运行时面板不是页面，而是 **引擎的前端外壳**
* Headless 架构不是为了优雅，而是为了不被 UI 锁死
* MVP 阶段，解耦比完整更重要

> **只要引擎值得存在，UI 迟早会补上；反之不成立。**
--------