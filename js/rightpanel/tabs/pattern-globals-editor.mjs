/** @typedef {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../fe/patterndesign.mjs").PatternTransformation} PatternTransformation */

import { PatternEvaluator } from "../../pattern-evaluator.mjs";
import { notnull } from "../../util.mjs";
import { DynamicF64Input } from "../common/dynamic-f64-input.mjs";

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


			/**
			 * @type {(import("../../../../shared/util").RemoveFirstFromArray<ConstructorParameters<typeof DynamicF64Input>>|string)[]}
			 */
			const ifsa = [
				["Speed", () => this.pattern_design.filedata.pattern_transform.playback_speed, v => { this.pattern_design.filedata.pattern_transform.playback_speed = v; return { pattern_transform: { geo_transform: false }}; }, { unit: "%", step: 25, min: 0 }],
				["Intensity", () => this.pattern_design.filedata.pattern_transform.intensity_factor, v => { this.pattern_design.filedata.pattern_transform.intensity_factor = v; return { pattern_transform: { geo_transform: false }}; }, { unit: "%", step: 10, min: 0 }],
				["Rotation", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.rotation, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.rotation = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "deg", step: 15 }],
				"Scale",
				["Scale x", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.x, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.x = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "×", step: 0.25 }],
				["Scale y", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.y, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.y = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "×", step: 0.25 }],
				["Scale z", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.z, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.scale.z = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "×", step: 0.25 }],
				"Translate",
				["Translate x", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.x, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.x = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "mm", step: 1 }],
				["Translate y", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.y, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.y = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "mm", step: 1 }],
				["Translate z", () => this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.z, v => { this.pattern_design.filedata.pattern_transform.geometric_transforms.translate.z = v; return { pattern_transform: { geo_transform: true }}; }, { unit: "mm", step: 1 }],
			];
			this._inputs = ifsa.map(ifs => {
				if (typeof ifs === "string") {
					const h3 = document.createElement("h3");
					h3.textContent = ifs;
					this._transformcontrol_div.appendChild(h3);
					return null;
				} else {
					const [name, get, set, options] = ifs;
					const input = new DynamicF64Input(this.pattern_design, name, get, set, options);
					this._transformcontrol_div.appendChild(input);
					return input;
				}
			}).filter(/** @type {(a: any) => a is DynamicF64Input } */ (v => v instanceof DynamicF64Input));

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

	#_update_transform_controls() {
		for (const input of this._inputs) {
			input.update_value();
		}
	}
}