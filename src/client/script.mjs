import Split from "./thirdparty/split-grid.mjs";
const splitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));

/** @typedef {import("../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */



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


splitGrid({
	columnGutters: [
		{ track: 1, element: document.querySelector("div.gutter.leftcenter") },
		{ track: 3, element: document.querySelector("div.gutter.centerright") },
	],
	rowGutters: [
		{ track: 1, element: document.querySelector("div.gutter.topbottom") },
	]
});

document.addEventListener("keydown", ev => {
	if (ev.key == "/" || ev.key == "?") alert("This is the help message for now");
});