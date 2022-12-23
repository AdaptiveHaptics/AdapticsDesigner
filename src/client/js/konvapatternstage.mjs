import { KonvaResizeStage } from "./konvashared.mjs";
import { notnull } from "./util.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("./script.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaPatternControlPointSymbol = Symbol("KonvaPatternControlPoint");

export class KonvaPatternStage extends KonvaResizeStage {
	transformer = new Konva.Transformer();
	selection_rect = new Konva.Rect();

	/**
	 * 
	 * @param {MAHPatternDesignFE} current_design 
	 * @param {string} direct_container_id 
	 * @param {HTMLElement} resize_container 
	 */
	constructor(current_design, direct_container_id, resize_container) {
		super(direct_container_id, resize_container, { stageWidth: 500, stageHeight: 500 });

		this.current_design = current_design;

		this.k_control_points_layer = new Konva.Layer();
		this.k_stage.add(this.k_control_points_layer);

		this.k_stage.on("dblclick", _ev => {
			current_design.save_state();
			const { x, y } = this.k_stage.getRelativePointerPosition();
			const new_keyframe = this.current_design.append_new_keyframe({ coords: { x, y, z: 0 } });
			current_design.commit_operation({ new_keyframes: [new_keyframe] });
		});
		// this.k_stage.on("click", ev => {
		// 	if (ev.target == this.k_stage && !ev.evt.ctrlKey) current_design.deselect_all_keyframes();
		// });

		{ //initialize selection_rect
			let x1, y1, x2, y2;
			this.k_stage.on("mousedown touchstart", ev => {
				if (ev.target != this.k_stage) return;
				ev.evt.preventDefault();
				x1 = notnull(this.k_control_points_layer.getRelativePointerPosition()).x;
				y1 = notnull(this.k_control_points_layer.getRelativePointerPosition()).y;
				x2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).x;
				y2 = notnull(this.k_control_points_layer.getRelativePointerPosition()).y;

				this.selection_rect.visible(true);
				this.selection_rect.width(0);
				this.selection_rect.height(0);
			});
			this.k_stage.on("mousemove touchmove", ev => {
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
			this.k_stage.on("mouseup mouseleave touchend", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect.visible()) return;
				ev.evt.preventDefault();

				// update visibility in timeout, so we can check it in click event
				// setTimeout(() => {
				// 	this.selection_rect.visible(false);
				// });
				this.selection_rect.visible(false);

				// const box = this.selection_rect.getSelfRect();
				const keyframes_in_box = current_design.filedata.keyframes.filter(kf => {
					return (
						Math.min(x1, x2) <= kf.coords.x && kf.coords.x <= Math.max(x1, x2) &&
						Math.min(y1, y2) <= kf.coords.y && kf.coords.y <= Math.max(y1, y2)
					);
				});
				if (!ev.evt.ctrlKey) current_design.deselect_all_keyframes();
				current_design.select_keyframes(keyframes_in_box);
			});
		}


		current_design.state_change_events.addEventListener("kf_new", ev => {
			const keyframes = this.current_design.get_sorted_keyframes();
			const index = keyframes.indexOf(ev.detail.keyframe);
			const curr_cp = new KonvaPatternControlPoint(ev.detail.keyframe, this);
			/** @type {KonvaPatternControlPoint} */
			const prev_cp = keyframes[index - 1]?.[KonvaPatternControlPointSymbol];
			/** @type {KonvaPatternControlPoint} */
			const next_cp = keyframes[index + 1]?.[KonvaPatternControlPointSymbol];
			if (prev_cp) {
				prev_cp.lines.out?.line.destroy();
				const _kpcpl = new KonvaPatternControlPointLine(prev_cp, curr_cp, this);
			}
			if (next_cp) {
				next_cp.lines.out?.line.destroy();
				const _kpcpl = new KonvaPatternControlPointLine(curr_cp, next_cp, this);
			}
		});
		current_design.state_change_events.addEventListener("rerender", _ev => {
			this.render_design();
		});
		current_design.state_change_events.addEventListener("kf_reorder", _ev => {
			//just take the easy route
			this.render_design();
		});


		this.render_design();
	}

	render_design() {
		for (const kf of this.current_design.filedata.keyframes) {
			kf[KonvaPatternControlPointSymbol]?.destroy();
		}
		this.k_control_points_layer.destroyChildren();

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
				this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
			});
			this.transformer.on("transformstart", _ev => {
				this.current_design.save_state();
			});
			this.transformer.on("transformend", _ev => {
				this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
			});
			this.k_control_points_layer.add(this.transformer);
		}

		this.selection_rect = new Konva.Rect({
			fill: getComputedStyle(document.body).getPropertyValue("--control-point-select-rect-fill"),
			visible: false,
		});
		this.k_control_points_layer.add(this.selection_rect);

		const keyframes = this.current_design.get_sorted_keyframes();

		// render control points
		const control_points = keyframes.map(keyframe => new KonvaPatternControlPoint(keyframe, this));

		//render path interp
		for (let i = 0; i < control_points.length && i + 1 < control_points.length; i++) {
			const curr_cp = control_points[i];
			const next_cp = control_points[i + 1];
			const _kpcpl = new KonvaPatternControlPointLine(curr_cp, next_cp, this);
		}

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
			strokeWidth: 2
		});
		curr_cp.lines.out = this;
		next_cp.lines.in = this;

		this.curr_cp = curr_cp;
		this.next_cp = next_cp;

		pattern_stage.k_control_points_layer.add(this.line);
	}
}

class KonvaPatternControlPoint {
	/** @type {{ in: KonvaPatternControlPointLine | null, out: KonvaPatternControlPointLine | null }} */
	lines = { in: null, out: null };
	/**
	 * 
	 * @param {MAHKeyframeFE} keyframe 
	 * @param {KonvaPatternStage} pattern_stage 
	 */
	constructor(keyframe, pattern_stage) {
		this.keyframe = keyframe;
		this.pattern_stage = pattern_stage;

		//TODO: it would be nice if perfectly overlapping control points were made obvious to the user
		this.k_cp_circle = new Konva.Circle({
			x: keyframe.coords.x,
			y: keyframe.coords.y,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		this.k_cp_circle.on("click", ev => {
			this.select_this(ev.evt.ctrlKey);
			
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
		this.k_cp_circle.on("mouseleave", _ev => {
			document.body.style.cursor = "";
		});
		this.k_cp_circle.on("dragstart", ev => {
			// console.log("dragstart "+this.keyframe.time);

			this.select_this(ev.evt.ctrlKey);
		});
		this.k_cp_circle.on("dragmove", _ev => {
			this.update_control_point({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() });
		});
		this.k_cp_circle.on("transform", _ev => {
			// console.log("transform "+this.keyframe.time);
			this.k_cp_circle.scale({ x: 1, y: 1 });
			this.k_cp_circle.skew({ x: 0, y: 0 });
			this.k_cp_circle.rotation(0);
			this.update_control_point({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() });
		});

		this.listener_abort = new AbortController();
		pattern_stage.current_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;
			const prev_cp = this.lines.in?.curr_cp;
			const next_cp = this.lines.out?.next_cp;
			this.lines.in?.line.destroy();
			this.lines.out?.line.destroy();
			if (prev_cp && next_cp) new KonvaPatternControlPointLine(prev_cp, next_cp, pattern_stage);
			else {
				if (prev_cp) prev_cp.lines.out = null;
				if (next_cp) next_cp.lines.in = null;
			}

			this.destroy();
		}, { signal: this.listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_control_point();
		}, { signal: this.listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_select", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.k_cp_circle.stroke(getComputedStyle(document.body).getPropertyValue("--control-point-stroke-selected"));
			this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().concat([this.k_cp_circle]));
		}, { signal: this.listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_deselect", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.k_cp_circle.stroke(getComputedStyle(document.body).getPropertyValue("--control-point-stroke"));
			this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().filter(n => n != this.k_cp_circle));
		}, { signal: this.listener_abort.signal });

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;
	}

	destroy() {
		this.k_cp_circle.destroy();
		this.listener_abort.abort();
	}

	/**
	 * 
	 * @param {boolean} ctrlKey 
	 */
	select_this(ctrlKey) {
		if (this.pattern_stage.current_design.is_keyframe_selected(this.keyframe)) {
			if (ctrlKey) this.pattern_stage.current_design.deselect_keyframes([this.keyframe]);
			return;
		}

		if (!ctrlKey) this.pattern_stage.current_design.deselect_all_keyframes();
		this.pattern_stage.current_design.select_keyframes([this.keyframe]);
	}

	update_control_point({ raw_x, raw_y } = { raw_x: this.keyframe.coords.x, raw_y: this.keyframe.coords.y }) {
		const x = Math.min(Math.max(raw_x, 0), this.pattern_stage.stageWidth);
		const y = Math.min(Math.max(raw_y, 0), this.pattern_stage.stageHeight);
		this.k_cp_circle.x(x);
		this.k_cp_circle.y(y);
		this.keyframe.coords.x = x;
		this.keyframe.coords.y = y;

		this.k_cp_circle.x(x);
		this.k_cp_circle.y(y);

		if (this.lines.in) {
			const points = this.lines.in.line.points();
			points[2] = x;
			points[3] = y;
			this.lines.in.line.points(points);
		}
		if (this.lines.out) {
			const points = this.lines.out.line.points();
			points[0] = x;
			points[1] = y;
			this.lines.out.line.points(points);
		}
	}
}