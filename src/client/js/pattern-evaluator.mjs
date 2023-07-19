/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */

/** @typedef {Map<string, number>} UserParameters */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").PatternEvaluatorParameters} WASMPatternEvaluatorParameters */
/** @typedef {{ time: number, user_parameters: UserParameters, geometric_transform: WASMPatternEvaluatorParameters["geometric_transform"] }} PatternEvaluatorParameters */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").BrushAtAnimLocalTime} BrushAtAnimLocalTime */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").NextEvalParams} NextEvalParams */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").PatternTransformation} PatternTransformation */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").GeometricTransformMatrix} GeometricTransformMatrix */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").GeometricTransformsSimple} GeometricTransformsSimple */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").ATFormula} ATFormula */
/** @typedef {import("../external/pattern_evaluator/rs-shared-types").MAHCoordsConst} MAHCoordsConst */
/** @typedef {import("./fe/patterndesign.mjs").MAHAnimationFileFormatFE} MAHAnimationFileFormatFE */

import init, { PatternEvaluator as PatternEvaluatorWASM  } from "../external/pattern_evaluator/pattern_evaluator.js";

// export const PATTERN_EVALUATOR_WASM_LOAD_PROMISE = init().then(() => PatternEvaluator2);
await init();

export class PatternEvaluator {
	#_internal;

	/**
	 * @param {MidAirHapticsAnimationFileFormat} mah_animation
	 * @returns {MidAirHapticsAnimationFileFormat}
	 */
	static try_parse_into_latest_version(mah_animation) {
		return JSON.parse(PatternEvaluatorWASM.try_parse_into_latest_version(JSON.stringify(mah_animation)));
	}

	/**
	 *
	 * @param {MidAirHapticsAnimationFileFormat} mah_animation
	 */
	constructor(mah_animation) {
		this.#_internal = new PatternEvaluatorWASM(JSON.stringify(mah_animation));
	}

	free() {
		this.#_internal.free();
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

	/**
	 *
	 * @param {GeometricTransformsSimple} gts
	 * @param {MAHCoordsConst} coords
	 * @param {UserParameters} user_parameters
	 * @param {MAHAnimationFileFormatFE["user_parameter_definitions"]} user_parameter_definitions
	 * @returns {MAHCoordsConst}
	 */
	static geo_transform_simple_apply(gts, coords, user_parameters, user_parameter_definitions) {
		return JSON.parse(
			PatternEvaluatorWASM.geo_transform_simple_apply(JSON.stringify({
				gts,
				coords,
				user_parameters: Object.fromEntries(user_parameters),
				user_parameter_definitions
			}))
		);
	}
	/**
	 *
	 * @param {GeometricTransformsSimple} gts
	 * @param {MAHCoordsConst} coords
	 * @param {UserParameters} user_parameters
	 * @param {MAHAnimationFileFormatFE["user_parameter_definitions"]} user_parameter_definitions
	 * @returns {MAHCoordsConst}
	 */
	static geo_transform_simple_inverse(gts, coords, user_parameters, user_parameter_definitions) {
		return JSON.parse(
			PatternEvaluatorWASM.geo_transform_simple_inverse(JSON.stringify({
				gts,
				coords,
				user_parameters: Object.fromEntries(user_parameters),
				user_parameter_definitions
			}))
		);
	}


	/**
	 * @param {string} formula_str
	 * @returns {ATFormula}
	 * @throws {Error}
	 */
	static parse_formula(formula_str) {
		return JSON.parse(PatternEvaluatorWASM.parse_formula(formula_str));
	}

	/**
	 *
	 * @param {ATFormula} formula
	 * @returns {string}
	 */
	static formula_to_string(formula) {
		return PatternEvaluatorWASM.formula_to_string(JSON.stringify(formula));
	}

	/**
	 *
	 * @param {import("../external/pattern_evaluator/rs-shared-types.js").MAHDynamicF64} dynf64
	 * @param {UserParameters} user_parameters
	 * @param {MAHAnimationFileFormatFE["user_parameter_definitions"]} user_parameter_definitions
	 */
	static dynf64_to_f64(dynf64, user_parameters, user_parameter_definitions) {
		return PatternEvaluatorWASM.dynf64_to_f64(
			JSON.stringify(dynf64),
			JSON.stringify(Object.fromEntries(user_parameters)),
			JSON.stringify(user_parameter_definitions)
		);
	}
}