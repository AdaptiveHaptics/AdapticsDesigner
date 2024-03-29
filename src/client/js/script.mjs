import SplitGrid from "split-grid";
import { MAHPatternDesignFE } from "./fe/patterndesign.mjs";
import { KonvaPatternStage } from "./konvapanes/pattern-stage.mjs";
import { KonvaTimelineStage } from "./konvapanes/timeline-stage.mjs";
import { DesignLibrary } from "./leftpanel/design-library.mjs";
import { ParameterEditor } from "./parameter-editor.mjs";
import { RightPanel } from "./rightpanel/right-panel.mjs";
import { notnull } from "./util.mjs";
import { BasicThreeMAHDevEnvironment } from "./3d/basic-three-mah-dev-environment.mjs";
import { CenterPanel } from "./center-panel.mjs";
import * as ExperienceSimulations from "./3d/exps/index.mjs";

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


const search_up = new URLSearchParams(window.location.search);
const user_study_non_adaptive_mode = ["userstudy_B", "userstudy_na"].some(s => search_up.has(s));
console.log("user_study_non_adaptive_mode: ", user_study_non_adaptive_mode);
const user_study_mode = user_study_non_adaptive_mode || ["userstudy_A", "userstudy"].some(s => search_up.has(s));
console.log("user_study_mode: ", user_study_mode);
Object.assign(window, {
	user_study_mode,
	user_study_non_adaptive_mode,
});


/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MidAirHapticsClipboardFormat} MidAirHapticsClipboardFormat */

/** @type {HTMLDivElement} */
const mainsplitgrid_div = notnull(document.querySelector("div.mainsplitgrid"));
/** @type {HTMLDivElement} */
const rightpanel_div = notnull(mainsplitgrid_div.querySelector("div.right"));
/** @type {HTMLDivElement} */
const centerpanel_div = notnull(mainsplitgrid_div.querySelector("div.center"));
/** @type {HTMLDivElement} */
const pattern_div = notnull(mainsplitgrid_div.querySelector("div.patternstagecontainer"));
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


/** @type {HTMLDivElement} */
const file_isection_div = notnull(document.querySelector("div.isection.file"));

/** @type {HTMLDivElement} */
const threejscontainer_div = notnull(document.querySelector("div.threejscontainer"));


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
const WEBSOCKET_CONNECTED_LOCALSTORAGE_KEY = "websocket_connected";
const WEBSOCKET_HAND_TRACKING_LOCALSTORAGE_KEY = "websocket_handtracking";
const DESIGN_LIBRARY_SEARCH_LOCAL_STORAGE_KEY = "design_library_last_search";


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
		file_titlebar_manager.trigger_save();
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


{
	/** @type {HTMLInputElement} */
	const websocketurl_input = notnull(document.querySelector(".isection.websocket input.websocketurl"));
	/** @type {HTMLButtonElement} */
	const websocket_connect_button = notnull(document.querySelector(".isection.websocket button.connect"));
	/** @type {HTMLButtonElement} */
	const websocket_disconnect_button = notnull(document.querySelector(".isection.websocket button.disconnect"));
	/** @type {HTMLButtonElement} */
	const websocket_state_span = notnull(document.querySelector(".isection.websocket span.websocketstate"));
	/** @type {HTMLInputElement} */
	const tracking_input = notnull(document.querySelector(".isection.websocket input.tracking"));

	requestAnimationFrame(() => {
		if (window.localStorage.getItem(WEBSOCKET_HAND_TRACKING_LOCALSTORAGE_KEY) == "true") {
			if (tracking_input.checked) return;
			tracking_input.click();
		}
		if (window.localStorage.getItem(WEBSOCKET_CONNECTED_LOCALSTORAGE_KEY) == "true") websocket_connect_button.click();
	});

	websocket_connect_button.addEventListener("click", () => {
		primary_design.connect_websocket(websocketurl_input.value);

		window.localStorage.setItem(WEBSOCKET_CONNECTED_LOCALSTORAGE_KEY, "true");

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
		websocket.state_change_events.addEventListener("tracking_data", ev => {
			three_mah_dev_environment?.update_tracking_data(ev.detail.tracking_frame);
		});
	});
	websocket_disconnect_button.addEventListener("click", () => {
		primary_design.disconnect_websocket();

		window.localStorage.removeItem(WEBSOCKET_CONNECTED_LOCALSTORAGE_KEY);

		websocket_connect_button.style.display = "";
		websocket_disconnect_button.style.display = "none";
		websocket_connect_button.focus();
		websocketurl_input.disabled = false;
	});

	tracking_input.checked = primary_design.tracking;
	primary_design.state_change_events.addEventListener("rerender", _ => {
		tracking_input.checked = primary_design.tracking;
	});
	tracking_input.addEventListener("change", () => {
		window.localStorage.setItem(WEBSOCKET_HAND_TRACKING_LOCALSTORAGE_KEY, tracking_input.checked ? "true" : "false");
		primary_design.update_tracking(tracking_input.checked);
	});
}




/** @type {FilePickerAcceptType[]} */
const FILE_TYPES = [
	{
		description: "Adaptics Pattern File",
		accept: {
			"application/json": [".adaptics", ".json"],
		},
	},
];


export class FileTitlebarManager {
	/**
	 * @param {MAHPatternDesignFE} primary_design
	 * @param {HTMLDivElement} file_isection_div
	 */
	constructor(primary_design, file_isection_div) {
		/** @type {HTMLButtonElement} */
		const file_new_button = notnull(file_isection_div.querySelector("button.new"));
		/** @type {HTMLButtonElement} */
		const file_open_button = notnull(file_isection_div.querySelector("button.open"));
		/** @type {HTMLButtonElement} */
		this.file_download_button = notnull(file_isection_div.querySelector("button.download"));
		/** @type {HTMLButtonElement} */
		this.file_save_button = notnull(file_isection_div.querySelector("button.save"));
		/** @type {HTMLButtonElement} */
		const file_save_as_button = notnull(file_isection_div.querySelector("button.save_as"));
		/** @type {HTMLSpanElement} */
		this.filename_span = notnull(file_isection_div.querySelector("span.filename"));
		/** @type {HTMLSpanElement} */
		const savedstate_span = notnull(file_isection_div.querySelector("span.savedstate"));

		primary_design.state_change_events.addEventListener("rerender", () => {
			this.filename_span.textContent = primary_design.filename;
		});

		primary_design.state_change_events.addEventListener("commit_update", ev => {
			savedstate_span.classList.toggle("committed", ev.detail.committed);
			this.set_saved_to_fs(false);
		});


		const last_file_handle_map = new Map();
		file_new_button.addEventListener("click", async () => {
			this.confirm_discard_changes();
			last_file_handle_map.clear();
			/** @type {[string, MidAirHapticsAnimationFileFormat]} */
			const [default_filename, default_filedata] = MAHPatternDesignFE.DEFAULT;
			await primary_design.import_file(new File([JSON.stringify(default_filedata)], default_filename, { type: "application/json" }));
			pattern_div.focus();
		});

		if ("showSaveFilePicker" in window && "showOpenFilePicker" in window) {
			this.file_download_button.style.display = "none";
			/** @type {(filehandle: FileSystemFileHandle) => Promise<void>} */
			const save_to_filehandle = async (fileHandle) => {
				const writable = await fileHandle.createWritable();
				await writable.write(primary_design.export_file());
				await writable.close();
				this.set_saved_to_fs(true);
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
			this.file_save_button.addEventListener("click", async () => {
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
					this.set_saved_to_fs(true);
				} catch (e) {
					if (e.name == "AbortError") {
						//do nothing
					} else {
						throw e;
					}
				}
			});

		} else { // fallback for browsers that don't support the File System Access API
			this.file_save_button.disabled = true;
			file_save_as_button.disabled = true;
			file_save_as_button.title = this.file_save_button.title = "This browser does not support the File System Access API `showSaveFilePicker` and `showOpenFilePicker`.";
			this.file_download_button.addEventListener("click", async () => {
				const file = primary_design.export_file();
				const url = URL.createObjectURL(file);
				const a = document.createElement("a");
				a.href = url;
				a.download = file.name;
				a.click();
				URL.revokeObjectURL(url);
				this.set_saved_to_fs(true);
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
	}


	set_saved_to_fs(saved) {
		if (saved) {
			this.filename_span.classList.remove("unsaved");
			this.filename_span.title = "Saved to filesystem.";
		} else {
			this.filename_span.classList.add("unsaved");
			this.filename_span.title = "Changes not saved to filesystem.";
		}
	}

	is_saved() {
		return !this.filename_span.classList.contains("unsaved");
	}

	confirm_discard_changes() {
		if (!this.is_saved()) {
			const confirmation = confirm(`'${primary_design.filename}' is not saved. Are you sure you want to discard your changes?`);
			if (!confirmation) return false;
		}
		return true;
	}

	trigger_save() {
		if (this.file_save_button.disabled) this.file_download_button.click();
		else this.file_save_button.click();
	}
}

const file_titlebar_manager = new FileTitlebarManager(primary_design, file_isection_div);


primary_design.commit_operation({ rerender: true });

/** @type {BasicThreeMAHDevEnvironment | null} */
let three_mah_dev_environment = null;
try {
	three_mah_dev_environment = new BasicThreeMAHDevEnvironment(primary_design, threejscontainer_div);
	// three_base_environment.load_experience(new ButtonExperience(primary_design));
	// three_base_environment.load_experience(new AsteroidExperience(primary_design));
} catch (e) { console.warn(e); }
const konva_pattern_stage = new KonvaPatternStage(primary_design, patternstage_div, pattern_div);
const center_panel = new CenterPanel(centerpanel_div);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, timelinestage_div, timeline_div);
const right_panel = new RightPanel(primary_design, rightpanel_div);
const unified_keyframe_editor = right_panel.unified_keyframe_editor;
const parameter_editor = new ParameterEditor(primary_design, notnull(document.querySelector("div.parametereditor")));



const design_library = (() => {
	const { AsteroidExperience, ButtonExperience, RainExperience } = ExperienceSimulations;
	/**
	 *
	 * @param {string} url
	 * @returns {Promise<MidAirHapticsAnimationFileFormat>}
	 */
	const load_pattern = async (url) => {
		try {
			const f = await fetch(url);
			if (f.status == 404) {
				alert(`Failed to load pattern '${url}': 404`);
				throw new Error(`Failed to load pattern '${url}': 404`);
			}
			const json = /** @type {MidAirHapticsAnimationFileFormat} */ (await f.json());
			return json;
		} catch (e) {
			if (e.name == "TypeError" && e.message == "Failed to fetch") {
				console.error(e); // happens when the user refreshes the tab before the fetch completes
				// @ts-ignore
				return null;
			}
			else throw e;
		}
	};
	/** @type {(namepath: string, urlpath: string, sim_exp: import("./3d/exps/base-experience.mjs").BaseExperience | null) => [string, import("./leftpanel/design-library.mjs").DesignMapElement]} */
	const load_pattern_into_tuple = (namepath, urlpath, sim_exp) => [namepath, { design: load_pattern(urlpath), sim_exp }];
	/** @type {(path: string, sim_exp?: import("./3d/exps/base-experience.mjs").BaseExperience | null, forcenamepath?: string) => [string, import("./leftpanel/design-library.mjs").DesignMapElement]} */
	const example_pattern_from_path = (path, sim_exp, forcenamepath) => load_pattern_into_tuple(forcenamepath ?? `Examples/${path}`, `./example-patterns/${path}.adaptics`, sim_exp ?? null);
	const user_study_non_adaptive_shown_patterns = [
		example_pattern_from_path("Non-Adaptive/Checkmark", null, "Examples/Checkmark"),
		example_pattern_from_path("Non-Adaptive/StaticShock", null, "Examples/StaticShock"),

		example_pattern_from_path("user-study/HeartbeatBase", new AsteroidExperience(primary_design), "Pilot Study/HeartbeatBase"),
		example_pattern_from_path("user-study/RainBase", new RainExperience(primary_design), "Pilot Study/RainBase"),
	];
	const user_study_shown_patterns = [
		example_pattern_from_path("Adaptive/Simple/Button", new ButtonExperience(primary_design), "Examples/Adaptive/Button"),
		example_pattern_from_path("Adaptive/Simple/Wind", null, "Examples/Adaptive/Wind"),
		example_pattern_from_path("Adaptive/Simple/StaticShock", null, "Examples/Adaptive/StaticShock"),

		example_pattern_from_path("Non-Adaptive/Checkmark"),
		example_pattern_from_path("Non-Adaptive/StaticShock"),

		example_pattern_from_path("user-study/HeartbeatBase", new AsteroidExperience(primary_design), "Pilot Study/HeartbeatBase"),
		example_pattern_from_path("user-study/RainBase", new RainExperience(primary_design), "Pilot Study/RainBase"),
	];
	const all_patterns = [
		example_pattern_from_path("Adaptive/Simple/Button", new ButtonExperience(primary_design)),
		example_pattern_from_path("Adaptive/Simple/Wind"),
		example_pattern_from_path("Adaptive/Simple/Heartbeat", new AsteroidExperience(primary_design)),
		example_pattern_from_path("Adaptive/Simple/Rain", new RainExperience(primary_design)),
		example_pattern_from_path("Adaptive/Simple/StaticShock"),

		example_pattern_from_path("Adaptive/Unity/Button", new ButtonExperience(primary_design)),
		example_pattern_from_path("Adaptive/Unity/Rain", new RainExperience(primary_design)),
		example_pattern_from_path("Adaptive/Unity/SpaceshipHeartbeat", new AsteroidExperience(primary_design)),

		example_pattern_from_path("Non-Adaptive/Rain"),
		example_pattern_from_path("Non-Adaptive/Checkmark"),
		example_pattern_from_path("Non-Adaptive/StaticShock"),

		example_pattern_from_path("user-study/HeartbeatBase", new AsteroidExperience(primary_design), "Pilot Study/HeartbeatBase"),
		example_pattern_from_path("user-study/RainBase", new RainExperience(primary_design), "Pilot Study/RainBase"),
	];
	const patterns = user_study_non_adaptive_mode ? user_study_non_adaptive_shown_patterns : (
		user_study_mode ? user_study_shown_patterns : all_patterns
	);
	const design_library = new DesignLibrary(primary_design, three_mah_dev_environment, file_titlebar_manager, designlibrary_div, new Map(patterns), DESIGN_LIBRARY_SEARCH_LOCAL_STORAGE_KEY);
	return design_library;
})();


const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
darkModePreference.addEventListener("change", _ev => {
	primary_design.force_rerender();
});


if (user_study_non_adaptive_mode) {
	/** @type {HTMLDivElement} */
	const userparamscontainer_div = notnull(document.querySelector("div.parametereditor div.userparamscontainer"));
	userparamscontainer_div.style.display = "none";

	/** @type {HTMLDivElement} */
	const center_panel_tabs_div = notnull(centerpanel_div.querySelector("div.tabs"));
	center_panel_tabs_div.style.visibility = "hidden";
	center_panel_tabs_div.style.height = "0px";

	/** @type {HTMLDetailsElement} */
	const cjump_details = notnull(rightpanel_div.querySelector("form.ukfe > details.cjump"));
	cjump_details.style.display = "none";
	cjump_details.style.visibility = "hidden";
}

Object.assign(window, {
	primary_design,
	konva_pattern_stage,
	konva_timeline_stage,
	right_panel,
	unified_keyframe_editor,
	parameter_editor,
	design_library,
	file_titlebar_manager,
	three_mah_dev_environment,
	center_panel,
});