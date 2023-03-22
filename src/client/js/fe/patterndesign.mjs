/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */
/** @typedef {import("./keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../pattern-evaluator.mjs").PatternEvaluatorParameters} PatternEvaluatorParameters */
/** @typedef {import("../pattern-evaluator.mjs").NextEvalParams} NextEvalParams */
/**
 * @template T, K
 * @typedef {import("../../../shared/util").ReqProp<T, K>} ReqProp
 */
/**
 * @template T
 * @template K
 * @typedef {import("../../../shared/util").OptExceptProp<T, K>} OptExceptProp
 */

/** @type {import("../../../shared/types").REVISION_STRING} */
const MAH_$REVISION = "0.0.5-alpha.1";

import { DeviceWSController } from "../device-ws-controller.mjs";
import { PatternEvaluator } from "../pattern-evaluator.mjs";
import { assert_unreachable } from "../util.mjs";
import { BoundsCheck } from "./keyframes/bounds-check.mjs";
import { create_correct_keyframefe_wrapper, MAHKeyframePauseFE, MAHKeyframeStandardFE, MAHKeyframeStopFE, NewKeyframeCommon } from "./keyframes/index.mjs";

/**
 * @typedef {Object} StateEventMap
 * @property {{ keyframe: MAHKeyframeFE }} kf_new
 * @property {{ keyframe: MAHKeyframeFE }} kf_delete
 * @property {{ keyframe: MAHKeyframeFE }} kf_update
 * @property {{}} rerender
 * @property {{ keyframe: MAHKeyframeFE }} kf_select
 * @property {{ keyframe: MAHKeyframeFE }} kf_deselect
 * @property {{ keyframe: MAHKeyframeFE }} kf_reorder
 * @property {{ committed: boolean }} commit_update
 * @property {{ }} playback_update
 * @property {{ time: boolean }} parameters_update
 * @property {{ }} playstart_update
 */

/**
 * @typedef {ReturnType<typeof MAHPatternDesignFE.prototype.load_filedata_into_fe_format>} MAHAnimationFileFormatFE
 */

/**
 * @template {keyof StateEventMap} K
 */
export class StateChangeEvent extends CustomEvent {
	/**
	 *
	 * @param {K} event
	 * @param {ReqProp<CustomEventInit<StateEventMap[K]>, "detail">} eventInitDict
	 */
	constructor(event, eventInitDict) {
		super(event, eventInitDict);
	}
}

class StateChangeEventTarget extends EventTarget {
	/**
	 *
	 * @template {keyof StateEventMap} K
	 * @param {K} type
	 * @param {(ev: CustomEvent<StateEventMap[K]>) => void} listener
	 * @param {boolean | AddEventListenerOptions=} options
	 */
	addEventListener(type, listener, options) {
		super.addEventListener(type, listener, options);
	}
}

export class MAHPatternDesignFE {
	/**
	 *
	 * @param {string} filename
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 */
	constructor(filename, filedata, undo_states = [], redo_states = [], undo_states_size = 50, redo_states_size = 50) {
		this.filename = filename;

		/** @type {MAHAnimationFileFormatFE} */
		this.filedata = this.load_filedata_into_fe_format(filedata);

		this.undo_states = undo_states;
		this.undo_states_size = undo_states_size;
		this.redo_states = redo_states;
		this.redo_states_size = redo_states_size;


		this.state_change_events = new StateChangeEventTarget();
		this.state_change_events.addEventListener("rerender", ev => console.info(ev));

		//pattern eval
		/** @type {PatternEvaluatorParameters}  */
		this.evaluator_params = { time: 0, user_parameters: new Map() };
		/** @type {NextEvalParams} */
		this.evaluator_next_eval_params = PatternEvaluator.default_next_eval_params();
		this.pattern_evaluator = new PatternEvaluator(this.filedata);
		this.state_change_events.addEventListener("commit_update", ev => {
			if (ev.detail.committed) {
				this.pattern_evaluator = new PatternEvaluator(this.filedata);
				this.websocket?.update_pattern(this.filedata);
				this.#_eval_pattern();
			}
		});
		this.state_change_events.addEventListener("parameters_update", ev => {
			if (this.is_playing() && this.websocket?.is_connected()) {
				if (ev.detail.time) {
					//wait for playback_update from websocket
				} else {
					this.websocket.update_parameters(this.evaluator_params);
				}
			} else {
				this.#_eval_pattern();
			}
		});
		this.state_change_events.addEventListener("playstart_update", _ => {
			this.websocket?.update_playstart(this.#_playstart_timestamp);
			if (this.is_playing()) {
				this.#_tick_playback();
			}
		});
		this.state_change_events.addEventListener("playback_update", _ => {
			if (this.last_eval[0].stop) this.update_playstart(0);
		});
		this.last_eval = this.#_eval_pattern(); //set in constructor for typecheck
	}



	/** @type {MidAirHapticsAnimationFileFormat[]} */
	undo_states = [];
	undo_states_size = 50;
	/** @type {MidAirHapticsAnimationFileFormat[]} */
	redo_states = [];
	redo_states_size = 50;

	// save_working_copy_to_localstorage_timer = null; #this is not atomic
	_committed = false;
	get committed() {
		return this._committed;
	}
	set committed(v) {
		this.state_change_events.dispatchEvent(new StateChangeEvent("commit_update", { detail: { committed: v }}));
		this._committed = v;
	}

	save_state() {
		if (!this.committed) {
			alert("save_state before commit");
			throw new Error("save_state before commit");
		}
		this.committed = false;
		this.redo_states.length = 0;
		this.undo_states.push(this.clone_filedata());
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.save_to_localstorage();

		//# this is not atomic
		// if (this.save_working_copy_to_localstorage_timer) clearTimeout(this.save_working_copy_to_localstorage_timer);
		// setTimeout(() => this.save_to_localstorage(), 1800);
	}
	/**
	 *
	 * @param {{
	 * 	rerender?: boolean,
	 * 	new_keyframes?: MAHKeyframeFE[]
	 * 	updated_keyframes?: MAHKeyframeFE[]
	 * 	deleted_keyframes?: MAHKeyframeFE[]
	 * }} param0
	 */
	commit_operation({ rerender, new_keyframes, updated_keyframes, deleted_keyframes }) {
		if (this.committed) {
			alert("commit_operation before save");
			throw new Error("commit_operation before save");
		}
		this.save_to_localstorage();
		this.committed = true;


		// it might be better to run everything through es6 proxies than trust we provide all modified objects, but im just gonna with this for now
		if (rerender) {
			const change_event = new StateChangeEvent("rerender", { detail: {} });
			this.state_change_events.dispatchEvent(change_event);
			return;
		}


		if (deleted_keyframes) {
			for (const keyframe of deleted_keyframes) {
				const change_event = new StateChangeEvent("kf_delete", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
		if (new_keyframes) {
			for (const keyframe of new_keyframes) {
				const change_event = new StateChangeEvent("kf_new", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
		if (updated_keyframes) {
			for (const keyframe of updated_keyframes) {
				const change_event = new StateChangeEvent("kf_update", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
	}

	undo() {
		const fd = this.undo_states.pop();
		if (fd == null) return false;

		this.redo_states.push(this.clone_filedata());
		if (this.redo_states.length > this.redo_states_size) this.redo_states.shift();

		this.selected_keyframes.clear();
		this.filedata = this.load_filedata_into_fe_format(fd);
		this.committed = false;
		this.commit_operation({ rerender: true });
		return true;
	}

	redo() {
		const fd = this.redo_states.pop();
		if (fd == null) return false;

		this.undo_states.push(this.clone_filedata());
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.selected_keyframes.clear();
		this.filedata = this.load_filedata_into_fe_format(fd);
		this.committed = false;
		this.commit_operation({ rerender: true });
		return true;
	}



	/**
	 * * return value mused be passed into `commit_operation` as a value in `new_keyframes`
	 * @param {OptExceptProp<MAHKeyframe, "type">} set
	 */
	insert_new_keyframe(set) {
		let keyframe;
		switch (set.type) {
			case "standard": { keyframe = MAHKeyframeStandardFE.from_current_keyframes(this, set); break; }
			case "pause": { keyframe = MAHKeyframePauseFE.from_current_keyframes(this, set); break; }
			case "stop": { keyframe = MAHKeyframeStopFE.from_current_keyframes(this, set); break; }
			default: assert_unreachable(set);
		}
		this.filedata.keyframes.push(keyframe);
		this.filedata.keyframes.sort();
		return keyframe;
	}


	/** @type {Set<MAHKeyframeFE>} */
	selected_keyframes = new Set();

	/**
	 *
	 * @param {MAHKeyframeFE[]} selected_keyframes
	 */
	select_keyframes(selected_keyframes) {
		for (const keyframe of selected_keyframes) {
			this.selected_keyframes.add(keyframe);
			const change_event = new StateChangeEvent("kf_select", { detail: { keyframe } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	/**
	 *
	 * @param {MAHKeyframeFE[]} deselected_keyframes
	 */
	deselect_keyframes(deselected_keyframes) {
		for (const keyframe of deselected_keyframes) {
			this.selected_keyframes.delete(keyframe);
			const change_event = new StateChangeEvent("kf_deselect", { detail: { keyframe } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	select_all_keyframes() {
		this.select_keyframes(this.filedata.keyframes);
	}
	deselect_all_keyframes() {
		this.deselect_keyframes([...this.selected_keyframes]);
	}
	/**
	 *
	 * @param {MAHKeyframeFE} keyframe
	 * @returns {boolean}
	 */
	is_keyframe_selected(keyframe) {
		return this.selected_keyframes.has(keyframe);
	}

	group_select_logic(selected_keyframes, linked_keyframes, { shiftKey = false, ctrlKey = false, altKey = false }) {
		let keyframes = [];

		if (altKey) { keyframes = [...selected_keyframes, ...linked_keyframes]; }
		else keyframes = [...selected_keyframes];

		if (!ctrlKey) this.deselect_all_keyframes();
		if (ctrlKey && shiftKey) this.deselect_keyframes(keyframes);
		else this.select_keyframes(keyframes);
	}


	/**
	 *
	 * @returns {MAHKeyframeFE[]}
	 */
	get_sorted_keyframes() {
		this.filedata.keyframes.sort((a, b) => a.time - b.time);
		return this.filedata.keyframes;
	}
	/**
	 *
	 * @returns {MAHKeyframeFE | undefined}
	 */
	get_last_keyframe() {
		return this.get_sorted_keyframes()[this.filedata.keyframes.length - 1];
	}
	/**
	 *
	 * @returns {MAHKeyframeFE | undefined}
	 */
	get_secondlast_keyframe() {
		return this.get_sorted_keyframes()[this.filedata.keyframes.length - 2];
	}
	/**
	 *
	 * @param {MAHKeyframeFE} keyframe
	 */
	get_sorted_keyframe_index(keyframe) {
		const index = this.get_sorted_keyframes().indexOf(keyframe);
		if (index == -1) throw new TypeError("keyframe not in array");
		return index;
	}



	/**
	 * @template R
	 * @param {(keyframe: MAHKeyframeFE) => (R | null)} pred
	 * @param {MAHKeyframeFE} keyframe
	 * @param {"next" | "prev"} prevornext
	 * @returns {R | null}
	 */
	get_nearest_neighbor_keyframe_matching_pred(keyframe, pred, prevornext = "next") {
		const prev = prevornext == "prev";
		const keyframes = this.get_sorted_keyframes();
		const index = this.get_sorted_keyframe_index(keyframe);
		for (
			let i = prev ?
				index :
				index + 1;
			prev ?
				i-- :
				i < keyframes.length;
			prev ?
				null :
				i++
		) {
			const kf = pred(keyframes[i]);
			if (kf) return kf;
		}
		return null;
	}

	/**
	 * return value mused be passed into `commit_operation` as `deleted_keyframes`
	 * @param {MAHKeyframeFE[]} keyframes
	 */
	delete_keyframes(keyframes) {
		this.deselect_all_keyframes();
		for (const keyframe of keyframes) {
			const index = this.get_sorted_keyframe_index(keyframe);
			this.filedata.keyframes.splice(index, 1);
		}
		return keyframes;
	}

	/**
	 *
	 * @param {MAHKeyframeFE} keyframe
	 */
	check_for_reorder(keyframe) {
		const index = this.filedata.keyframes.indexOf(keyframe);
		if (index == -1) throw new TypeError("keyframe not in array");
		const prev_kf = this.filedata.keyframes[index-1];
		const next_kf = this.filedata.keyframes[index+1];
		if (
			(prev_kf && prev_kf.time > keyframe.time) ||
			(next_kf && next_kf.time < keyframe.time)
		) { //reorder needed
			console.log("reorder needed");
			const change_event = new StateChangeEvent("kf_reorder", { detail: { keyframe } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}


	get_user_parameters_to_keyframes_map() {
		/** @type {Map<string, MAHKeyframeFE[]>} */
		const uparam_to_kfs_map = new Map();
		for (const keyframe of this.filedata.keyframes) {
			if ("cjump" in keyframe) {
				const param = keyframe.cjump?.condition.parameter;
				if (param) {
					const arr = uparam_to_kfs_map.get(param);
					if (arr) arr.push(keyframe);
					else uparam_to_kfs_map.set(param, [keyframe]);
				}
			}
		}
		return uparam_to_kfs_map;
	}


	#_playstart_timestamp = 0;
	#_tick_playback() {
		if (!this.is_playing()) return;
		const time = Date.now()-this.#_playstart_timestamp;
		this.#_update_pattern_time(time);
		requestAnimationFrame(() => this.#_tick_playback());
	}
	is_playing() {
		return this.#_playstart_timestamp != 0;
	}

	/**
	 *
	 * @param {number} playstart_timestamp in milliseconds
	 */
	update_playstart(playstart_timestamp) {
		this.#_playstart_timestamp = playstart_timestamp;
		const ce = new StateChangeEvent("playstart_update", { detail: { } });
		this.state_change_events.dispatchEvent(ce);
	}

	/**
	 *
	 * @param {number} time
	 */
	update_pattern_time(time) {
		if (this.is_playing()) return; //ignore during playback
		this.evaluator_next_eval_params = PatternEvaluator.default_next_eval_params();
		this.#_update_pattern_time(time);
	}
	/**
	 *
	 * @param {number} time
	 */
	#_update_pattern_time(time) {
		this.evaluator_params.time = time;
		const ce = new StateChangeEvent("parameters_update", { detail: { time: true } });
		this.state_change_events.dispatchEvent(ce);
	}

	/**
	 * @param {string} param
	 * @param {number} value
	 */
	update_evaluator_user_params(param, value) {
		this.evaluator_params.user_parameters.set(param, value);
		const ce = new StateChangeEvent("parameters_update", { detail: { time: false } });
		this.state_change_events.dispatchEvent(ce);
	}

	#_eval_pattern() {
		const eval_result = this.pattern_evaluator.eval_brush_at_anim_local_time_for_max_t(this.evaluator_params, this.evaluator_next_eval_params);
		this.last_eval = eval_result;
		this.evaluator_next_eval_params = eval_result[0].next_eval_params;
		const sce = new StateChangeEvent("playback_update", { detail: {} });
		this.state_change_events.dispatchEvent(sce);
		return eval_result;
	}



	/**
	 *
	 * @param {string | URL} url
	 */
	connect_websocket(url) {
		if (this.websocket) this.websocket.destroy();
		const websocket = new DeviceWSController(url);
		websocket.state_change_events.addEventListener("connected", _ev => {
			websocket.update_pattern(this.filedata);
			websocket.update_playstart(this.#_playstart_timestamp);
		});
		websocket.state_change_events.addEventListener("disconnected", _ev => {
			this.#_eval_pattern();
		});
		websocket.state_change_events.addEventListener("playback_update", ev => {
			this.last_eval = ev.detail.evals;
			const sce = new StateChangeEvent("playback_update", { detail: {} });
			this.state_change_events.dispatchEvent(sce);
		});
		this.websocket = websocket;
	}
	disconnect_websocket() {
		if (this.websocket) this.websocket.destroy();
		this.websocket = null;
	}


	async copy_selected_to_clipboard() {
		/** @type {MidAirHapticsClipboardFormat} */
		const clipboard_data = {
			$DATA_FORMAT: "MidAirHapticsClipboardFormat",
			$REVISION: MAH_$REVISION,
			keyframes: [...this.selected_keyframes]
		};
		// const ci = new ClipboardItem({
		// 	// "application/json": JSON.stringify(clipboard_data), //not allowed in chrome for security reasons
		// 	"text/plain": JSON.stringify(clipboard_data),
		// });
		// navigator.clipboard.write([ci]);
		await navigator.clipboard.writeText(JSON.stringify(clipboard_data, null, "\t"));
		this.deselect_all_keyframes();
	}

	async paste_clipboard() {
		try {
			const clipboard_data = await navigator.clipboard.readText();
			/** @type {MidAirHapticsClipboardFormat} */
			let clipboard_parsed;
			try {
				clipboard_parsed = JSON.parse(clipboard_data);
			} catch (e) {
				console.error(e);
				throw new Error("Could not find MidAirHapticsClipboardFormat data in clipboard.");
			}
			if (clipboard_parsed.$DATA_FORMAT != "MidAirHapticsClipboardFormat") throw new Error(`incorrect $DATA_FORMAT ${clipboard_parsed.$DATA_FORMAT} expected ${"MidAirHapticsClipboardFormat"}`);
			if (clipboard_parsed.$REVISION != MAH_$REVISION) throw new Error(`incorrect revision ${clipboard_parsed.$REVISION} expected ${MAH_$REVISION}`);

			// I was gonna do a more complicated "ghost" behaviour
			// but google slides just drops the new objects at an offset
			// and adds them to selected
			this.save_state();
			const deleted_keyframes = this.delete_keyframes([...this.selected_keyframes]);
			clipboard_parsed.keyframes.sort();

			const paste_time_offset = NewKeyframeCommon.next_timestamp(this) - (clipboard_parsed.keyframes[0]?.time || 0);
			// console.log(paste_time_offset);

			const new_keyframes = clipboard_parsed.keyframes.map(kf => {
				console.log(kf.time);
				kf.time += paste_time_offset;
				console.log(kf.time);
				if ("coords" in kf) {
					kf.coords.coords.x += 5;
					kf.coords.coords.y += 5;
					kf.coords.coords = BoundsCheck.coords(kf.coords.coords);
				}
				return this.insert_new_keyframe(kf);
			});
			this.commit_operation({ new_keyframes, deleted_keyframes });
			this.select_keyframes(new_keyframes);
		} catch (e) {
			alert("Could not find MidAirHapticsClipboardFormat data in clipboard");
			throw e;
		}
	}


	/**
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 */
	load_filedata_into_fe_format(filedata) {
		const keyframesFE = filedata.keyframes.map(kf => create_correct_keyframefe_wrapper(kf, this));
		const filedataFE = { ...filedata, keyframes: keyframesFE };
		return filedataFE;
	}
	/**
	 * @returns {MidAirHapticsAnimationFileFormat}
	 */
	clone_filedata() {
		/** @type {MidAirHapticsAnimationFileFormat} */
		const filedata = JSON.parse(JSON.stringify(this.filedata));
		filedata.$DATA_FORMAT = "MidAirHapticsAnimationFileFormat";
		filedata.$REVISION = MAH_$REVISION;
		return filedata;
	}

	serialize() {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = this;
		filedata.$DATA_FORMAT = "MidAirHapticsAnimationFileFormat";
		filedata.$REVISION = MAH_$REVISION;
		const serializable_obj = { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size };
		return JSON.stringify(serializable_obj);
	}
	/**
	 *
	 * @param {string} json_str
	 * @returns {MAHPatternDesignFE}
	 */
	static deserialize(json_str) {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = JSON.parse(json_str);
		if (filedata.$DATA_FORMAT != "MidAirHapticsAnimationFileFormat") throw new Error(`incorrect $DATA_FORMAT ${filedata.$DATA_FORMAT} expected ${"MidAirHapticsAnimationFileFormat"}`);
		if (filedata.$REVISION != MAH_$REVISION) throw new Error(`incorrect revision ${filedata.$REVISION} expected ${MAH_$REVISION}`);
		return new MAHPatternDesignFE(filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size);
	}

	static get LOCAL_STORAGE_KEY() { return "primary_design"; }

	save_to_localstorage() {
		window.localStorage.setItem(MAHPatternDesignFE.LOCAL_STORAGE_KEY, this.serialize());
	}
	static load_from_localstorage() {
		const lssf = window.localStorage.getItem(MAHPatternDesignFE.LOCAL_STORAGE_KEY);
		if (lssf) {
			return this.deserialize(lssf);
		} else {
			return null;
		}
	}
}

/** @type {[string, MidAirHapticsAnimationFileFormat]} */
MAHPatternDesignFE.DEFAULT = ["test.json", {
	$DATA_FORMAT: "MidAirHapticsAnimationFileFormat",
	$REVISION: MAH_$REVISION,

	name: "test",

	projection: "plane",
	update_rate: 1,

	keyframes: [
		{
			type: "standard",
			time: 0.000,
			coords: {
				coords: {
					x: 0,
					y: 0,
					z: 0,
				},
				transition: {
					name: "linear",
					params: {}
				}
			},
			intensity: {
				intensity: {
					name: "constant",
					params: {
						value: 1.00
					}
				},
				transition: {
					name: "linear",
					params: {}
				}
			},
			brush: {
				brush: {
					name: "circle",
					params: {
						radius: 1.00
					}
				},
				transition: {
					name: "linear",
					params: {}
				}
			}
		}
	]
}];