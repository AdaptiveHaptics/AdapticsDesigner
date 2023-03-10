import { has_coords, filter_has_coords } from "../fe/keyframes/index.mjs";
import { KonvaResizeStage } from "./shared.mjs";
import { notnull } from "../util.mjs";
import { BoundsCheck } from "../fe/keyframes/bounds-check.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframePauseFE} MAHKeyframePauseFE */
/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframeStopFE} MAHKeyframeStopFE */
/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/**
 * @template T
 * @typedef {import("../../../shared/util").NotNullable<T>} NotNullable
 */

const KonvaPatternControlPointSymbol = Symbol("KonvaPatternControlPoint");

export class KonvaPatternStage extends KonvaResizeStage {
	static pattern_square_size = 500;
	static pattern_padding = 30;

	transformer = new Konva.Transformer();
	selection_rect = new Konva.Rect();
	pattern_area = new Konva.Rect();

	xy_snapping() {
		return 5;
	}


	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} direct_container_id
	 * @param {HTMLElement} resize_container
	 */
	constructor(pattern_design, direct_container_id, resize_container, {
		pattern_square_size = KonvaPatternStage.pattern_square_size,
		pattern_padding = KonvaPatternStage.pattern_padding,
	} = {}) {
		super(direct_container_id, resize_container, {
			stageWidth: pattern_square_size + 2*pattern_padding,
			stageHeight: pattern_square_size + 2*pattern_padding,
		});

		this.pattern_padding = pattern_padding;
		this.pattern_square_size = pattern_square_size;
		this.pattern_design = pattern_design;

		this.k_control_points_layer = new Konva.Layer();
		this.k_stage.add(this.k_control_points_layer);

		resize_container.addEventListener("keydown", ev => {
			if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
				ev.preventDefault();
				ev.stopPropagation();
				this.pattern_design.deselect_all_keyframes();
				this.pattern_design.select_keyframes(this.pattern_design.filedata.keyframes.filter(has_coords));
			}
		});

		{ //initialize selection_rect
			let x1, y1, x2, y2;
			this.k_stage.on("pointerdown", ev => {
				if (ev.target != this.k_stage && ev.target != this.pattern_area) return;
				// ev.evt.preventDefault();
				x1 = notnull(this.k_control_points_layer.getRelativePointerPosition()).x;
				y1 = notnull(this.k_control_points_layer.getRelativePointerPosition()).y;
				x2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).x;
				y2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).y;

				this.selection_rect.visible(true);
				this.selection_rect.width(0);
				this.selection_rect.height(0);
			});
			this.k_stage.on("pointermove", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect.visible()) return;
				ev.evt.preventDefault();
				x2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).x;
				y2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).y;

				// console.log(x1, y1, x2, y2);

				this.selection_rect.setAttrs({
					x: Math.min(x1, x2),
					y: Math.min(y1, y2),
					width: Math.abs(x2 - x1),
					height: Math.abs(y2 - y1),
				});
			});
			document.body.addEventListener("pointerup", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect.visible()) return;
				ev.preventDefault();

				// update visibility in timeout, so we can check it in click event
				// setTimeout(() => {
				// 	this.selection_rect.visible(false);
				// });
				this.selection_rect.visible(false);

				// const box = this.selection_rect.getSelfRect();
				const pat_c1 = this.layer_coords_to_pattern_coords({ raw_x: x1, raw_y: y1 });
				const pat_c2 = this.layer_coords_to_pattern_coords({ raw_x: x2, raw_y: y2 });
				const low_coords = { x: Math.min(pat_c1.x, pat_c2.x), y: Math.min(pat_c1.y, pat_c2.y) };
				const high_coords = { x: Math.max(pat_c1.x, pat_c2.x), y: Math.max(pat_c1.y, pat_c2.y) };
				const keyframes_in_box = this.pattern_design.filedata.keyframes.filter(has_coords).filter(kf => {
					return (
						low_coords.x <= kf.coords.coords.x && kf.coords.coords.x <= high_coords.x &&
						low_coords.y <= kf.coords.coords.y && kf.coords.coords.y <= high_coords.y
					);
				});
				const linked_keyframes = [];
				for (const kf of keyframes_in_box) {
					const cp = KonvaPatternControlPoint.get_control_point_from_keyframe(kf);
					cp?.linked_keyframes.forEach(kf => linked_keyframes.push(kf));
				}
				this.pattern_design.group_select_logic(keyframes_in_box, linked_keyframes, { shiftKey: ev.shiftKey, ctrlKey: ev.ctrlKey, altKey: ev.altKey });
			});
		}


		pattern_design.state_change_events.addEventListener("kf_new", ev => {
			if ("coords" in ev.detail.keyframe) {
				const curr_cp = new KonvaPatternControlPoint(ev.detail.keyframe, this);
				const prev_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.pattern_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_has_coords, "prev"));
				const next_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.pattern_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_has_coords, "next"));
				if (prev_cp) new KonvaPatternControlPointLine(prev_cp, curr_cp, this);
				if (next_cp) new KonvaPatternControlPointLine(curr_cp, next_cp, this);
				if (prev_cp?.has_linked()) {
					this.update_all_linked();
				}
			} else if (ev.detail.keyframe.type == "pause" || ev.detail.keyframe.type == "stop") {
				const prev_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.pattern_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_has_coords, "prev"));
				if (prev_cp) prev_cp.update_linked(ev.detail.keyframe);
			}
		});
		pattern_design.state_change_events.addEventListener("kf_delete", _ev => {
			this.update_all_linked();
		});
		pattern_design.state_change_events.addEventListener("rerender", _ev => {
			this.render_design();
		});
		pattern_design.state_change_events.addEventListener("kf_reorder", _ev => {
			this.update_order();
		});


		this.render_design();
	}

	render_design() {
		for (const kf of this.pattern_design.filedata.keyframes) {
			if ("coords" in kf) {
				KonvaPatternControlPoint.get_control_point_from_keyframe(kf)?.destroy();
			}
		}
		this.playback_vis?.destroy();
		this.k_control_points_layer.destroyChildren();


		{ //init pattern_area
			this.pattern_area = new Konva.Rect({
				x: this.pattern_padding,
				y: this.pattern_padding,
				width: this.pattern_square_size,
				height: this.pattern_square_size,
				stroke: getComputedStyle(document.body).getPropertyValue("--pattern-boundary"),
				strokeWidth: 4,
			});
			this.pattern_area.on("pointerdblclick", ev => {
				if (ev.target != this.pattern_area) return;
				this.pattern_design.save_state();
				const { x: raw_x, y: raw_y } = this.k_control_points_layer.getRelativePointerPosition();
				const { x, y } = this.raw_coords_to_pattern_coords({ raw_x, raw_y, snap: true });
				const new_keyframe = this.pattern_design.insert_new_keyframe({
					type: "standard",
					coords: {
						coords: { x, y, z: 0 },
						transition: { name: "linear", params: {} }
					}
				});
				this.pattern_design.commit_operation({ new_keyframes: [new_keyframe] });

				this.selection_rect.visible(false);
				if (!ev.evt.ctrlKey) this.pattern_design.deselect_all_keyframes();
				this.pattern_design.select_keyframes([ new_keyframe ]);
			});
			this.k_control_points_layer.add(this.pattern_area);
		}

		{ //initalize grid
			const { x: layer0x, y: layer0y } = this.pattern_coords_to_layer_coords({ x: 0, y: 0 });
			const axisconfig = {
				listening: false,
				stroke: getComputedStyle(document.body).getPropertyValue("--pattern-axis"),
				strokeWidth: 2,
			};
			this.k_control_points_layer.add(new Konva.Line({
				points: [layer0x, this.pattern_padding, layer0x, this.pattern_padding+this.pattern_square_size],
				...axisconfig
			}));
			this.k_control_points_layer.add(new Konva.Line({
				points: [this.pattern_padding, layer0y, this.pattern_padding+this.pattern_square_size, layer0y],
				...axisconfig
			}));
		}

		{ //init playback
			this.playback_vis = new KonvaPlaybackVis(this);
			this.playback_vis.update();
		}

		{ //init transformer
			this.transformer = new Konva.Transformer({
				// boundBoxFunc: (oldBoundBox, newBoundBox) => {
				// 	if (newBoundBox.width != oldBoundBox.width || newBoundBox.height != oldBoundBox.height) return oldBoundBox;
				// 	else return newBoundBox;
				// }
			});
			this.transformer.on("dragstart", _ev => {
				this.pattern_design.save_state();
			});
			this.transformer.on("dragend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.pattern_design.commit_operation({ updated_keyframes: [...this.pattern_design.selected_keyframes] });
				});
			});
			this.transformer.on("transformstart", _ev => {
				this.pattern_design.save_state();
			});
			this.transformer.on("transformend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.pattern_design.commit_operation({ updated_keyframes: [...this.pattern_design.selected_keyframes] });
				});
			});
			this.k_control_points_layer.add(this.transformer);
		}

		this.selection_rect = new Konva.Rect({
			fill: getComputedStyle(document.body).getPropertyValue("--control-point-select-rect-fill"),
			visible: false,
		});
		this.k_control_points_layer.add(this.selection_rect);

		const keyframes = this.pattern_design.get_sorted_keyframes();
		const control_points = [];
		for (const kf of keyframes) { // render control points
			if (!("coords" in kf)) continue;
			const cp = new KonvaPatternControlPoint(kf, this);
			control_points.push(cp);
		}

		this.update_paths();
		this.update_all_linked();
	}

	update_order() {
		this.update_paths();
		this.update_all_linked();
	}

	update_paths() {
		// render path interp
		const keyframes = this.pattern_design.get_sorted_keyframes();
		/** @type {(KonvaPatternControlPoint | null)[]} */
		const control_points = [];
		for (const kf of keyframes) { // render control points
			if (!("coords" in kf)) continue;
			control_points.push(KonvaPatternControlPoint.get_control_point_from_keyframe(kf));
		}

		for (let i = 0; i < control_points.length && i + 1 < control_points.length; i++) {
			const curr_cp = control_points[i];
			const next_cp = control_points[i + 1];
			if (curr_cp && next_cp) new KonvaPatternControlPointLine(curr_cp, next_cp, this);
		}
		const first_cp = control_points[0];
		const last_cp = control_points[control_points.length-1];
		if (first_cp) first_cp.lines.in = null;
		if (last_cp) last_cp.lines.out = null;
	}

	update_all_linked() {
		let last_cp = null;
		for (const kf of this.pattern_design.get_sorted_keyframes()) {
			if ("coords" in kf) {
				const curr_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(kf);
				curr_cp?.update_linked(null);
				last_cp = curr_cp;
			} else if (kf.type == "pause" || kf.type == "stop") {
				last_cp?.update_linked(kf);
			}
		}
	}

	/**
	 *
	 * @param {{ x: number, y: number }} coords
	 */
	pattern_coords_to_layer_coords({ x, y }) {
		return {
			x: ((x - BoundsCheck.raw.coords.x.min)/(BoundsCheck.raw.coords.x.max-BoundsCheck.raw.coords.x.min)*this.pattern_square_size) + this.pattern_padding,
			y: (this.pattern_square_size - (y - BoundsCheck.raw.coords.y.min)/(BoundsCheck.raw.coords.y.max-BoundsCheck.raw.coords.y.min)*this.pattern_square_size) + this.pattern_padding,
			// z: z+this.pattern_padding,
		};
	}
	/**
	 *
	 * @param {{ raw_x: number, raw_y: number }} coords
	 */
	layer_coords_to_pattern_coords({ raw_x, raw_y }) {
		return {
			x: (raw_x-this.pattern_padding)/this.pattern_square_size * (BoundsCheck.raw.coords.x.max-BoundsCheck.raw.coords.x.min) + BoundsCheck.raw.coords.x.min,
			y: (this.pattern_square_size - (raw_y-this.pattern_padding))/this.pattern_square_size * (BoundsCheck.raw.coords.y.max-BoundsCheck.raw.coords.y.min) + BoundsCheck.raw.coords.y.min,
			// z: z-this.pattern_padding,
		};
	}

	snap_coords({ x, y }) {
		const xy_snapping = this.xy_snapping();
		return {
			x: Math.round(x / xy_snapping) * xy_snapping,
			y: Math.round(y / xy_snapping) * xy_snapping,
		};
	}


	raw_coords_to_pattern_coords({ raw_x, raw_y, snap = false }) {
		let pattern_coords = this.layer_coords_to_pattern_coords({ raw_x, raw_y });
		if (snap) pattern_coords = this.snap_coords(pattern_coords);
		const { x, y } = BoundsCheck.coords({ z: 0, ...pattern_coords });
		return { x, y, };
	}
}

class KonvaPlaybackVis {
	/**
	 *
	 * @param {KonvaPatternStage} pattern_stage
	 */
	constructor(pattern_stage) {
		this.pattern_stage = pattern_stage;
		this.playback_vis = new Konva.Line({
			lineCap: "round",
			lineJoin: "round",
		});

		this.pattern_stage.k_control_points_layer.add(this.playback_vis);

		this.listener_abort = new AbortController();
		this.pattern_stage.pattern_design.state_change_events.addEventListener("playback_update", _ev => {
			this.update();
		});
		this.pattern_stage.pattern_design.state_change_events.addEventListener("commit_update", ev => {
			this.playback_vis.visible(ev.detail.committed);
		});
	}

	destroy() {
		this.playback_vis.destroy();
		this.listener_abort.abort();
	}

	update() {
		const color = getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis");

		const last_eval = this.pattern_stage.pattern_design.last_eval;
		const last_eval_layer_coords = last_eval.map(p => this.pattern_stage.pattern_coords_to_layer_coords(p.coords));

		this.playback_vis.points([last_eval_layer_coords[0].x, last_eval_layer_coords[0].y, ...last_eval_layer_coords.flatMap(c => [c.x, c.y])]);

		this.playback_vis.strokeWidth(10);
		this.playback_vis.stroke(color);
	}
}

const CONTROL_POINT_CIRCLE_RADIUS = 20; //radius of the control point circle
const PAUSE_X = 2.5; //distance between the two lines of the pause symbol
const PAUSE_Y = 5; //half of the height of the pause symbol
const PAUSE_WIDTH = 2; //width of the pause symbol
const PAUSE_OFFSET = { x: CONTROL_POINT_CIRCLE_RADIUS-4, y: -CONTROL_POINT_CIRCLE_RADIUS-8 }; //offset of the pause symbol from the center of its control point circle

const STOP_RADIUS = 9; //radius of the stop symbol
const STOP_STRK_WIDTH = 1.5; //width of the stroke of the stop symbol

class KonvaPatternControlPoint {
	/** @type {{ in: KonvaPatternControlPointLine | null, out: KonvaPatternControlPointLine | null }} */
	lines = { in: null, out: null };

	/**
	 *
	 * @param {NotNullable<ReturnType<import("../fe/keyframes/index.mjs").filter_has_coords>>} keyframe
	 * @param {KonvaPatternStage} pattern_stage
	 */
	constructor(keyframe, pattern_stage) {
		this.keyframe = keyframe;
		this.pattern_stage = pattern_stage;

		/** @type {Set<MAHKeyframePauseFE | MAHKeyframeStopFE>} */
		this.linked_keyframes = new Set();

		//TODO: it would be nice if perfectly overlapping control points were made obvious to the user
		this.k_cp_circle = new Konva.Circle({
			x: -1,
			y: -1,
			radius: CONTROL_POINT_CIRCLE_RADIUS,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		this.k_cp_circle.on("click", ev => {
			this.select_this(ev.evt.ctrlKey, false);

			if (ev.evt.altKey) {
				pattern_stage.pattern_design.save_state();
				const deleted_keyframes = pattern_stage.pattern_design.delete_keyframes([...pattern_stage.pattern_design.selected_keyframes]);
				pattern_stage.pattern_design.commit_operation({ deleted_keyframes });
				return;
			}
		});
		this.k_cp_circle.on("mouseenter", _ev => {
			document.body.style.cursor = "pointer";
		});
		// not using "pointer" makes alt+click, etc less discoverable
		// this.k_cp_circle.on("mousedown", _ev => {
		// 	document.body.style.cursor = "grabbing";
		// });
		// this.k_cp_circle.on("mouseup", _ev => {
		// 	document.body.style.cursor = "grab";
		// });
		this.k_cp_circle.on("mouseleave", _ev => {
			document.body.style.cursor = "";
		});
		this.k_cp_circle.on("dragstart", ev => {
			this.select_this(ev.evt.ctrlKey, true);
		});
		this.k_cp_circle.on("dragmove", _ev => {
			this.update_position(this.pattern_stage.raw_coords_to_pattern_coords({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y(), snap: this.pattern_stage.transformer.nodes().length<=1 }));
		});
		this.k_cp_circle.on("transform", _ev => {
			// console.log("transform "+this.keyframe.time);
			this.k_cp_circle.scale({ x: 1, y: 1 });
			this.k_cp_circle.skew({ x: 0, y: 0 });
			this.k_cp_circle.rotation(0);
			this.update_position(this.pattern_stage.raw_coords_to_pattern_coords({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() }));
		});
		this.k_cp_circle.on("dragend transformend", _ev => {
			this.update_position(this.pattern_stage.raw_coords_to_pattern_coords({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y(), snap: true }));
		});

		this.linked_group = new Konva.Group({
			visible: true,
			listening: false,
		});

		this.linked_pause_group = new Konva.Group({
			visible: false,
			listening: false,
		});
		this.linked_group.add(this.linked_pause_group);
		this.linked_pause_group.add(new Konva.Rect({
			x: -PAUSE_X-PAUSE_WIDTH/2,
			y: -PAUSE_Y,
			width: PAUSE_WIDTH,
			height: 2*PAUSE_Y,
		}));
		this.linked_pause_group.add(new Konva.Rect({
			x: PAUSE_X-PAUSE_WIDTH/2,
			y: -PAUSE_Y,
			width: PAUSE_WIDTH,
			height: 2*PAUSE_Y,
		}));

		this.linked_stop_group = new Konva.Group({
			visible: false,
			listening: false,
		});
		this.linked_group.add(this.linked_stop_group);
		this.linked_stop_group.add(new Konva.RegularPolygon({
			sides: 8,
			radius: STOP_RADIUS,
			strokeWidth: STOP_STRK_WIDTH,
			rotation: 180*Math.PI/8,
		}));


		pattern_stage.k_control_points_layer.add(this.linked_group);

		this.listener_abort = new AbortController();
		pattern_stage.pattern_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;
			const prev_cp = this.lines.in?.curr_cp;
			const next_cp = this.lines.out?.next_cp;
			if (prev_cp && next_cp) new KonvaPatternControlPointLine(prev_cp, next_cp, pattern_stage);
			else {
				this.lines.out?.line.destroy();
				this.lines.in?.line.destroy();
				if (prev_cp) prev_cp.lines.out = null;
				if (next_cp) next_cp.lines.in = null;
			}

			this.destroy();
		}, { signal: this.listener_abort.signal });

		pattern_stage.pattern_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_position(keyframe.coords.coords);
		}, { signal: this.listener_abort.signal });

		pattern_stage.pattern_design.state_change_events.addEventListener("kf_select", ev => {
			if (ev.detail.keyframe == keyframe) {
				this.update_select(true);

			// @ts-ignore TypeScript/issues/13086
			} else if (this.linked_keyframes.has(ev.detail.keyframe)) {
				// @ts-ignore TypeScript/issues/13086
				this.update_linked(ev.detail.keyframe);
			}
		}, { signal: this.listener_abort.signal });

		pattern_stage.pattern_design.state_change_events.addEventListener("kf_deselect", ev => {
			if (ev.detail.keyframe == keyframe) {
				this.update_select(false);

			// @ts-ignore TypeScript/issues/13086
			} else if (this.linked_keyframes.has(ev.detail.keyframe)) {
				// @ts-ignore TypeScript/issues/13086
				this.update_linked(ev.detail.keyframe);
			}
		}, { signal: this.listener_abort.signal });

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;

		this.update_position(keyframe.coords.coords);
		this.update_select(pattern_stage.pattern_design.is_keyframe_selected(keyframe));
		// this.update_pause();
	}

	destroy() {
		this.k_cp_circle.destroy();
		this.listener_abort.abort();
		this.linked_group.destroy();
	}

	/**
	 *
	 * @param {boolean} ctrlKey
	 * @param {boolean} dont_deselect
	 */
	select_this(ctrlKey, dont_deselect) {
		if (this.pattern_stage.pattern_design.is_keyframe_selected(this.keyframe)) {
			if (ctrlKey && !dont_deselect) this.pattern_stage.pattern_design.deselect_keyframes([this.keyframe]);
			return;
		}

		if (!ctrlKey) this.pattern_stage.pattern_design.deselect_all_keyframes();
		this.pattern_stage.pattern_design.select_keyframes([this.keyframe]);
	}

	has_linked() {
		return this.linked_keyframes.size > 0;
	}
	has_pause() {
		return this.linked_pause_group.visible();
	}
	has_stop() {
		return this.linked_stop_group.visible();
	}

	/**
	 *
	 * @param {MAHKeyframePauseFE | MAHKeyframeStopFE | null} linked_keyframe
	 */
	update_linked(linked_keyframe) {
		if (linked_keyframe) this.linked_keyframes.add(linked_keyframe);
		else this.linked_keyframes.clear();

		if (this.has_linked()) {
			const pause_keyframe = [...this.linked_keyframes].find(kf => kf.type == "pause");
			this.linked_pause_group.visible(!!pause_keyframe);
			if (pause_keyframe) {
				const fillvar = this.pattern_stage.pattern_design.selected_keyframes.has(pause_keyframe)?"--control-point-pause-selected":"--control-point-pause";
				//@ts-ignore
				for (const c of this.linked_pause_group.children) c.fill(getComputedStyle(document.body).getPropertyValue(fillvar));
			}

			const stop_keyframe = [...this.linked_keyframes].find(kf => kf.type == "stop");
			this.linked_stop_group.visible(!!stop_keyframe);
			if (stop_keyframe) {
				const strokevar = this.pattern_stage.pattern_design.selected_keyframes.has(stop_keyframe)?"--control-point-stop-selected":"--control-point-stop";
				//@ts-ignore
				for (const c of this.linked_stop_group.children) c.stroke(getComputedStyle(document.body).getPropertyValue(strokevar));
			}



			this.linked_group.setZIndex((this.pattern_stage.k_control_points_layer.children?.length || 999)-1);
		}
	}

	/**
	 *
	 * @param {boolean} selected
	 */
	update_select(selected) {
		const stroke = selected? "--control-point-stroke-selected" : "--control-point-stroke";
		this.k_cp_circle.stroke(getComputedStyle(document.body).getPropertyValue(stroke));
		if (selected) this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().concat([this.k_cp_circle]));
		else this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().filter(n => n != this.k_cp_circle));
	}

	/**
	 *
	 * @param {{ x: number, y: number }} pattern_coords
	 */
	update_position(pattern_coords) {
		const layer_coords = this.pattern_stage.pattern_coords_to_layer_coords(pattern_coords);

		this.k_cp_circle.x(layer_coords.x);
		this.k_cp_circle.y(layer_coords.y);
		this.linked_group.x(layer_coords.x + PAUSE_OFFSET.x);
		this.linked_group.y(layer_coords.y + PAUSE_OFFSET.y);
		this.keyframe.coords.coords.x = pattern_coords.x;
		this.keyframe.coords.coords.y = pattern_coords.y;

		if (this.lines.in) {
			const points = this.lines.in.line.points();
			points[2] = layer_coords.x;
			points[3] = layer_coords.y;
			this.lines.in.line.points(points);
		}
		if (this.lines.out) {
			const points = this.lines.out.line.points();
			points[0] = layer_coords.x;
			points[1] = layer_coords.y;
			this.lines.out.line.points(points);
		}
	}


	/**
	 *
	 * @param {typeof KonvaPatternControlPoint.prototype.keyframe | null | undefined} keyframe
	 * @returns {KonvaPatternControlPoint | null}
	 */
	static get_control_point_from_keyframe(keyframe) {
		return keyframe?.[KonvaPatternControlPointSymbol];
	}
}

class KonvaPatternControlPointLine {
	/**
	 *
	 * @param {KonvaPatternControlPoint} curr_cp
	 * @param {KonvaPatternControlPoint} next_cp
	 * @param {KonvaPatternStage} pattern_stage
	 */
	constructor(curr_cp, next_cp, pattern_stage) {
		this.line = new Konva.Line({
			points: [curr_cp.k_cp_circle.x(), curr_cp.k_cp_circle.y(), next_cp.k_cp_circle.x(), next_cp.k_cp_circle.y()],
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-line-stroke"),
			strokeWidth: 2,
			listening: false,
		});

		const old_out = curr_cp.lines.out;
		if (old_out) old_out.line.destroy();
		const old_in = next_cp.lines.in;
		if (old_in) old_in.line.destroy();

		curr_cp.lines.out = this;
		next_cp.lines.in = this;

		this.curr_cp = curr_cp;
		this.next_cp = next_cp;

		pattern_stage.k_control_points_layer.add(this.line);
	}
}