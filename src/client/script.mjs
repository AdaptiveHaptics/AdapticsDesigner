import Split from "./thirdparty/split-grid.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));
const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */

const centerDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.main > div.center"));

/** @type {{filename: string, filedata: MidAirHapticsAnimationFileFormat }} */
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


function setupKonva() {
	const sceneWidth = 500;
	const sceneHeight = 500;

	const k_stage = new Konva.Stage({
		container: "patternstage",
		width: sceneWidth,
		height: sceneHeight,
	});
	const k_control_points_layer = new Konva.Layer();
	k_stage.add(k_control_points_layer);

	function create_control_point() {
		const k_cp_circle = new Konva.Circle({
			x: k_stage.width() / 2,
			y: k_stage.height() / 2,
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
		k_control_points_layer.add(k_cp_circle);
	}

	function fitStageIntoParentContainer() {
		const container = centerDiv;
		
		const scale = Math.min(container.offsetWidth / sceneWidth, container.offsetHeight / sceneHeight);
		// console.log(container.offsetWidth / sceneWidth, container.offsetHeight / sceneHeight, scale);

		k_stage.width(sceneWidth * scale);
		k_stage.height(sceneHeight * scale);
		k_stage.scale({ x: scale, y: scale });
	}

	fitStageIntoParentContainer();
	// adapt the stage on any window resize
	window.addEventListener("resize", ev => fitStageIntoParentContainer());
	onMainGridResizeListeners.push(ev => fitStageIntoParentContainer());

	create_control_point();
}
setupKonva();
