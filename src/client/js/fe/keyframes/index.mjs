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

