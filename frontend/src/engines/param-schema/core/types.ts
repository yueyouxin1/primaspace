export type SchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array";

// ========================================================================
// 1. 定义引用内容的严格结构 (ValueRefContent)
// ========================================================================
export interface ValueRefContent {
  /** 引用的源节点ID */
  blockID: string;
  /** 引用的变量路径 (e.g., 'output.result') */
  path: string;
  /** 元数据源标识，如 loop-block-output (可选) */
  source?: string;
}

// ========================================================================
// 2. 定义具体的 Value 子类型 (利用字面量类型作为 Discriminator)
// ========================================================================

/**
 * 字面量值
 * content 可以是任意合法的 JSON 值 (String, Number, Bool, Array, Object)
 */
export interface LiteralValue {
  type: 'literal';
  content: any; // 这里使用 any 是为了兼容各种静态配置值，也可以定义为 JsonValue
}

/**
 * 表达式值
 * content 必须是字符串
 */
export interface ExprValue {
  type: 'expr';
  content: string;
}

/**
 * 引用值
 * content 必须是 ValueRefContent 对象结构
 */
export interface RefValue {
  type: 'ref';
  content: ValueRefContent;
}

// ========================================================================
// 3. 定义聚合类型 (ParameterValue)
// ========================================================================
/**
 * 核心值类型定义。
 * 使用 TypeScript 的 Discriminated Union 特性。
 * 当 type === 'ref' 时，TS 会自动推断 content 为 ValueRefContent 类型。
 */
export type SchemaValueDefinition = LiteralValue | ExprValue | RefValue;

// ========================================================================
// 4. Schema 定义
// ========================================================================

export interface SchemaBlueprint {
  type: SchemaType;
  uid?: number;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: ParameterSchema[];
  items?: SchemaBlueprint;
}

export interface ParameterSchema extends SchemaBlueprint {
  name: string;
  required: boolean;
  open: boolean;
  role?: string;
  label?: string;
  value?: SchemaValueDefinition;
  meta?: Record<string, unknown>;
}

export type SchemaNodeKind = "root" | "property" | "item";

export interface SchemaNode {
  id: string;
  kind: SchemaNodeKind;
  type: SchemaType;
  uid?: number;
  name?: string;
  required?: boolean;
  open?: boolean;
  role?: string;
  label?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  value?: SchemaValueDefinition;
  meta?: Record<string, unknown>;
  children?: SchemaNode[];
  item?: SchemaNode | null;
}

export interface SchemaTree {
  root: SchemaNode;
}

export interface SchemaNodePathSegment {
  key: "root" | "properties" | "items";
  index?: number;
  name?: string;
}

export interface SchemaNodeLocator {
  nodeId: string;
  path: SchemaNodePathSegment[];
}

export interface SchemaIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  nodeId: string;
  path: string;
}

export interface SchemaValidationResult {
  issues: SchemaIssue[];
  errors: SchemaIssue[];
  warnings: SchemaIssue[];
}

export interface SchemaPreviewValue {
  source: "value" | "default" | "empty";
  value: unknown;
}
