/** @typedef {import("../../../../shared/types").MAHKeyframePause} MAHKeyframePause */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { MAHKeyframeBaseFE } from "./base.mjs";

/**
 * @implements {MAHKeyframePause}
 */
export class MAHKeyframePauseFE extends MAHKeyframeBaseFE {
	/**
	 * 
	 * @param {MAHKeyframePause} keyframe 
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		if (keyframe.type != "pause") throw new TypeError(`keyframe is not of type 'pause' found '${keyframe.type}'`);
		super(keyframe, pattern_design);
		this.type = /** @type {"pause"} */ ("pause"); //for type check
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.transition = keyframe.transition;
	}

	/**
	 * 
	 * @param {MAHPatternDesignFE} pattern_design 
	 * @param {{} | MAHKeyframeFE} set 
	 */
	static from_current_keyframes(pattern_design, set) {
		let time;
		if ("time" in set) {
			time = set.time;
		} else {
			time = pattern_design.linterp_next_timestamp();
		}
		
		return new MAHKeyframePauseFE({ type: "pause", time: time, brush, intensity, transition }, pattern_design);
	}
}