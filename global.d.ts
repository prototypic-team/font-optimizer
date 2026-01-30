declare namespace NodeJS {
  interface ProcessEnv {
    ASSETS_HOST: string | undefined;
  }
}

/**
 * An utility type, that merges two types. It guarantees, that if some
 * of the properties names between two types math, the resulting type
 * will infer those properties from the first type.
 * It is helpful when wewant to override some properties on one type
 * with some custom implementation. Think of it as a type analog of
 * Object.assign() or { ...originalObject, overrittenPropert: newValue }
 * (in es6)
 *
 * Usage:
 *
 * type OriginalType = {
 *    overritenProperty: string
 *    regularProperty: string
 * }
 *
 * type TypeWithOverrides = MergeWithPriority<
 *    { overritenProperty: boolean },
 *    OriginalType
 * >
 *
 * The resulting type will be:
 * {
 *    overritenProperty: boolean
 *    regularProperty: string
 * }
 */
type MergeWithPriority<T, P> = T & Omit<P, keyof T>;

/**
 * Utility type, that helps partial types for nested objects
 */
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Utility type, that helps define optional properties, that can be ommited.
 * In contrast with Partial type, non-optional properties will be required.
 */
type Optional<T, P extends keyof T = keyof T> = Omit<T, P> & {
  [key in P]?: T[key];
};

/**
 * Utility type, that helps define required properties, that have to be present.
 * There is a built-in Required type, that make all the object fields required.
 * This helper makes required only specified fields.
 */
type RequiredFields<T, P extends keyof T = keyof T> = Pick<T, P> &
  Partial<Omit<T, P>>;

/**
 * Utility type, that helps define function return type based on the arguments.
 */
type ConditionalReturnType<A, R> = A extends undefined ? undefined : R;
