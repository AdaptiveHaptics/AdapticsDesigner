/**
 * Assert Not Null
 * @template T
 * @param {T | null} v
 * @returns {T}
 */
export function notnull(v) {
	if (v != null) return v;
	else throw new TypeError("Unexpected null");
}
/**
 *
 * @param {never} x
 * @returns {never}
 */
export function assert_unreachable(x) {
	throw new Error("Unexpected variant: " + x);
}

export function milliseconds_to_hhmmssms_format(t) {
	const pad = (n, z = 2) => ("00" + n).slice(-z);
	t = Math.floor(t);
	const ms = t % 1000;
	t = (t - ms) / 1000;
	const secs = t % 60;
	t = (t - secs) / 60;
	const mins = t % 60;
	t = (t - mins) / 60;
	const hrs = t;
	return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * @template T
 * @param {T} o
 * @returns {T}
 */
export function structured_clone(o) {
	return window.structuredClone(o);
}


/**
 * Compares two values for deep equality.
 *
 * @template {any} A
 * @template {any} B
 * @param {A} a
 * @param {B} b
 * @returns {A is B} `true` if the values are deeply equal, `false` otherwise.
 */
export function deep_equals(a, b) {
	// @ts-ignore
	return a == b || (
		a && b &&
		typeof a == "object" && typeof b == "object" &&
		Object.keys(a).length == Object.keys(b).length &&
		Object.keys(a).every(k => deep_equals(a[k], b[k]))
	);
}

/**
 * @param {number} num
 * @returns {string}
 */
export function num_to_rounded_string(num) {
	return (Math.round(num*100000)/100000).toString();
}

/**
 * @template K, T
 * @param {Map<K, T>} map
 * @param {K} key
 * @param {() => T} default_fn
 * @returns {T}
 */
export function map_get_or_default(map, key, default_fn) {
	const v = map.get(key);
	if (v !== undefined) return v;
	else {
		const v = default_fn();
		map.set(key, v);
		return v;
	}
}

/**
 *
 * @param  {...any} _args
 * @returns {never}
 */
export function abstract_method_unreachable(..._args) {
	throw new Error("Abstract method not implemented");
}