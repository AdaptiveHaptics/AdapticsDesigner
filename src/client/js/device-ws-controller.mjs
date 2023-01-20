/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

export class DeviceWSController {

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string | URL} url_arg
	 */
	constructor(pattern_design ,url_arg) {
		const url = new URL(url_arg);
		url.protocol = "ws";
		this.ws = new WebSocket(url);
		this.ws.addEventListener("message", m => console.log(m));
	}

	todo
}