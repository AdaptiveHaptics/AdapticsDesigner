import { filter_by_coords, has_coords } from "../fe/keyframes/index.mjs";
import { KonvaResizeStage } from "./shared.mjs";
import { notnull } from "../util.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframePauseFE} MAHKeyframePauseFE */
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
	playback_vis = new Konva.Circle();
	pattern_area = new Konva.Rect();


	/**
	 *
	 * @param {MAHPatternDesignFE} current_design
	 * @param {string} direct_container_id
	 * @param {HTMLElement} resize_container
	 */
	constructor(current_design, direct_container_id, resize_container, {
		pattern_square_size = KonvaPatternStage.pattern_square_size,
		pattern_padding = KonvaPatternStage.pattern_padding,
	} = {}) {
		super(direct_container_id, resize_container, {
			stageWidth: pattern_square_size + 2*pattern_padding,
			stageHeight: pattern_square_size + 2*pattern_padding,
		});

		this.pattern_padding = pattern_padding;
		this.pattern_square_size = pattern_square_size;
		this.current_design = current_design;

		this.k_control_points_layer = new Konva.Layer();
		this.k_stage.add(this.k_control_points_layer);

		resize_container.addEventListener("keydown", ev => {
			if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
				ev.preventDefault();
				ev.stopPropagation();
				this.current_design.deselect_all_keyframes();
				this.current_design.select_keyframes(this.current_design.filedata.keyframes.filter(has_coords));
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
				const low_coords = this.layer_coords_to_pattern_coords({ raw_x: Math.min(x1, x2), raw_y: Math.min(y1, y2) });
				const high_coords = this.layer_coords_to_pattern_coords({ raw_x: Math.max(x1, x2), raw_y: Math.max(y1, y2) });
				const keyframes_in_box = this.current_design.filedata.keyframes.filter(has_coords).filter(kf => {
					return (
						low_coords.x <= kf.coords.coords.x && kf.coords.coords.x <= high_coords.x &&
						low_coords.y <= kf.coords.coords.y && kf.coords.coords.y <= high_coords.y
					);
				});
				const linked_keyframes = [];
				for (const kf of keyframes_in_box) {
					const cp = KonvaPatternControlPoint.get_control_point_from_keyframe(kf);
					if (cp?.pause_keyframe) linked_keyframes.push(cp?.pause_keyframe);
				}
				this.current_design.group_select_logic(keyframes_in_box, linked_keyframes, { shiftKey: ev.shiftKey, ctrlKey: ev.ctrlKey, altKey: ev.altKey });
			});
		}


		current_design.state_change_events.addEventListener("kf_new", ev => {
			if ("coords" in ev.detail.keyframe) {
				const curr_cp = new KonvaPatternControlPoint(ev.detail.keyframe, this);
				const prev_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.current_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_by_coords, "prev"));
				const next_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.current_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_by_coords, "next"));
				if (prev_cp) new KonvaPatternControlPointLine(prev_cp, curr_cp, this);
				if (next_cp) new KonvaPatternControlPointLine(curr_cp, next_cp, this);
				if (prev_cp?.is_paused()) {
					this.update_all_pause();
				}
			} else if (ev.detail.keyframe.type == "pause") {
				const prev_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(
					this.current_design.get_nearest_neighbor_keyframe_matching_pred(ev.detail.keyframe, filter_by_coords, "prev"));
				if (prev_cp) prev_cp.update_pause(ev.detail.keyframe);
			}
		});
		current_design.state_change_events.addEventListener("kf_delete", _ev => {
			this.update_all_pause();
		});
		current_design.state_change_events.addEventListener("rerender", _ev => {
			this.render_design();
		});
		current_design.state_change_events.addEventListener("kf_reorder", _ev => {
			this.update_order();
		});


		current_design.state_change_events.addEventListener("playback_update", _ev => {
			this.update_playback_vis();
		});
		current_design.state_change_events.addEventListener("commit_update", ev => {
			this.playback_vis.visible(ev.detail.committed);
		});


		this.render_design();
	}

	render_design() {
		for (const kf of this.current_design.filedata.keyframes) {
			if ("coords" in kf) {
				KonvaPatternControlPoint.get_control_point_from_keyframe(kf)?.destroy();
			}
		}
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
				this.current_design.save_state();
				const { x: raw_x, y: raw_y } = this.k_control_points_layer.getRelativePointerPosition();
				const { x, y } = this.raw_coords_to_pattern_coords({ raw_x, raw_y });
				const new_keyframe = this.current_design.insert_new_keyframe({
					type: "standard",
					coords: {
						coords: { x, y, z: 0 },
						transition: { name: "linear", params: {} }
					}
				});
				this.current_design.commit_operation({ new_keyframes: [new_keyframe] });

				this.selection_rect.visible(false);
				if (!ev.evt.ctrlKey) this.current_design.deselect_all_keyframes();
				this.current_design.select_keyframes([ new_keyframe ]);
			});
			this.k_control_points_layer.add(this.pattern_area);
		}

		{ //init playback
			this.playback_vis = new Konva.Circle({
				radius: 5,
			});
			this.update_playback_vis();
			this.k_control_points_layer.add(this.playback_vis);
		}

		{ //init transformer
			this.transformer = new Konva.Transformer({
				// boundBoxFunc: (oldBoundBox, newBoundBox) => {
				// 	if (newBoundBox.width != oldBoundBox.width || newBoundBox.height != oldBoundBox.height) return oldBoundBox;
				// 	else return newBoundBox;
				// }
			});
			this.transformer.on("dragstart", _ev => {
				this.current_design.save_state();
			});
			this.transformer.on("dragend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
				});
			});
			this.transformer.on("transformstart", _ev => {
				this.current_design.save_state();
			});
			this.transformer.on("transformend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
				});
			});
			this.k_control_points_layer.add(this.transformer);
		}

		this.selection_rect = new Konva.Rect({
			fill: getComputedStyle(document.body).getPropertyValue("--control-point-select-rect-fill"),
			visible: false,
		});
		this.k_control_points_layer.add(this.selection_rect);

		const keyframes = this.current_design.get_sorted_keyframes();
		const control_points = [];
		for (const kf of keyframes) { // render control points
			if (!("coords" in kf)) continue;
			const cp = new KonvaPatternControlPoint(kf, this);
			control_points.push(cp);
		}

		this.update_paths();
		this.update_all_pause();
	}

	update_order() {
		this.update_paths();
		this.update_all_pause();
	}

	update_paths() {
		// render path interp
		const keyframes = this.current_design.get_sorted_keyframes();
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
	}

	update_all_pause() {
		let last_cp = null;
		for (const kf of this.current_design.get_sorted_keyframes()) {
			if ("coords" in kf) {
				const curr_cp = KonvaPatternControlPoint.get_control_point_from_keyframe(kf);
				curr_cp?.update_pause(null);
				last_cp = curr_cp;
			} else if (kf.type == "pause") {
				last_cp?.update_pause(kf);
			}
		}
	}

	update_playback_vis() {
		const last_eval = this.current_design.last_eval;
		const last_eval_layer_coords = this.pattern_coords_to_layer_coords(last_eval.coords);
		this.playback_vis.x(last_eval_layer_coords.x);
		this.playback_vis.y(last_eval_layer_coords.y);
		this.playback_vis.opacity();
		this.playback_vis.fill(getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis"));
	}

	/**
	 *
	 * @param {{ x: number, y: number }} coords
	 */
	pattern_coords_to_layer_coords({ x, y }) {
		return {
			x: x+this.pattern_padding,
			y: y+this.pattern_padding,
			// z: z+this.pattern_padding,
		};
	}
	/**
	 *
	 * @param {{ raw_x: number, raw_y: number }} coords
	 */
	layer_coords_to_pattern_coords({ raw_x, raw_y }) {
		return {
			x: raw_x-this.pattern_padding,
			y: raw_y-this.pattern_padding,
			// z: z-this.pattern_padding,
		};
	}


	raw_coords_to_pattern_coords({ raw_x, raw_y }) {
		const pattern_coords = this.layer_coords_to_pattern_coords({ raw_x, raw_y });
		const x = Math.min(Math.max(pattern_coords.x, 0), this.pattern_square_size);
		const y = Math.min(Math.max(pattern_coords.y, 0), this.pattern_square_size);
		// if (snap) {
		// 	const ms_snapping = this.timeline_stage.milliseconds_snapping();
		// 	raw_xt = Math.round(raw_xt / ms_snapping) * ms_snapping;
		// }
		return { x, y, };
	}
}

const pausex = 4;
const pausey = 8;
const pausewidth = 3;

class KonvaPatternControlPoint {
	/** @type {{ in: KonvaPatternControlPointLine | null, out: KonvaPatternControlPointLine | null }} */
	lines = { in: null, out: null };

	/**
	 *
	 * @param {NotNullable<ReturnType<import("../fe/keyframes/index.mjs").filter_by_coords>>} keyframe
	 * @param {KonvaPatternStage} pattern_stage
	 */
	constructor(keyframe, pattern_stage) {
		this.keyframe = keyframe;
		this.pattern_stage = pattern_stage;

		//TODO: it would be nice if perfectly overlapping control points were made obvious to the user
		this.k_cp_circle = new Konva.Circle({
			x: -1,
			y: -1,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		this.k_cp_circle.on("click", ev => {
			this.select_this(ev.evt.ctrlKey, false);

			if (ev.evt.altKey) {
				pattern_stage.current_design.save_state();
				const deleted_keyframes = pattern_stage.current_design.delete_keyframes([...pattern_stage.current_design.selected_keyframes]);
				pattern_stage.current_design.commit_operation({ deleted_keyframes });
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
			this.update_position(this.pattern_stage.raw_coords_to_pattern_coords({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() }));
		});
		this.k_cp_circle.on("transform", _ev => {
			// console.log("transform "+this.keyframe.time);
			this.k_cp_circle.scale({ x: 1, y: 1 });
			this.k_cp_circle.skew({ x: 0, y: 0 });
			this.k_cp_circle.rotation(0);
			this.update_position(this.pattern_stage.raw_coords_to_pattern_coords({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() }));
		});

		this.paused_group = new Konva.Group({
			visible: false,
			listening: false,
		});
		this.paused_group.add(new Konva.Rect({
			x: -pausex-pausewidth/2,
			y: -pausey,
			width: pausewidth,
			height: 2*pausey,
		}));
		this.paused_group.add(new Konva.Rect({
			x: pausex-pausewidth/2,
			y: -pausey,
			width: pausewidth,
			height: 2*pausey,
		}));
		pattern_stage.k_control_points_layer.add(this.paused_group);

		this.listener_abort = new AbortController();
		pattern_stage.current_design.state_change_events.addEventListener("kf_delete", ev => {
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

		pattern_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_position(keyframe.coords.coords);
		}, { signal: this.listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_select", ev => {
			if (ev.detail.keyframe == keyframe) {
				this.update_select(true);
			} else if (ev.detail.keyframe == this.pause_keyframe) {
				this.update_pause(this.pause_keyframe);
			}
		}, { signal: this.listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_deselect", ev => {
			if (ev.detail.keyframe == keyframe) {
				this.update_select(false);
			} else if (ev.detail.keyframe == this.pause_keyframe) {
				this.update_pause(this.pause_keyframe);
			}
		}, { signal: this.listener_abort.signal });

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;

		this.update_position(keyframe.coords.coords);
		this.update_select(pattern_stage.current_design.is_keyframe_selected(keyframe));
		// this.update_pause();
	}

	destroy() {
		this.k_cp_circle.destroy();
		this.listener_abort.abort();
		this.paused_group.destroy();
	}

	/**
	 *
	 * @param {boolean} ctrlKey
	 * @param {boolean} dont_deselect
	 */
	select_this(ctrlKey, dont_deselect) {
		if (this.pattern_stage.current_design.is_keyframe_selected(this.keyframe)) {
			if (ctrlKey && !dont_deselect) this.pattern_stage.current_design.deselect_keyframes([this.keyframe]);
			return;
		}

		if (!ctrlKey) this.pattern_stage.current_design.deselect_all_keyframes();
		this.pattern_stage.current_design.select_keyframes([this.keyframe]);
	}

	is_paused() {
		return this.paused_group.visible();
	}

	/**
	 *
	 * @param {MAHKeyframePauseFE | null} pause_keyframe
	 */
	update_pause(pause_keyframe) {
		this.pause_keyframe = pause_keyframe;
		this.paused_group.visible(!!pause_keyframe);
		if (pause_keyframe) {
			const fillvar = this.pattern_stage.current_design.selected_keyframes.has(pause_keyframe)?"--control-point-pause-selected":"--control-point-pause";
			//@ts-ignore
			for (const c of this.paused_group.children) c.fill(getComputedStyle(document.body).getPropertyValue(fillvar));
			this.paused_group.setZIndex((this.pattern_stage.k_control_points_layer.children?.length || 999)-1);
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
		this.paused_group.x(layer_coords.x);
		this.paused_group.y(layer_coords.y);
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