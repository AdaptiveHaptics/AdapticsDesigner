/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { notnull } from "./util.mjs";


export class ParameterEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} patterneditor_div
	 */
	constructor(pattern_design, patterneditor_div) {
		this._pattern_design = pattern_design;
		this._patterneditor_div = patterneditor_div;
		this._userparameters_div = notnull(this._patterneditor_div.querySelector("div.userparameters"));

		{ //init timecontrol
			this._timecontrol_div = notnull(document.querySelector("div.timecontrol"));
			this._timecontrol_input = notnull(this._timecontrol_div.querySelector("input"));
			this._timecontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._timecontrol_input.value);
				if (Number.isFinite(v)) {
					this._pattern_design.update_pattern_time(Math.max(v, 0));
				} else {
					this._timecontrol_input.value = this._pattern_design.evaluator_params.time.toFixed(0);
				}
			});
			/** @type {HTMLButtonElement} */
			this._timecontrol_play = notnull(this._timecontrol_div.querySelector("button.play"));
			/** @type {HTMLButtonElement} */
			this._timecontrol_pause = notnull(this._timecontrol_div.querySelector("button.pause"));
			/** @type {HTMLButtonElement} */
			this._timecontrol_reset = notnull(this._timecontrol_div.querySelector("button.reset"));

			this._timecontrol_play.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(Date.now() - this._pattern_design.evaluator_params.time);
			});
			this._timecontrol_pause.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(0);
			});
			this._timecontrol_reset.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(0);
				this._pattern_design.update_pattern_time(0);
			});


			this._pattern_design.state_change_events.addEventListener("parameters_update", () => {
				this.#_update_playback_controls();
			});
			this._pattern_design.state_change_events.addEventListener("playstart_update", () => {
				this.#_update_playback_controls();
			});

			this.#_update_playback_controls();
		}

		{ //init userparameters
			this._pattern_design.state_change_events.addEventListener("rerender", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("kf_update", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("kf_delete", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("parameters_update", () => {
				this.#_update_user_parameters_values();
			});
			this._userparameters_div.addEventListener("change", ev => {
				const input = ev.target;
				if (input instanceof HTMLInputElement) {
					const v = parseFloat(input.value);
					if (Number.isFinite(v)) {
						this._pattern_design.update_evaluator_user_params(input.name, v);
					} else {
						input.value = this._pattern_design.evaluator_params.user_parameters.get(input.name)?.toFixed(2) || "0";
					}
				}
			});
			this.#_update_user_parameters_controls();
		}
	}

	/**
	 *
	 * @param {string} key
	 * @param {number} val
	 */
	#_create_user_param_control(key, val) {
		const label = document.createElement("label");

		const labeltext_span = document.createElement("span");
		labeltext_span.classList.add("labeltext");
		labeltext_span.textContent = key;
		label.appendChild(labeltext_span);

		const val_input = document.createElement("input");
		val_input.name = key;
		val_input.step = "0.05";
		val_input.type = "number";
		val_input.value = val.toString();
		label.appendChild(val_input);

		return label;
	}

	#_update_user_parameters_controls() {
		const uparam_to_kfs_map = this._pattern_design.get_user_parameters_to_keyframes_map();
		/** @type {Map<string, HTMLLabelElement>} */
		const param_labels = new Map();
		const pc_labels = [...this._userparameters_div.children];
		for (const pc_label of pc_labels) {
			if (!(pc_label instanceof HTMLLabelElement)) continue;
			const user_param_name = notnull(pc_label.querySelector("input")).name;
			if (uparam_to_kfs_map.has(user_param_name)) {
				param_labels.set(user_param_name, pc_label);
			}
			pc_label.remove();
		}
		for (const [param, keyframes] of new Map([...uparam_to_kfs_map].sort((a, b) => a[0].localeCompare(b[0])))) {
			const pc_label = param_labels.get(param) || this.#_create_user_param_control(param, 0);
			pc_label.addEventListener("click", _ => {
				this._pattern_design.deselect_all_keyframes();
				this._pattern_design.select_keyframes(keyframes);
			});
			this._userparameters_div.appendChild(pc_label);
		}
		this.#_update_user_parameters_values();
	}

	#_update_user_parameters_values() {
		for (const pc_label of this._userparameters_div.children) {
			const user_param_name = notnull(pc_label.querySelector("input")).name;
			const user_param_val = this._pattern_design.evaluator_params.user_parameters.get(user_param_name);
			if (user_param_val !== undefined) {
				notnull(pc_label.querySelector("input")).value = user_param_val.toString();
			}
		}
	}

	#_update_playback_controls() {
		this._timecontrol_input.value = this._pattern_design.evaluator_params.time.toFixed(0);
		if (this._pattern_design.is_playing()) {
			this._timecontrol_play.style.display = "none";
			this._timecontrol_pause.style.display = "";
		} else {
			this._timecontrol_play.style.display = "";
			this._timecontrol_pause.style.display = "none";
		}
	}

}