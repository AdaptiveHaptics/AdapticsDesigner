/** @typedef {import("./fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

import { BoundsCheck } from "./fe/keyframes/bounds-check.mjs";
import { supports_coords, supports_brush, supports_intensity, supports_cjump } from "./fe/keyframes/index.mjs";
import { notnull } from "./util.mjs";

export class UnifiedKeyframeEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} unifiedkeyframeeditorDiv
	 */
	constructor(pattern_design, unifiedkeyframeeditorDiv) {
		this.pattern_design = pattern_design;
		this.unifiedkeyframeeditorDiv = unifiedkeyframeeditorDiv;

		this.pattern_design.state_change_events.addEventListener("rerender", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_reorder", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_select", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_update", ev => {
			if (this.pattern_design.selected_keyframes.has(ev.detail.keyframe)) this.select_update();
		});
		this.pattern_design.state_change_events.addEventListener("kf_deselect", _ev => this.select_update());

		this.ukfeForm = notnull(this.unifiedkeyframeeditorDiv.querySelector("form"));
		this.ukfeForm.addEventListener("submit", ev => {
			ev.preventDefault();
		});
		// this.ukfeForm.addEventListener("focusin", ev => {
		// this.ukfeForm.addEventListener("focusout", ev => {
		notnull(this.ukfeForm.querySelector("div.typecontainer")).addEventListener("change", _ev => {
			this.on_type_change();
		});
		/** @type {HTMLDetailsElement} */
		this.coords_details = notnull(this.ukfeForm.querySelector("details.coords"));
		this.coords_inputs = notnull(this.coords_details.querySelector(".coordsconfig")).querySelectorAll("input");
		this.coords_transition_select = /** @type {HTMLSelectElement} */(this.coords_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.brush_details = notnull(this.ukfeForm.querySelector("details.brush"));
		this.brush_type_select = notnull(this.brush_details.querySelector("select"));
		this.brush_inputs = notnull(this.brush_details.querySelector(".brushconfig")).querySelectorAll("input");
		this.brush_transition_select = /** @type {HTMLSelectElement} */(this.brush_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.intensity_details = notnull(this.ukfeForm.querySelector("details.intensity"));
		this.intensity_type_select = notnull(this.intensity_details.querySelector("select"));
		this.intensity_inputs = notnull(this.intensity_details.querySelector(".intensityconfig")).querySelectorAll("input");
		this.intensity_transition_select = /** @type {HTMLSelectElement} */(this.intensity_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.cjump_details = notnull(this.ukfeForm.querySelector("details.cjump"));
		/** @type {HTMLInputElement} */
		this.cjump_parameter_input = notnull(this.cjump_details.querySelector("input[name=parameter]"));
		/** @type {HTMLInputElement} */
		this.cjump_value_input = notnull(this.cjump_details.querySelector("input[name=value]"));
		/** @type {HTMLInputElement} */
		this.cjump_jump_to_input = notnull(this.cjump_details.querySelector("input[name=jump_to]"));
		/** @type {HTMLSelectElement} */
		this.cjump_operator_select = notnull(this.cjump_details.querySelector("select[name=conditionoperatortype]"));
		// this.cjump_transition_select = /** @type {HTMLSelectElement} */(this.cjump_details.querySelector("div.transitionconfig select"));

		this.coords_details.addEventListener("change", _ev => {
			this.on_coords_change();
		});
		this.brush_details.addEventListener("change", _ev => {
			this.on_brush_change();
		});
		this.intensity_details.addEventListener("change", _ev => {
			this.on_intensity_change();
		});
		this.cjump_details.addEventListener("change", _ev => {
			this.on_cjump_change();
		});



		/** @type {HTMLSelectElement} */
		this.keyframe_type_select = notnull(this.unifiedkeyframeeditorDiv.querySelector("select.keyframe.type"));


		this.select_update();
	}



	/**
	 * @template T
	 * @template F
	 * @param {T[]} keyframes
	 * @param {(arg0: T) => F} map_to_field
	 * @returns {F | null}
	 */
	get_if_field_identical(keyframes, map_to_field) {
		const fa = keyframes.map(map_to_field);
		if (fa.every(v => v == fa[0])) return fa[0];
		else return null;
	}


	select_update() {
		const selected = [...this.pattern_design.selected_keyframes];
		if (selected.length == 0) return this.unifiedkeyframeeditorDiv.classList.add("showhelp");
		else this.unifiedkeyframeeditorDiv.classList.remove("showhelp");


		const selected_type = this.get_if_field_identical(selected, kf => kf.type);
		this.keyframe_type_select.value = selected_type || "multipletypes";


		const common_fields = {
			coords: true,
			brush: true,
			intensity: true,
			cjump: true,
		};
		for (const field of Object.keys(common_fields)) {
			/** @type {HTMLDetailsElement} */
			const field_details = notnull(this.ukfeForm.querySelector(`details.${field}`));
			field_details.style.display = "none";
		}
		for (const kf of selected) {
			switch (kf.type) {
				case "standard": { break; }
				case "pause": {
					common_fields.coords = false;
					break;
				}
				case "stop": {
					common_fields.coords = false;
					common_fields.brush = false;
					common_fields.intensity = false;
					common_fields.cjump = false;
					break;
				}
			}
		}

		if (common_fields.coords) {
			this.coords_details.style.display = "";
			const for_type_check = selected.filter(supports_coords);

			this.coords_inputs.forEach(i => i.value = this.get_if_field_identical(for_type_check, kf => kf.coords.coords[i.name]));

			const selected_transition = this.get_if_field_identical(for_type_check, kf => kf.coords.transition.name);
			this.coords_transition_select.value = selected_transition || "multipletypes";
		}
		if (common_fields.brush) {
			this.brush_details.style.display = "";
			const for_type_check = selected.filter(supports_brush);

			const brush_type = this.get_if_field_identical(for_type_check, kf => kf.brush?.brush.name || "omitted");
			this.brush_type_select.value = brush_type || "multipletypes";

			this.brush_inputs.forEach(i => {
				const parent_label = notnull(i.parentElement);
				if (for_type_check.find(kf => kf.brush?.brush.params[i.name] == undefined)) parent_label.style.display = "none";
				else {
					parent_label.style.display = "";
					const val = this.get_if_field_identical(for_type_check, kf => kf.brush?.brush.params[i.name]);
					i.value = val;
				}
			});

			const transition_div = /** @type {HTMLDivElement} */ (this.brush_details.querySelector("div.transition"));
			if (for_type_check.find(kf => kf.brush == undefined)) transition_div.style.display = "none";
			else {
				transition_div.style.display = "";
				const selected_transition = this.get_if_field_identical(for_type_check, kf => kf.brush?.transition.name);
				this.brush_transition_select.value = selected_transition || "multipletypes";
			}
		}
		if (common_fields.intensity) {
			this.intensity_details.style.display = "";
			const for_type_check = selected.filter(supports_intensity);

			const intensity_type = this.get_if_field_identical(for_type_check, kf => kf.intensity?.intensity.name || "omitted");
			this.intensity_type_select.value = intensity_type || "multipletypes";

			this.intensity_inputs.forEach(i => {
				const parent_label = notnull(i.parentElement);
				if (for_type_check.find(kf => kf.intensity?.intensity.params[i.name] == undefined)) parent_label.style.display = "none";
				else {
					parent_label.style.display = "";
					const val = this.get_if_field_identical(for_type_check, kf => kf.intensity?.intensity.params[i.name]);
					i.value = val;
				}
			});

			const transition_div = /** @type {HTMLDivElement} */ (this.intensity_details.querySelector("div.transition"));
			if (for_type_check.find(kf => kf.intensity == undefined)) transition_div.style.display = "none";
			else {
				transition_div.style.display = "";
				const selected_transition = this.get_if_field_identical(for_type_check, kf => kf.intensity?.transition.name);
				this.intensity_transition_select.value = selected_transition || "multipletypes";
			}

		}
		if (common_fields.cjump) {
			this.cjump_details.style.display = "";
			const for_type_check = selected.filter(supports_cjump);

			this.cjump_parameter_input.value = this.get_if_field_identical(for_type_check, kf => kf.cjump?.condition.parameter) || "";
			this.cjump_operator_select.value = this.get_if_field_identical(for_type_check, kf => kf.cjump?.condition.operator.name) || "multipletypes";
			this.cjump_value_input.value = this.get_if_field_identical(for_type_check, kf => kf.cjump?.condition.value)?.toString() || "";
			this.cjump_jump_to_input.value = this.get_if_field_identical(for_type_check, kf => kf.cjump?.jump_to)?.toString() || "";

		}
	}


	on_type_change() {
		this.pattern_design.save_state();

		const new_type = this.keyframe_type_select.value;
		const selected = [...this.pattern_design.selected_keyframes];
		const deleted_keyframes = this.pattern_design.delete_keyframes(selected);
		const new_keyframes = deleted_keyframes.map(dkf => this.pattern_design.insert_new_keyframe({
			...dkf,
			//@ts-ignore
			type: new_type
		}));

		this.pattern_design.commit_operation({ deleted_keyframes, new_keyframes });
		this.pattern_design.select_keyframes(new_keyframes);
	}
	on_coords_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_coords); //filter for type check (redundant since GUI restricts to correct types)
		const raw_coords = { x: 0, y: 0, z: 0 };
		this.coords_inputs.forEach(i => raw_coords[i.name] = parseFloat(i.value));
		try {
			const new_coords = BoundsCheck.coords(raw_coords);
			keyframes.forEach(kf => kf.coords.coords = new_coords);
		} catch (e) { /* ignore !isFinite */ }
		// @ts-ignore
		keyframes.forEach(kf => kf.coords.transition.name = this.coords_transition_select.value);

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_brush_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_brush); //filter for type check (redundant since GUI restricts to correct types)

		this.brush_inputs.forEach(i => {
			const parent_label = notnull(i.parentElement);
			if (parent_label.style.display == "none") return;
			keyframes.forEach(kf => {
				if (!kf.brush) return;
				kf.brush.brush.params[i.name] = parseFloat(i.value);
			});
		});

		keyframes.forEach(kf => {
			if (!kf.brush) return;
			if (kf.brush.brush.name == this.brush_type_select.value) return;
			switch (this.brush_type_select.value) {
				case "circle":
					kf.brush.brush = {
						name: this.brush_type_select.value,
						params: { radius: 1 }
					};
					break;
				case "line":
					kf.brush.brush = {
						name: this.brush_type_select.value,
						params: {
							length: 5,
							thickness: 1,
							rotation: 0
						}
					};
					break;
				case "multipletypes":
					break;
				default: throw new Error(`unexpected brush type: ${this.brush_type_select.value}`);
			}
		});

		// @ts-ignore
		keyframes.forEach(kf => { if (kf.brush) kf.brush.transition.name = this.brush_transition_select.value; });

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_intensity_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_intensity); //filter for type check (redundant since GUI restricts to correct types)

		this.intensity_inputs.forEach(i => {
			const parent_label = notnull(i.parentElement);
			if (parent_label.style.display == "none") return;
			keyframes.forEach(kf => {
				if (!kf.intensity) return;
				kf.intensity.intensity.params[i.name] = parseFloat(i.value);
			});
		});

		keyframes.forEach(kf => {
			if (!kf.intensity) return;
			if (kf.intensity.intensity.name == this.intensity_type_select.value) return;
			switch (this.intensity_type_select.value) {
				case "constant":
					kf.intensity.intensity = {
						name: this.intensity_type_select.value,
						params: { value: 1 }
					};
					break;
				case "random":
					kf.intensity.intensity = {
						name: this.intensity_type_select.value,
						params: {
							min: 0,
							max: 1,
						}
					};
					break;
				case "multipletypes":
					break;
				default: throw new Error(`unexpected intensity type: ${this.intensity_type_select.value}`);
			}
		});

		// @ts-ignore
		keyframes.forEach(kf => { if (kf.intensity) kf.intensity.transition.name = this.intensity_transition_select.value; });

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_cjump_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_cjump); //filter for type check (redundant since GUI restricts to correct types)

		keyframes.forEach(kf => {
			if (!kf.cjump && !this.cjump_parameter_input.value) return;
			if (!kf.cjump) kf.cjump = { condition: { parameter: "conditionAA", operator: { name: "gt", params: {} }, value: 0 }, jump_to: 1.5 };
			if (this.cjump_parameter_input.value) kf.cjump.condition.parameter = this.cjump_parameter_input.value;
			switch (this.cjump_operator_select.value) {
				case "lt":
				case "lt_eq":
				case "gt":
				case "gt_eq":
					kf.cjump.condition.operator = { name: this.cjump_operator_select.value, params: {} };
					break;
				case "multipletypes":
					break;
				default: throw new Error(`unexpected cjump operator type: ${this.intensity_type_select.value}`);
			}
			if (this.cjump_value_input.value) kf.cjump.condition.value = parseFloat(this.cjump_value_input.value);
			if (this.cjump_jump_to_input.value) kf.cjump.jump_to = parseFloat(this.cjump_jump_to_input.value);
		});

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}

}