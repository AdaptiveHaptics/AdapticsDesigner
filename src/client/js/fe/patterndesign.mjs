/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */
/** @typedef {import("../../../shared/types").PatternTransformation} PatternTransformation */
/** @typedef {import("../../../shared/types").ConditionalJump} ConditionalJump */
/** @typedef {import("../../../external/pattern_evaluator/rs-shared-types").MAHDynamicF64} MAHDynamicF64 */
/** @typedef {import("./keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../pattern-evaluator.mjs").PatternEvaluatorParameters} PatternEvaluatorParameters */
/** @typedef {import("../pattern-evaluator.mjs").NextEvalParams} NextEvalParams */
/** @typedef {import("../pattern-evaluator.mjs").GeometricTransformMatrix} GeometricTransformMatrix */
/** @typedef {import("../konvapanes/timeline-stage.mjs").KonvaCJumpFlag} KonvaCJumpFlag */
/**
 * @template T
 * @template {keyof T} K
 * @typedef {import("../../../shared/util").ReqProp<T, K>} ReqProp
 */
/**
 * @template T
 * @template {keyof T} K
 * @typedef {import("../../../shared/util").OptExceptProp<T, K>} OptExceptProp
 */

/** @type {import("../../../shared/types").REVISION_STRING} */
const MAH_$REVISION = "0.0.9-alpha.2";

import { DeviceWSController } from "../device-ws-controller.mjs";
import { PatternEvaluator } from "../pattern-evaluator.mjs";
import { assert_unreachable } from "../util.mjs";
import { ParseJSONSchema } from "../utility/json-schema-parser.mjs";
import { BoundsCheck } from "./keyframes/bounds-check.mjs";
import { create_correct_keyframefe_wrapper, MAHKeyframePauseFE, MAHKeyframeStandardFE, MAHKeyframeStopFE, NewKeyframeCommon } from "./keyframes/index.mjs";
const JSON_SCHEMA = JSON.parse(await fetch(new URL("../../external/pattern_evaluator/rs-shared-types.json", import.meta.url)).then(r => r.text()));
const PARSED_JSON_SCHEMA = new ParseJSONSchema(JSON_SCHEMA);
const MAH_DYNAMIC_F64_PATHS = PARSED_JSON_SCHEMA.find_paths_to_wanted_on_type(PARSED_JSON_SCHEMA.resolve_type_name("MAHKeyframe"), PARSED_JSON_SCHEMA.resolve_type_name("MAHDynamicF64"));

/**
 * @typedef {Object} StateEventMap
 * @property {{ keyframe: MAHKeyframeFE }} kf_new
 * @property {{ keyframe: MAHKeyframeFE }} kf_delete
 * @property {{ keyframe: MAHKeyframeFE }} kf_update
 * @property {{}} rerender
 * @property {{ keyframe: MAHKeyframeFE, cjump_flag: undefined } | { keyframe: undefined, cjump_flag: KonvaCJumpFlag }} item_select
 * @property {{ keyframe: MAHKeyframeFE, cjump_flag: undefined } | { keyframe: undefined, cjump_flag: KonvaCJumpFlag }} item_deselect
 * @property {{ keyframe: MAHKeyframeFE }} kf_reorder
 * @property {{ committed: boolean }} commit_update
 * @property {{ }} playback_update
 * @property {{ time: boolean }} parameters_update
 * @property {{ }} playstart_update
 * @property {{ geo_transform: boolean }} pattern_transform_update
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
	#_filename; get filename() { return this.#_filename; }

	/**
	 *
	 * @param {string} filename
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 */
	constructor(filename, filedata, undo_states = [], redo_states = [], undo_states_size = 50, redo_states_size = 50) {
		this.#_filename = filename;

		/** @type {MAHAnimationFileFormatFE} */
		this.filedata = this.load_filedata_into_fe_format(filedata);

		this.undo_states = undo_states;
		this.undo_states_size = undo_states_size;
		this.redo_states = redo_states;
		this.redo_states_size = redo_states_size;


		this.state_change_events = new StateChangeEventTarget();
		// this.state_change_events.addEventListener("rerender", ev => console.info(ev));

		//pattern eval
		/** @type {PatternEvaluatorParameters}  */
		this.evaluator_params = { time: 0, user_parameters: new Map(), geometric_transform: PatternEvaluator.default_geo_transform_matrix() };
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

	/**
	 * must be followed by commit_operation
	 */
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
	 * must be preceded by save_state
	 *
	 * @param {{
	 * 	rerender?: boolean,
	 * 	new_keyframes?: MAHKeyframeFE[] | Set<MAHKeyframeFE>
	 * 	updated_keyframes?: MAHKeyframeFE[] | Set<MAHKeyframeFE>
	 * 	deleted_keyframes?: MAHKeyframeFE[] | Set<MAHKeyframeFE>
	 * 	pattern_transform?: { geo_transform: boolean },
	 * }} param0
	 */
	commit_operation({ rerender, pattern_transform, new_keyframes, updated_keyframes, deleted_keyframes }) {
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

		if (pattern_transform) {
			const change_event = new StateChangeEvent("pattern_transform_update", { detail: { geo_transform: pattern_transform.geo_transform } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}

	undo() {
		const fd = this.undo_states.pop();
		if (fd == null) return false;

		this.redo_states.push(this.clone_filedata());
		if (this.redo_states.length > this.redo_states_size) this.redo_states.shift();

		this.selected_keyframes.clear();
		this.filedata = this.load_filedata_into_fe_format(fd); //could fail to due to incorrect data structure revision
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
		this.filedata = this.load_filedata_into_fe_format(fd); //could fail to due to incorrect data structure revision
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
	/** @type {Set<KonvaCJumpFlag>} */
	selected_cjump_flags = new Set();


	/** @typedef {{ keyframes?: MAHKeyframeFE[], cjump_flags?: KonvaCJumpFlag[] }} SelectItemsStruct */
	/**
	 *
	 * @param {SelectItemsStruct} param0
	 */
	select_items({ keyframes = [], cjump_flags = [] }) {
		for (const keyframe of keyframes) {
			this.selected_keyframes.add(keyframe);
			const change_event = new StateChangeEvent("item_select", { detail: { keyframe, cjump_flag: undefined } });
			this.state_change_events.dispatchEvent(change_event);
		}
		for (const cjump_flag of cjump_flags) {
			this.selected_cjump_flags.add(cjump_flag);
			const change_event = new StateChangeEvent("item_select", { detail: { keyframe: undefined, cjump_flag } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	/**
	 *
	 * @param {SelectItemsStruct} param0
	 */
	deselect_items({ keyframes = [], cjump_flags = [] }) {
		for (const keyframe of keyframes) {
			this.selected_keyframes.delete(keyframe);
			const change_event = new StateChangeEvent("item_deselect", { detail: { keyframe, cjump_flag: undefined } });
			this.state_change_events.dispatchEvent(change_event);
		}
		for (const cjump_flag of cjump_flags) {
			this.selected_cjump_flags.delete(cjump_flag);
			const change_event = new StateChangeEvent("item_deselect", { detail: { keyframe: undefined, cjump_flag } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	select_all_keyframes() {
		this.select_items({ keyframes: this.filedata.keyframes });
	}
	deselect_all_items() {
		this.deselect_items({ keyframes: [...this.selected_keyframes], cjump_flags: [...this.selected_cjump_flags] });
	}
	/**
	 * @param {Object} param0
	 * @param {MAHKeyframeFE=} param0.keyframe
	 * @param {KonvaCJumpFlag=} param0.cjump_flag
	 * @returns {boolean}
	 */
	is_item_selected({ keyframe, cjump_flag }) {
		if (keyframe) return this.selected_keyframes.has(keyframe);
		if (cjump_flag) return this.selected_cjump_flags.has(cjump_flag);
		return false;
	}

	/**
	 *
	 * @param {SelectItemsStruct} selected
	 * @param {SelectItemsStruct} linked
	 */
	group_select_logic(selected, linked, { shiftKey = false, ctrlKey = false, altKey = false }) {
		let to_select = {};

		if (altKey) { // merge selected and linked
			const keys = new Set([...Object.keys(selected), ...Object.keys(linked)]);
			for (const key of keys) {
				to_select[key] = [...(selected[key] ?? []), ...(linked[key] ?? [])];
			}
		}
		else Object.assign(to_select, selected);

		if (!ctrlKey) this.deselect_all_items();
		if (ctrlKey && shiftKey) this.deselect_items(to_select);
		else this.select_items(to_select);
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
		this.deselect_all_items();
		for (const keyframe of keyframes) {
			const index = this.get_sorted_keyframe_index(keyframe);
			this.filedata.keyframes.splice(index, 1);
		}
		return keyframes;
	}

	async delete_selected_items() {
		if (this.selected_keyframes.size == 0 && this.selected_cjump_flags.size == 0) return;
		this.save_state();
		const selected_cjump_flags = [...this.selected_cjump_flags];
		const updated_keyframes = selected_cjump_flags.flatMap(cjf => cjf.delete_cjumps_to_self());
		const deleted_keyframes = this.delete_keyframes([...this.selected_keyframes]);
		this.commit_operation({ updated_keyframes, deleted_keyframes });
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
		this.evaluator_next_eval_params.last_eval_pattern_time = time;
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
	/**
	 *
	 * @param {GeometricTransformMatrix} transform_matrix
	 */
	update_evaluator_geo_transform(transform_matrix) {
		this.evaluator_params.geometric_transform = transform_matrix;
		const ce = new StateChangeEvent("parameters_update", { detail: { time: false } });
		this.state_change_events.dispatchEvent(ce);
	}

	get_user_parameters_to_linked_map() {
		/** @type {Map<string, { items: { keyframes: MAHKeyframeFE[], pattern_transform: boolean }, prop_parents: { cjumps: ConditionalJump[], dynf64: MAHDynamicF64[] } }>} */
		const uparam_to_item_map = new Map();
		const get_up_linked_or_default = (param_name) => {
			const up_linked = uparam_to_item_map.get(param_name);
			if (up_linked) return up_linked;

			const new_up_linked = {
				items: { keyframes: [], pattern_transform: false },
				prop_parents: { cjumps: [], dynf64: [] }
			};
			uparam_to_item_map.set(param_name, new_up_linked);
			return new_up_linked;
		};


		for (const keyframe of this.filedata.keyframes) {
			if ("cjumps" in keyframe) {
				for (const cjump of keyframe.cjumps) {
					const param_name = cjump.condition.parameter;
					if (param_name) {
						const up_linked = get_up_linked_or_default(param_name);
						up_linked.items.keyframes.push(keyframe);
						up_linked.prop_parents.cjumps.push(cjump);
					}
				}
			}
		}


		//check pattern transform
		// TODO: compute this from json schema (json-schema-parser.mjs)
		const DYN_F64_LIST = [
			this.filedata.pattern_transform.playback_speed,
			this.filedata.pattern_transform.intensity_factor,
			this.filedata.pattern_transform.geometric_transforms.rotation,
			this.filedata.pattern_transform.geometric_transforms.scale.x,
			this.filedata.pattern_transform.geometric_transforms.scale.y,
			this.filedata.pattern_transform.geometric_transforms.scale.z,
			this.filedata.pattern_transform.geometric_transforms.translate.x,
			this.filedata.pattern_transform.geometric_transforms.translate.y,
			this.filedata.pattern_transform.geometric_transforms.translate.z,
		];

		for (const mah_dyn_f64 of DYN_F64_LIST) {
			if (mah_dyn_f64.type == "dynamic") {
				const param_name = mah_dyn_f64.value;
				const up_linked = get_up_linked_or_default(param_name);
				up_linked.items.pattern_transform = true;
				up_linked.prop_parents.dynf64.push(mah_dyn_f64);
			}
		}


		for (const keyframe of this.filedata.keyframes) {
			const mah_dyn_f64s = PARSED_JSON_SCHEMA.get_wanted_from_paths(keyframe, MAH_DYNAMIC_F64_PATHS, (mah_dyn_f64) => {
				return mah_dyn_f64 && (
					(mah_dyn_f64.type == "dynamic" && typeof mah_dyn_f64.value == "string") ||
					(mah_dyn_f64.type == "f64" && typeof mah_dyn_f64.value == "number")
				);
			});
			for (const mah_dyn_f64 of mah_dyn_f64s) {
				if (mah_dyn_f64.type == "dynamic") {
					const param_name = mah_dyn_f64.value;
					const up_linked = get_up_linked_or_default(param_name);
					up_linked.items.keyframes.push(keyframe);
					up_linked.prop_parents.dynf64.push(mah_dyn_f64);
				}
			}
		}


		return uparam_to_item_map;
	}

	rename_evaluator_user_param(old_name, new_name) {
		this.save_state();

		const value = this.evaluator_params.user_parameters.get(old_name);
		this.evaluator_params.user_parameters.delete(old_name);
		this.evaluator_params.user_parameters.set(new_name, value || 0);

		const up_linked = this.get_user_parameters_to_linked_map().get(old_name);
		if (!up_linked) throw new Error("no linked items found (should not happen)");
		for (const cj of up_linked.prop_parents.cjumps) {
			cj.condition.parameter = new_name;
		}
		for (const dynf64 of up_linked.prop_parents.dynf64) {
			dynf64.value = new_name;
		}
		const updated_keyframes = up_linked.items.keyframes;
		// just use geo_transform: true for now, since we don't keep track of which properties exactly change, and if they are geo transforms
		const pattern_transform = up_linked.items.pattern_transform ? { geo_transform: true } : undefined;

		this.commit_operation({ updated_keyframes, pattern_transform });

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


	async cut_selected_to_clipboard() {
		const selected_keyframes = [...this.selected_keyframes];
		await this.copy_selected_to_clipboard();
		this.save_state();
		const deleted_keyframes = this.delete_keyframes(selected_keyframes);
		this.commit_operation({ deleted_keyframes });
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
		this.deselect_all_items();
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
				if ("cjumps" in kf) {
					for (const cjump of kf.cjumps) {
						cjump.jump_to += paste_time_offset;
					}
				}
				console.log(kf.time);
				if ("coords" in kf) {
					kf.coords.coords.x += 5;
					kf.coords.coords.y += 5;
					kf.coords.coords = BoundsCheck.coords(kf.coords.coords);
				}
				return this.insert_new_keyframe(kf);
			});
			this.commit_operation({ new_keyframes, deleted_keyframes });
			this.select_items({ keyframes: new_keyframes });
		} catch (e) {
			alert("Could not find MidAirHapticsClipboardFormat data in clipboard");
			throw e;
		}
	}


	/**
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 */
	load_filedata_into_fe_format(filedata) {
		if (filedata.$DATA_FORMAT != "MidAirHapticsAnimationFileFormat") throw new Error(`incorrect $DATA_FORMAT ${filedata.$DATA_FORMAT} expected ${"MidAirHapticsAnimationFileFormat"}`);
		if (filedata.$REVISION != MAH_$REVISION) throw new Error(`incorrect revision ${filedata.$REVISION} expected ${MAH_$REVISION}`);
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

	export_file() {
		return new File([JSON.stringify(this.clone_filedata(), undefined, "\t")], this.filename, { type: "application/json" });
	}

	/**
	 * @param {string} filename
	 */
	update_filename(filename) {
		this.save_state();
		this.#_filename = filename;
		this.commit_operation({ rerender: true });
	}

	/**
	 * @param {File} file
	 */
	async import_file(file) {
		const filedata_text = await file.text();
		const filedataFE = this.load_filedata_into_fe_format(JSON.parse(filedata_text));
		this.save_state();
		this.#_filename = file.name;
		this.filedata = filedataFE;
		this.commit_operation({ rerender: true });
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
MAHPatternDesignFE.DEFAULT = ["untitled.json", {
	$DATA_FORMAT: "MidAirHapticsAnimationFileFormat",
	$REVISION: MAH_$REVISION,

	name: "untitled",

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
						value: { type: "f64", value: 1.00 }
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
						radius: { type: "f64", value: 1.0 },
						am_freq: { type: "f64", value: 0.0 },
					}
				},
				transition: {
					name: "linear",
					params: {}
				}
			},
			cjumps: [],
		}
	],

	pattern_transform: PatternEvaluator.default_pattern_transformation()
}];