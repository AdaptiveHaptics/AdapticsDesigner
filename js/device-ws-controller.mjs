/** @typedef {import("./fe/patterndesign.mjs").MAHAnimationFileFormatFE} MAHAnimationFileFormatFE */
/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("./pattern-evaluator.mjs").PatternEvaluatorParameters} PatternEvaluatorParameters */
/**
 * @template T
 * @template {keyof T} K
 * @typedef {import("../../shared/util").ReqProp<T, K>} ReqProp
 */

export class DeviceWSController {
	#_destroyed = false;

	/**
	 *
	 * @param {string | URL} url_arg
	 */
	constructor(url_arg) {
		this.url = new URL(url_arg);
		this.url.protocol = "ws";

		this.state_change_events = new WebsocketStateChangeEventTarget();
		this.#initws();
	}

	#initws() {
		if (this.#_destroyed) return;
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
			this.handle_message(m);
		});
	}

	is_connected() {
		return this.ws?.readyState == WebSocket.OPEN;
	}

	/**
	 *
	 * @returns {Promise<void>}
	 */
	async wait_connected() {
		return await new Promise((res) => {
			if (this.is_connected()) return res();
			else {
				this.state_change_events.addEventListener("connected", () => res());
			}
		});
	}

	/**
	 *
	 * @param {MAHAnimationFileFormatFE} pattern
	 */
	update_pattern(pattern) {
		this.send("update_pattern", { pattern_json: JSON.stringify(pattern) });
	}

	/**
	 *
	 * @param {number} playstart time in milliseconds
	 */
	update_playstart(playstart) {
		const playstart_offset = playstart - Date.now();
		this.send("update_playstart", { playstart, playstart_offset });
	}

	/**
	 *
	 * @param {PatternEvaluatorParameters} evaluator_params
	 */
	update_parameters(evaluator_params) {
		/** @type {import("./pattern-evaluator.mjs").WASMPatternEvaluatorParameters} */
		const json_safe_p = { time: evaluator_params.time, user_parameters: Object.fromEntries(evaluator_params.user_parameters), geometric_transform: evaluator_params.geometric_transform };
		this.send("update_parameters", { evaluator_params: json_safe_p });
	}

	/**
	 *
	 * @param {string} cmd
	 * @param {{ [x: string]: any }} data
	 */
	send(cmd, data) {
		if (!this.ws) throw new Error("ws not initialized");
		if (this.ws.readyState != WebSocket.OPEN) return console.warn("ws not OPEN");
		const o = {
			cmd,
			data
		};
		this.ws.send(JSON.stringify(o));
	}

	/**
	 *
	 * @param {{ cmd: string, data: { [x: string]: any } }} m
	 */
	handle_message(m) {
		switch (m.cmd) {
			case "playback_update": {
				this.state_change_events.dispatchEvent(new WebsocketStateEvent("playback_update", { detail: { evals: m.data.evals } }));
				return;
			}
			case "ignoreme": {
				break;
			}
			default:
				throw new Error(`Unknown websocket message '${m.cmd}'`);
		}
		console.log(m);
	}


	destroy() {
		this.#_destroyed = true;
		this.ws?.close();
	}

	get destroyed() {
		return this.#_destroyed;
	}
}


/**
 * @typedef {Object} WebsocketStateEventMap
 * @property {{ }} connected
 * @property {{ }} disconnected
 * @property {{ evals: import("./pattern-evaluator.mjs").BrushAtAnimLocalTime[] }} playback_update
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