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
		this.type = /** @type {"pause"} */ ("pause"); //for type check
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.transition = keyframe.transition;
	}

	/**
	 * 
	 * @param {MAHPatternDesignFE} pattern_design 
	 * @param {Partial<MAHKeyframe>} set 
	 */
	static from_current_keyframes(pattern_design, set) {
		const {
			time,
			brush = MAHKeyframePauseFE.DEFAULT.brush,
			intensity = MAHKeyframePauseFE.DEFAULT.intensity,
			transition = MAHKeyframePauseFE.DEFAULT.transition,
		} = new NewKeyframeCommon(pattern_design, set.time || null);
		const keyframe = new MAHKeyframePauseFE(structured_clone({ time, brush, intensity, transition, ...set, type: MAHKeyframePauseFE.DEFAULT.type }), pattern_design);
		return keyframe;
	}

	/** @type {MAHKeyframePause} */
	static DEFAULT = {
		type: "pause",
		time: 0.000,
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