/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

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

