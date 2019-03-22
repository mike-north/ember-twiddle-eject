export type ErrorResult = ['error', Error];
export type NoValueResult = ErrorResult | ['ok'];
export type ValueResult<T> = ErrorResult | ['ok', T];
