type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// check-as-cast-density: allow-file — test fixture builder for partial domain objects
export const asType = <T>(value: DeepPartial<T>): T => value as T;
