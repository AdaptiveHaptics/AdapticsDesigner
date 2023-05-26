import Split from "../thirdparty/split-grid.mjs";
import { MAHPatternDesignFE } from "./fe/patterndesign.mjs";
import { KonvaPatternStage } from "./konvapanes/pattern-stage.mjs";
import { KonvaTimelineStage } from "./konvapanes/timeline-stage.mjs";
import { ParameterEditor } from "./parameter-editor.mjs";
import { RightPanel } from "./rightpanel/right-panel.mjs";
import { notnull } from "./util.mjs";

const ignoreErrorsContaining = [
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
/** @typedef {import("../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */

/** @type {HTMLDivElement} */
const mainsplitgrid_div = notnull(document.querySelector("div.mainsplitgrid"));
/** @type {HTMLDivElement} */
const rightpanel_div = notnull(mainsplitgrid_div.querySelector("div.right"));
/** @type {HTMLDivElement} */
const pattern_div = notnull(mainsplitgrid_div.querySelector("div.center"));
/** @type {HTMLDivElement} */
const timeline_div = notnull(document.querySelector("div.timeline"));
/** @type {HTMLSpanElement} */
const savedstate_span = notnull(document.querySelector("span.savedstate"));

const websocketurl_input = /** @type {HTMLInputElement} */ (document.querySelector(".isection.websocket input.websocketurl"));
const websocket_connect_button = /** @type {HTMLButtonElement} */ (document.querySelector(".isection.websocket button.connect"));
const websocket_disconnect_button = /** @type {HTMLButtonElement} */ (document.querySelector(".isection.websocket button.disconnect"));
const websocket_state_span = /** @type {HTMLButtonElement} */ (document.querySelector(".isection.websocket span.websocketstate"));


const _mainsplit = SplitGrid({
	minSize: 5,
	columnGutters: [
		{ track: 1, element: notnull(mainsplitgrid_div.querySelector("div.mainsplitgrid > div.gutter.leftcenter")) },
		{ track: 3, element: notnull(mainsplitgrid_div.querySelector("div.mainsplitgrid > div.gutter.centerright")) },
	],
	rowGutters: [
		{ track: 1, element: notnull(mainsplitgrid_div.querySelector("div.mainsplitgrid > div.gutter.topbottom")) },
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
	alert("loading design from local storage failed.\nProbably due to the format changing, and migration not being implemented during initial development (version<1.0.0).\n\nloading default pattern...");
	primary_design = new MAHPatternDesignFE(...MAHPatternDesignFE.DEFAULT);
	console.error(e);
}

const focus_within_design_panes = () => {
	return pattern_div.matches(":focus-within") || timeline_div.matches(":focus-within");
};
document.addEventListener("keydown", ev => {
	if (ev.key == "s" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		console.warn("todo");
		//todo
	}

	// begin design pane restricted keybinds
	if (!focus_within_design_panes()) return;
	if (ev.key == "z" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		console.log("undo");
		if (primary_design.undo()) {
			//success
		} else {
			//do nothing
		}
	}
	if (ev.key == "Z" && ev.ctrlKey && ev.shiftKey && !ev.altKey ||
		ev.key == "y" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		console.log("redo");
		if (primary_design.redo()) {
			//success
		} else {
			//do nothing
		}
	}
	if (ev.key == "Delete" && !ev.ctrlKey && !ev.shiftKey && !ev.altKey && focus_within_design_panes()) {
		ev.preventDefault();
		console.log("delete");
		primary_design.delete_selected_items();
	}
	if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		primary_design.select_all_keyframes();
	}
});

document.addEventListener("cut", ev => {
	if (focus_within_design_panes()) {
		primary_design.cut_selected_to_clipboard();
		ev.preventDefault();
	}
});
document.addEventListener("copy", ev => {
	if (focus_within_design_panes()) {
		primary_design.copy_selected_to_clipboard();
		ev.preventDefault();
	}
});
document.addEventListener("paste", ev => {
	if (focus_within_design_panes()) {
		primary_design.paste_clipboard();
		ev.preventDefault();
	}
});

websocket_connect_button.addEventListener("click", () => {
	primary_design.connect_websocket(websocketurl_input.value);

	websocket_connect_button.style.display = "none";
	websocket_disconnect_button.style.display = "";
	websocket_disconnect_button.focus();
	websocketurl_input.disabled = true;
	websocket_state_span.textContent = "connecting...";
	const websocket = primary_design.websocket;
	if (websocket == null) throw new Error("websocket == null");
	websocket.state_change_events.addEventListener("connected", _ev => {
		websocket_state_span.textContent = "connected";
	});
	websocket.state_change_events.addEventListener("disconnected", _ev => {
		websocket_state_span.textContent =  websocket.destroyed ? "disconnected" : "reconnecting...";
	});
});
websocket_disconnect_button.addEventListener("click", () => {
	primary_design.disconnect_websocket();

	websocket_connect_button.style.display = "";
	websocket_disconnect_button.style.display = "none";
	websocket_connect_button.focus();
	websocketurl_input.disabled = false;
});

primary_design.state_change_events.addEventListener("commit_update", ev => {
	savedstate_span.textContent = ev.detail.committed ? "saved to localstorage" : "pending change";
});
primary_design.commit_operation({});
const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", pattern_div);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, "timelinestage", timeline_div);
const right_panel = new RightPanel(primary_design, rightpanel_div);
const unified_keyframe_editor = right_panel.unified_keyframe_editor;
const parameter_editor = new ParameterEditor(primary_design, notnull(document.querySelector("div.parametereditor")));

Object.assign(window, {
	primary_design,
	konva_pattern_stage,
	konva_timeline_stage,
	right_panel,
	unified_keyframe_editor,
	parameter_editor,
});