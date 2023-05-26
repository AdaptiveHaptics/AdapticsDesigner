/** @typedef {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../fe/patterndesign.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../../../../external/pattern_evaluator/rs-shared-types").MAHDynamicF64} MAHDynamicF64 */

export class DynamicF64Input extends HTMLLabelElement {
	#_pattern_design;
	#_labeltext_span = document.createElement("span");
	#_val_input = document.createElement("input");
	#_step = 1;
	#_set;
	#_get;
	#_min;
	#_max;

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} name
	 * @param {() => MAHDynamicF64} get
	 * @param {(v: MAHDynamicF64) => Parameters<MAHPatternDesignFE["commit_operation"]>[0]} set
	 * @param {Object} param3
	 * @param {string=} param3.unit
	 * @param {number=} param3.step
	 * @param {number=} param3.min
	 * @param {number=} param3.max
	 */
	constructor(pattern_design, name, get, set, { unit, step, min, max }) {
		super();

		this.#_pattern_design = pattern_design;
		this.#_set = set;
		this.#_get = get;

		this.#_labeltext_span.classList.add("labeltext");
		this.#_labeltext_span.textContent = name;
		this.appendChild(this.#_labeltext_span);
		if (unit) {
			const unit_span = document.createElement("span");
			unit_span.classList.add("unit");
			unit_span.textContent = " " + unit;
			this.#_labeltext_span.appendChild(unit_span);
		}

		if (step) this.#_step = step;
		this.#_min = min;
		this.#_max = max;

		this.#_val_input.type = "text";
		this.#_val_input.value = get().value.toString();
		this.#_val_input.addEventListener("keydown", ev => {
			const value = this.#_parse_input_value();
			if (value.type === "f64") {
				if (ev.key === "ArrowUp") {
					this.#_val_input.value = (value.value + this.#_step).toString();
					this.#_on_val_input_change(); // constrain, set
					ev.preventDefault();
				} else if (ev.key === "ArrowDown") {
					this.#_val_input.value = (value.value - this.#_step).toString();
					this.#_on_val_input_change(); // constrain, set
					ev.preventDefault();
				}
			}
		});
		this.#_val_input.addEventListener("change", _ => this.#_on_val_input_change());
		this.appendChild(this.#_val_input);
	}

	update_value() {
		const v = this.#_get();
		if (v.type === "f64") {
			this.#_val_input.value = v.value.toString();
		} else {
			this.#_val_input.value = v.value;
		}
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
	 * @returns {MAHDynamicF64}
	 */
	#_parse_input_value() {
		const v = parseFloat(this.#_val_input.value);
		if (Number.isFinite(v)) {
			return { type: "f64", value: this.#_constrain_f64(v) };
		} else {
			return { type: "dynamic", value: this.#_val_input.value };
		}
	}

	#_on_val_input_change() {
		this.#_pattern_design.save_state();
		this.#_pattern_design.commit_operation(this.#_set(this.#_parse_input_value()));
	}
}

// Register the custom element
customElements.define("dynamic-f64-input", DynamicF64Input, { extends: "label" });