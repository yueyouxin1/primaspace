# ParameterSchema 编辑器方案建议

1. **与后端契约的“唯一真源”与兼容策略**

* 前端使用 `id: uuid` 没问题，但导入导出必须定义清楚：`uid`（后端可选数字）如何保留/映射、缺失时如何生成、以及是否需要稳定映射（同一节点多次编辑后 uid 是否保持）。
* 明确我们导出时的目标形态：`ParameterSchema[]`（object 的 properties）与 `SchemaBlueprint`（array items）在边界处如何转换，避免出现“数组元素匿名但我们又需要 name”的语义冲突。

2. **类型变更（change_type）的确定性迁移规则**

* `object -> 非object`、`array -> 非array` 时，`properties/items` 的清理/迁移策略需要写成明确规则（含是否弹确认、是否可撤销、如何保留数据到 meta 暂存）。
* `wrap_array/unwrap_array` 的语义也要定义清楚（尤其是 unwrap 后 name/required/open 等字段继承策略）。

3. **校验体系分层：结构性错误 vs 业务约束警告**

* 结构性错误（阻断保存）：例如 object 子属性 name 缺失/重复、array 缺 items、type 不合法。
* 业务警告（不阻断但提示）：例如 `value.type` 与 schema `type` 不匹配、enum 与 type 不匹配、required/open 的策略性建议等。
* 预览 Resolver 必须和这套分层一致（错误/警告可定位到节点路径）。

4. **路径与引用（ref）需要标准化**

* 既然存在 `value.type='ref'`，编辑器必须定义一种稳定的 `nodePath`（如 `root.properties[2].properties[0]` 或基于 uuid 的 path），并明确 ref 的解析上下文（workflow 节点输出、全局变量等）。否则 Preview Resolver 会无法做一致预览。

5. **性能边界与工程化约束**

* Tree 虚拟化 OK，同时建议把 “节点局部订阅” 写进实现方案：选中节点以外的 Detail 不订阅；大字段（enum/meta）一律延迟/按需加载。
* Ops 日志增长策略：是否需要压缩/快照（例如每 N 次 op 生成 snapshot，避免回放过慢）。

6. **扩展字段的 UI 规范**

* `meta` 建议使用 JSON editor + schema 约束（至少做格式化、折叠、diff 友好）。
* `enum` 大列表要有搜索/批量导入/去重与类型一致性提示。

下一步你可以按你列的 1)~4) 先交付一个 MVP，但请把上面这些“补齐项”同步写入设计文档/README，并在代码里做成明确的协议与规则（尤其是导入导出与 change_type 迁移规则）。
另外你提的两个问题：

* **存储位置/API 字段名**：我们会给你当前资源层的接口与字段映射；你先按“导入 ParameterSchema[] / 导出 ParameterSchema[]”做适配层，内部 Tree 不直接耦合 API。
* **多人协作**：先按单人编辑上线，但 Ops 必须保持可序列化与可持久化，为后续协作预留。

---

## 交付标准（必须满足，作为验收口径）

### 0) 交付物清单

* **Package A：`@org/param-schema-core`（必交付）**

  * `SchemaNode/SchemaOp/applyOp/invertOp`
  * `import(ParameterSchema[]) -> tree`、`export(tree) -> ParameterSchema[]`
  * `validate(tree)`（错误/警告分层）
  * `resolvePreview(node)`（value > default > empty 的解析链预览，可选但推荐）
* **Package B：`@org/param-schema-editor-ui`（推荐交付）**

  * Tree / Detail / Preview 三栏编辑器组件（Tailwind + shadcn）
  * 虚拟化与大字段延迟加载策略落地
  * 所有业务耦合点通过 hooks/adapter 注入
* **宿主项目 Adapter 示例（必交付至少 1 个）**

  * 保存/发布 API、402/403 拦截、权限、i18n、路由跳转的接入示例代码

---

### 1) 功能验收标准（MVP 必达）

* **导入/导出一致性**：导入一份 ParameterSchema，编辑器不改动时导出应做到**语义等价**（字段不丢、结构不乱、顺序保持）。
* **基本编辑能力**：

  * 增/删/改节点（properties/items）
  * 同级 properties 排序（拖拽或按钮）
  * change_type（object/array 切换必须有明确迁移规则）
  * enum/value/meta 编辑可用（meta 至少 JSON 可编辑+折叠）
* **Undo/Redo**：所有编辑操作必须可撤销/重做，且不会破坏树结构。
* **错误/警告定位**：validate 输出必须能定位到节点（按 uuid path 或稳定 path），UI 可点击跳转到节点。

---

### 2) 契约与语义标准（“核心数据契约”必须硬约束）

* **类型结构约束**：

  * `type=object` 必须允许管理 `properties: ParameterSchema[]`
  * `type=array` 必须允许管理 `items: SchemaBlueprint`
  * `type` 变更时对 `properties/items` 的清理/迁移必须可预测、可撤销
* **name 规则**：

  * object 下的 properties：`name` 必填且同级唯一（错误级别：阻断保存）
* **解析链预览一致**：

  * Preview Resolver 显示解析优先级：`value` > `default` > 空
  * `value.type` 与 schema `type` 不一致：至少警告提示（不强制阻断，除非你们规定为 error）

---

### 3) 性能验收标准（“高性能编辑器”的硬指标）

* **树虚拟化落地**：Tree 列表必须虚拟化，不能一次渲染全量节点。
* **局部订阅**：Detail Panel 仅渲染当前选中节点；节点修改不应触发全树重渲染。
* **大字段策略**：

  * `enum` 大数组：延迟渲染 + 搜索/过滤（避免一次性渲染 1000+ 行）
  * `meta`：默认折叠，不做深层自动展开/深 watch
* **回放与快照策略**：

  * ops 日志不得无限增长导致回放变慢：必须提供**快照/压缩**策略或清晰的上限与处理方式（例如每 N 次 op 生成 snapshot）

---

### 4) 包化与复用标准（独立包的关键）

* **core 包无 UI 依赖**（必须）：不依赖 Tailwind/shadcn/路由/业务 API。
* **editor-ui 不直连业务**（必须）：

  * 保存/发布由 `onSave/onPublish` 注入
  * 402/403 拦截通过 `onBillingBlocked` / `onForbidden` 回调注入
  * 权限通过 `canEdit(node)` 或能力集注入
* **样式策略明确**（必须写清）：

  * Tailwind 由宿主编译还是包内输出 CSS（二选一并固化）
  * 冲突策略（主题 token、前缀、或限制宿主配置范围）

---

### 5) 质量标准（测试 + 文档 + 可维护）

* **单元测试（core 必须）**：

  * applyOp/invertOp（至少覆盖：add/remove/move/set/change_type）
  * import/export round-trip（至少 5 组：object/array/嵌套/enum/value/meta）
  * validate（错误/警告分层）
* **组件测试（ui 推荐）**：

  * 关键路径冒烟：新增节点、改字段、撤销重做、导出
* **文档（必须）**：

  * core：数据模型、op 列表、迁移规则、校验规则
  * ui：props/hook/adapter 接口说明 + 最小接入 demo
  * 示例：提供一份“复杂 schema” demo 数据用于回归

---

### 6) 可用性与一致性标准（面向长期演进）

* **快捷操作**：新增/删除/复制等至少有一种高效入口（右键/hover/快捷键可选）
* **可访问性（最低限度）**：表单控件可键盘操作，弹窗可关闭并焦点回归（shadcn 通常能帮到）
* **国际化（若项目需要）**：UI 文案可从外部注入/可替换，不写死中文/英文在组件内部

---

按这个口径推进即可，你开始出 `SchemaNode/SchemaOp/applyOp+invertOp` 代码骨架与三栏 UI 框架吧。