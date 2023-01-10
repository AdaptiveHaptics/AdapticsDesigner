/** @typedef {import("../../../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { MAHKeyframeBaseFE } from "./base.mjs";

/**
 * @implements {MAHKeyframeStandard}
 */
export class MAHKeyframeStandardFE extends MAHKeyframeBaseFE {
	/**
	 * 
	 * @param {MAHKeyframeStandard} keyframe 
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		if (keyframe.type != "standard") throw new TypeError(`keyframe is not of type 'standard' found '${keyframe.type}'`);
		super(keyframe, pattern_design);
		this.type = /** @type {"standard"} */ ("standard"); //for type check
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.transition = keyframe.transition;
		this.coords = keyframe.coords;
	}
	
	/**
	 * 
	 * @param {MAHPatternDesignFE} pattern_design 
	 * @param {{} | MAHKeyframeFE} set 
	 */
	static from_current_keyframes(pattern_design, set) {
		const current_keyframes_sorted = pattern_design.get_sorted_keyframes();

		let time;
		if ("time" in set) {
			time = set.time;
		} else {
			time = pattern_design.linterp_next_timestamp();
		}

		let next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > time);
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
		if ("coords" in set) {
			coords = set.coords;
		} else {
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
		}

		todo("redo if time can also have brush intensity transitions");


		// console.log(set);
		const keyframe = new MAHKeyframeStandardFE(window.structuredClone({ ...MAHKeyframeStandardFE.DEFAULT, ...next_keyframe, ...prev_keyframe, ...set, time, coords }), pattern_design);
		
		return keyframe;
	}


	/** @type {MAHKeyframeStandard} */
	static DEFAULT = {
		type: "standard",
		time: 0.000,
		coords: { x: 0, y: 0, z: 0, },
		intensity: {
			name: "constant",
			params: {
				value: 1.00
			}
		},
		brush: {
			name: "point",
			params: {
				size: 1.00
			}
		},
		transition: {
			name: "linear",
			params: {}
		}
	};
}