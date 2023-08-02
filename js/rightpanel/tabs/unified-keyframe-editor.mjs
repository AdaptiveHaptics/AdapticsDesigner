/** @typedef {import("../../fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../../../shared/types.js").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../../shared/types.js").MAHKeyframe} MAHKeyframe */

import { BoundsCheck } from "../../fe/keyframes/bounds-check.mjs";
import { supports_coords, supports_brush, supports_intensity, supports_cjump } from "../../fe/keyframes/index.mjs";
import { deep_equals, notnull, num_to_rounded_string } from "../../util.mjs";
import Sortable from "sortablejs";
import { DynamicF64Input } from "../common/dynamic-f64-input.mjs";

export class UnifiedKeyframeEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} ukfecontainerDiv
	 */
	constructor(pattern_design, ukfecontainerDiv) {
		this.pattern_design = pattern_design;
		this.ukfecontainerDiv = ukfecontainerDiv;

		this.pattern_design.state_change_events.addEventListener("rerender", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_reorder", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_update", ev => {
			if (this.pattern_design.selected_keyframes.has(ev.detail.keyframe)) this.select_update();
		});
		this.pattern_design.state_change_events.addEventListener("item_select_batch", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("item_deselect_batch", _ev => this.select_update());

		/** @type {HTMLFormElement} */
		this.ukfeForm = notnull(ukfecontainerDiv.querySelector("form.ukfe"));
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
		this.brush_config_label_input_grid = notnull(this.brush_details.querySelector("div.brushconfig.labelinputgrid"));
		/** @type {(import("../../../../shared/util").RemoveFirstFromArray<ConstructorParameters<typeof DynamicF64Input>>)[]} */
		const brush_input_specs = [
			["radius", { unit: "mm", min: 0, max: 100 }],
			["length", { unit: "mm", min: 0, max: 100 }],
			// ["thickness", { unit: "mm", min: 0, max: 100 } ],
			["rotation", { unit: "deg" }],
			["am_freq", { unit: "hz", min: 0, max: 500 }]
		];
		this.brush_inputs = new Map(brush_input_specs.map(ifs => {
			const [name, options] = ifs;
			const input = new DynamicF64Input(this.pattern_design, name, options);
			this.brush_config_label_input_grid.appendChild(input);
			return [name, input];
		}));
		this.brush_transition_select = /** @type {HTMLSelectElement} */(this.brush_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.intensity_details = notnull(this.ukfeForm.querySelector("details.intensity"));
		this.intensity_type_select = notnull(this.intensity_details.querySelector("select"));
		this.intensity_config_label_input_grid = notnull(this.intensity_details.querySelector("div.intensityconfig.labelinputgrid"));
		/** @type {(import("../../../../shared/util").RemoveFirstFromArray<ConstructorParameters<typeof DynamicF64Input>>)[]} */
		const intensity_input_specs = [
			["value", { unit: "", min: 0, max: 1, step: 0.05 }],
			["min", { unit: "", min: 0, max: 1, step: 0.05 }],
			["max", { unit: "", min: 0, max: 1, step: 0.05 }],
		];
		this.intensity_inputs = new Map(intensity_input_specs.map(ifs => {
			const [name, options] = ifs;
			const input = new DynamicF64Input(this.pattern_design, name, options);
			this.intensity_config_label_input_grid.appendChild(input);
			return [name, input];
		}));
		this.intensity_transition_select = /** @type {HTMLSelectElement} */(this.intensity_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.cjump_details = notnull(this.ukfeForm.querySelector("details.cjump"));
		/** @type {HTMLDivElement} */
		this.cjumps_container_div = notnull(this.cjump_details.querySelector("div.cjumps-container"));
		/** @type {HTMLTemplateElement} */
		this.cjump_row_template = notnull(this.cjump_details.querySelector("template.cjumprow"));
		/** @type {HTMLButtonElement} */
		this.cjump_add_button = notnull(this.cjump_details.querySelector("button.add"));
		this.cjump_add_button.addEventListener("click", _ev => this.on_cjump_add());
		this.cjumps_sortable = new Sortable(this.cjumps_container_div, {
			handle: ".draghandle",
			animation: 150,
			onEnd: ev => {
				this.on_cjump_reorder(notnull(ev.oldIndex ?? null), notnull(ev.newIndex ?? null));
			}
		});

		this.coords_details.addEventListener("change", _ev => {
			this.on_coords_change();
		});
		this.brush_details.addEventListener("change", _ev => {
			this.on_brush_change();
		});
		this.intensity_details.addEventListener("change", _ev => {
			this.on_intensity_change();
		});
		this.cjump_details.addEventListener("change", ev => {
			if (ev.target == this.cjumps_container_div && "newIndex" in ev) return; // ignore if from Sortable
			this.on_cjump_change();
		});



		/** @type {HTMLSelectElement} */
		this.keyframe_type_select = notnull(this.ukfeForm.querySelector("select[name=keyframetype]"));


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
		if (fa.every(v => deep_equals(v, fa[0]))) return fa[0];
		else return null;
	}


	select_update() {
		const selected = [...this.pattern_design.selected_keyframes];
		if (selected.length == 0) return this.ukfecontainerDiv.classList.add("noneselected");
		else this.ukfecontainerDiv.classList.remove("noneselected");


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

			for (const [brush_input_name, brush_input] of this.brush_inputs) {
				if (for_type_check.find(kf => kf.brush?.brush.params[brush_input_name] == undefined)) brush_input.style.display = "none";
				else {
					brush_input.style.display = "";
					const val = this.get_if_field_identical(for_type_check, kf => kf.brush?.brush.params[brush_input_name]);
					brush_input.update_value(val);
				}

			}

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


			for (const [intensity_input_name, intensity_input] of this.intensity_inputs) {
				if (for_type_check.find(kf => kf.intensity?.intensity.params[intensity_input_name] == undefined)) intensity_input.style.display = "none";
				else {
					intensity_input.style.display = "";
					const val = this.get_if_field_identical(for_type_check, kf => kf.intensity?.intensity.params[intensity_input_name]);
					intensity_input.update_value(val);
				}

			}

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

			/** @type {import("../../../../shared/types.js").ConditionalJump[][]} */
			const cjumps_by_index = [];
			for (const kf of for_type_check) {
				for (let i = 0; i < kf.cjumps.length; i++) {
					const cjump = kf.cjumps[i];
					const cjumps_at_index = cjumps_by_index[i] || [];
					cjumps_at_index.push(cjump);
					cjumps_by_index[i] = cjumps_at_index;
				}
			}

			while (this.cjumps_container_div.firstChild) this.cjumps_container_div.removeChild(this.cjumps_container_div.firstChild);

			for (const [row_index, cjumps_at_index] of cjumps_by_index.entries()) {
				// clone template row
				const cjump_row = /** @type {ParentNode} */ (this.cjump_row_template.content.cloneNode(true));

				notnull(cjump_row.querySelector("input[name=parameter]")).replaceWith(
					new DynamicF64Input(this.pattern_design, "parameter", { paramonly: true, nolabel: true}));

				const { cjump_parameter_df64_input, cjump_value_input, cjump_jump_to_input, cjump_operator_select, cjump_remove_button }
					= get_children_from_cjump_row(cjump_row);
				cjump_remove_button.addEventListener("click", () => {
					this.on_cjump_remove(row_index);
				});
				cjump_parameter_df64_input.update_value(this.get_if_field_identical(cjumps_at_index, cjump => { return { type: "param", value: cjump.condition.parameter}; }));
				cjump_operator_select.value = this.get_if_field_identical(cjumps_at_index, cjump => cjump.condition.operator.name) || "multipletypes";
				cjump_value_input.value = this.get_if_field_identical(cjumps_at_index, cjump => cjump.condition.value)?.toString() || "";
				const jump_to_input_identical = this.get_if_field_identical(cjumps_at_index, cjump => cjump.jump_to);
				if (jump_to_input_identical != null) cjump_jump_to_input.value = num_to_rounded_string(jump_to_input_identical / 1000);
				else cjump_jump_to_input.value = "";
				this.cjumps_container_div.appendChild(cjump_row);
			}

			this.cjumps_sortable.save();
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
		this.pattern_design.select_items({ keyframes: new_keyframes });
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
		if (this.coords_transition_select.value != "multipletypes") keyframes.forEach(kf => kf.coords.transition.name = this.coords_transition_select.value);

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}


	/**
	 * Helper function to update keyframes with new intensity or brush data.
	 *
	 * @template {MAHKeyframeFE} K
	 * @param {MAHKeyframe[]} all_keyframes - All keyframes to check.
	 * @param {Map<string, DynamicF64Input>} prop_inputs - The input elements to get the new data from.
	 * @param {HTMLSelectElement} prop_type_select - The select element to get the new prop subtype from.
	 * @param {HTMLSelectElement} prop_transition_select - The select element to get the new prop transition from.
	 * @param {string} kf_prop_name - The name of the keyframe property to update.
	 * These dont work
	 * param {keyof K & keyof K[keyof K]} kf_prop_name
	 * param {"brush"|"intensity"} kf_prop_name
	 * @param {(kf: MAHKeyframeFE) => kf is K} filter_kf_prop - A function to check if the keyframe supports the given type.
	 * @param {(type: string) => any} create_default_for_type - A function to create a new prop object with a given type.
	 */
	#_update_keyframes_with_flat_inputs(all_keyframes, prop_inputs, prop_type_select, prop_transition_select, kf_prop_name, filter_kf_prop, create_default_for_type) {
		const filtered_keyframes = all_keyframes.filter(filter_kf_prop);

		for (const [input_name, input] of prop_inputs) {
			filtered_keyframes.forEach(kf => {
				if (!kf[kf_prop_name] || input.style.display == "none") return;
				const val = input.get_value();
				if (val != null) {
					kf[kf_prop_name][kf_prop_name].params[input_name] = val;
					if (val.type == "param") {
						this.pattern_design.last_used_user_param = val.value;
					}
				}
			});
		}

		filtered_keyframes.forEach(kf => {
			if (!kf[kf_prop_name]) return;
			if (kf[kf_prop_name][kf_prop_name].name == prop_type_select.value) return;
			if (prop_type_select.value == "multipletypes") return;
			kf[kf_prop_name][kf_prop_name] = create_default_for_type(prop_type_select.value);
		});

		if (prop_transition_select.value != "multipletypes") filtered_keyframes.forEach(kf => { if (kf[kf_prop_name]) kf[kf_prop_name].transition.name = prop_transition_select.value; });
	}

	// Usage:
	on_brush_change() {
		this.pattern_design.save_state();
		const keyframes = [...this.pattern_design.selected_keyframes];
		this.#_update_keyframes_with_flat_inputs(
			keyframes, this.brush_inputs, this.brush_type_select, this.brush_transition_select, "brush", supports_brush,
			(type) => {
				switch (type) {
					case "circle": return {
						name: type,
						params: { radius: { type: "f64", value: 10 }, am_freq: { type: "f64", value: 0 } }
					};
					case "line": return {
						name: type,
						params: {
							length: { type: "f64", value: 5 },
							thickness: { type: "f64", value: 1 },
							rotation: { type: "f64", value: 0 },
							am_freq: { type: "f64", value: 0 },
						}
					};
					default: throw new Error(`unexpected brush type: ${type}`);
				}
			}
		);
		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}

	on_intensity_change() {
		this.pattern_design.save_state();
		const keyframes = [...this.pattern_design.selected_keyframes];
		this.#_update_keyframes_with_flat_inputs(
			keyframes, this.intensity_inputs, this.intensity_type_select, this.intensity_transition_select, "intensity", supports_intensity,
			(type) => {
				switch (type) {
					case "constant": return {
						name: type,
						params: { value: { type: "f64", value: 1 } }
					};
					case "random": return {
						name: type,
						params: {
							min: { type: "f64", value: 0 },
							max: { type: "f64", value: 1 },
						}
					};
					default: throw new Error(`unexpected intensity type: ${type}`);
				}
			}
		);
		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_cjump_add() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_cjump);

		const default_param_name = this.pattern_design.last_used_user_param ??
			keyframes.find(kf => kf.cjumps.length != 0)?.cjumps[0].condition.parameter ??
			Object.keys(this.pattern_design.filedata.user_parameter_definitions)[0] ??
			"foo";

		this.pattern_design.last_used_user_param = default_param_name;

		keyframes.forEach(kf => {
			kf.cjumps.push({
				condition: {
					parameter: default_param_name,
					operator: {
						name: "lt_eq",
						params: {}
					},
					value: 0,
				},
				jump_to: 0,
			});
		});


		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	/**
	 *
	 * @param {number} old_index
	 * @param {number} new_index
	 */
	on_cjump_reorder(old_index, new_index) {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_cjump);

		keyframes.forEach(kf => {
			const cjump = kf.cjumps.splice(old_index, 1)[0];
			if (!cjump) return;
			kf.cjumps.splice(new_index, 0, cjump);
		});

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	/**
	 *
	 * @param {number} row_index
	 */
	on_cjump_remove(row_index) {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_cjump);

		keyframes.forEach(kf => {
			kf.cjumps.splice(row_index, 1);
		});

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_cjump_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(supports_cjump); //filter for type check (redundant since GUI restricts to correct types)

		keyframes.forEach(kf => {
			const cjump_rows = this.cjumps_container_div.children;
			for (let i = 0; i< cjump_rows.length; i++) {
				const cjump_row =  cjump_rows[i];
				const { cjump_parameter_df64_input, cjump_value_input, cjump_jump_to_input, cjump_operator_select } = get_children_from_cjump_row(cjump_row);
				const cjump = kf.cjumps[i];
				if (!cjump) return;
				const cjump_param_df64_wrapped = cjump_parameter_df64_input.get_value();
				if (cjump_param_df64_wrapped && cjump_param_df64_wrapped.type == "param") {
					this.pattern_design.last_used_user_param = cjump.condition.parameter = cjump_param_df64_wrapped.value;
				}
				switch (cjump_operator_select.value) {
					case "lt":
					case "lt_eq":
					case "gt":
					case "gt_eq":
						cjump.condition.operator = { name: cjump_operator_select.value, params: {} };
						break;
					case "multipletypes":
						break;
					default: throw new Error(`unexpected cjump operator type: ${this.intensity_type_select.value}`);
				}
				if (cjump_value_input.value) cjump.condition.value = parseFloat(cjump_value_input.value);
				if (cjump_jump_to_input.value) cjump.jump_to = parseFloat(cjump_jump_to_input.value) * 1000;
			}
		});

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}

}

/**
 *
 * @param {ParentNode} cjump_row
 */
function get_children_from_cjump_row(cjump_row) {
	/** @type {DynamicF64Input} */
	const cjump_parameter_df64_input = notnull(cjump_row.querySelector("dynamic-f64-input"));
	/** @type {HTMLInputElement} */
	const cjump_value_input = notnull(cjump_row.querySelector("input[name=value]"));
	/** @type {HTMLInputElement} */
	const cjump_jump_to_input = notnull(cjump_row.querySelector("input[name=jump_to]"));
	/** @type {HTMLSelectElement} */
	const cjump_operator_select = notnull(cjump_row.querySelector("select[name=conditionoperatortype]"));
	// this.cjump_transition_select = /** @type {HTMLSelectElement} */(this.cjump_details.querySelector("div.transitionconfig select"));
	/** @type {HTMLButtonElement} */
	const cjump_remove_button = notnull(cjump_row.querySelector("button.remove"));

	return { cjump_parameter_df64_input, cjump_value_input, cjump_jump_to_input, cjump_operator_select, cjump_remove_button };
}