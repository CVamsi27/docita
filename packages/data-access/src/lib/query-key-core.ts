export type QueryParams = Readonly<object> | undefined;

export function withParams<TParams extends QueryParams>(params: TParams) {
  return params ?? {};
}
