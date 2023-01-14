/** @typedef {import("../../../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { structured_clone } from "../../util.mjs";
import { MAHKeyframeBasicFE } from "./basic.mjs";
import { NewKeyframeCommon } from "./index.mjs";

/**
 * @implements {MAHKeyframeStandard}
 */
export class MAHKeyframeStandardFE extends MAHKeyframeBasicFE {
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
		this.coords = keyframe.coords;
	}

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {Partial<MAHKeyframeFE>} set
	 */
	static from_current_keyframes(pattern_design, set) {
		const { time, coords, brush, intensity, } = new NewKeyframeCommon(pattern_design, set.time || null);
		const keyframe = new MAHKeyframeStandardFE(structured_clone({ time, coords, brush, intensity, ...set, type: "standard" }), pattern_design);
		return keyframe;
	}
}