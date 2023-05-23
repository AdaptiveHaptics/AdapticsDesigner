/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */

/** @typedef {import("../external/pattern_evaluator/rs-shared-types").PatternEvaluatorParameters} WASMPatternEvaluatorParameters */
/** @typedef {{ time: number, user_parameters: Map<string, number>, geometric_transform: WASMPatternEvaluatorParameters["geometric_transform"] }} PatternEvaluatorParameters */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").BrushAtAnimLocalTime} BrushAtAnimLocalTime */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").NextEvalParams} NextEvalParams */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").PatternTransformation} PatternTransformation */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").GeometricTransformMatrix} GeometricTransformMatrix */

import init, { PatternEvaluator as PatternEvaluatorWASM  } from "../external/pattern_evaluator/pattern_evaluator.js";

// export const PATTERN_EVALUATOR_WASM_LOAD_PROMISE = init().then(() => PatternEvaluator2);
await init();

export class PatternEvaluator {
	#_internal;

	/**
	 *
	 * @param {MidAirHapticsAnimationFileFormat} mah_animation
	 */
	constructor(mah_animation) {
		this.#_internal = new PatternEvaluatorWASM(JSON.stringify(mah_animation));
	}




	// /**
	//  *
	//  * @param {PatternEvaluatorParameters} p
	//  */
	// eval_path_at_anim_local_time(p) {
	// 	return this.#_internal.eval_path_at_anim_local_time(JSON.stringify(p));
	// }

	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @param {NextEvalParams} nep
	 * @returns {BrushAtAnimLocalTime}
	 */
	eval_brush_at_anim_local_time(p, nep) {
		/** @type {WASMPatternEvaluatorParameters} */
		const json_safe_p = { time: p.time, user_parameters: Object.fromEntries(p.user_parameters), geometric_transform: p.geometric_transform };
		return JSON.parse(this.#_internal.eval_brush_at_anim_local_time(JSON.stringify(json_safe_p), JSON.stringify(nep)));
	}

	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @param {NextEvalParams} nep
	 * @returns {BrushAtAnimLocalTime[]}
	 */
	eval_brush_at_anim_local_time_for_max_t(p, nep) {
		/** @type {WASMPatternEvaluatorParameters} */
		const json_safe_p = { time: p.time, user_parameters: Object.fromEntries(p.user_parameters), geometric_transform: p.geometric_transform };
		return JSON.parse(this.#_internal.eval_brush_at_anim_local_time_for_max_t(JSON.stringify(json_safe_p), JSON.stringify(nep)));
	}

	/**
	 *
	 * @returns {NextEvalParams}
	 */
	static default_next_eval_params() {
		return JSON.parse(PatternEvaluatorWASM.default_next_eval_params());
	}

	/**
	 *
	 * @returns {PatternTransformation}
	 */
	static default_pattern_transformation() {
		return JSON.parse(PatternEvaluatorWASM.default_pattern_transformation());
	}
	/**
	 *
	 * @returns {GeometricTransformMatrix}
	 */
	static default_geo_transform_matrix() {
		return JSON.parse(PatternEvaluatorWASM.default_geo_transform_matrix());
	}
}