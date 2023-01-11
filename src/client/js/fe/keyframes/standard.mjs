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
		this.transition = keyframe.transition;
		this.coords = keyframe.coords;
	}
	
	/**
	 * 
	 * @param {MAHPatternDesignFE} pattern_design 
	 * @param {Partial<MAHKeyframeFE>} set 
	 */
	static from_current_keyframes(pattern_design, set) {
		const {
			time, coords,
			brush = MAHKeyframeStandardFE.DEFAULT.brush,
			intensity = MAHKeyframeStandardFE.DEFAULT.intensity,
			transition = MAHKeyframeStandardFE.DEFAULT.transition,
		} = new NewKeyframeCommon(pattern_design, set.time || null);
		const keyframe = new MAHKeyframeStandardFE(structured_clone({ time, coords, brush, intensity, transition, ...set, type: MAHKeyframeStandardFE.DEFAULT.type }), pattern_design);
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