/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */
/** @typedef {import("../../../shared/types").PatternTransformation} PatternTransformation */
/** @typedef {import("../../../shared/types").ConditionalJump} ConditionalJump */
/** @typedef {import("../../../shared/types").ATFormula} ATFormula */
/** @typedef {import("../../../shared/types").MAHUserParameterDefinition} MAHUserParameterDefinition */
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
const MAH_$REVISION = "0.1.0-alpha.2";

/**
 * @typedef {{
 *   items: { keyframes: MAHKeyframeFE[], pattern_transform: boolean },
 *   prop_parents: { cjumps: ConditionalJump[], dynf64: MAHDynamicF64[] },
 *   cjump_to_kf_map: Map<ConditionalJump, MAHKeyframeFE>,
 * 	 unused: boolean,
 * }} UserParamLinked
 */

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
 * @property {{ keyframes: MAHKeyframeFE[], cjump_flags: KonvaCJumpFlag[] }} item_select_batch
 * @property {{ keyframe: MAHKeyframeFE, cjump_flag: undefined } | { keyframe: undefined, cjump_flag: KonvaCJumpFlag }} item_deselect
 * @property {{ keyframes: MAHKeyframeFE[], cjump_flags: KonvaCJumpFlag[] }} item_deselect_batch
 * @property {{ keyframe: MAHKeyframeFE }} kf_reorder
 * @property {{ committed: boolean }} commit_update
 * @property {{ }} playback_update
 * @property {{ time: boolean }} parameters_update
 * @property {{ }} playstart_update
 * @property {{ geo_transform: boolean }} pattern_transform_update
 * @property {{ user_param_definitions: string[] }} user_param_definitions_update
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

/**
 * @returns {PatternEvaluatorParameters}
 */
function default_eval_params() {
	return { time: 0, user_parameters: new Map(), geometric_transform: PatternEvaluator.default_geo_transform_matrix() };
}

/** @typedef {((serialized: string) => void) | null} SaveSerializedDesignFEStateFN */

export class MAHPatternDesignFE {
	#_filename; get filename() { return this.#_filename; }
	/** @type {string | null} */
	#_last_used_user_param = null; get last_used_user_param() { return this.#_last_used_user_param; } set last_used_user_param(v) { this.#_last_used_user_param = v; }

	#_tracking = false; get tracking() { return this.#_tracking; }

	/**
	 *
	 * @param {string} filename
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 * @param {SaveSerializedDesignFEStateFN} save_design_fe_state
	 */
	constructor(filename, filedata, save_design_fe_state, undo_states = [], redo_states = [], undo_states_size = 50, redo_states_size = 50) {
		this.#_filename = filename;

		this.save_design_fe_state = save_design_fe_state == null ? () => {} : () => save_design_fe_state(this.serialize());

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
		this.evaluator_params = default_eval_params();
		this.apply_user_param_definitions();
		/** @type {NextEvalParams} */
		this.evaluator_next_eval_params = PatternEvaluator.default_next_eval_params();
		this.pattern_evaluator = new PatternEvaluator(this.filedata);
		this.state_change_events.addEventListener("commit_update", ev => {
			if (ev.detail.committed) {
				this.pattern_evaluator?.free();
				this.pattern_evaluator = new PatternEvaluator(this.filedata);
				this.websocket?.update_pattern(this.filedata);
				this.#_eval_pattern();
			}
		});
		this.state_change_events.addEventListener("parameters_update", ev => {
			if (!ev.detail.time) { // dont send time updates
				this.websocket?.update_parameters(this.evaluator_params);
			}
			if (!this.websocket?.is_connected() || !this.is_playing()) { //eval if websocket not connected, or not playing (cause websocket wont send update back if not playing)
				this.#_eval_pattern();
			}
		});
		this.state_change_events.addEventListener("playstart_update", _ => {
			this.websocket?.update_playstart(this.#_playstart_timestamp);
			if (this.is_playing()) {
				this.#_tick_playback();
			}
		});
		this.state_change_events.addEventListener("rerender", _ => {
			if (this.websocket) this.#_full_update_websocket(this.websocket);
		});
		this.state_change_events.addEventListener("playback_update", _ => {
			if (this.last_eval[0].stop && this.is_playing()) {
				this.update_playstart(0);
				this.update_pattern_time(this.last_eval[0].pattern_time); // force eval again if stopped playing (because playback (websocket) will just show dot @ stop point, but we want to see whole brush)
			}
		});
		this.state_change_events.addEventListener("user_param_definitions_update", ev => {
			this.apply_user_param_definitions();
			const lastused_user_param = ev.detail.user_param_definitions.find(p => this.filedata.user_parameter_definitions[p] !== undefined); //find param that wasnt deleted
			if (lastused_user_param) {
				this.#_last_used_user_param = lastused_user_param;
			} else if (this.#_last_used_user_param && this.filedata.user_parameter_definitions[this.#_last_used_user_param] === undefined) {
				this.#_last_used_user_param = null;
			}
		});

		this.last_eval = this.#_eval_pattern(); //set in constructor for typecheck
	}



	/** @type {{ filename: string, filedata: MidAirHapticsAnimationFileFormat }[]} */
	undo_states = [];
	undo_states_size = 50;
	/** @type {{ filename: string, filedata: MidAirHapticsAnimationFileFormat }[]} */
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

	#_create_undo_redo_state() {
		return {
			filename: this.filename,
			filedata: this.clone_filedata(),
		};
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
		this.undo_states.push(this.#_create_undo_redo_state());
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.save_design_fe_state();
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
	 *  user_param_definitions?: string[],
	 * }} param0
	 */
	commit_operation({ rerender, pattern_transform, new_keyframes, updated_keyframes, deleted_keyframes, user_param_definitions }) {
		if (this.committed) {
			alert("commit_operation before save");
			throw new Error("commit_operation before save");
		}
		this.save_design_fe_state();
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

		if (user_param_definitions) {
			const change_event = new StateChangeEvent("user_param_definitions_update", { detail: { user_param_definitions } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}

	undo() {
		return this.#_undo_redo(false);
	}

	redo() {
		return this.#_undo_redo(true);
	}

	#_undo_redo(redo = false) {
		const u_states_take = redo ? this.redo_states : this.undo_states;
		const u_states_push = redo ? this.undo_states : this.redo_states;
		const u_states_push_max_len = redo ? this.undo_states_size : this.redo_states_size;
		const u_state = u_states_take.pop();
		if (u_state == null) return false;

		u_states_push.push(this.#_create_undo_redo_state());
		if (u_states_push.length > u_states_push_max_len) u_states_push.shift();

		this.deselect_all_items({ no_emit: true });
		this.filedata = this.load_filedata_into_fe_format(u_state.filedata); //could fail to due to incorrect data structure revision
		this.#_filename = u_state.filename;
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

		const change_event = new StateChangeEvent("item_select_batch", { detail: { keyframes, cjump_flags } });
		this.state_change_events.dispatchEvent(change_event);
	}
	/**
	 *
	 * @param {SelectItemsStruct} param0
	 */
	deselect_items({ keyframes = [], cjump_flags = [] }, { no_emit = false } = {}) {
		for (const keyframe of keyframes) {
			this.selected_keyframes.delete(keyframe);
			if (!no_emit) {
				const change_event = new StateChangeEvent("item_deselect", { detail: { keyframe, cjump_flag: undefined } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
		for (const cjump_flag of cjump_flags) {
			this.selected_cjump_flags.delete(cjump_flag);
			if (!no_emit) {
				const change_event = new StateChangeEvent("item_deselect", { detail: { keyframe: undefined, cjump_flag } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}

		const change_event = new StateChangeEvent("item_deselect_batch", { detail: { keyframes, cjump_flags } });
		this.state_change_events.dispatchEvent(change_event);
	}
	select_all_keyframes() {
		this.select_items({ keyframes: this.filedata.keyframes });
	}
	deselect_all_items({ no_emit = false } = {}) {
		this.deselect_items({ keyframes: [...this.selected_keyframes], cjump_flags: [...this.selected_cjump_flags] }, { no_emit });
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
	 *
	 * @param {string} param
	 * @param {number=} value
	 * @returns
	 */
	#_clamp_user_param(param, value) {
		const def = this.filedata.user_parameter_definitions[param];
		if (!def) throw new TypeError("undefined user parameter");
		const clamped_value = Math.max((def.min ?? -Infinity), Math.min((def.max ?? Infinity), value ?? def.default));
		return clamped_value;
	}
	/**
	 * @param {string} param
	 * @param {number} value
	 */
	update_evaluator_user_params(param, value) {
		this.evaluator_params.user_parameters.set(param, this.#_clamp_user_param(param, value));
		const ce = new StateChangeEvent("parameters_update", { detail: { time: false } });
		this.state_change_events.dispatchEvent(ce);
	}
	reset_user_parameters() {
		for (const [param, def] of Object.entries(this.filedata.user_parameter_definitions)) {
			this.evaluator_params.user_parameters.set(param, def.default);
		}
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

	/**
	 *
	 * @param {string} param_name
	 * @param {MAHUserParameterDefinition} param_def
	 */
	update_user_param_definition(param_name, param_def) {
		this.save_state();
		this.filedata.user_parameter_definitions[param_name] = param_def;
		this.commit_operation({ user_param_definitions: [param_name] });
	}


	/**
	 * @param {MAHKeyframe} keyframe
	 * @return {MAHDynamicF64[]}
	 */
	get_dynf64_from_keyframe(keyframe) {
		/** @type {(mah_dyn_f64: MAHDynamicF64 | null) => boolean} */
		const verify_mah_dynamic_f64 = (mah_dyn_f64) => {
			if (!mah_dyn_f64) return false;
			switch (mah_dyn_f64.type) {
				case "param": return typeof mah_dyn_f64.value == "string";
				case "f64": return typeof mah_dyn_f64.value == "number";
				case "formula": return typeof mah_dyn_f64.value == "object";
				default: try { assert_unreachable(mah_dyn_f64); } catch (e) { return false; }
			}
		};
		return PARSED_JSON_SCHEMA.get_wanted_from_paths(keyframe, MAH_DYNAMIC_F64_PATHS, verify_mah_dynamic_f64);
	}

	/**
	 *
	 * @param {ATFormula} at_formula
	 * @returns
	 */
	#_get_params_from_at_formula(at_formula) {
		/** @type {Set<string>} */
		const param_name_set = new Set();
		/** @type {Set<ATFormula>} */
		const parameter_atf_set = new Set();
		this.#_get_params_from_at_formula_internal(at_formula, param_name_set, parameter_atf_set);
		return { param_name_set, parameter_atf_set };
	}
	/**
	 *
	 * @param {ATFormula} at_formula
	 * @param {Set<string>} param_name_set
	 * @param {Set<ATFormula>} parameter_atf_set
	 */
	#_get_params_from_at_formula_internal(at_formula, param_name_set, parameter_atf_set) {
		switch (at_formula.type) {
			case "constant": break;
			case "parameter": {
				param_name_set.add(at_formula.value);
				parameter_atf_set.add(at_formula);
				break;
			}
			case "add": case "subtract": case "multiply": case "divide": {
				this.#_get_params_from_at_formula_internal(at_formula.value[0], param_name_set, parameter_atf_set);
				this.#_get_params_from_at_formula_internal(at_formula.value[1], param_name_set, parameter_atf_set);
				break;
			}
			default: assert_unreachable(at_formula);
		}
	}
	/**
	 *
	 * @param {MAHDynamicF64} mah_dyn_f64
	 * @returns {string[]}
	 */
	get_params_from_dynf64(mah_dyn_f64) {
		switch (mah_dyn_f64.type) {
			case "param": {
				const param_name = mah_dyn_f64.value;
				return [param_name];
			}
			case "f64": return [];
			case "formula": {
				const at_formula = mah_dyn_f64.value;
				const { param_name_set } = this.#_get_params_from_at_formula(at_formula);
				return [...param_name_set];
			}
			default: assert_unreachable(mah_dyn_f64);
		}
	}

	get_user_parameters_to_linked_map() {
		/** @type {Map<string, UserParamLinked>} */
		const uparam_to_linked_map = new Map();
		const get_up_linked_or_default = (param_name) => {
			const up_linked = uparam_to_linked_map.get(param_name);
			if (up_linked) return up_linked;

			/** @type {UserParamLinked} */
			const new_up_linked = {
				items: { keyframes: [], pattern_transform: false },
				prop_parents: { cjumps: [], dynf64: [] },
				cjump_to_kf_map: new Map(),
				unused: true,
			};
			uparam_to_linked_map.set(param_name, new_up_linked);
			return new_up_linked;
		};


		// check cjumps
		for (const keyframe of this.filedata.keyframes) {
			if ("cjumps" in keyframe) {
				for (const cjump of keyframe.cjumps) {
					const param_name = cjump.condition.parameter;
					if (param_name) {
						const up_linked = get_up_linked_or_default(param_name);
						up_linked.items.keyframes.push(keyframe);
						up_linked.prop_parents.cjumps.push(cjump);
						up_linked.cjump_to_kf_map.set(cjump, keyframe);
					}
				}
			}
		}


		//check pattern transform
		// TODO: compute this from json schema (json-schema-parser.mjs)
		const PATTERN_TRANSFORM_DYN_F64_LIST = [
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

		for (const mah_dyn_f64 of PATTERN_TRANSFORM_DYN_F64_LIST) {
			const params = this.get_params_from_dynf64(mah_dyn_f64);
			for (const param_name of params) {
				const up_linked = get_up_linked_or_default(param_name);
				up_linked.items.pattern_transform = true;
				up_linked.prop_parents.dynf64.push(mah_dyn_f64);
			}
		}


		for (const keyframe of this.filedata.keyframes) {
			const mah_dyn_f64s = this.get_dynf64_from_keyframe(keyframe);
			for (const mah_dyn_f64 of mah_dyn_f64s) {
				const params = this.get_params_from_dynf64(mah_dyn_f64);
				for (const param_name of params) {
					const up_linked = get_up_linked_or_default(param_name);
					up_linked.items.keyframes.push(keyframe);
					up_linked.prop_parents.dynf64.push(mah_dyn_f64);
				}
			}
		}


		{ // create_user_param_definitions_for_orphans
			for (const [uparam_name, _up_linked] of uparam_to_linked_map) {
				if (this.filedata.user_parameter_definitions[uparam_name]) continue;
				// does not necessarily need a commit, as this doesnt actually change execution, simply explicity defines the defaults used by the evaluator
				// performing a commit here, and therefore emitting user_param_definitions_update may cause infinite recursion
				// feels kinda fragile, maybe fix later
				this.filedata.user_parameter_definitions[uparam_name] = {
					default: 0,
					min: -Infinity,
					max: Infinity,
					step: 0.05,
				};
			}
		}
		{ // mark used
			for (const [_uparam_name, up_linked] of uparam_to_linked_map) {
				up_linked.unused = false;
			}
		}


		//add unused user parameters to uparam map
		for (const [uparam_name, _uparam_def] of Object.entries(this.filedata.user_parameter_definitions)) {
			get_up_linked_or_default(uparam_name);
		}

		return uparam_to_linked_map;
	}

	/**
	 *
	 * @param {string} old_name
	 * @returns {boolean}
	 */
	delete_user_param(old_name) {
		return this.#_rename_or_delete_user_param(old_name);
	}
	/**
	 *
	 * @param {string} old_name
	 * @param {string} new_name
	 * @returns {boolean}
	 */
	rename_user_param(old_name, new_name) {
		return this.#_rename_or_delete_user_param(old_name, new_name);
	}

	/**
	 * Omit new_name to delete the parameter
	 *
	 * @param {string} old_name
	 * @param {string=} new_name
	 * @returns {boolean}
	 */
	#_rename_or_delete_user_param(old_name, new_name) {
		const up_linked = this.get_user_parameters_to_linked_map().get(old_name);
		const old_value = this.evaluator_params.user_parameters.get(old_name);

		if (!new_name && up_linked && up_linked.prop_parents.cjumps.length > 0) {
			const confirmation = confirm(`The parameter "${old_name}" is still used in ${up_linked?.prop_parents.cjumps.length} conditional jump(s).\nAre you sure you want to delete the parameter?\nDeleting the parameter will also delete the linked conditional jumps.`);
			if (!confirmation) return false;
		}
		if (new_name && this.filedata.user_parameter_definitions[new_name]) {
			const confirmation = confirm(`The parameter "${new_name}" already exists.\nAre you sure you want to overwrite it?`);
			if (!confirmation) return false;
		}

		this.save_state();

		if (new_name) this.filedata.user_parameter_definitions[new_name] = this.filedata.user_parameter_definitions[old_name];
		delete this.filedata.user_parameter_definitions[old_name];

		this.evaluator_params.user_parameters.delete(old_name);
		if (new_name) this.evaluator_params.user_parameters.set(new_name, old_value || 0);

		if (up_linked) {
			if (new_name) { //rename at usage
				for (const cj of up_linked.prop_parents.cjumps) {
					cj.condition.parameter = new_name;
				}
				for (const dynf64 of up_linked.prop_parents.dynf64) {
					switch (dynf64.type) {
						case "f64": throw new Error("unreachable");
						case "param": dynf64.value = new_name; break;
						case "formula": {
							const { parameter_atf_set } = this.#_get_params_from_at_formula(dynf64.value);
							for (const atf of parameter_atf_set) {
								if (atf.type == "parameter") atf.value = new_name;
								else throw new Error("unreachable");
							}
							break;
						}
						default: assert_unreachable(dynf64);
					}
				}
			} else { //delete at usage
				for (const cj of up_linked.prop_parents.cjumps) {
					const kf = up_linked.cjump_to_kf_map.get(cj);
					if (kf && "cjumps" in kf) {
						kf.cjumps = kf.cjumps.filter((cj_f) => cj_f != cj);
					} else throw new Error("bad cjump->kf map");
				}
				for (const dynf64 of up_linked.prop_parents.dynf64) {
					switch (dynf64.type) {
						case "f64": throw new Error("unreachable");
						case "param": {
							const dynf64_cast = /** @type {MAHDynamicF64} */ (dynf64);
							dynf64_cast.type = "f64";
							dynf64_cast.value = old_value || 0;
							break;
						}
						case "formula": {
							const { parameter_atf_set } = this.#_get_params_from_at_formula(dynf64.value);
							for (const atf of parameter_atf_set) {
								if (atf.type == "parameter") {
									const atf_cast = /** @type {ATFormula} */ (atf);
									atf_cast.type = "constant";
									atf_cast.value = old_value || 0;
								}
								else throw new Error("unreachable");
							}
							break;
						}
						default: assert_unreachable(dynf64);
					}
				}
			}
		}

		const updated_keyframes = up_linked?.items.keyframes || [];
		// just use geo_transform: true for now, since we don't keep track of which properties exactly change, and if they are geo transforms
		const pattern_transform = up_linked?.items.pattern_transform ? { geo_transform: true } : undefined;
		const user_param_definitions = new_name ? [new_name, old_name] : [old_name];

		this.commit_operation({ updated_keyframes, pattern_transform, user_param_definitions });

		const ce = new StateChangeEvent("parameters_update", { detail: { time: false } });
		this.state_change_events.dispatchEvent(ce);

		return true;
	}

	apply_user_param_definitions() {
		//apply this.filedata.user_parameter_definitions constraints
		for (const [param_name, _param_def] of Object.entries(this.filedata.user_parameter_definitions)) {
			const param_value = this.evaluator_params.user_parameters.get(param_name);
			const new_value = this.#_clamp_user_param(param_name, param_value);
			if (param_value != new_value) {
				this.update_evaluator_user_params(param_name, new_value);
			}
		}
	}

	/**
	 *
	 * @param {MAHDynamicF64} dynf64
	 * @returns {number}
	 */
	resolve_dynamic_f64(dynf64) {
		//if (dynf64.type == "f64") return dynf64.value; // fast path for static values # enable this if slow
		return PatternEvaluator.dynf64_to_f64(dynf64, this.evaluator_params.user_parameters, this.filedata.user_parameter_definitions);
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
	 * @param {boolean} tracking
	 */
	update_tracking(tracking) {
		this.#_tracking = tracking;
		this.websocket?.update_tracking(tracking);
	}

	/**
	 *
	 * @param {string | URL} url
	 */
	connect_websocket(url) {
		if (this.websocket) this.websocket.destroy();
		const websocket = new DeviceWSController(url);
		websocket.state_change_events.addEventListener("connected", _ev => {
			this.#_full_update_websocket(websocket);
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
	/**
	 *
	 * @param {DeviceWSController} websocket
	 */
	#_full_update_websocket(websocket) {
		// we cant send next_eval_params (atm), so we pause and start playback again at correct timestamp. this seems to work better logically in some cases
		const was_playing = this.is_playing();
		this.update_playstart(0); // stop playback first, in case something is playing
		this.update_pattern_time(this.last_eval[0]?.pattern_time ?? 0); // start at last pattern time
		websocket.update_pattern(this.filedata);
		websocket.update_parameters(this.evaluator_params);
		websocket.update_tracking(this.#_tracking);
		if (was_playing) this.update_playstart(Date.now() - this.evaluator_params.time);
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
		const copied_keyframes = [...this.selected_keyframes];

		/** @type {Set<string>} */
		const copied_parameters = new Set(copied_keyframes.flatMap(keyframe =>
			this.get_dynf64_from_keyframe(keyframe).map(df64 => this.get_params_from_dynf64(df64)).flat()
		));
		const copied_param_defs = Object.fromEntries(
			[...copied_parameters].map(param_name => [param_name, this.filedata.user_parameter_definitions[param_name]])
		);

		/** @type {MidAirHapticsClipboardFormat} */
		const clipboard_data = {
			$DATA_FORMAT: "MidAirHapticsClipboardFormat",
			$REVISION: MAH_$REVISION,
			keyframes: copied_keyframes,
			user_parameter_definitions: copied_param_defs,
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
				// console.log(kf.time);
				kf.time += paste_time_offset;
				if ("cjumps" in kf) {
					for (const cjump of kf.cjumps) {
						cjump.jump_to += paste_time_offset;
					}
				}
				// console.log(kf.time);
				if ("coords" in kf) {
					kf.coords.coords.x += 5;
					kf.coords.coords.y += 5;
					kf.coords.coords = BoundsCheck.coords(kf.coords.coords);
				}
				return this.insert_new_keyframe(kf);
			});

			//merge user_parameter_definitions
			for (const [param_name, param_def] of Object.entries(clipboard_parsed.user_parameter_definitions)) {
				if (param_name in this.filedata.user_parameter_definitions) continue;
				this.filedata.user_parameter_definitions[param_name] = param_def;
			}

			this.commit_operation({ new_keyframes, deleted_keyframes, user_param_definitions: Object.keys(clipboard_parsed.user_parameter_definitions) });
			this.select_items({ keyframes: new_keyframes });
		} catch (e) {
			alert("Could not find MidAirHapticsClipboardFormat data in clipboard");
			throw e;
		}
	}


	/**
	 * @param {MidAirHapticsAnimationFileFormat} filedata_raw
	 */
	load_filedata_into_fe_format(filedata_raw) {
		if (filedata_raw.$DATA_FORMAT != "MidAirHapticsAnimationFileFormat") throw new Error(`incorrect $DATA_FORMAT ${filedata_raw.$DATA_FORMAT} expected ${"MidAirHapticsAnimationFileFormat"}`);

		//if (filedata.$REVISION != MAH_$REVISION) throw new Error(`incorrect revision ${filedata.$REVISION} expected ${MAH_$REVISION}`);
		const filedata = PatternEvaluator.try_parse_into_latest_version(filedata_raw); // verify valid or convertible version of filedata, return converted

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
		const filedata = JSON.parse(filedata_text);
		this.import_file_from_filedata(filedata, file.name);
	}
	/**
	 *
	 * @param {MidAirHapticsAnimationFileFormat} filedata
	 * @param {string} filename
	 * @returns
	 */
	import_file_from_filedata(filedata, filename) {
		const filedataFE = this.load_filedata_into_fe_format(filedata);
		this.deselect_all_items({ no_emit: true });
		this.update_playstart(0);
		this.evaluator_params = default_eval_params();
		this.evaluator_next_eval_params = PatternEvaluator.default_next_eval_params();
		this.save_state();
		this.#_filename = filename;
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
	 * @param {SaveSerializedDesignFEStateFN} save_func
	 * @returns {MAHPatternDesignFE}
	 */
	static deserialize(json_str, save_func) {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = /** @type {MAHPatternDesignFE} */(JSON.parse(json_str));
		return new MAHPatternDesignFE(filename, filedata, save_func, undo_states, redo_states, undo_states_size, redo_states_size);
	}
}

/** @type {[string, MidAirHapticsAnimationFileFormat]} */
MAHPatternDesignFE.DEFAULT = ["untitled.adaptics", {
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
						radius: { type: "f64", value: 10.0 },
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

	pattern_transform: PatternEvaluator.default_pattern_transformation(),

	user_parameter_definitions: {}
}];