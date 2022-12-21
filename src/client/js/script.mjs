import Split from "../thirdparty/split-grid.mjs";
import { KonvaPatternStage } from "./konvapatternstage.mjs";
import { KonvaTimelineStage } from "./konvatimeline.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));
const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const mainsplitgridDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.mainsplitgrid"));
const centerDiv = /** @type {HTMLDivElement} */ (mainsplitgridDiv.querySelector("div.center"));
const timelineDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.timeline"));
/**
 * Assert Not Null
 * @template T
 * @param {T | null} t 
 * @returns {T}
 */
const notnull = t => { if (t) { return t; } else { throw new TypeError("Unexpected null"); } };

export class MAHPatternDesignFE {
	/**
	 * 
	 * @param {string} filename 
	 * @param {MidAirHapticsAnimationFileFormat} filedata 
	 */
	constructor(filename, filedata, undo_states = [], redo_states = [], undo_states_size = 50, redo_states_size = 50) {
		this.filename = filename;
		this.filedata = filedata;
		this.undo_states = undo_states;
		this.undo_states_size = undo_states_size;
		this.redo_states = redo_states;
		this.redo_states_size = redo_states_size;

		this.filedata.keyframes = this.filedata.keyframes.map(kf => new MAHKeyframeFE(kf));
	}



	undo_states = [];
	undo_states_size = 50;
	redo_states = [];
	redo_states_size = 50;

	// save_working_copy_to_localstorage_timer = null; #this is not atomic

	save_state() {
		this.redo_states.length = 0;
		this.undo_states.push(window.structuredClone(this.filedata));
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.save_to_localstorage();

		//# this is not atomic
		// if (this.save_working_copy_to_localstorage_timer) clearTimeout(this.save_working_copy_to_localstorage_timer);
		// setTimeout(() => this.save_to_localstorage(), 1800);
	}
	commit_operation() {
		this.save_to_localstorage();
	}

	undo() {
		if (this.undo_states.length == 0) return false;
		this.redo_states.push(window.structuredClone(this.filedata));
		if (this.redo_states.length > this.redo_states_size) this.redo_states.shift();
		this.filedata = this.undo_states.pop();
		return true;
	}

	redo() {
		if (this.redo_states.length == 0) return false;
		this.undo_states.push(window.structuredClone(this.filedata));
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();
		this.filedata = this.redo_states.pop();
		return true;
	}



	append_new_keyframe(x, y) {
		const last_keyframe = this.filedata.keyframes[this.filedata.keyframes.length - 1];
		const secondlast_keyframe = this.filedata.keyframes[this.filedata.keyframes.length - 2];
		const keyframe = new MAHKeyframeFE({ ...last_keyframe, coords: { x, y, z: 0 } });
		let add_to_time = 0;
		if (secondlast_keyframe) { // linterp
			add_to_time = last_keyframe.time - secondlast_keyframe.time;
		}
		if (last_keyframe) {
			keyframe.time += Math.max(add_to_time, 100);
		}
		this.filedata.keyframes.push(keyframe);
		return keyframe;
	}

	/**
	 * 
	 * @returns {MAHKeyframe | undefined}
	 */
	get_last_keyframe() {
		return this.filedata.keyframes[this.filedata.keyframes.length - 1];
	}
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 */
	get_keyframe_index(keyframe) {
		return this.filedata.keyframes.indexOf(keyframe);
	}
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 */
	delete_keyframe(keyframe) {
		const index = this.get_keyframe_index(keyframe);
		if (index == -1) throw new TypeError("keyframe not in array");
		return this.filedata.keyframes.splice(index, 1);
	}






	serialize() {
		return JSON.stringify(this);
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
	 */
	constructor({
		time = 0.000,
		coords = { x: 0, y: 0, z: 0, },
		intensity = {
			name: "Constant",
			params: {
				value: 1.00
			}
		},
		brush = {
			name: "Point",
			params: {
				size: 1.00
			}
		},
		transition = {
			name: "Linear",
			params: {}
		}
	}) {
		this.time = time;
		this.brush = brush;
		this.intensity = intensity;
		this.coords = coords;
		this.transition = transition;
	}
}


const primary_design = MAHPatternDesignFE.load_from_localstorage() || new MAHPatternDesignFE("test.json", {
	revision: "0.0.1-alpha.1",
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

const onMainGridResizeListeners = [];
onMainGridResizeListeners.push(ev => {
	// todo: maybe migrate to resize observer?
	centerDiv.dispatchEvent(new Event("resize"));
});
const mainsplit = SplitGrid({
	columnGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.leftcenter")) },
		{ track: 3, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.centerright")) },
	],
	rowGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.topbottom")) },
	],
	onDragEnd: (d, t) => { for (const l of onMainGridResizeListeners) l(d, t); }
});

document.addEventListener("keydown", ev => {
	if (ev.key == "/" || ev.key == "?") alert(`Help:
	ctrl+z to undo
	ctrl+shift+z to redo
	double click on the pattern canvas to create a new control point
	alt+click on a control point to delete it
	`);
	if (ev.key == "z" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		console.log("undo");
		if (primary_design.undo()) {
			konva_pattern_stage.render_design();
		} else {
			//do nothing
		}
	}
	if (ev.key == "Z" && ev.ctrlKey && ev.shiftKey && !ev.altKey) {
		console.log("redo");
		if (primary_design.redo()) {
			konva_pattern_stage.render_design();
		} else {
			//do nothing
		}
	}
});


const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", centerDiv);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, "timelinestage", timelineDiv);

// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
// @ts-ignore
window.konva_timeline_stage = konva_timeline_stage;
// @ts-ignore
window.primary_design = primary_design;
