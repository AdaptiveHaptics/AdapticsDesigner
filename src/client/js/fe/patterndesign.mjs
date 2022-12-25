/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */
/** @typedef {import("./keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** 
 * @template T
 * @template K
 * @typedef {import("../../../shared/util").ReqProp<T, K>} ReqProp
 */

import { create_correct_keyframefe_wrapper, MAHKeyframePauseFE, MAHKeyframeStandardFE } from "./keyframes/index.mjs";

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
		this.state_change_events.addEventListener("rerender", ev => console.log(ev));
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
	 * 
	 * @param {Partial<MAHKeyframe> & Pick<MAHKeyframe, "type">} set
	 * @returns 
	 */
	insert_new_keyframe(set) {
		let keyframe;
		switch (set.type) {
			case "standard": { keyframe = MAHKeyframeStandardFE.from_current_keyframes(this, set); break; }
			case "pause": { keyframe = MAHKeyframePauseFE.from_current_keyframes(this, set); break; }
			// @ts-ignore
			default: throw new TypeError(`Unknown keyframe type '${keyframe.type}'`);
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
	 * 
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


	async copy_selected_to_clipboard() {
		/** @type {MidAirHapticsClipboardFormat} */
		const clipboard_data = {
			$DATA_FORMAT: "MidAirHapticsClipboardFormat",
			$REVISION: "0.0.1-alpha.3",
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
			if (clipboard_parsed.$REVISION != "0.0.1-alpha.3") throw new Error(`incorrect revision ${clipboard_parsed.$REVISION} expected ${"0.0.1-alpha.2"}`);


			// I was gonna do a more complicated "ghost" behaviour
			// but google slides just drops the new objects at an offset
			this.deselect_all_keyframes();
			this.save_state();
			clipboard_parsed.keyframes.sort();

			const paste_time_offset = this.linterp_next_timestamp() - (clipboard_parsed.keyframes[0]?.time || 0);
			console.log(paste_time_offset);

			const new_keyframes = clipboard_parsed.keyframes.map(kf => {
				console.log(kf.time);
				kf.time += paste_time_offset;
				console.log(kf.time);
				if ("coords" in kf) {
					Object.keys(kf.coords).forEach(k => kf.coords[k] += 5);
					Object.keys(kf.coords).forEach(k => kf.coords[k] = Math.min(Math.max(kf.coords[k], 0), 500));
				}
				return this.insert_new_keyframe(kf);
			});
			this.commit_operation({ new_keyframes });
			this.select_keyframes(new_keyframes);
		} catch (e) {
			alert("Could not find MidAirHapticsClipboardFormat data in clipboard");
			throw e;
		}
	}

	/**
	 * 
	 * @returns {number} timestamp for next keyframe
	 */
	linterp_next_timestamp() {
		const last_keyframe = this.get_last_keyframe();
		const secondlast_keyframe = this.get_secondlast_keyframe();
		if (last_keyframe) { // linterp
			if (secondlast_keyframe) {
				return 2 * last_keyframe.time - secondlast_keyframe.time;
			} else {
				return last_keyframe.time + 500;
			}
		} else {
			return 0;
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
		filedata.$REVISION = "0.0.1-alpha.3";
		return filedata;
	}

	serialize() {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = this;
		filedata.$DATA_FORMAT = "MidAirHapticsAnimationFileFormat";
		filedata.$REVISION = "0.0.1-alpha.3";
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
		if (filedata.$REVISION != "0.0.1-alpha.3") throw new Error(`incorrect revision ${filedata.$REVISION} expected ${"0.0.1-alpha.3"}`);
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
	$REVISION: "0.0.1-alpha.3",

	name: "test",

	direction: "normal",
	duration: 5 * 1000,
	iteration_count: 1,

	projection: "plane",
	update_rate: 1,

	keyframes: [
		{
			type: "standard",
			time: 0.000,
			coords: {
				x: 250,
				y: 250,
				z: 0,
			},
			intensity: {
				name: "Constant",
				params: {
					value: 1.00
				}
			},
			brush: {
				name: "Point",
				params: {
					size: 1.00
				}
			},
			transition: {
				name: "Linear",
				params: {}
			}
		}
	]
}];