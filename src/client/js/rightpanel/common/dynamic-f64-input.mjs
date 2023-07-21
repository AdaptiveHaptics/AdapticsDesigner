/** @typedef {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../fe/patterndesign.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../../../external/pattern_evaluator/rs-shared-types").MAHDynamicF64} MAHDynamicF64 */
/** @typedef {import("../../../external/pattern_evaluator/rs-shared-types").ATFormula} ATFormula */

import { PatternEvaluator } from "../../pattern-evaluator.mjs";
import { assert_unreachable, deep_equals, num_to_rounded_string } from "../../util.mjs";

export class DynamicF64Input extends HTMLElement {
	#_pattern_design;
	#_name;
	#_label = document.createElement("label");
	#_labeltext_span = document.createElement("span");
	#_val_input_div = document.createElement("div");
	#_val_input = document.createElement("input");
	#_autocomplete_div = document.createElement("div");
	#_step = 1;
	#_set;
	#_get;
	#_min;
	#_max;
	/** @type {MAHDynamicF64 | null} */
	#_last_update_value = null;
	/** @type {MAHDynamicF64 | null} */
	#_last_input_change_value = null;
	#_paramonly;

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} name
	 * @param {Object} param3
	 * @param {() => MAHDynamicF64=} param3.get
	 * @param {(v: MAHDynamicF64) => Parameters<MAHPatternDesignFE["commit_operation"]>[0]=} param3.set
	 * @param {string=} param3.unit
	 * @param {number=} param3.step
	 * @param {number=} param3.min
	 * @param {number=} param3.max
	 * @param {boolean=} param3.nolabel
	 * @param {boolean=} param3.paramonly
	 */
	constructor(pattern_design, name, { get, set, unit, step, min, max, nolabel, paramonly } = {}) {
		super();

		if (arguments.length === 0) {
			// we are being cloned/created from DOM
			// the rest of the initialization should actually be ok to run with undefined values, but interactions will be UB
		}

		this.#_pattern_design = pattern_design;
		this.#_set = set;
		this.#_get = get;

		this.#_paramonly = paramonly;

		this.#_labeltext_span.classList.add("labeltext");
		this.#_name = name;
		this.#_labeltext_span.textContent = name;
		this.#_label.appendChild(this.#_labeltext_span);
		if (unit) {
			const unit_span = document.createElement("span");
			unit_span.classList.add("unit");
			unit_span.textContent = " " + unit;
			this.#_labeltext_span.appendChild(unit_span);
		}

		if (step) this.#_step = step;
		this.#_min = min;
		this.#_max = max;


		this.#_val_input_div.classList.add("vinput");
		this.#_val_input.type = "text";
		if (this.#_get) this.update_value();
		this.#_val_input.addEventListener("keydown", ev => {
			const value = this.#_parse_input_value();
			if (ev.key === "Escape") {
				this.#_reset_value();
				this.#_blur_delayed();
				return;
			}

			if (ev.key === "Enter") {
				// select autoaction autocompletion if there is one
				/** @type {HTMLButtonElement | null} */
				const autoaction = this.#_autocomplete_div.querySelector(".autoaction");
				if (autoaction) {
					ev.preventDefault();
					autoaction.click();
				}
				return;
			}

			if (value && value.type === "f64") {
				if (ev.key === "ArrowUp") {
					this.#_val_input.value = num_to_rounded_string(value.value + this.#_step);
					this.#_on_val_input_change(); // constrain, set
					ev.preventDefault();
					return;
				} else if (ev.key === "ArrowDown") {
					this.#_val_input.value = num_to_rounded_string(value.value - this.#_step);
					this.#_on_val_input_change(); // constrain, set
					ev.preventDefault();
					return;
				}
			}
		});
		this.#_val_input.addEventListener("change", ev => {
			ev.stopPropagation(); //i cant use shadowroot because subgrid isnt supported (and may not even work in shadow root)
			this.#_on_val_input_change();
		});
		this.#_val_input_div.appendChild(this.#_val_input);

		this.#_autocomplete_div.classList.add("menulist", "autocomplete");
		this.#_val_input_div.appendChild(this.#_autocomplete_div);


		if (nolabel) {
			this.appendChild(this.#_val_input_div);
		} else {
			this.#_label.appendChild(this.#_val_input_div);
			this.appendChild(this.#_label);
		}


		this.#_val_input.addEventListener("input", _ev => {
			this.#_update_autocomplete();
		});
	}

	get_name() {
		return this.#_name;
	}


	/**
	 *
	 * @param {MAHDynamicF64} v
	 * @returns {string}
	 */
	static stringify_df64(v) {
		switch (v.type) {
			case "f64":
				return num_to_rounded_string(v.value);
			case "formula":
				return PatternEvaluator.formula_to_string(v.value);
			case "param":
				return v.value;
			default: assert_unreachable(v);
		}
	}
	/**
	 * Update the value of the input element from the real model value
	 *
	 * @param {(MAHDynamicF64 | null)=} v
	 */
	update_value(v) {
		if (v === undefined) {
			if (!this.#_get) throw new Error("Cannot auto update value without getter");
			v = this.#_get();
		}
		this.#_update_input_value(v);
		this.#_last_update_value = window.structuredClone(v);
		this.#_last_input_change_value = window.structuredClone(v);
	}
	/**
	 * Internal function to set the value of the input element.
	 * Since it isnt necessarily the same as the model value, it does not update this.#_last_value.
	 * Typically called on autocompletion, prior to #_on_val_input_change
	 *
	 * @param {MAHDynamicF64 | null} v
	 */
	#_update_input_value(v) {
		const no_change = deep_equals(this.#_last_update_value, v) && deep_equals(this.#_last_input_change_value, v); // update either way, as it is no cost
		if (v === null) {
			this.#_val_input.value = "";
		} else {
			this.#_val_input.value = DynamicF64Input.stringify_df64(v);
		}
		if (!no_change) this.#_update_autocomplete();
	}
	get_value() {
		return this.#_parse_input_value();
	}

	#_reset_value() {
		this.update_value(this.#_last_update_value);
	}

	/**
	 *
	 * @param {number} v
	 */
	#_constrain_f64(v) {
		if (this.#_min !== undefined && v < this.#_min) return this.#_min;
		if (this.#_max !== undefined && v > this.#_max) return this.#_max;
		return v;
	}

	/**
	 *
	 * @returns {MAHDynamicF64 | null}
	 */
	#_parse_input_value() {
		if (this.#_val_input.value === "") {
			return null;
		}
		const v_num = Number(this.#_val_input.value);
		const v_pf = parseFloat(this.#_val_input.value);

		/** @type {ATFormula | null} */
		let v_parse_formula = null;
		try {
			v_parse_formula = PatternEvaluator.parse_formula(this.#_val_input.value);
		} catch (e) {
			// ignore
		}

		if (Number.isFinite(v_num) && v_num === v_pf && !this.#_paramonly) {
			return { type: "f64", value: this.#_constrain_f64(v_num) };
		} else if (/[+\-*/()]/g.test(this.#_val_input.value) && v_parse_formula != null) {
			return { type: "formula", value: v_parse_formula };
		} else {
			return { type: "param", value: this.#_val_input.value };
		}
	}

	#_on_val_input_change() {
		const df64v = this.#_parse_input_value();
		const no_change = deep_equals(this.#_last_update_value, df64v) || deep_equals(this.#_last_input_change_value, df64v); // dont send if no change, or al0ready sent change
		if (no_change) return; // prevent emitting event on no change (fix for clicking on an autocompletion triggering #_on_val_input_change() and a change event on the htmlinputelement (because of blur) in some cases) see that comment below for more info.
		if (df64v === null) {
			this.#_reset_value();
			return; // no change
		}

		this.#_last_input_change_value = window.structuredClone(df64v);

		this.dispatchEvent(new Event("change", { bubbles: true }));
		if (this.#_set) {
			this.#_pattern_design.save_state();
			this.#_pattern_design.commit_operation(this.#_set(df64v));
		}
		//this.#_update_autocomplete();
	}

	#_update_autocomplete() {
		/**
		 *
		 * @param {MAHDynamicF64} df64v
		 * @param {object} param0
		 * @param {string=} param0.type
		 * @param {boolean=} param0.autoaction
		 */
		const insert_autocompletion = (df64v, { type, autoaction } = {}) =>  {
			const value = DynamicF64Input.stringify_df64(df64v);
			if (!type) {
				switch (df64v.type) {
					case "f64": type = "constant"; break;
					case "param": type = "parameter"; break;
					case "formula": type = "formula"; break;
					default: assert_unreachable(df64v);
				}
			}

			{ //create dom elements
				const autocompletion_button = document.createElement("button");
				autocompletion_button.classList.add("df64autocompletion");
				if (autoaction) autocompletion_button.classList.add("autoaction");
				const value_span = document.createElement("span");
				value_span.classList.add("value");
				value_span.textContent = value;
				autocompletion_button.appendChild(value_span);
				const type_span = document.createElement("span");
				type_span.classList.add("type");
				type_span.textContent = type;
				autocompletion_button.appendChild(type_span);

				const onclick = ev => {
					ev.preventDefault();
					this.#_update_input_value(df64v);
					this.#_on_val_input_change(); //blur *MAY* also trigger change event (and _on_val_input_change) (not consistent, depends on browser and if input field was typed in or backspaced in, etc.)
					this.#_blur_delayed();
				};
				autocompletion_button.addEventListener("mousedown", onclick);
				autocompletion_button.addEventListener("click", onclick);

				this.#_autocomplete_div.appendChild(autocompletion_button);
			}
		};

		while (this.#_autocomplete_div.lastChild) this.#_autocomplete_div.removeChild(this.#_autocomplete_div.lastChild);

		const df64v = this.#_parse_input_value();
		const user_params = [...this.#_pattern_design.get_user_parameters_to_linked_map().keys()];

		if (df64v) {
			let autoaction = true;
			if (df64v.type === "f64") {
				insert_autocompletion(df64v, { autoaction });
				autoaction = false;
			}

			if (df64v.type === "formula") {
				insert_autocompletion(df64v, { autoaction });
				autoaction = false;
			}

			//todo: show formula creation autocompletion
			if (user_params.includes(this.#_val_input.value)) {
				insert_autocompletion({ type: "param", value: this.#_val_input.value }, { autoaction });
				autoaction = false;
			} else if (!( // dont show parameter creation for
				this.#_val_input.value === "" || // empty string
				df64v.type !== "f64" || // param names that can be parsed as f64
				this.#_val_input.value.includes("`") // param names that include the formula param name delimiter
				//
				// Creation of these is technically still allowed (by the json format, and elsewhere in gui, but we will not allow it here to reduce confusion)
			)) {
				insert_autocompletion({ type: "param", value: this.#_val_input.value }, { type: "create new parameter", autoaction });
				autoaction = false;
			}
		}

		user_params.filter(p =>
			p.toLocaleLowerCase().includes(this.#_val_input.value.toLocaleLowerCase()) &&
			p !== this.#_val_input.value
		).forEach(p => {
			insert_autocompletion({ type: "param", value: p });
		});

	}

	#_blur_delayed() {
		requestAnimationFrame(() => {
			// console.log(document.activeElement);
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
			// console.log(document.activeElement);
		});
	}
}

// Register the custom element
customElements.define("dynamic-f64-input", DynamicF64Input);