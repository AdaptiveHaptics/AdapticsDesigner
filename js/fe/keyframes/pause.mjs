/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../../shared/types").MAHKeyframePause} MAHKeyframePause */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./index.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { structured_clone } from "../../util.mjs";
import { MAHKeyframeBasicFE } from "./basic.mjs";
import { NewKeyframeCommon } from "./index.mjs";

/**
 * @implements {MAHKeyframePause}
 */
export class MAHKeyframePauseFE extends MAHKeyframeBasicFE {
	/**
	 *
	 * @param {MAHKeyframePause} keyframe
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		if (keyframe.type != "pause") throw new TypeError(`keyframe is not of type 'pause' found '${keyframe.type}'`);
		super(keyframe, pattern_design);
		this.type = keyframe.type;
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.cjumps = keyframe.cjumps;
	}

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {Partial<MAHKeyframe>} set
	 */
	static from_current_keyframes(pattern_design, set) {
		const {
			time,
			brush,
			intensity,
		} = new NewKeyframeCommon(pattern_design, set.time || null);
		const keyframe = new MAHKeyframePauseFE(structured_clone({ time, brush, intensity, cjumps: [], ...set, type: "pause" }), pattern_design);
		return keyframe;
	}
}