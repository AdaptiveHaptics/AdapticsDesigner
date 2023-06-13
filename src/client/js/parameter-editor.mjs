/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./fe/patterndesign.mjs").MAHKeyframeFE} MAHKeyframeFE */

import { assert_unreachable, notnull } from "./util.mjs";

export class ParameterEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} parametereditor_div
	 */
	constructor(pattern_design, parametereditor_div) {
		this._pattern_design = pattern_design;
		this._parametereditor_div = parametereditor_div;
		this._userparameters_div = notnull(this._parametereditor_div.querySelector("div.userparameters"));
		/** @type {HTMLButtonElement} */
		this._addparam_button = notnull(this._parametereditor_div.querySelector("button.addparam"));

		this.user_param_dialog = new UserParamDialog(pattern_design);

		{ //init playback (timecontrol)
			/** @type {HTMLDivElement} */
			this._playback_div = notnull(this._parametereditor_div.querySelector("div.playback"));
			this._playback_div.querySelector("span.warning")?.addEventListener("click", _ev => {
				alert(this._playback_div.title);
			});


			/** @type {HTMLDivElement} */
			this._timecontrol_div = notnull(this._parametereditor_div.querySelector("div.timecontrol"));
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
			const pvalue = this._pattern_design.resolve_dynamic_f64({ type: "dynamic", value: param });
			const step_size = this._pattern_design.filedata.user_parameter_definitions[param]?.step ?? 0.05;
			const up_el = userparam_els_by_name.get(param) ||  (
				this._pattern_design.update_evaluator_user_params(param, pvalue),
				new UserParamControl(this._pattern_design, param, pvalue, step_size, up_linked, this.user_param_dialog)
			);

			up_el.up_linked = up_linked;

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


			if (this._pattern_design.resolve_dynamic_f64(this._pattern_design.filedata.pattern_transform.playback_speed) == 0) {
				this._playback_div.classList.add("warning");
				this._playback_div.title = "Warning: Playback speed is currently set to 0.\nCheck Post Processing -> Playback Speed";
			} else if (this._pattern_design.resolve_dynamic_f64(this._pattern_design.filedata.pattern_transform.intensity_factor) == 0) {
				this._playback_div.classList.add("warning");
				this._playback_div.title = "Warning: Intensity is currently set to 0.\nCheck Post Processing -> Intensity";
			} else {
				this._playback_div.classList.remove("warning");
				this._playback_div.title = "";
			}
		} else {
			this._timecontrol_play.style.display = "";
			this._timecontrol_pause.style.display = "none";

			this._playback_div.classList.remove("warning");
			this._playback_div.title = "";
		}
	}

}


class UserParamControl extends HTMLElement {
	#_pattern_design;
	#_name_input = document.createElement("input");
	#_val_input = document.createElement("input");
	/** @type {import("./fe/patterndesign.mjs").UserParamLinked} */
	#_up_linked;
	/** @type {UserParamDialog} */
	#_user_param_dialog;

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} key
	 * @param {number} val
	 * @param {number} step_size
	 * @param {import("./fe/patterndesign.mjs").UserParamLinked} up_linked
	 * @param {UserParamDialog} user_param_dialog
	 */
	constructor(pattern_design, key, val, step_size, up_linked, user_param_dialog) {
		super();

		this.#_pattern_design = pattern_design;
		this.#_user_param_dialog = user_param_dialog;
		this.up_linked = up_linked;


		this.classList.add("userparam");

		this.#_name_input.value = key;
		this.#_name_input.addEventListener("change", _ => this.on_name_input_change());
		this.appendChild(this.#_name_input);

		const eq_span = document.createElement("span");
		eq_span.classList.add("eq");
		eq_span.innerText = "=";
		this.appendChild(eq_span);

		this.#_val_input.name = key;
		this.step_size = step_size;
		this.#_val_input.type = "number";
		this.#_val_input.value = val.toString();
		this.#_val_input.addEventListener("change", _ => this.on_val_input_change());
		this.appendChild(this.#_val_input);

		const edit_button = document.createElement("button");
		edit_button.classList.add("textonly");
		edit_button.style.padding = "0";
		edit_button.innerHTML = '<span class="material-symbols-outlined">settings</span>';
		edit_button.title = "Edit Parameter Definition";
		edit_button.addEventListener("click", _ => this.#_user_param_dialog.open(this.param_name));
		this.appendChild(edit_button);

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
	/**
	 * @param {number} v
	 */
	set step_size(v) {
		this.#_val_input.step = v.toString();
	}
	/**
	 * @param {import("./fe/patterndesign.mjs").UserParamLinked} v
	 */
	set up_linked(v) {
		this.#_up_linked = v;
		const hasProps = this.#_up_linked.prop_parents.dynf64.length + this.#_up_linked.prop_parents.cjumps.length > 0;
		this.classList.toggle("unused", !hasProps);
	}
	get up_linked() {
		return this.#_up_linked;
	}

	on_name_input_change() {
		const new_name = this.param_name;
		if (
			(new_name != "" || confirm(`Delete parameter '${this.#_val_input.name}'?`)) && // if delete, confirm
			this.#_pattern_design.rename_evaluator_user_param(this.#_val_input.name, new_name)
		) {
			this.param_name = new_name;
		} else {
			this.param_name = this.#_val_input.name; // reset to old name to avoid merging/collision
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
		this.#_pattern_design.select_items({ keyframes: this.up_linked.items.keyframes });
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
				this.#_confirm_dismiss();
			}
		});
		this._userparamdialog_form.addEventListener("input", _ => this.oninput());
		this._userparamdialog_form.addEventListener("change", _ => this.oninput());
		this._userparamdialog_form.addEventListener("submit", _ => {
			const { name, default_value, min, max, step } = this.get_values();
			pattern_design.update_user_param_definition(name, { default: default_value, min, max, step });
		});
	}


	reset() {
		this._userparamdialog_form.reset();
		this.oninput();
		this._userparamdialog_errortext_div.textContent = "";
	}

	oninput() {
		this._userparamdialog_min_input.disabled = !this._userparamdialog_clampmin_input.checked;
		this._userparamdialog_max_input.disabled = !this._userparamdialog_clampmax_input.checked;


		const { name, default_value, min, max, step } = this.get_values();

		this._userparamdialog_save_button.disabled = true;
		if (name === "") {
			this._userparamdialog_errortext_div.textContent = "Name must not be empty";
		} else if (name in this.#_pattern_design.filedata.user_parameter_definitions && !this._userparamdialog_paramname_input.disabled) {
			this._userparamdialog_errortext_div.textContent = `Parameter with name '${name}' already exists`;
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

	#_confirm_dismiss() {
		// if edit mode, confirm discard changes
		if (this._userparamdialog_paramname_input.disabled) {
			const { name, default_value, min, max, step } = this.get_values();
			const { default: initial_default_value, min: initial_min, max: initial_max, step: initial_step } = this.#_pattern_design.filedata.user_parameter_definitions[name];
			if (default_value != initial_default_value || min != initial_min || max != initial_max || step != initial_step) {
				if (!confirm("Changes have not been saved. Discard?")) {
					return;
				}
			}
		}
		this._userparamdialog_dialog.close("dismiss");
	}

	/**
	 *
	 * @param {string=} edit_param_name
	 */
	open(edit_param_name) {
		if (edit_param_name) {
			this._userparamdialog_dialog.classList.remove("add");
			this._userparamdialog_dialog.classList.add("edit");

			this._userparamdialog_paramname_input.disabled = true;
			this._userparamdialog_paramname_input.value = edit_param_name;
			const { default: default_value, min, max, step } = this.#_pattern_design.filedata.user_parameter_definitions[edit_param_name];
			this._userparamdialog_default_input.value = (Math.round(default_value*100000)/100000).toString();
			if (min && min !== -Infinity) {
				this._userparamdialog_clampmin_input.checked = true;
				this._userparamdialog_min_input.value = (Math.round(min*100000)/100000).toString();
			}
			if (max && max !== Infinity) {
				this._userparamdialog_clampmax_input.checked = true;
				this._userparamdialog_max_input.value = (Math.round(max*100000)/100000).toString();
			}
			this._userparamdialog_step_input.value = (Math.round(step*100000)/100000).toString();

		} else {
			this._userparamdialog_dialog.classList.remove("edit");
			this._userparamdialog_dialog.classList.add("add");
			this._userparamdialog_paramname_input.disabled = false;
		}

		this.oninput(); // update error text
		this._userparamdialog_dialog.showModal();
	}

}