import Split from "../thirdparty/split-grid.mjs";
import { KonvaPatternStage } from "./konvapatternstage.mjs";
import { KonvaTimelineStage } from "./konvatimeline.mjs";
import { notnull } from "./util.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));

/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */
/** @typedef {import("../../shared/gui-types").StateChangeEventTarget} StateChangeEventTarget */
/** @typedef {import("../../shared/gui-types").StateEventMap} StateEventMap */
/** @typedef {import("../../shared/gui-types").MAHAnimationFileFormatFE} MAHAnimationFileFormatFE */

const mainsplitgridDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.mainsplitgrid"));
const centerDiv = /** @type {HTMLDivElement} */ (mainsplitgridDiv.querySelector("div.center"));
const timelineDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.timeline"));
const savedstateSpan = /** @type {HTMLSpanElement} */ (document.querySelector("span.savedstate"));

/**
 * @template {keyof StateEventMap} K
 */
export class StateChangeEvent extends CustomEvent {
	/**
	 * 
	 * @param {K} event 
	 * @param {CustomEventInit<StateEventMap[K]>} eventInitDict
	 */
	constructor(event, eventInitDict) {
		super(event, eventInitDict);
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
		
		
		this.filedata = this.load_filedata_into_fe_format(filedata);

		this.undo_states = undo_states;
		this.undo_states_size = undo_states_size;
		this.redo_states = redo_states;
		this.redo_states_size = redo_states_size;


		this.state_change_events = /** @type {StateChangeEventTarget} */ (new EventTarget());
	}



	/** @type {MidAirHapticsAnimationFileFormat[]} */
	undo_states = [];
	undo_states_size = 50;
	/** @type {MidAirHapticsAnimationFileFormat[]} */
	redo_states = [];
	redo_states_size = 50;

	// save_working_copy_to_localstorage_timer = null; #this is not atomic
	_commited = false;
	get commited() {
		return this._commited;
	}
	set commited(v) {
		savedstateSpan.textContent = v ? "saved to localstorage" : "pending change";
		this._commited = v;
	}

	save_state() {
		if (!this.commited) {
			alert("save_state before commit");
			throw new Error("save_state before commit");
		}
		this.commited = false;
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
		if (this.commited) {
			alert("commit_operation before save");
			throw new Error("commit_operation before save");
		}
		this.save_to_localstorage();
		this.commited = true;


		// it might be better to run everything through es6 proxies than trust we provide all modified objects, but im just gonna with this for now
		if (rerender) {
			const change_event = new StateChangeEvent("rerender", { detail: {} });
			this.state_change_events.dispatchEvent(change_event);
			return;
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
		if (deleted_keyframes) {
			for (const keyframe of deleted_keyframes) {
				const change_event = new StateChangeEvent("kf_delete", { detail: { keyframe } });
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
		this.commited = false;
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
		this.commited = false;
		this.commit_operation({ rerender: true });
		return true;
	}



	/**
	 * 
	 * @param {MAHKeyframeSet} set
	 * @returns 
	 */
	insert_new_keyframe(set) {
		const keyframe = MAHKeyframeFE.from_current_keyframes(this, set, this.get_sorted_keyframes());
		this.filedata.keyframes.push(keyframe);
		this.filedata.keyframes.sort();
		return keyframe;
	}

	
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
		/** @type {import("../../shared/types").MidAirHapticsClipboardFormat} */
		const clipboard_data = {
			$DATA_FORMAT: "MidAirHapticsClipboardFormat",
			$REVISION: "0.0.1-alpha.2",
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
			if (clipboard_parsed.$REVISION != "0.0.1-alpha.2") throw new Error(`incorrect revision ${clipboard_parsed.$REVISION} expected ${"0.0.1-alpha.2"}`);


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
				Object.keys(kf.coords).forEach(k => kf.coords[k] += 5);
				Object.keys(kf.coords).forEach(k => kf.coords[k] = Math.min(Math.max(kf.coords[k], 0), 500));
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
	 * @returns {MAHAnimationFileFormatFE}
	 */
	load_filedata_into_fe_format(filedata) {
		const keyframesFE = filedata.keyframes.map(kf => new MAHKeyframeFE(kf, this));
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
		filedata.$REVISION = "0.0.1-alpha.2";
		return filedata;
	}

	serialize() {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = this;
		filedata.$DATA_FORMAT = "MidAirHapticsAnimationFileFormat";
		filedata.$REVISION = "0.0.1-alpha.2";
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

/**
 * @implements {MAHKeyframe}
 */
export class MAHKeyframeFE {
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 * @param {MAHPatternDesignFE} pattern_design
	 */
	constructor(keyframe, pattern_design) {
		this._pattern_design = pattern_design;
		this._time = keyframe.time;
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.coords = keyframe.coords;
		this.transition = keyframe.transition;
	}

	get time() {
		return this._time;
	}
	set_time(t) {
		if (this._time == t) return;
		this._time = t;
		this._pattern_design.check_for_reorder(this);
	}
	
	/**
	 * @returns {MAHKeyframe}
	 */
	toJSON() {
		const { time, brush, intensity, coords, transition } = this;
		return { time, brush, intensity, coords, transition };
	}

	
	/**
	 * @typedef {Object} MAHKeyframeSetOptional
	 * @property {{ x: number, y: number, z: number }=} coords
	 * @property {number=} time
	 * @typedef {MAHKeyframeSetOptional | MAHKeyframeFE} MAHKeyframeSet
	 */
	/**
	 * 
	 * @param {MAHPatternDesignFE} pattern_design 
	 * @param {MAHKeyframeSet} set 
	 * @param {MAHKeyframeFE[]} current_keyframes_sorted
	 */
	static from_current_keyframes(pattern_design, set, current_keyframes_sorted) {
		let time;
		if (set.time == undefined) {
			time = pattern_design.linterp_next_timestamp();
		} else {
			time = set.time;
		}

		let next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > time);
		if (next_keyframe_index == -1) next_keyframe_index = current_keyframes_sorted.length;
		const secondprev_keyframe = /** @type {MAHKeyframeFE | undefined} */ (current_keyframes_sorted[next_keyframe_index-2]);
		const prev_keyframe = /** @type {MAHKeyframeFE | undefined} */ (current_keyframes_sorted[next_keyframe_index-1]);
		const next_keyframe = /** @type {MAHKeyframeFE | undefined} */ (current_keyframes_sorted[next_keyframe_index]);
		const secondnext_keyframe = /** @type {MAHKeyframeFE | undefined} */ (current_keyframes_sorted[next_keyframe_index+1]);

		let coords = { x: 0, y: 0, z: 0 };
		if (set.coords == undefined) {
			if (prev_keyframe && next_keyframe) {
				Object.keys(coords).forEach(k => coords[k] = (prev_keyframe.coords[k] + next_keyframe.coords[k])/2, 500);
			} else if (secondprev_keyframe && prev_keyframe) {
				Object.keys(coords).forEach(k => coords[k] = 2*prev_keyframe.coords[k] - secondprev_keyframe.coords[k], 500);
			} else if (secondnext_keyframe && next_keyframe) {
				Object.keys(coords).forEach(k => coords[k] = 2*next_keyframe.coords[k] - secondnext_keyframe.coords[k], 500);
			} else if (prev_keyframe) {
				Object.keys(coords).forEach(k => coords[k] = prev_keyframe.coords[k] + 5, 500);
			}
			Object.keys(coords).forEach(k => coords[k] = Math.min(Math.max(coords[k], 0), 500));
		} else {
			coords = set.coords;
		}
		const keyframe = new MAHKeyframeFE(window.structuredClone({ ...MAHKeyframeFE.default, ...next_keyframe?.toJSON(), ...prev_keyframe?.toJSON(), ...set, time, coords }), pattern_design);
		
		return keyframe;
	}
}
/** @type {MAHKeyframe} */
MAHKeyframeFE.default = {
	time: 0.000,
	coords: { x: 0, y: 0, z: 0, },
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
};


const _mainsplit = SplitGrid({
	columnGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.leftcenter")) },
		{ track: 3, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.centerright")) },
	],
	rowGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.topbottom")) },
	],
});
const _bottomsplit = SplitGrid({
	columnGutters: [
		{ track: 1, element: notnull(document.querySelector("div.bottom > div.gutter.column")) },
	],
});

document.addEventListener("keydown", ev => {
	if (ev.key == "/" || ev.key == "?") alert(`Help:
	ctrl+z to undo
	ctrl+shift+z to redo
	double click on the pattern canvas to create a new control point
	alt+click on a control point to delete it
	click and drag to select multiple
	ctrl+click or ctrl+click and drag to add to selection
	`);
	if (ev.key == "z" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		console.log("undo");
		if (primary_design.undo()) {
			//success
		} else {
			//do nothing
		}
	}
	if (ev.key == "Z" && ev.ctrlKey && ev.shiftKey && !ev.altKey) {
		console.log("redo");
		if (primary_design.redo()) {
			//success
		} else {
			//do nothing
		}
	}
	if (ev.key == "Delete" && !ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		console.log("delete");
		if (primary_design.selected_keyframes.size == 0) return;
		primary_design.save_state();
		const deleted_keyframes = primary_design.delete_keyframes([...primary_design.selected_keyframes]);
		primary_design.commit_operation({ deleted_keyframes });
	}
});

document.addEventListener("copy", _ev => {
	primary_design.copy_selected_to_clipboard();
});
document.addEventListener("paste", _ev => {
	primary_design.paste_clipboard(); 
});




const primary_design = MAHPatternDesignFE.load_from_localstorage() || new MAHPatternDesignFE("test.json", {
	$DATA_FORMAT: "MidAirHapticsAnimationFileFormat",
	$REVISION: "0.0.1-alpha.2",

	name: "test",

	direction: "normal",
	duration: 5 * 1000,
	iteration_count: 1,

	projection: "plane",
	update_rate: 1,

	keyframes: [
		{
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
});
primary_design.commit_operation({});
const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", centerDiv);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, "timelinestage", timelineDiv);

// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
// @ts-ignore
window.konva_timeline_stage = konva_timeline_stage;
// @ts-ignore
window.primary_design = primary_design;
