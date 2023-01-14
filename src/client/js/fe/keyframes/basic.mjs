/** @typedef {import("../../../../shared/types").MAHKeyframeBasic} MAHKeyframeBasic */
/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../../shared/types").MAHKeyframeTime} MAHKeyframeBase */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

/**
 * @abstract
 * @implements {MAHKeyframeBasic}
 */
export class MAHKeyframeBasicFE {
	#_pattern_design;
	/** @readonly */
	time;
	
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		this.#_pattern_design = pattern_design;
		this.time = keyframe.time;
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
	}

	/**
	 * 
	 * @param {number} t 
	 */
	set_time(t) {
		if (this.time == t) return;
		//@ts-ignore readonly (i gave up on trying to do this better)
		this.time = t;
		//@ts-ignore assume abstract, so `this` must be an implementation
		const this_non_abstract = /** @type {MAHKeyframeFE} */ (this);
		this.#_pattern_design.check_for_reorder(this_non_abstract);
	}
}