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
		/** @type {HTMLButtonElement} */
		this._addparam_button = notnull(this._patterneditor_div.querySelector("button.addparam"));

		this.user_param_dialog = new UserParamDialog(pattern_design);

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

		{ //init userparameters
			this._addparam_button.addEventListener("click", _ev => {
				this.user_param_dialog.open();
			});
			this._pattern_design.state_change_events.addEventListener("rerender", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("kf_update", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("kf_delete", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("pattern_transform_update", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("user_param_definitions_update", () => {
				this.#_update_user_parameters_controls();
			});
			this._pattern_design.state_change_events.addEventListener("parameters_update", ev => {
				if (!ev.detail.time) this.#_update_user_parameters_values();
			});
			this.#_update_user_parameters_controls();
		}
	}

	#_update_user_parameters_controls() {
		const up_linked_map = this._pattern_design.get_user_parameters_to_linked_map();
		/** @type {Map<string, UserParamControl>} */
		const userparam_els_by_name = new Map();
		const uparam_children = [...this._userparameters_div.children];
		for (const up_el of uparam_children) {
			if (!(up_el instanceof UserParamControl)) continue;
			const user_param_name = up_el.param_name;
			if (up_linked_map.has(user_param_name)) {
				userparam_els_by_name.set(user_param_name, up_el);
			}
			up_el.remove();
		}
		for (const [param, up_linked] of new Map([...up_linked_map].sort((a, b) => a[0].localeCompare(b[0])))) {
			const up_el = userparam_els_by_name.get(param) || (this._pattern_design.update_evaluator_user_params(param, 0), new UserParamControl(this._pattern_design, param, 0, up_linked.items.keyframes));

			up_el.linked_keyframes = up_linked.items.keyframes;

			this._userparameters_div.appendChild(up_el);
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
			alert(`Parameter with the name '${new_name}' already exists!`);
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


class UserParamDialog {
	#_pattern_design;

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(pattern_design) {
		this.#_pattern_design = pattern_design;

		/** @type {HTMLDialogElement} */
		this._userparamdialog_dialog = notnull(document.querySelector("dialog#userparamdialog"));
		/** @type {HTMLFormElement} */
		this._userparamdialog_form = notnull(this._userparamdialog_dialog.querySelector("form"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_paramname_input = notnull(this._userparamdialog_form.querySelector("input[name=paramname]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_default_input = notnull(this._userparamdialog_form.querySelector("input[name=default]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_clampmin_input = notnull(this._userparamdialog_form.querySelector("input[name=clampmin]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_min_input = notnull(this._userparamdialog_form.querySelector("input[name=min]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_clampmax_input = notnull(this._userparamdialog_form.querySelector("input[name=clampmax]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_max_input = notnull(this._userparamdialog_form.querySelector("input[name=max]"));
		/** @type {HTMLInputElement} */
		this._userparamdialog_step_input = notnull(this._userparamdialog_form.querySelector("input[name=step]"));
		/** @type {HTMLButtonElement} */
		this._userparamdialog_save_button = notnull(this._userparamdialog_form.querySelector("button[type=submit]"));
		/** @type {HTMLButtonElement} */
		this._userparamdialog_close_button = notnull(this._userparamdialog_form.querySelector("button.close"));
		/** @type {HTMLButtonElement} */
		this._userparamdialog_reset_button = notnull(this._userparamdialog_form.querySelector("button.reset"));
		/** @type {HTMLDivElement} */
		this._userparamdialog_errortext_div = notnull(this._userparamdialog_form.querySelector("div.errortext"));


		this._userparamdialog_close_button.addEventListener("click", _ => {
			this._userparamdialog_dialog.close("dismiss");
		});
		this._userparamdialog_reset_button.addEventListener("click", _ => {
			this.reset();
		});
		this._userparamdialog_dialog.addEventListener("click", ev => {
			// light dismiss
			if (ev.target === this._userparamdialog_dialog) {
				console.log("light dismiss");
				this._userparamdialog_dialog.close("dismiss");
			}
		});
		this._userparamdialog_form.addEventListener("change", _ => {
			this.onchange();
		});
		this._userparamdialog_form.addEventListener("submit", _ => {
			const { name, default_value, min, max, step } = this.get_values();
			pattern_design.update_user_param_definition(name, { default: default_value, min, max, step });
		});
	}


	reset() {
		this._userparamdialog_form.reset();
		this.onchange();
		this._userparamdialog_errortext_div.textContent = "";
	}

	onchange() {
		this._userparamdialog_min_input.disabled = !this._userparamdialog_clampmin_input.checked;
		this._userparamdialog_max_input.disabled = !this._userparamdialog_clampmax_input.checked;


		const { name, default_value, min, max, step } = this.get_values();

		this._userparamdialog_save_button.disabled = true;
		if (name === "") {
			this._userparamdialog_errortext_div.textContent = "Name must not be empty";
		} else if (name in this.#_pattern_design.filedata.user_parameter_definitions) {
			this._userparamdialog_errortext_div.textContent = "Parameter with name '${}' already exists";
		} else if (!Number.isFinite(default_value)) {
			this._userparamdialog_errortext_div.textContent = "Default value must be a number";
		} else if (!Number.isFinite(step)) {
			this._userparamdialog_errortext_div.textContent = "Step must be a number";
		} else if (min > max) {
			this._userparamdialog_errortext_div.textContent = "Min must be less than max";
		} else if (min > default_value) {
			this._userparamdialog_errortext_div.textContent = "Default value must be greater than min";
		} else if (default_value > max) {
			this._userparamdialog_errortext_div.textContent = "Default value must be less than max";
		} else {
			this._userparamdialog_errortext_div.textContent = "";
			this._userparamdialog_save_button.disabled = false;
		}
	}

	get_values() {
		const name = this._userparamdialog_paramname_input.value;
		const default_value = parseFloat(this._userparamdialog_default_input.value);
		const min = this._userparamdialog_clampmin_input.checked ? parseFloat(this._userparamdialog_min_input.value) : -Infinity;
		const max = this._userparamdialog_clampmax_input.checked ? parseFloat(this._userparamdialog_max_input.value) : Infinity;
		const step = parseFloat(this._userparamdialog_step_input.value);
		return { name, default_value, min, max, step };
	}

	open() {
		this._userparamdialog_dialog.showModal();
	}

}