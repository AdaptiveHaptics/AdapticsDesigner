import { abstract_method_unreachable } from "../../util.mjs";

export class BaseExperience {
	#_pattern_design;
	#_expected_params;

	/**
	 *
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 * @param {string[]} expected_params
	 */
	constructor(pattern_design, expected_params) {
		this.#_pattern_design = pattern_design;
		this.#_expected_params = expected_params;
	}

	#_warned_about_missing_params = false;
	/**
	 *
	 * @param {string} param_name
	 * @param {number} param_value
	 * @returns
	 */
	set_param_or_warn(param_name, param_value) {
		if (this.#_pattern_design.filedata.user_parameter_definitions[param_name] == undefined) {
			if (!this.#_warned_about_missing_params) alert(
				`The pattern "${this.#_pattern_design.filedata.name}" does not have a parameter named "${param_name}".\n`+
				`"${this.constructor.name}" is expecting the following parameters: ${this.#_expected_params.join(", ")}`
			);
			this.#_warned_about_missing_params = true;
			return;
		} else {
			if (!this.#_expected_params.includes(param_name)) throw new Error(`"${param_name}" not declared in ${this.constructor.name} expected_params`);
			try {
				this.#_pattern_design.update_evaluator_user_param(param_name, param_value);
			} catch (e) {
				if (e.message == "undefined user parameter") throw new Error("should be unreachable");
				throw e;
			}
		}
	}

	/**
	 * @abstract
	 * @returns {THREE.Object3D}
	 */
	getObject3D() {
		abstract_method_unreachable();
	}

	/**
	 * @abstract
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update(last_tracking_data) {
		abstract_method_unreachable(last_tracking_data);
	}
}