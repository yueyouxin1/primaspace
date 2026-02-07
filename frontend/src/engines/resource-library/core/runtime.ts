import type { ResourceLibraryCommand } from "./commands";
import { initialResourceLibraryState, reduceResourceLibrary } from "./state";
import type {
  ResourceLibrarySelector,
  ResourceLibraryState,
  ResourceLibrarySubscriber,
} from "./types";

export interface ResourceLibraryRuntime {
  getState: () => ResourceLibraryState;
  dispatch: (command: ResourceLibraryCommand) => void;
  subscribe: <T>(selector: ResourceLibrarySelector<T>, subscriber: ResourceLibrarySubscriber<T>) => () => void;
}

type Listener<T> = {
  selector: ResourceLibrarySelector<T>;
  subscriber: ResourceLibrarySubscriber<T>;
  lastValue: T;
};

export function createResourceLibraryRuntime(
  initialState: Partial<ResourceLibraryState> = {},
): ResourceLibraryRuntime {
  let state: ResourceLibraryState = { ...initialResourceLibraryState, ...initialState };
  const listeners = new Set<Listener<unknown>>();

  const notify = (prev: ResourceLibraryState) => {
    listeners.forEach((listener) => {
      const nextValue = listener.selector(state as ResourceLibraryState);
      if (!Object.is(nextValue, listener.lastValue)) {
        const previousValue = listener.lastValue;
        listener.lastValue = nextValue;
        listener.subscriber(nextValue, previousValue);
      }
    });
  };

  const dispatch = (command: ResourceLibraryCommand) => {
    const prev = state;
    const next = reduceResourceLibrary(state, command);
    if (next === prev) return;
    state = next;
    notify(prev);
  };

  const subscribe = <T,>(
    selector: ResourceLibrarySelector<T>,
    subscriber: ResourceLibrarySubscriber<T>,
  ) => {
    const listener: Listener<T> = {
      selector,
      subscriber,
      lastValue: selector(state),
    };
    listeners.add(listener as Listener<unknown>);
    return () => {
      listeners.delete(listener as Listener<unknown>);
    };
  };

  return {
    getState: () => state,
    dispatch,
    subscribe,
  };
}
