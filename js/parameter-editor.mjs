/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./fe/patterndesign.mjs").MAHKeyframeFE} MAHKeyframeFE */

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
		this._userparam_helpmsg_span = notnull(this._patterneditor_div.querySelector("span.helpmsg"));

		{ //init timecontrol
			this._timecontrol_div = notnull(document.querySelector("div.timecontrol"));
			this._timecontrol_input = notnull(this._timecontrol_div.querySelector("input"));
			this._timecontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._timecontrol_input.value);
				if (Number.isFinite(v)) {
					this._pattern_design.update_pattern_time(Math.max(v, 0));
				} else {
					this.#_update_playback_controls();
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

		{ // init transformcontrol
			this._transformcontrol_div = notnull(document.querySelector("div.transformcontrol"));
			/** @type {HTMLInputElement} */
			this._speedcontrol_input = notnull(this._transformcontrol_div.querySelector("input[name=speed]"));
			this._speedcontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._speedcontrol_input.value) / 100;
				if (Number.isFinite(v)) {
					this._pattern_design.update_evaluator_transform({ playback_speed: v });
				} else {
					this.#_update_transform_controls();
				}
			});

			/** @type {HTMLInputElement} */
			this._intensitycontrol_input = notnull(this._transformcontrol_div.querySelector("input[name=intensity]"));
			this._intensitycontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._intensitycontrol_input.value) / 100;
				if (Number.isFinite(v)) {
					this._pattern_design.update_evaluator_transform({ intensity_factor: v });
				} else {
					this.#_update_transform_controls();
				}
			});

			this._pattern_design.state_change_events.addEventListener("parameters_update", ev => {
				if (!ev.detail.time) this.#_update_transform_controls();
			});

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
			this._pattern_design.state_change_events.addEventListener("parameters_update", ev => {
				if (!ev.detail.time) this.#_update_user_parameters_values();
			});
			this.#_update_user_parameters_controls();
		}
	}

	#_update_user_parameters_controls() {
		const uparam_to_kfs_map = this._pattern_design.get_user_parameters_to_keyframes_map();
		/** @type {Map<string, UserParamControl>} */
		const userparam_els_by_name = new Map();
		const uparam_children = [...this._userparameters_div.children];
		for (const up_el of uparam_children) {
			if (!(up_el instanceof UserParamControl)) continue;
			const user_param_name = up_el.param_name;
			if (uparam_to_kfs_map.has(user_param_name)) {
				userparam_els_by_name.set(user_param_name, up_el);
			}
			up_el.remove();
		}
		for (const [param, keyframes] of new Map([...uparam_to_kfs_map].sort((a, b) => a[0].localeCompare(b[0])))) {
			const up_el = userparam_els_by_name.get(param) || (this._pattern_design.update_evaluator_user_params(param, 0), new UserParamControl(this._pattern_design, param, 0, keyframes));

			up_el.linked_keyframes = keyframes;

			this._userparameters_div.appendChild(up_el);
		}
		// if no user parameters, show a message instead
		if ([...this._userparameters_div.children].filter(el => el instanceof UserParamControl).length === 0) {
			this._userparam_helpmsg_span.classList.remove("hide");
		} else {
			this._userparam_helpmsg_span.classList.add("hide");
		}
		this.#_update_user_parameters_values();
	}

	#_update_user_parameters_values() {
		for (const up_el of this._userparameters_div.children) {
			if (!(up_el instanceof UserParamControl)) continue;
			const user_param_val = this._pattern_design.evaluator_params.user_parameters.get(up_el.param_name);
			if (user_param_val !== undefined) {
				up_el.param_value = user_param_val.toString();
			}
		}
	}

	#_update_playback_controls() {
		this._timecontrol_input.value = this._pattern_design.last_eval[0].pattern_time.toFixed(0);
		if (this._pattern_design.is_playing()) {
			this._timecontrol_play.style.display = "none";
			this._timecontrol_pause.style.display = "";
		} else {
			this._timecontrol_play.style.display = "";
			this._timecontrol_pause.style.display = "none";
		}
	}

	#_update_transform_controls() {
		this._speedcontrol_input.value = (this._pattern_design.evaluator_params.transform.playback_speed*100).toFixed(0);
		this._intensitycontrol_input.value = (this._pattern_design.evaluator_params.transform.intensity_factor*100).toFixed(0);
	}


}


class UserParamControl extends HTMLElement {
	#_pattern_design;
	#_name_input = document.createElement("input");
	#_val_input = document.createElement("input");

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} key
	 * @param {number} val
	 * @param {MAHKeyframeFE[]} linked_keyframes
	 */
	constructor(pattern_design, key, val, linked_keyframes) {
		super();

		this.#_pattern_design = pattern_design;
		this.linked_keyframes = linked_keyframes;

		this.classList.add("userparam");

		this.#_name_input.value = key;
		this.#_name_input.addEventListener("change", _ => this.on_name_input_change());
		this.appendChild(this.#_name_input);

		const eq_span = document.createElement("span");
		eq_span.innerText = "=";
		this.appendChild(eq_span);

		this.#_val_input.name = key;
		this.#_val_input.step = "0.05";
		this.#_val_input.type = "number";
		this.#_val_input.value = val.toString();
		this.#_val_input.addEventListener("change", _ => this.on_val_input_change());
		this.appendChild(this.#_val_input);

		this.addEventListener("click", _ev => this.select_linked());
	}

	get param_name() {
		return this.#_name_input.value;
	}
	set param_name(v) {
		this.#_name_input.value = v;
		this.#_val_input.name = v;
	}
	get param_value() {
		return this.#_val_input.value;
	}
	set param_value(v) {
		this.#_val_input.value = v;
	}

	on_name_input_change() {
		const new_name = this.param_name;
		if (this.#_pattern_design.evaluator_params.user_parameters.has(new_name)) {
			this.param_name = this.#_val_input.name; // reset to old name to avoid merging/collision
		} else {
			this.#_pattern_design.rename_evaluator_user_param(this.#_val_input.name, new_name);
			this.param_name = new_name;
		}
	}
	on_val_input_change() {
		const v = parseFloat(this.param_value);
		if (Number.isFinite(v)) {
			this.#_pattern_design.update_evaluator_user_params(this.param_name, v);
		} else {
			this.param_value = this.#_pattern_design.evaluator_params.user_parameters.get(this.param_name)?.toFixed(2) || "0"; // reset to old value
		}
	}

	select_linked() {
		this.#_pattern_design.deselect_all_items();
		this.#_pattern_design.select_items({ keyframes: this.linked_keyframes });
	}
}

// Register the custom element
customElements.define("user-param-control", UserParamControl);