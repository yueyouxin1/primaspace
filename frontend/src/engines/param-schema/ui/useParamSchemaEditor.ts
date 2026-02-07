import { onBeforeUnmount, shallowRef } from "vue";
import { createSchemaRuntime, type SchemaEditorState, type SchemaRuntimeOptions } from "../core";

export interface UseParamSchemaEditorOptions extends SchemaRuntimeOptions {
  initialState?: Partial<SchemaEditorState>;
}

export function useParamSchemaEditor(options: UseParamSchemaEditorOptions = {}) {
  const runtime = createSchemaRuntime(options.initialState ?? {}, options);
  const state = shallowRef(runtime.getState());

  const unsubscribe = runtime.subscribe((next) => next, (nextState) => {
    state.value = nextState;
  });

  onBeforeUnmount(() => {
    unsubscribe();
  });

  return {
    state,
    dispatch: runtime.dispatch,
  };
}
