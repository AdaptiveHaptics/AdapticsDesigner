/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { notnull } from "../util.mjs";

export class PatternGlobalsEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLFormElement} patternForm
	 */
	constructor(pattern_design, patternForm) {
		this.pattern_design = pattern_design;

		this.patternForm = patternForm;
		this.patternForm.addEventListener("submit", ev => {
			ev.preventDefault();
		});

		{ // init transformcontrol
			this._transformcontrol_div = notnull(this.patternForm.querySelector("div.transformcontrol"));
			/** @type {HTMLInputElement} */
			this._speedcontrol_input = notnull(this._transformcontrol_div.querySelector("input[name=speed]"));
			this._speedcontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._speedcontrol_input.value) / 100;
				if (Number.isFinite(v)) {
					this.pattern_design.update_evaluator_transform({ playback_speed: v });
				} else {
					this.#_update_transform_controls();
				}
			});

			/** @type {HTMLInputElement} */
			this._intensitycontrol_input = notnull(this._transformcontrol_div.querySelector("input[name=intensity]"));
			this._intensitycontrol_input.addEventListener("change", _ => {
				const v = parseFloat(this._intensitycontrol_input.value) / 100;
				if (Number.isFinite(v)) {
					this.pattern_design.update_evaluator_transform({ intensity_factor: v });
				} else {
					this.#_update_transform_controls();
				}
			});

			this.pattern_design.state_change_events.addEventListener("parameters_update", ev => {
				if (!ev.detail.time) this.#_update_transform_controls();
			});
			this.#_update_transform_controls();
		}
	}

	#_update_transform_controls() {
		this._speedcontrol_input.value = (this.pattern_design.evaluator_params.transform.playback_speed*100).toFixed(0);
		this._intensitycontrol_input.value = (this.pattern_design.evaluator_params.transform.intensity_factor*100).toFixed(0);
	}
}