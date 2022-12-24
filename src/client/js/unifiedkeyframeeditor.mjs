/** @typedef {import("./script.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./script.mjs").MAHKeyframeStandardFE} MAHKeyframeStandardFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

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

		this.pattern_design.state_change_events.addEventListener("kf_select", ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_deselect", ev => this.select_update());

		this.ukfeForm = notnull(this.unifiedkeyframeeditorDiv.querySelector("form"));
		this.ukfeForm.addEventListener("submit", ev => {
			ev.preventDefault();
		});
		// this.ukfeForm.addEventListener("focusin", ev => {
		// this.ukfeForm.addEventListener("focusout", ev => {
		notnull(this.ukfeForm.querySelector("div.typecontainer")).addEventListener("change", ev => {
			this.on_type_change();
		});
		notnull(this.ukfeForm.querySelector("details.coords")).addEventListener("change", ev => {
			this.on_coords_change();
		});
		notnull(this.ukfeForm.querySelector("details.brush")).addEventListener("change", ev => {
			this.on_brush_change();
		});
		notnull(this.ukfeForm.querySelector("details.intensity")).addEventListener("change", ev => {
			this.on_intensity_change();
		});
		notnull(this.ukfeForm.querySelector("details.transition")).addEventListener("change", ev => {
			this.on_transition_change();
		});


		/** @type {HTMLSelectElement} */
		this.type_select = notnull(this.unifiedkeyframeeditorDiv.querySelector("select.type"));


		this.select_update();
	}


	select_update() {
		const selected = [...this.pattern_design.selected_keyframes];
		if (selected.length == 0) this.unifiedkeyframeeditorDiv.classList.add("showhelp");
		else this.unifiedkeyframeeditorDiv.classList.remove("showhelp");


		let selected_type;
		for (const kf of selected) {
			if (!selected_type) selected_type = kf.type;
			else if (selected_type == kf.type) continue;
			else {
				selected_type = null;
				break;
			}
		}
		// @ts-ignore setting to null
		this.type_select.value = selected_type;



		const common_fields = new Set(["coords", "brush", "intensity", "transition"]);
		for (const field of common_fields) {
			/** @type {HTMLDetailsElement} */
			const field_details = notnull(this.ukfeForm.querySelector(`details.${field}`));
			field_details.style.display = "none";
		}
		for (const kf of selected) {
			for (const common_field of common_fields) {
				if (common_field in kf) continue;
				else common_fields.delete(common_field);
			}
		}
		for (const field of common_fields) {
			/** @type {HTMLDetailsElement} */
			const field_details = notnull(this.ukfeForm.querySelector(`details.${field}`));
			field_details.style.display = "";
		}
	}


	on_type_change(ev) {
		this.pattern_design.save_state();
		const new_type = this.type_select.value;
		const selected = [...this.pattern_design.selected_keyframes];
		const deleted_keyframes = this.pattern_design.delete_keyframes(selected);
		const new_keyframes = deleted_keyframes.map(dkf => this.pattern_design.insert_new_keyframe({
			...dkf,
			//@ts-ignore
			type: new_type
		}));
		
		this.pattern_design.commit_operation({ deleted_keyframes, new_keyframes });
	}
	on_coords_change() {
		this.pattern_design.save_state();

		this.pattern_design.commit_operation();
	}
	on_brush_change() {
		this.pattern_design.save_state();

		this.pattern_design.commit_operation();
	}
	on_intensity_change() {
		this.pattern_design.save_state();

		this.pattern_design.commit_operation();
	}
	on_transition_change() {
		this.pattern_design.save_state();

		this.pattern_design.commit_operation();
	}

}