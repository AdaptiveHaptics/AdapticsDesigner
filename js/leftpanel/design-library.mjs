/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */

import { MAHPatternDesignFE } from "../fe/patterndesign.mjs";
import { KonvaPatternStage } from "../konvapanes/pattern-stage.mjs";
import { KonvaTimelineStage } from "../konvapanes/timeline-stage.mjs";
import { map_get_or_default, notnull, structured_clone } from "../util.mjs";

/** @typedef {{ design: Promise<MidAirHapticsAnimationFileFormat>, sim_exp: import("../3d/exps/base-experience.mjs").BaseExperience | null }} DesignMapElement */
/** @typedef {Map<string, DesignMapElement>} DesignsMap */
export class DesignLibrary {
	/** @type {HTMLInputElement} */
	#_search_input;
	/** @type {HTMLButtonElement} */
	#_clear_button;

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {import("../3d/basic-three-mah-dev-environment.mjs").BasicThreeMAHDevEnvironment | null} three_mah_dev_environment
	 * @param {import("../script.mjs").FileTitlebarManager} file_titlebar_manager
	 * @param {HTMLDivElement} designlibrary_div
	 * @param {DesignsMap} designs_map
	 * @param {string=} search_local_storage_key
	 */
	constructor(pattern_design, three_mah_dev_environment, file_titlebar_manager, designlibrary_div, designs_map, search_local_storage_key) {
		this.pattern_design = pattern_design;
		this.three_base_environment = three_mah_dev_environment;
		this.file_titlebar_manager = file_titlebar_manager;
		this.designlibrary_div = designlibrary_div;
		this.search_local_storage_key = search_local_storage_key;

		/** @type {HTMLDivElement} */
		this.designtree_div = notnull(designlibrary_div.querySelector("div.designtree"));

		this.#_search_input = notnull(this.designlibrary_div.querySelector("input[type=text]"));
		this.#_clear_button = notnull(this.designlibrary_div.querySelector("button.clear"));

		this.designs_map = designs_map;
		this.render_designs(this.designs_map);

		if (this.search_local_storage_key) {
			const last_search_string = window.localStorage.getItem(this.search_local_storage_key);
			if (last_search_string) {
				this.#_search_input.value = last_search_string;
				this.#_on_search_input();
			}
		}

		this.#_search_input.addEventListener("input", _ev => {
			this.#_on_search_input();
		});

		this.#_clear_button.addEventListener("click", _ev => {
			this.#_search_input.value = "";
			this.#_on_search_input();
		});

		{
			this._preview_pattern_design = new MAHPatternDesignFE(...MAHPatternDesignFE.DEFAULT, null);
			this._preview_pattern_design.commit_operation({ rerender: true });

			const pattern_resize_div = document.createElement("div");
			pattern_resize_div.style.width = "20ex";
			pattern_resize_div.style.height = "20ex";
			const pattern_stage_div = document.createElement("div");
			pattern_stage_div.classList.add("patternstage");
			const pattern_context_menu_div = document.createElement("div");
			pattern_context_menu_div.classList.add("contextmenu");
			pattern_resize_div.appendChild(pattern_context_menu_div);
			pattern_resize_div.appendChild(pattern_stage_div);
			const _pattern_stage = new KonvaPatternStage(this._preview_pattern_design, pattern_stage_div, pattern_resize_div);

			const timeline_resize_div = document.createElement("div");
			timeline_resize_div.style.width = "20ex";
			timeline_resize_div.style.height = "7ex";
			const timeline_stage_div = document.createElement("div");
			timeline_stage_div.classList.add("timelinestage");
			const timeline_context_menu_div = document.createElement("div");
			timeline_context_menu_div.classList.add("contextmenu");
			timeline_resize_div.appendChild(timeline_context_menu_div);
			timeline_resize_div.appendChild(timeline_stage_div);
			const timeline_stage = new KonvaTimelineStage(this._preview_pattern_design, timeline_stage_div, timeline_resize_div);
			timeline_stage.k_stage.scale({ x: 0.5, y: 0.5 });
			timeline_stage.fix_scrollbar_coords();

			this._preview_div = document.createElement("div");
			this._preview_div.classList.add("preview");
			this._preview_div.appendChild(pattern_resize_div);
			this._preview_div.appendChild(timeline_resize_div);
		}
	}

	#_on_search_input() {
		if (this.search_local_storage_key) window.localStorage.setItem(this.search_local_storage_key, this.#_search_input.value);
		const search_text = this.#_search_input.value;
		const filtered = new Map([...this.designs_map].filter(([design_path, _design]) => design_path.toLowerCase().includes(search_text.toLowerCase())));
		this.render_designs(filtered, search_text !== "");
	}

	/**
	 *
	 * @param {DesignsMap} designs
	 * @param {boolean} open_folders
	 */
	render_designs(designs, open_folders = false) {
		while (this.designtree_div.lastChild) this.designtree_div.removeChild(this.designtree_div.lastChild);
		const designtree_children_div = document.createElement("div");
		designtree_children_div.classList.add("children");
		this.designtree_div.appendChild(designtree_children_div);

		/** @typedef {{ children_div: HTMLDivElement, child_folders: FolderMap }} FolderDef */
		/** @typedef {Map<string, FolderDef>} FolderMap */
		/** @type {FolderMap} */
		const designtree_folders_map = new Map();

		for (const design_path of [...designs.keys()].sort()) {
			const design = notnull(designs.get(design_path) ?? null);
			const design_path_split = design_path.split("/");
			const [filename, ...folders_rev] = design_path_split.reverse();
			const filename_with_ext = filename + ".adaptics";
			const folders = folders_rev.reverse();
			/** @type {FolderDef} */
			let folders_map_curr = { children_div: designtree_children_div, child_folders: designtree_folders_map };
			for (const folder_name of folders) {
				folders_map_curr = map_get_or_default(folders_map_curr.child_folders, folder_name, () => ({
					children_div: this.#_create_folder(folder_name, folders_map_curr.children_div, open_folders),
					child_folders: new Map()
				}));
			}

			const file_div = document.createElement("div");
			file_div.classList.add("file");
			const file_button = document.createElement("button");
			file_button.textContent = filename;
			file_div.appendChild(file_button);
			folders_map_curr.children_div.appendChild(file_div);
			file_div.addEventListener("mouseover", async () => {
				try {
					this._preview_pattern_design.import_file_from_filedata(structured_clone(await design.design), filename_with_ext);
					file_div.appendChild(this._preview_div);
					this._preview_div.style.left = (file_div.offsetLeft + file_div.offsetWidth) + "px";

					this._preview_pattern_design.update_playstart(Date.now());
				} catch (e) {
					alert("Unable to load design file: " + e);
					throw e;
				}
			});
			file_div.addEventListener("mouseout", () => {
				this._preview_pattern_design.update_playstart(0);
				this._preview_div.remove();
			});
			file_button.addEventListener("click", async () => {
				if (this.file_titlebar_manager.confirm_discard_changes()) {
					this.pattern_design.import_file_from_filedata(structured_clone(await design.design), filename_with_ext);
					this.three_base_environment?.load_experience(design.sim_exp);
					this.file_titlebar_manager.set_saved_to_fs(true);
				}
			});

		}
	}


	/**
	 *
	 * @param {string} folder_name
	 * @param {HTMLDivElement} curr_folder_children_div
	 * @param {boolean} open
	 */
	#_create_folder(folder_name, curr_folder_children_div, open = false) {
		const folder = document.createElement("details");
		folder.classList.add("folder");
		const summary = document.createElement("summary");
		summary.textContent = folder_name;
		folder.appendChild(summary);
		const children_div = document.createElement("div");
		children_div.classList.add("children");
		folder.appendChild(children_div);

		curr_folder_children_div.appendChild(folder);

		if (open) folder.open = true;

		return children_div;
	}
}