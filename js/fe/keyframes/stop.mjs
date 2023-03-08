/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../../shared/types").MAHKeyframeStop} MAHKeyframeStop */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { structured_clone } from "../../util.mjs";
import { MAHKeyframeBasicFE } from "./basic.mjs";
import { NewKeyframeCommon } from "./index.mjs";

/**
 * @implements {MAHKeyframeStop}
 */
export class MAHKeyframeStopFE extends MAHKeyframeBasicFE {
	/**
	 *
	 * @param {MAHKeyframeStop} keyframe
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		if (keyframe.type != "stop") throw new TypeError(`keyframe is not of type 'stop' found '${keyframe.type}'`);
		super(keyframe, pattern_design);
		this.type = keyframe.type;
	}

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {Partial<MAHKeyframe>} set
	 */
	static from_current_keyframes(pattern_design, set) {
		const { time } = new NewKeyframeCommon(pattern_design, set.time || null);
		const keyframe = new MAHKeyframeStopFE(structured_clone({ time, ...set, type: "stop" }), pattern_design);
		return keyframe;
	}
}