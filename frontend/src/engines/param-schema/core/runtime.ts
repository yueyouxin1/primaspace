import type { SchemaNode } from "./types";
import type { SchemaOp } from "./ops";
import { applyOp, invertOp } from "./ops";
import { createRootNode } from "./node";

export type SchemaEditorStatus = "idle" | "dirty" | "saving" | "error";

export interface SchemaEditorState {
  tree: SchemaNode;
  selection: { nodeId: string | null };
  status: SchemaEditorStatus;
  undoStack: SchemaOp[];
  redoStack: SchemaOp[];
  opLog: SchemaOp[];
  snapshots: Array<{ index: number; tree: SchemaNode }>;
}

export type SchemaEditorAction =
  | { type: "apply"; op: SchemaOp }
  | { type: "select"; nodeId: string | null }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; tree: SchemaNode };

export interface SchemaEditorRuntime {
  getState: () => SchemaEditorState;
  dispatch: (action: SchemaEditorAction) => void;
  subscribe: <T>(selector: (state: SchemaEditorState) => T, subscriber: (next: T, prev: T) => void) => () => void;
}

export interface SchemaRuntimeOptions {
  snapshotEvery?: number;
}

export const initialSchemaEditorState: SchemaEditorState = {
  tree: createRootNode(),
  selection: { nodeId: null },
  status: "idle",
  undoStack: [],
  redoStack: [],
  opLog: [],
  snapshots: [],
};

export function reduceSchemaEditor(state: SchemaEditorState, action: SchemaEditorAction): SchemaEditorState {
  switch (action.type) {
    case "apply": {
      const nextTree = applyOp(state.tree, action.op);
      if (nextTree === state.tree) return state;
      const nextUndo = [...state.undoStack, action.op];
      const nextOpLog = [...state.opLog, action.op];
      return {
        ...state,
        tree: nextTree,
        status: "dirty",
        undoStack: nextUndo,
        redoStack: [],
        opLog: nextOpLog,
      };
    }
    case "select":
      return { ...state, selection: { nodeId: action.nodeId } };
    case "undo": {
      const last = state.undoStack[state.undoStack.length - 1];
      if (!last) return state;
      const inverse = invertOp(state.tree, last);
      if (!inverse) return state;
      const nextTree = applyOp(state.tree, inverse);
      return {
        ...state,
        tree: nextTree,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, last],
        status: "dirty",
      };
    }
    case "redo": {
      const last = state.redoStack[state.redoStack.length - 1];
      if (!last) return state;
      const nextTree = applyOp(state.tree, last);
      return {
        ...state,
        tree: nextTree,
        undoStack: [...state.undoStack, last],
        redoStack: state.redoStack.slice(0, -1),
        status: "dirty",
      };
    }
    case "reset":
      return {
        ...state,
        tree: action.tree,
        status: "idle",
        undoStack: [],
        redoStack: [],
        opLog: [],
        snapshots: [],
      };
    default:
      return state;
  }
}

export function createSchemaRuntime(
  initialState: Partial<SchemaEditorState> = {},
  options: SchemaRuntimeOptions = {},
): SchemaEditorRuntime {
  let state: SchemaEditorState = { ...initialSchemaEditorState, ...initialState };
  const listeners = new Set<{ selector: (state: SchemaEditorState) => unknown; subscriber: (next: unknown, prev: unknown) => void; lastValue: unknown }>();
  const snapshotEvery = options.snapshotEvery ?? 50;

  const notify = (prev: SchemaEditorState) => {
    listeners.forEach((listener) => {
      const nextValue = listener.selector(state);
      if (!Object.is(nextValue, listener.lastValue)) {
        const previousValue = listener.lastValue;
        listener.lastValue = nextValue;
        listener.subscriber(nextValue, previousValue);
      }
    });
  };

  const dispatch = (action: SchemaEditorAction) => {
    const prev = state;
    const next = reduceSchemaEditor(state, action);
    if (next === prev) return;
    state = maybeSnapshot(next, snapshotEvery);
    notify(prev);
  };

  const subscribe = <T,>(selector: (state: SchemaEditorState) => T, subscriber: (next: T, prev: T) => void) => {
    const listener = { selector, subscriber, lastValue: selector(state) };
    listeners.add(listener as unknown as typeof listener);
    return () => {
      listeners.delete(listener as unknown as typeof listener);
    };
  };

  return {
    getState: () => state,
    dispatch,
    subscribe,
  };
}

function maybeSnapshot(state: SchemaEditorState, snapshotEvery: number): SchemaEditorState {
  if (state.opLog.length === 0) return state;
  if (state.opLog.length % snapshotEvery !== 0) return state;
  const snapshots = [...state.snapshots, { index: state.opLog.length, tree: state.tree }];
  return { ...state, snapshots };
}
