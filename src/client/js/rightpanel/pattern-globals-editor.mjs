/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../fe/patterndesign.mjs").PatternTransformation} PatternTransformation */

import { PatternEvaluator } from "../pattern-evaluator.mjs";
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
			this._playbackspeed_input = notnull(this._transformcontrol_div.querySelector("input[name=playback_speed]"));
			this._playbackspeed_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.playback_speed = v, ev));

			/** @type {HTMLInputElement} */
			this._intensity_input = notnull(this._transformcontrol_div.querySelector("input[name=intensity]"));
			this._intensity_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.intensity_factor = v, ev));

			/** @type {HTMLInputElement} */
			this._rotation_input = notnull(this._transformcontrol_div.querySelector("input[name=rotation]"));
			this._rotation_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.rotation = v, ev, { geo_transform: true }));

			/** @type {HTMLInputElement} */
			this._scale_x_input = notnull(this._transformcontrol_div.querySelector("input[name=scale_x]"));
			this._scale_x_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.x = v, ev, { geo_transform: true }));

			/** @type {HTMLInputElement} */
			this._scale_y_input = notnull(this._transformcontrol_div.querySelector("input[name=scale_y]"));
			this._scale_y_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.y = v, ev, { geo_transform: true }));

			/** @type {HTMLInputElement} */
			this._scale_z_input = notnull(this._transformcontrol_div.querySelector("input[name=scale_z]"));
			this._scale_z_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.z = v, ev, { geo_transform: true }));


			/** @type {HTMLInputElement} */
			this._translate_x_input = notnull(this._transformcontrol_div.querySelector("input[name=translate_x]"));
			this._translate_x_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.x = v, ev, { geo_transform: true }));

			/** @type {HTMLInputElement} */
			this._translate_y_input = notnull(this._transformcontrol_div.querySelector("input[name=translate_y]"));
			this._translate_y_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.y = v, ev, { geo_transform: true }));

			/** @type {HTMLInputElement} */
			this._translate_z_input = notnull(this._transformcontrol_div.querySelector("input[name=translate_z]"));
			this._translate_z_input.addEventListener("change", ev =>
				this.#_handleInputChange(v => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.z = v, ev, { geo_transform: true }));


			this.pattern_design.state_change_events.addEventListener("pattern_transform_update", _ev => {
				this.#_update_transform_controls();
			});
			this.#_update_transform_controls();

			notnull(this.patternForm.querySelector("button[type=reset]")).addEventListener("click", ev => {
				ev.preventDefault();
				this.pattern_design.save_state();
				this.pattern_design.filedata.pattern_transform = PatternEvaluator.default_pattern_transformation();
				this.pattern_design.commit_operation({ pattern_transform: { geo_transform: true } });
			});
		}
	}

	/**
	 * @param {(v: number) => void} set
	 * @param {Event} event
	 */
	#_handleInputChange(set, event, { geo_transform = false } = {}) {
		// @ts-ignore
		const v = parseFloat(event.target.value);
		if (Number.isFinite(v)) {
			this.pattern_design.save_state();
			set(v);
			this.pattern_design.commit_operation({ pattern_transform: { geo_transform } });
		} else {
			this.#_update_transform_controls();
		}
	}

	#_update_transform_controls() {
		this._playbackspeed_input.value = this.pattern_design.filedata.pattern_transform.playback_speed.toFixed(2);
		this._intensity_input.value = this.pattern_design.filedata.pattern_transform.intensity_factor.toFixed(2);
		this._rotation_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.rotation.toFixed(2);
		this._scale_x_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.x.toFixed(2);
		this._scale_y_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.y.toFixed(2);
		this._scale_z_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.z.toFixed(2);
		this._translate_x_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.x.toFixed(2);
		this._translate_y_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.y.toFixed(2);
		this._translate_z_input.value = this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.z.toFixed(2);
	}
}