/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { notnull } from "../util.mjs";
import { PatternGlobalsEditor } from "./tabs/pattern-globals-editor.mjs";
import { UnifiedKeyframeEditor } from "./tabs/unified-keyframe-editor.mjs";

export class RightPanel {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} rightpanel_div
	 */
	constructor(pattern_design, rightpanel_div) {
		this.pattern_design = pattern_design;
		this.rightpanel_div = rightpanel_div;
		this.tabpanelcontainer_div = notnull(this.rightpanel_div.querySelector("div.tabpanelcontainer"));

		/** @type {HTMLDivElement} */
		this.tabs = notnull(this.rightpanel_div.querySelector("div.tabs"));
		// listen for clicks on the tabs
		this.tabs.addEventListener("click", ev => {
			// @ts-ignore
			const tab_button = ev.target.closest("button.tab");
			if (tab_button) {
				const tabpanel_name = tab_button.dataset.tabpanel;
				this.update_tab(tabpanel_name);
			}
		});


		this.help_div = notnull(this.tabpanelcontainer_div.querySelector("div.help"));
		this.unified_keyframe_editor = new UnifiedKeyframeEditor(pattern_design, notnull(this.tabpanelcontainer_div.querySelector("div.ukfecontainer")));
		this.pattern_globals_editor = new PatternGlobalsEditor(pattern_design, notnull(this.tabpanelcontainer_div.querySelector("form.pattern")));

		this.update_tab("help");
	}

	update_tab(tabpanel_name) {
		[...this.tabpanelcontainer_div.children].forEach(tabpanel_div => {
			if (tabpanel_div.classList.contains(tabpanel_name)) {
				tabpanel_div.classList.remove("hidden");
			} else {
				tabpanel_div.classList.add("hidden");
			}
		});
		[...this.tabs.children].forEach(tab_button => {
			// @ts-ignore
			if (tab_button.dataset.tabpanel === tabpanel_name) {
				tab_button.classList.add("active");
			} else {
				tab_button.classList.remove("active");
			}
		});
	}
}