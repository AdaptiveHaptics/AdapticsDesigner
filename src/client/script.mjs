import Split from "./thirdparty/split-grid.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));
const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../shared/types").MAHKeyframe} MAHKeyframe */

const centerDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.main > div.center"));

/** @typedef {{filename: string, filedata: MidAirHapticsAnimationFileFormat }} MAHCurrentDesign */
/** @type {MAHCurrentDesign} */
const current_design = {
	filename: "",
	filedata: {
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
						value: 0.75000
					}
				},
				brush: {
					name: "Point",
					params: {
						size: 1
					}
				},
				transition: {
					name: "Linear",
					params: {}
				}
			}
		]
	}
};


const onMainGridResizeListeners = [];
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



class KonvaPatternStage {

	sceneWidth = 500;
	sceneHeight = 500;

	/**
	 * 
	 * @param {MAHCurrentDesign} current_design 
	 */
	constructor(current_design) {

		this.current_design = current_design;

		this.k_stage = new Konva.Stage({
			container: "patternstage",
			width: this.sceneWidth,
			height: this.sceneHeight,
		});

		this.k_control_points_layer = new Konva.Layer();
		this.k_stage.add(this.k_control_points_layer);

		this.k_stage.on("dblclick", ev => {
			const {x ,y} = this.k_stage.getRelativePointerPosition();
			this.create_keyframe_control_point(x, y);
		});


		// adapt the stage on any window resize
		window.addEventListener("resize", ev => this.fitStageIntoParentContainer());
		onMainGridResizeListeners.push(ev => this.fitStageIntoParentContainer());
		this.fitStageIntoParentContainer();


		this.render_design();
	}

	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 */
	create_keyframe_control_point(keyframe) {
		const k_cp_circle = new Konva.Circle({
			x: keyframe.coords.x,
			y: keyframe.coords.y,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		k_cp_circle.addEventListener("mouseenter", ev => {
			document.body.style.cursor = "pointer";
		});
		k_cp_circle.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "default";
		});
		k_cp_circle.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "default";
		});
		this.k_control_points_layer.add(k_cp_circle);
	}

	fitStageIntoParentContainer() {
		const container = centerDiv;
		
		const scale = Math.min(container.offsetWidth / this.sceneWidth, container.offsetHeight / this.sceneHeight);
		// console.log(container.offsetWidth / sceneWidth, container.offsetHeight / sceneHeight, scale);

		this.k_stage.width(this.sceneWidth * scale);
		this.k_stage.height(this.sceneHeight * scale);
		this.k_stage.scale({ x: scale, y: scale });
	}

	render_design() {
		const keyframes = this.current_design.filedata.keyframes;
		// render control points
		for (const keyframe of keyframes) {
			this.create_keyframe_control_point(keyframe.coords.x, keyframe.coords.y);
		}
		//render path interp
		for (let i=0; i < keyframes.length && i+1 < keyframes.length; i++) {
			const curr_kf = keyframes[i];
			const next_kf = keyframes[i+1];

			//todo
		}

	}
}
const konva_pattern_stage = new KonvaPatternStage(current_design);
// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
