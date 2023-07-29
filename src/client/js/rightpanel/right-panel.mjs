/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { TabPanel } from "../tabpanel.mjs";
import { notnull } from "../util.mjs";
import { PatternGlobalsEditor } from "./tabs/pattern-globals-editor.mjs";
import { UnifiedKeyframeEditor } from "./tabs/unified-keyframe-editor.mjs";

export class RightPanel extends TabPanel {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} rightpanel_div
	 */
	constructor(pattern_design, rightpanel_div) {
		super(rightpanel_div);
		this.pattern_design = pattern_design;
		this.rightpanel_div = rightpanel_div;


		this.help_div = notnull(this.tabpanelscontainer_div.querySelector("div.help"));
		this.unified_keyframe_editor = new UnifiedKeyframeEditor(pattern_design, notnull(this.tabpanelscontainer_div.querySelector("div.ukfecontainer")));
		this.pattern_globals_editor = new PatternGlobalsEditor(pattern_design, notnull(this.tabpanelscontainer_div.querySelector("form.postprocessing")));

		// switch to UKFE tab when a keyframe is selected if tabs have not been manually switched
		this.pattern_design.state_change_events.addEventListener("item_select", ev => {
			if (!this.tab_switched_manually && ev.detail.keyframe) this.switch_to_tab("ukfecontainer");
		});

		this.switch_to_tab("help");
	}
}