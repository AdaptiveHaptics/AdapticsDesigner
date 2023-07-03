import Split from "../thirdparty/split-grid.mjs";
import { MAHPatternDesignFE } from "./fe/patterndesign.mjs";
import { KonvaPatternStage } from "./konvapanes/pattern-stage.mjs";
import { KonvaTimelineStage } from "./konvapanes/timeline-stage.mjs";
import { DesignLibrary } from "./leftpanel/design-library.mjs";
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
	console.error(event);
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
const patternstage_div = notnull(pattern_div.querySelector("div#patternstage"));
/** @type {HTMLDivElement} */
const timeline_div = notnull(document.querySelector("div.timeline"));
/** @type {HTMLDivElement} */
const timelinestage_div = notnull(timeline_div.querySelector("div#timelinestage"));

/** @type {HTMLDivElement} */
const leftpanel_div = notnull(mainsplitgrid_div.querySelector("div.left"));
/** @type {HTMLDivElement} */
const designlibrary_div = notnull(leftpanel_div.querySelector("div.designlibrary"));



/** @type {HTMLInputElement} */
const websocketurl_input = notnull(document.querySelector(".isection.websocket input.websocketurl"));
/** @type {HTMLButtonElement} */
const websocket_connect_button = notnull(document.querySelector(".isection.websocket button.connect"));
/** @type {HTMLButtonElement} */
const websocket_disconnect_button = notnull(document.querySelector(".isection.websocket button.disconnect"));
/** @type {HTMLButtonElement} */
const websocket_state_span = notnull(document.querySelector(".isection.websocket span.websocketstate"));

/** @type {HTMLButtonElement} */
const file_new_button = notnull(document.querySelector(".isection.file button.new"));
/** @type {HTMLButtonElement} */
const file_open_button = notnull(document.querySelector(".isection.file button.open"));
/** @type {HTMLButtonElement} */
const file_download_button = notnull(document.querySelector(".isection.file button.download"));
/** @type {HTMLButtonElement} */
const file_save_button = notnull(document.querySelector(".isection.file button.save"));
/** @type {HTMLButtonElement} */
const file_save_as_button = notnull(document.querySelector(".isection.file button.save_as"));
/** @type {HTMLSpanElement} */
const filename_span = notnull(document.querySelector(".isection.file span.filename"));
/** @type {HTMLSpanElement} */
const savedstate_span = notnull(document.querySelector("span.savedstate"));


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


const PRIMARY_DESIGN_LOCAL_STORAGE_KEY = "primary_design";


/** @type {MAHPatternDesignFE} */
let primary_design;
const lssf = window.localStorage.getItem(PRIMARY_DESIGN_LOCAL_STORAGE_KEY);
const save_func = serialized => window.localStorage.setItem(PRIMARY_DESIGN_LOCAL_STORAGE_KEY, serialized);
const create_default = () => new MAHPatternDesignFE(...MAHPatternDesignFE.DEFAULT, save_func);
try {
	primary_design = lssf ? MAHPatternDesignFE.deserialize(lssf, save_func) : create_default();
} catch (e) {
	alert("loading design from local storage failed.\nProbably due to the format changing.\n\nloading default pattern...");
	primary_design = create_default();
	console.error(e);
}

const focus_within_design_panes = () => {
	return pattern_div.matches(":focus-within") || timeline_div.matches(":focus-within");
};
const focus_within_design_panes_or_nothing_focused = () => document.activeElement == document.body || focus_within_design_panes();
document.addEventListener("keydown", ev => {
	if (ev.key == "s" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		ev.preventDefault();
		if (file_save_button.disabled) file_download_button.click();
		else file_save_button.click();
	}

	// restrict keybinds to nothing focused, or design panes focused
	if (focus_within_design_panes_or_nothing_focused()) {
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
		if (ev.key == "Delete" && !ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
			ev.preventDefault();
			console.log("delete");
			primary_design.delete_selected_items();
		}
		if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
			ev.preventDefault();
			primary_design.select_all_keyframes();
		}
	}
});

document.addEventListener("cut", ev => {
	if (focus_within_design_panes_or_nothing_focused()) {
		primary_design.cut_selected_to_clipboard();
		ev.preventDefault();
	}
});
document.addEventListener("copy", ev => {
	if (focus_within_design_panes_or_nothing_focused()) {
		primary_design.copy_selected_to_clipboard();
		ev.preventDefault();
	}
});
document.addEventListener("paste", ev => {
	if (focus_within_design_panes_or_nothing_focused()) {
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




/** @type {FilePickerAcceptType[]} */
const FILE_TYPES = [
	{
		description: "Adaptics Pattern File",
		accept: {
			"application/json": [".adaptics", ".json"],
		},
	},
];



if ("showSaveFilePicker" in window && "showOpenFilePicker" in window) {
	const last_file_handle_map = new Map();

	file_download_button.style.display = "none";
	/** @type {(filehandle: FileSystemFileHandle) => Promise<void>} */
	const save_to_filehandle = async (fileHandle) => {
		const writable = await fileHandle.createWritable();
		await writable.write(primary_design.export_file());
		await writable.close();
		filename_span.classList.remove("unsaved");
	};
	file_save_as_button.addEventListener("click", async () => {
		try {
			const file_handle = await window.showSaveFilePicker({
				types: FILE_TYPES,
				excludeAcceptAllOption: false,
				suggestedName: primary_design.filename,
			});
			last_file_handle_map.set(file_handle.name, file_handle);
			primary_design.update_filename(file_handle.name);
			await save_to_filehandle(file_handle);
		} catch (e) {
			if (e.name == "AbortError") {
				//do nothing
			} else {
				throw e;
			}
		}
	});
	file_save_button.addEventListener("click", async () => {
		if (!last_file_handle_map.has(primary_design.filename)) {
			file_save_as_button.click();
			return;
		}
		await save_to_filehandle(last_file_handle_map.get(primary_design.filename));
	});
	file_open_button.addEventListener("click", async () => {
		try {
			const [file_handle] = await window.showOpenFilePicker({
				types: FILE_TYPES,
				multiple: false,
			});
			last_file_handle_map.set(file_handle.name, file_handle);
			const file = await file_handle.getFile();
			await primary_design.import_file(file);
			filename_span.classList.remove("unsaved");
		} catch (e) {
			if (e.name == "AbortError") {
				//do nothing
			} else {
				throw e;
			}
		}
	});
	file_new_button.addEventListener("click", async () => {
		if (filename_span.classList.contains("unsaved")) {
			const confirmation = confirm(`'${primary_design.filename}' is not saved. Are you sure you want to discard your changes?`);
			if (!confirmation) return;
		}
		last_file_handle_map.clear();
		/** @type {[string, MidAirHapticsAnimationFileFormat]} */
		const [default_filename, default_filedata] = MAHPatternDesignFE.DEFAULT;
		await primary_design.import_file(new File([JSON.stringify(default_filedata)], default_filename, { type: "application/json" }));
		pattern_div.focus();
	});

} else { // fallback for browsers that don't support the File System Access API
	file_save_button.disabled = true;
	file_save_as_button.disabled = true;
	file_save_as_button.title = file_save_button.title = "This browser does not support the File System Access API `showSaveFilePicker` and `showOpenFilePicker`.";
	file_download_button.addEventListener("click", async () => {
		const file = primary_design.export_file();
		const url = URL.createObjectURL(file);
		const a = document.createElement("a");
		a.href = url;
		a.download = file.name;
		a.click();
		URL.revokeObjectURL(url);
		filename_span.classList.remove("unsaved");
	});
	file_open_button.addEventListener("click", async () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".adaptics,.json";
		input.addEventListener("change", () => {
			if (input.files == null) return;
			const file = input.files[0];
			if (file) primary_design.import_file(file);
		});
		input.click();
	});
}

primary_design.state_change_events.addEventListener("rerender", () => {
	filename_span.textContent = primary_design.filename;
});

primary_design.state_change_events.addEventListener("commit_update", ev => {
	savedstate_span.textContent = ev.detail.committed ? "saved to localstorage" : "pending change";
	filename_span.classList.add("unsaved");
});


primary_design.commit_operation({ rerender: true });
const konva_pattern_stage = new KonvaPatternStage(primary_design, patternstage_div, pattern_div);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, timelinestage_div, timeline_div);
const right_panel = new RightPanel(primary_design, rightpanel_div);
const unified_keyframe_editor = right_panel.unified_keyframe_editor;
const parameter_editor = new ParameterEditor(primary_design, notnull(document.querySelector("div.parametereditor")));

const design_library = new DesignLibrary(primary_design, designlibrary_div, new Map([
	["heartbeat", fetch("./example-patterns/heartbeat.adaptics").then(r => (/** @type {Promise<MidAirHapticsAnimationFileFormat>} */ (r.json()))) ]
]));

Object.assign(window, {
	primary_design,
	konva_pattern_stage,
	konva_timeline_stage,
	right_panel,
	unified_keyframe_editor,
	parameter_editor,
	design_library,
});