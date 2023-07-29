import { TabPanel } from "./tabpanel.mjs";

export class CenterPanel extends TabPanel {
	/**
	 *
	 * @param {HTMLDivElement} centerpanel_div
	 */
	constructor(centerpanel_div) {
		super(centerpanel_div);
		this.centerpanel_div = centerpanel_div;

		this.switch_to_tab("patternstagecontainer");
	}
}