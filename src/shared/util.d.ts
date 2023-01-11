/**** DEEP IMMUTABLE ****/
type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

type Immutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? ReadonlyArray<U> :
    T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : Readonly<T>

export type DeepImmutable<T> =
    T extends ImmutablePrimitive ? T :
    T extends Array<infer U> ? ImmutableArray<U> :
    T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
    T extends Set<infer M> ? ImmutableSet<M> : ImmutableObject<T>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };


/** Make one property optional */
type OptProp<T, K extends keyof T> = Partial<Pick<T, K>> & T;
/** Make one property required */
type ReqProp<T, K extends keyof T> = Required<Pick<T, K>> & T;
/** Make optional except property K */
type OptExceptProp<T, K extends keyof T> = Partial<T> & Pick<T, K>;

type NotNullable<T> = Exclude<T, null | undefined>;

type KeysOfUnion<T> = T extends T ? keyof T: never;