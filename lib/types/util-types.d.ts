export type PartialKeys<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
export type Equal<A, B> = A extends B ? A : never;
