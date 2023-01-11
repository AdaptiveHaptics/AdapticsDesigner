/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** 
 * @template T
 * @typedef {import("../../../../shared/util").NotNullable<T>} NotNullable
 */

import { MAHKeyframePauseFE } from "./pause.mjs";
import { MAHKeyframeStandardFE } from "./standard.mjs";

export { MAHKeyframePauseFE , MAHKeyframeStandardFE };

/** @typedef {MAHKeyframeStandardFE | MAHKeyframePauseFE} MAHKeyframeFE */


/**
 * 
 * @param {MAHKeyframeFE} keyframe 
 */
export function filter_by_coords(keyframe) {
	if ("coords" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_coords>> } */
export function has_coords(keyframe) {
	return "coords" in keyframe;
}
/**
 * 
 * @param {MAHKeyframeFE} keyframe 
 */
export function filter_by_brush(keyframe) {
	if ("brush" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_brush>> } */
export function has_brush(keyframe) {
	return "brush" in keyframe;
}
/**
 * 
 * @param {MAHKeyframeFE} keyframe 
 */
export function filter_by_intensity(keyframe) {
	if ("intensity" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_intensity>> } */
export function has_intensity(keyframe) {
	return "intensity" in keyframe;
}
/**
 * 
 * @param {MAHKeyframeFE} keyframe 
 */
export function filter_by_transition(keyframe) {
	if ("transition" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_transition>> } */
export function has_transition(keyframe) {
	return "transition" in keyframe;
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
		// @ts-ignore
		default: throw new TypeError(`Unknown keyframe type '${keyframe.type}'`);
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

	/**
	 * @returns {{ x: number, y: number, z: number }} timestamp for next keyframe
	 */
	get coords() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		let next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		if (next_keyframe_index == -1) next_keyframe_index = current_keyframes_sorted.length;
		const next_neighbors = [];
		for (let i=next_keyframe_index; i<current_keyframes_sorted.length; i++) {
			const kf = current_keyframes_sorted[i];
			if (kf.type == "standard") next_neighbors.push(kf);
			if (next_neighbors.length == 2) break;
			else continue;
		}
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
			Object.keys(coords).forEach(k => coords[k] = (prev_keyframe.coords[k] + next_keyframe.coords[k])/2, 500);
		} else if (secondprev_keyframe && prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*prev_keyframe.coords[k] - secondprev_keyframe.coords[k], 500);
		} else if (secondnext_keyframe && next_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*next_keyframe.coords[k] - secondnext_keyframe.coords[k], 500);
		} else if (prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = prev_keyframe.coords[k] + 5, 500);
		}
		Object.keys(coords).forEach(k => coords[k] = Math.min(Math.max(coords[k], 0), 500));
		return coords;
	}

	#find_neighbors() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		const next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		const next_keyframe = (next_keyframe_index == -1) ? undefined : current_keyframes_sorted[next_keyframe_index];
		const prev_keyframe = (next_keyframe_index == -1 || next_keyframe_index == 0) ? undefined : current_keyframes_sorted[next_keyframe_index-1];
		return { next_keyframe, prev_keyframe };
	}

	get brush() {
		const { next_keyframe, prev_keyframe } = this.#find_neighbors();
		return prev_keyframe?.brush || next_keyframe?.brush;
	}
	get intensity() {
		const { next_keyframe, prev_keyframe } = this.#find_neighbors();
		return prev_keyframe?.intensity || next_keyframe?.intensity;
	}
	get transition() {
		const { next_keyframe, prev_keyframe } = this.#find_neighbors();
		return prev_keyframe?.transition || next_keyframe?.transition;
	}
}
