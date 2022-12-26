import Split from "../thirdparty/split-grid.mjs";
import { MAHPatternDesignFE } from "./fe/patterndesign.mjs";
import { KonvaPatternStage } from "./konvapanes/patternstage.mjs";
import { KonvaTimelineStage } from "./konvapanes/timelinestage.mjs";
import { UnifiedKeyframeEditor } from "./unifiedkeyframeeditor.mjs";
import { notnull } from "./util.mjs";

const ignoreErrorsContaining = [
	"The play() request was interrupted by a new load request"
];
window.addEventListener("unhandledrejection", event => {
	// console.error(event.reason);
	const estr = `Unhandled Rejection: ${event.reason}\n${event.reason?event.reason.name||"":""}\n${event.reason?event.reason.message||"":""}\n${event.reason?event.reason.stack||"":""}`;
	// console.error(estr);
	if (ignoreErrorsContaining.findIndex(istr => estr.includes(istr)) == -1) alert(estr);
});
window.addEventListener("error", event => {
	// console.error(event);
	// @ts-ignore
	const estr = `Unhandled Error: ${event}\n${event?event.name||"":""}\n${event?event.message||"":""}\n${event?event.stack||"":""}`;
	// console.error(estr);
	if (ignoreErrorsContaining.findIndex(istr => estr.includes(istr)) == -1) alert(estr);
});


const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));

/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MAHKeyframeBase} MAHKeyframeBase */
/** @typedef {import("../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/** @typedef {import("../../shared/types").MAHKeyframePause} MAHKeyframePause */
/** @typedef {import("../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */

const mainsplitgridDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.mainsplitgrid"));
const centerDiv = /** @type {HTMLDivElement} */ (mainsplitgridDiv.querySelector("div.center"));
const timelineDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.timeline"));
const savedstateSpan = /** @type {HTMLSpanElement} */ (document.querySelector("span.savedstate"));


const _mainsplit = SplitGrid({
	minSize: 5,
	columnGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.leftcenter")) },
		{ track: 3, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.centerright")) },
	],
	rowGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.topbottom")) },
	],
});
const _bottomsplit = SplitGrid({
	minSize: 5,
	columnGutters: [
		{ track: 1, element: notnull(document.querySelector("div.bottom > div.gutter.column")) },
	],
});


/** @type {MAHPatternDesignFE} */
let primary_design;
try {
	primary_design = MAHPatternDesignFE.load_from_localstorage() || new MAHPatternDesignFE(...MAHPatternDesignFE.DEFAULT);
} catch (e) {
	alert("loading design from local storage failed.\nProbably due to the format changing, and migration not being implemented during initial development (version<1.0.0)). loading default pattern...");
	primary_design = new MAHPatternDesignFE(...MAHPatternDesignFE.DEFAULT);
	console.error(e);
}

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
	if (ev.key == "Z" && ev.ctrlKey && ev.shiftKey && !ev.altKey ||
		ev.key == "y" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
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
	if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		primary_design.select_all_keyframes();
	}
	if (ev.key == "s" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		console.warn("todo");
		//todo
	}
});

document.addEventListener("copy", _ev => {
	primary_design.copy_selected_to_clipboard();
});
document.addEventListener("paste", _ev => {
	primary_design.paste_clipboard(); 
});

primary_design.state_change_events.addEventListener("commit_update", ev => {
	savedstateSpan.textContent = ev.detail.committed ? "saved to localstorage" : "pending change";
});
primary_design.commit_operation({});
const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", centerDiv);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, "timelinestage", timelineDiv);
const unified_keyframe_editor = new UnifiedKeyframeEditor(primary_design, notnull(document.querySelector("div.unifiedkeyframeeditor")));

// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
// @ts-ignore
window.konva_timeline_stage = konva_timeline_stage;
// @ts-ignore
window.unified_keyframe_editor = unified_keyframe_editor;
// @ts-ignore
window.primary_design = primary_design;