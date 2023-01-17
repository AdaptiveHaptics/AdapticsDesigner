/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { notnull } from "./util.mjs";


export class ParameterEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} patterneditor_div
	 */
	constructor(pattern_design, patterneditor_div) {
		this.pattern_design = pattern_design;
		this.patterneditorDiv = patterneditor_div;

		{ //init timecontrol
			this.timecontrol_div = notnull(document.querySelector("div.timecontrol"));
			this.timecontrol_input = notnull(this.timecontrol_div.querySelector("input"));
			this.timecontrol_input.addEventListener("input", _ev => {
				const v = parseFloat(this.timecontrol_input.value);
				if (Number.isFinite(v)) {
					this.pattern_design.update_evaluator_params("time", Math.max(v, 0));
				} else {
					this.timecontrol_input.value = this.pattern_design.evaluator_params.time.toFixed(0);
				}
			});
			/** @type {HTMLButtonElement} */
			this.timecontrol_play = notnull(this.timecontrol_div.querySelector("button.play"));
			/** @type {HTMLButtonElement} */
			this.timecontrol_pause = notnull(this.timecontrol_div.querySelector("button.pause"));
			/** @type {HTMLButtonElement} */
			this.timecontrol_reset = notnull(this.timecontrol_div.querySelector("button.reset"));

			this.timecontrol_playstart = 0;
			const tickplayback = () => {
				if (!this.timecontrol_playstart) return;
				const time = Date.now()-this.timecontrol_playstart;
				this.pattern_design.update_evaluator_params("time", time);
				requestAnimationFrame(tickplayback);
			};
			this.timecontrol_play.addEventListener("click", _ev => {
				this.timecontrol_play.style.display = "none";
				this.timecontrol_pause.style.display = "";
				this.timecontrol_playstart = Date.now() - this.pattern_design.evaluator_params.time;
				tickplayback();
			});
			this.timecontrol_pause.addEventListener("click", _ev => {
				this.timecontrol_play.style.display = "";
				this.timecontrol_pause.style.display = "none";
				this.timecontrol_playstart = 0;
			});
			this.timecontrol_reset.addEventListener("click", _ev => {
				this.timecontrol_play.style.display = "";
				this.timecontrol_pause.style.display = "none";
				this.timecontrol_playstart = 0;
				this.pattern_design.update_evaluator_params("time", 0);
			});
		}


		// for (const [key, val] of pattern_design.evaluator_params.user_parameters) {
		// 	throw new Error("TODO");
		// }


		this.pattern_design.state_change_events.addEventListener("parameters_update", () => {
			this.update_controls();
		});

		this.update_controls();
	}

	// append_param_control(key, val) {
	// 	const control_div = document.createElement("div");
	// 	throw new Error("TODO");
	// 	this.patterneditorDiv.appendChild(control_div);
	// }

	update_controls() {
		this.timecontrol_input.value = this.pattern_design.evaluator_params.time.toFixed(0);
	}

}