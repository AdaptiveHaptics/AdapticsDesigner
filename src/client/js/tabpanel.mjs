import { notnull } from "./util.mjs";

export class TabPanel {
	tab_switched_manually = false;

	constructor(tabpanel_div) {
		this.tabpanel_div = tabpanel_div;
		this.tabpanelscontainer_div = notnull(this.tabpanel_div.querySelector("div.tabpanelscontainer"));

		/** @type {HTMLDivElement} */
		this.tabs = notnull(this.tabpanel_div.querySelector("div.tabs"));
		// listen for clicks on the tabs
		this.tabs.addEventListener("click", ev => {
			// @ts-ignore
			const tab_button = ev.target.closest("button.tab");
			if (tab_button) {
				const tabpanel_name = tab_button.dataset.tabpanel;
				this.switch_to_tab(tabpanel_name);
				this.tab_switched_manually = true;
			}
		});
	}

	switch_to_tab(tabpanel_name) {
		[...this.tabpanelscontainer_div.children].forEach(tabpanel_div => {
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