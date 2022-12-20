import Split from "../thirdparty/split-grid.mjs";
import { KonvaPatternStage } from "./konvapatternstage.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));
const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const centerDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.main > div.center"));

export class MAHPatternDesignFE {
	/**
	 * 
	 * @param {string} filename 
	 * @param {MidAirHapticsAnimationFileFormat} filedata 
	 */
	constructor(filename, filedata) {
		this.filename = filename;
		this.filedata = filedata;

		this.filedata.keyframes = this.filedata.keyframes.map(kf => new MAHKeyframeFE(kf));
	}

	append_new_keyframe(x, y) {
		const last_keyframe = this.filedata.keyframes[this.filedata.keyframes.length - 1];
		const secondlast_keyframe = this.filedata.keyframes[this.filedata.keyframes.length - 2];
		const keyframe = new MAHKeyframeFE({...last_keyframe, coords: { x, y, z: 0 }});
		if (secondlast_keyframe) { // linterp
			keyframe.time += last_keyframe.time-secondlast_keyframe.time;
		}
		this.filedata.keyframes.push(keyframe);
		return keyframe;
	}

	/**
	 * 
	 * @returns {MAHKeyframe | undefined}
	 */
	getLastKeyframe() {
		return this.filedata.keyframes[this.filedata.keyframes.length - 1];
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
	constructor(keyframe = {
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
	}) {
		this.time = keyframe.time;
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.coords = keyframe.coords;
		this.transition = keyframe.transition;
	}
}


const primary_design = new MAHPatternDesignFE("test.json", {
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
				x: 0,
				y: 0,
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
		{ track: 1, element: document.querySelector("div.gutter.leftcenter") },
		{ track: 3, element: document.querySelector("div.gutter.centerright") },
	],
	rowGutters: [
		{ track: 1, element: document.querySelector("div.gutter.topbottom") },
	],
	onDragEnd: (d, t) => { for (const l of onMainGridResizeListeners) l(d, t); }
});

document.addEventListener("keydown", ev => {
	if (ev.key == "/" || ev.key == "?") alert("This is the help message for now");
});


const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", centerDiv);

// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
// @ts-ignore
window.primary_design = primary_design;
