/**
 * Assert Not Null
 * @template T
 * @param {T | null} t
 * @returns {T}
 */
export function notnull(t) {
	if (t) return t;
	else throw new TypeError("Unexpected null");
}
/**
 *
 * @param {never} _x
 * @returns {never}
 */
export function assert_unreachable(_x) {
	throw new Error("Didn't expect to get here");
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