import { TabPanel } from "./tabpanel.mjs";

export class CenterPanel extends TabPanel {
	/**
	 *
	 * @param {HTMLDivElement} centerpanel_div
	 */
	constructor(centerpanel_div) {
		super(centerpanel_div);
		this.centerpanel_div = centerpanel_div;

		// parse hash as search params and check if a tab is specified
		const hash_params = new URLSearchParams(window.location.hash.slice(1));
		const tab = hash_params.get("centertab");

		this.switch_to_tab(tab ?? "patternstagecontainer");
	}
}