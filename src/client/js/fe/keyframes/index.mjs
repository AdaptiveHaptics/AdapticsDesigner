/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/**
 * @template T
 * @typedef {import("../../../../shared/util").NotNullable<T>} NotNullable
*/
/**
 * @template T
 * @typedef {import("../../../../shared/util").KeysOfUnion<T>} KeysOfUnion
*/

import { BoundsCheck } from "./bounds-check.mjs";
import { MAHKeyframePauseFE } from "./pause.mjs";
import { MAHKeyframeStandardFE } from "./standard.mjs";
import { MAHKeyframeStopFE } from "./stop.mjs";
import { assert_unreachable } from "../../util.mjs";

export { MAHKeyframePauseFE , MAHKeyframeStandardFE, MAHKeyframeStopFE };
/** @typedef {MAHKeyframeStandardFE | MAHKeyframePauseFE | MAHKeyframeStopFE} MAHKeyframeFE */


/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_has_coords(keyframe) {
	if ("coords" in keyframe) return keyframe;
	else return null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_has_coords>> } */
export function has_coords(keyframe) {
	return "coords" in keyframe;
}
/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_supports_coords(keyframe) {
	switch (keyframe.type) {
		case "standard": return keyframe;
		case "pause": return null;
		case "stop": return null;
		default: assert_unreachable(keyframe); //if this is causing a tsc error, switch cases are not complete (or typescript server needs to be restarted)
	}
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_supports_coords>> } */
export function supports_coords(keyframe) {
	return filter_supports_coords(keyframe) != null;
}

/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_supports_brush(keyframe) {
	switch (keyframe.type) {
		case "standard": return keyframe;
		case "pause": return keyframe;
		case "stop": return null;
		default: assert_unreachable(keyframe); //if this is causing a tsc error, switch cases are not complete
	}
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_supports_brush>> } */
export function supports_brush(keyframe) {
	return filter_supports_brush(keyframe) != null;
}

/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_supports_intensity(keyframe) {
	switch (keyframe.type) {
		case "standard": return keyframe;
		case "pause": return keyframe;
		case "stop": return null;
		default: assert_unreachable(keyframe); //if this is causing a tsc error, switch cases are not complete
	}
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_supports_intensity>> } */
export function supports_intensity(keyframe) {
	return filter_supports_intensity(keyframe) != null;
}

/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_supports_cjump(keyframe) {
	switch (keyframe.type) {
		case "standard": return keyframe;
		case "pause": return keyframe;
		case "stop": return null;
		default: assert_unreachable(keyframe); //if this is causing a tsc error, switch cases are not complete
	}
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_supports_cjump>> } */
export function supports_cjump(keyframe) {
	return filter_supports_cjump(keyframe) != null;
}

/**
 *
 * @param {MAHKeyframe} keyframe
 * @param {MAHPatternDesignFE} pattern_design
 * @returns {MAHKeyframeFE}
 */
export function create_correct_keyframefe_wrapper(keyframe, pattern_design) {
	switch (keyframe.type) {
		case "standard": return new MAHKeyframeStandardFE(keyframe, pattern_design);
		case "pause": return new MAHKeyframePauseFE(keyframe, pattern_design);
		case "stop": return new MAHKeyframeStopFE(keyframe, pattern_design);
		default: assert_unreachable(keyframe); //if this is causing a tsc error, switch cases are not complete
	}
}


export class NewKeyframeCommon {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {number | null} time
	 */
	constructor(pattern_design, time) {
		this.pattern_design = pattern_design;
		this.time = time!=null ? time : NewKeyframeCommon.next_timestamp(pattern_design);
	}
	/**
	 * @param {MAHPatternDesignFE} pattern_design
	 * @returns {number} timestamp for next keyframe
	 */
	static next_timestamp(pattern_design) {
		const last_keyframe = pattern_design.get_last_keyframe();
		const secondlast_keyframe = pattern_design.get_secondlast_keyframe();
		if (last_keyframe) { // linear extrapolation
			if (secondlast_keyframe) {
				return 2 * last_keyframe.time - secondlast_keyframe.time;
			} else {
				return last_keyframe.time + 500;
			}
		} else {
			return 0;
		}
	}

	/** @type {typeof NewKeyframeCommon.prototype.brush['transition']} */
	static DEFAULT_COORDS_TRANSITION = {
		name: "linear",
		params: {}
	};

	/**
	 * @returns {import("../../../../shared/types").CoordsWithTransition}
	 */
	get coords() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		let next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		if (next_keyframe_index == -1) next_keyframe_index = current_keyframes_sorted.length;
		/** @type {(MAHKeyframeStandardFE | undefined)[]} */
		const next_neighbors = [];
		for (let i=next_keyframe_index; i<current_keyframes_sorted.length; i++) {
			const kf = current_keyframes_sorted[i];
			if (kf.type == "standard") next_neighbors.push(kf);
			if (next_neighbors.length == 2) break;
			else continue;
		}
		/** @type {(MAHKeyframeStandardFE | undefined)[]} */
		const prev_neighbors = [];
		for (let i=next_keyframe_index; i--; ) {
			const kf = current_keyframes_sorted[i];
			if (kf.type == "standard") prev_neighbors.push(kf);
			if (prev_neighbors.length == 2) break;
			else continue;
		}
		const [next_keyframe, secondnext_keyframe] = next_neighbors;
		const [prev_keyframe, secondprev_keyframe] = prev_neighbors;

		let coords = { x: 0, y: 0, z: 0 };
		if (prev_keyframe && next_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = (prev_keyframe.coords.coords[k] + next_keyframe.coords.coords[k])/2);
		} else if (secondprev_keyframe && prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*prev_keyframe.coords.coords[k] - secondprev_keyframe.coords.coords[k]);
		} else if (secondnext_keyframe && next_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*next_keyframe.coords.coords[k] - secondnext_keyframe.coords.coords[k]);
		} else if (prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = prev_keyframe.coords.coords[k] + 5);
		}
		coords = BoundsCheck.coords(coords);
		return {
			coords,
			transition: prev_keyframe?.coords.transition || NewKeyframeCommon.DEFAULT_COORDS_TRANSITION
		};
	}

	#_find_neighbors() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		const next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		const next_keyframe = (next_keyframe_index == -1) ? undefined : current_keyframes_sorted[next_keyframe_index];
		const prev_keyframe = (next_keyframe_index == 0) ? undefined : current_keyframes_sorted[(next_keyframe_index == -1 ? current_keyframes_sorted.length : next_keyframe_index)-1];
		return { next_keyframe, prev_keyframe };
	}


	/**
	 * @template {KeysOfUnion<MAHKeyframeFE>} P
	 * @param {P} prop
	 * @returns {{ prev: Extract<MAHKeyframeFE, {[K in P]: any}>[P] | undefined, next: Extract<MAHKeyframeFE, {[K in P]: any}>[P] | undefined }}
	 */
	#_find_neighboring_prop(prop) {
		/**
		 * @template {KeysOfUnion<MAHKeyframeFE>} P
		 * @param {MAHKeyframeFE} kf
		 * @param {P} prop
		 * @returns {kf is Extract<MAHKeyframeFE, {[K in P]: any}>}
		 */
		function is_keyframe_with_prop(kf, prop) {
			return prop in kf;
		}

		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		const next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);

		let prev_prop = undefined;
		for (let i=next_keyframe_index-1; 0<=i && i<current_keyframes_sorted.length; i--) {
			const kf = current_keyframes_sorted[i];
			if (is_keyframe_with_prop(kf, prop)) {
				prev_prop = kf[prop];
			}
		}
		let next_prop = undefined;
		for (let i=next_keyframe_index; 0<=i && i<current_keyframes_sorted.length; i++) {
			const kf = current_keyframes_sorted[i];
			if (is_keyframe_with_prop(kf, prop)) {
				next_prop = kf[prop];
			}
		}
		return { prev: prev_prop, next: next_prop };
	}


	/** @type {typeof NewKeyframeCommon.prototype.brush} */
	static DEFAULT_BRUSH = {
		brush: {
			name: "circle",
			params: {
				radius: { type: "f64", value: 1.0 },
				am_freq: { type: "f64", value: 0 },
			}
		},
		transition: {
			name: "linear",
			params: {}
		}
	};
	/**
	 * @returns {import("../../../../shared/types").BrushWithTransition}
	 */
	get brush() {
		const { prev, next } = this.#_find_neighboring_prop("brush");
		return prev || next || NewKeyframeCommon.DEFAULT_BRUSH;
	}


	/** @type {typeof NewKeyframeCommon.prototype.intensity} */
	static DEFAULT_INTENSITY = {
		intensity: {
			name: "constant",
			params: {
				value: { type: "f64", value: 1.00 }
			}
		},
		transition: {
			name: "linear",
			params: {}
		}
	};
	/**
	 * @returns {import("../../../../shared/types").IntensityWithTransition}
	 */
	get intensity() {
		const { prev, next } = this.#_find_neighboring_prop("intensity");
		return prev || next || NewKeyframeCommon.DEFAULT_INTENSITY;
	}
}
