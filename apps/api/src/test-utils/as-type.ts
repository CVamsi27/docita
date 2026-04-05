type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const asType = <T>(value: DeepPartial<T>): T => value as T;
