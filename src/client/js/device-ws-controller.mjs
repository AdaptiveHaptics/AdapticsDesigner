/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/**
 * @template T, K
 * @typedef {import("../../shared/util").ReqProp<T, K>} ReqProp
 */

export class DeviceWSController {

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string | URL} url_arg
	 */
	constructor(pattern_design, url_arg) {
		this.pattern_design = pattern_design;

		this.url = new URL(url_arg);
		this.url.protocol = "ws";

		this.state_change_events = new WebsocketStateChangeEventTarget();
		this.#initws();

		this.pattern_design.state_change_events.addEventListener("commit_update", ev => {
			if (ev.detail.committed) {
				this.update_pattern();
			}
		});
	}

	#initws() {
		this.ws = new WebSocket(this.url);
		this.ws.addEventListener("error", ev => {
			console.error(ev);
			this.ws?.close();
		});
		this.ws.addEventListener("close", ev => {
			console.info(ev);
			this.state_change_events.dispatchEvent(new WebsocketStateEvent("disconnected", { detail: { } }));
			setTimeout(() => this.#initws(), 1000);
		});
		this.ws.addEventListener("open", ev => {
			console.info(ev);
			this.state_change_events.dispatchEvent(new WebsocketStateEvent("connected", { detail: { } }));
		});
		this.ws.addEventListener("message", ev => {
			const m = JSON.parse(ev.data);
			console.log(m);
		});
	}

	/**
	 *
	 * @returns {Promise<void>}
	 */
	async wait_connected() {
		return await new Promise((res, rej) => {
			if (this.ws?.readyState == WebSocket.OPEN) return res();
			else {
				this.state_change_events.addEventListener("connected", () => res());
			}
		});
	}

	update_pattern() {
		this.send("update_pattern", { patternjson: JSON.stringify(this.pattern_design.filedata) });
	}

	/**
	 *
	 * @param {string} cmd
	 * @param {{ [x: string]: any }} data
	 */
	send(cmd, data) {
		if (!this.ws) throw new Error("ws not initialized");
		if (this.ws.readyState != WebSocket.OPEN) throw new Error("ws not OPEN");
		const o = {
			cmd,
			data
		};
		this.ws.send(JSON.stringify(o));
	}

	destroy() {
		this.ws?.close();
	}
}


/**
 * @typedef {Object} WebsocketStateEventMap
 * @property {{ }} connected
 * @property {{ }} disconnected
 */

/**
 * @template {keyof WebsocketStateEventMap} K
 */
export class WebsocketStateEvent extends CustomEvent {
	/**
	 *
	 * @param {K} event
	 * @param {ReqProp<CustomEventInit<WebsocketStateEventMap[K]>, "detail">} eventInitDict
	 */
	constructor(event, eventInitDict) {
		super(event, eventInitDict);
	}
}

class WebsocketStateChangeEventTarget extends EventTarget {
	/**
	 *
	 * @template {keyof WebsocketStateEventMap} K
	 * @param {K} type
	 * @param {(ev: CustomEvent<WebsocketStateEventMap[K]>) => void} listener
	 * @param {boolean | AddEventListenerOptions=} options
	 */
	addEventListener(type, listener, options) {
		super.addEventListener(type, listener, options);
	}
}