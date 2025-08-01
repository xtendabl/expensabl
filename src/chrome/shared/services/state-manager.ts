/**
 * Simple signal implementation for reactive state management
 */
export class Signal<T> {
  private value: T;
  private listeners = new Set<(value: T) => void>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }

  update(updater: (current: T) => T): void {
    this.set(updater(this.value));
  }

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.value));
  }
}

/**
 * Action interface for state updates
 */
export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

/**
 * Reducer function type
 */
export type Reducer<S, A extends Action = Action> = (state: S, action: A) => S;

/**
 * State manager with Redux-like patterns but using signals for reactivity
 */
export class StateManager<S, A extends Action = Action> {
  private state: Signal<S>;
  private reducer: Reducer<S, A>;
  private middleware: Array<(action: A, getState: () => S) => A | null> = [];

  constructor(initialState: S, reducer: Reducer<S, A>) {
    this.state = new Signal(initialState);
    this.reducer = reducer;
  }

  /**
   * Dispatches an action to update state
   */
  dispatch(action: A): void {
    // Run through middleware
    let processedAction: A | null = action;
    for (const mw of this.middleware) {
      processedAction = mw(processedAction as A, () => this.state.get());
      if (!processedAction) return; // Middleware can cancel action
    }

    // Apply reducer
    const newState = this.reducer(this.state.get(), processedAction);
    this.state.set(newState);
  }

  /**
   * Gets current state
   */
  getState(): S {
    return this.state.get();
  }

  /**
   * Subscribes to state changes
   */
  subscribe(listener: (state: S) => void): () => void {
    return this.state.subscribe(listener);
  }

  /**
   * Adds middleware for action processing
   */
  use(middleware: (action: A, getState: () => S) => A | null): void {
    this.middleware.push(middleware);
  }
}

/**
 * Creates a type-safe action creator
 */
export function createAction<T = void>(type: string) {
  return (payload: T): Action<T> => ({ type, payload });
}

/**
 * Combines multiple reducers into a single reducer
 */
export function combineReducers<S>(reducers: {
  [K in keyof S]: Reducer<S[K], Action>;
}): Reducer<S> {
  return (state: S, action: Action): S => {
    const newState = {} as S;
    let hasChanged = false;

    for (const key in reducers) {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);

      newState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    return hasChanged ? newState : state;
  };
}

/**
 * Logger middleware for debugging
 */
export const loggerMiddleware = <A extends Action, S = unknown>(
  action: A,
  _getState: () => S
): A => {
  // Uncomment for debugging:
  // console.group(`Action: ${action.type}`);
  // console.log('Payload:', action.payload);
  // console.log('State before:', getState());
  // console.groupEnd();
  return action;
};

/**
 * Cache middleware for caching specific actions
 */
export interface CacheConfig {
  key: string;
  ttl: number; // milliseconds
  storage?: 'memory' | 'chrome.storage.local';
}

export function createCacheMiddleware<S = unknown>(
  cacheConfigs: Record<string, CacheConfig>
): (action: Action, getState: () => S) => Action | null {
  const memoryCache = new Map<string, { data: unknown; expires: number }>();

  return (action: Action, _getState: () => S): Action | null => {
    const config = cacheConfigs[action.type];
    if (!config) return action;

    const cacheKey = `${config.key}:${JSON.stringify(action.payload || {})}`;
    const now = Date.now();

    // Check cache
    if (config.storage === 'memory') {
      const cached = memoryCache.get(cacheKey);
      if (cached && cached.expires > now) {
        // Return null to cancel the action, but first update state with cached data
        setTimeout(() => {
          action.payload = cached.data;
        }, 0);
        return action;
      }
    }

    // Store in cache after action completes
    setTimeout(() => {
      if (config.storage === 'memory') {
        memoryCache.set(cacheKey, {
          data: action.payload,
          expires: now + config.ttl,
        });
      }
    }, 0);

    return action;
  };
}
