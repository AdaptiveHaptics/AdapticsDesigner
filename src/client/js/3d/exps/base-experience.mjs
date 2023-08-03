import { abstract_method_unreachable } from "../../util.mjs";


/**
 *
 * @returns {number} current time in seconds since epoch
 */
export function time_now() {
	return Date.now() / 1000;
}

export class BaseExperience {
	#_pattern_design;
	#_expected_params;
	#_optional_params;

	/**
	 *
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 * @param {string[]} expected_params
	 * @param {string[]} optional_params
	 */
	constructor(pattern_design, expected_params, optional_params) {
		if (this.constructor == BaseExperience) throw new Error("BaseExperience is an abstract class and cannot be instantiated");
		if (this.getObject3D == BaseExperience.prototype.getObject3D) throw new Error("Must override getObject3D() method to extend BaseExperience");
		if (this.update_for_dt == BaseExperience.prototype.update_for_dt) throw new Error("Must override update() method to extend BaseExperience");
		if (this.on_hand_enter_scene == BaseExperience.prototype.on_hand_enter_scene) throw new Error("Must override on_hand_enter_scene() method to extend BaseExperience");
		if (this.on_hand_exit_scene == BaseExperience.prototype.on_hand_exit_scene) throw new Error("Must override on_hand_exit_scene() method to extend BaseExperience");

		this.#_pattern_design = pattern_design;
		this.#_expected_params = expected_params;
		this.#_optional_params = optional_params;
	}


	#_last_update_time = time_now();
	#_last_update_hand_in_scene = false;
	/**
	 * @public
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update(last_tracking_data) {
		if (!this.#_last_update_hand_in_scene && last_tracking_data?.hand) this.#_on_hand_enter_scene();
		else if (this.#_last_update_hand_in_scene && !last_tracking_data?.hand) this.#_on_hand_exit_scene();

		const now = time_now();
		const delta_time = now - this.#_last_update_time;
		this.#_last_update_time = now;

		this.update_for_dt(delta_time, last_tracking_data);
	}

	#_on_hand_enter_scene() {
		this.#_last_update_hand_in_scene = true;
		this.#_pattern_design.update_playstart(0);
		this.#_pattern_design.update_pattern_time(0);
		this.#_pattern_design.update_playstart(Date.now());
		this.on_hand_enter_scene();
	}
	/**
	 * @protected
	 * @abstract
	 */
	on_hand_enter_scene() {
		abstract_method_unreachable();
	}

	#_on_hand_exit_scene() {
		this.#_last_update_hand_in_scene = false;
		this.#_pattern_design.update_playstart(0);
		this.on_hand_exit_scene();
	}
	/**
	 * @protected
	 * @abstract
	 */
	on_hand_exit_scene() {
		abstract_method_unreachable();
	}


	#_warned_about_missing_params = false;
	/**
	 * @protected
	 * @param {string} param_name
	 * @param {number} param_value
	 * @returns
	 */
	set_expected_param(param_name, param_value) {
		this.#_set_param_internal(param_name, param_value, true);
	}
	/**
	 * @protected
	 * @param {string} param_name
	 * @param {number} param_value
	 * @returns
	 */
	set_optional_param(param_name, param_value) {
		this.#_set_param_internal(param_name, param_value, false);
	}

	/**
	 *
	 * @param {string} param_name
	 * @param {number} param_value
	 * @param {boolean} expected_param
	 * @returns
	 */
	#_set_param_internal(param_name, param_value, expected_param) {
		if (this.#_pattern_design.filedata.user_parameter_definitions[param_name] == undefined) {
			if (expected_param && !this.#_warned_about_missing_params) {
				alert(
					`The pattern "${this.#_pattern_design.filedata.name}" does not have a parameter named "${param_name}".\n\n`+
					`The current simulation: "${this.constructor.name}" is expecting the following parameters:\n    ${this.#_expected_params.join(", ")}`
				);
				this.#_warned_about_missing_params = true;
			}
			return;
		} else {
			if (expected_param && !this.#_expected_params.includes(param_name)) throw new Error(`"${param_name}" not declared in ${this.constructor.name} expected_params`); // runtime check if param declared correctly
			if (!expected_param && !this.#_optional_params.includes(param_name)) throw new Error(`"${param_name}" not declared in ${this.constructor.name} optional_params`); // runtime check if param declared correctly
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
	 * @protected
	 * @abstract
	 * @param {number} delta_time
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update_for_dt(delta_time, last_tracking_data) {
		abstract_method_unreachable(delta_time, last_tracking_data);
	}
}