/**** DEEP IMMUTABLE ****/
type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

type Immutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? ReadonlyArray<U> :
    T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : Readonly<T>

export type DeepImmutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? DeepImmutableArray<U> :
    T extends Map<infer K, infer V> ? DeepImmutableMap<K, V> :
    T extends Set<infer M> ? DeepImmutableSet<M> : DeepImmutableObject<T>;

export type DeepImmutableArray<T> = ReadonlyArray<DeepImmutable<T>>;
export type DeepImmutableMap<K, V> = ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>;
export type DeepImmutableSet<T> = ReadonlySet<DeepImmutable<T>>;
export type DeepImmutableObject<T> = { readonly [K in keyof T]: DeepImmutable<T[K]> };


/** Make one property optional */
type OptProp<T, K extends keyof T> = Partial<Pick<T, K>> & T;
/** Make one property required */
type ReqProp<T, K extends keyof T> = Required<Pick<T, K>> & T;
/** Make optional except property K */
type OptExceptProp<T, K extends keyof T> = Partial<T> & Pick<T, K>;

type NotNullable<T> = Exclude<T, null | undefined>;

type KeysOfUnion<T> = T extends T ? keyof T: never;

type OmitNever<T extends Record<string, unknown>> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};
type SharedProperties<A, B> = OmitNever<Pick<A & B, keyof A & keyof B>>;