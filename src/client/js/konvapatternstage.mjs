import { KonvaResizeStage } from "./konvashared.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaPatternControlPointSymbol = Symbol("KonvaPatternControlPoint");

export class KonvaPatternStage extends KonvaResizeStage {
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
		this.transformer = new Konva.Transformer();
		this.k_control_points_layer.add(this.transformer);
		this.k_stage.add(this.k_control_points_layer);

		this.k_stage.on("dblclick", ev => {
			current_design.save_state();
			const { x, y } = this.k_stage.getRelativePointerPosition();
			const new_keyframe = this.current_design.append_new_keyframe({ coords: {x, y, z: 0} });
			current_design.commit_operation({ new_keyframes: [new_keyframe] });
		});
		this.k_stage.on("click", ev => {
			if (ev.target == this.k_stage && !ev.evt.ctrlKey) current_design.deselect_all_keyframes();
		});


		current_design.state_change_events.addEventListener("kf_new", ev => {
			const keyframes = this.current_design.get_sorted_keyframes();
			const index = keyframes.indexOf(ev.detail.keyframe);
			const curr_cp = new KonvaPatternControlPoint(ev.detail.keyframe, this);
			const prev_cp = keyframes[index-1]?.[KonvaPatternControlPointSymbol];
			const next_cp = keyframes[index+1]?.[KonvaPatternControlPointSymbol];
			if (prev_cp) {
				const kpcpl = new KonvaPatternControlPointLine(prev_cp, curr_cp, this);
			}
			if (next_cp) {
				const kpcpl = new KonvaPatternControlPointLine(curr_cp, next_cp, this);
			}
		});
		current_design.state_change_events.addEventListener("rerender", ev => {
			this.render_design();
		});


		this.render_design();
	}
	
	render_design() {
		this.k_control_points_layer.destroyChildren(); // i assume no memory leak since external references to KonvaPatternControlPointLines should be overwritten by following code

		this.transformer = new Konva.Transformer({
			// boundBoxFunc: (oldBoundBox, newBoundBox) => {
			// 	if (newBoundBox.width != oldBoundBox.width || newBoundBox.height != oldBoundBox.height) return oldBoundBox;
			// 	else return newBoundBox;
			// }
		});
		this.transformer.on("dragstart", ev => {
			// console.log("dragstart transformer");
			this.current_design.save_state();
		});
		this.transformer.on("dragend", ev => {
			// console.log("dragend transformer");
			this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
		});
		this.transformer.on("dragmove", ev => {
			// console.log("dragmove transformer");
		});
		this.transformer.on("transformstart", ev => {
			// console.log("transformstart transformer");
			this.current_design.save_state();
		});
		this.transformer.on("transformend", ev => {
			// console.log("transformend transformer");
			this.current_design.commit_operation({ updated_keyframes: [...this.current_design.selected_keyframes] });
		});
		this.transformer.on("transform", ev => {
			// console.log("transform transformer");
		});
		this.k_control_points_layer.add(this.transformer);

		const keyframes = this.current_design.get_sorted_keyframes();
		
		// render control points
		const control_points = keyframes.map(keyframe => new KonvaPatternControlPoint(keyframe, this));

		//render path interp
		for (let i = 0; i < control_points.length && i + 1 < control_points.length; i++) {
			const curr_cp = control_points[i];
			const next_cp = control_points[i + 1];
			const kpcpl = new KonvaPatternControlPointLine(curr_cp, next_cp, this);
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
	 * @param {MAHKeyframe} keyframe 
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
			// dragBoundFunc: pos => { //doesnt work cause pos.x is different this.k_cp_circle.x()
			// 	return {
			// 		x: Math.min(Math.max(pos.x, 0), this.pattern_stage.stageWidth),
			// 		y: Math.min(Math.max(pos.y, 0), this.pattern_stage.stageHeight),
			// 	};
			// }
		});
		this.k_cp_circle.on("click", ev => {
			console.log("click "+this.keyframe.time);
			if (ev.evt.altKey) {		
				pattern_stage.current_design.save_state();
				const deleted_keyframes = pattern_stage.current_design.delete_keyframes([keyframe]);
				pattern_stage.current_design.commit_operation({ deleted_keyframes });
				return;
			}

			this.select_this(ev.evt.ctrlKey);
		});
		this.k_cp_circle.on("mouseenter", ev => {
			document.body.style.cursor = "pointer";
		});
		this.k_cp_circle.on("mouseleave", ev => {
			document.body.style.cursor = "";
		});
		this.k_cp_circle.on("dragstart", ev => {
			// console.log("dragstart "+this.keyframe.time);

			if (!this.pattern_stage.current_design.is_keyframe_selected(keyframe)) {
				this.select_this(ev.evt.ctrlKey);
			}
		});
		// this.k_cp_circle.on("dragend", ev => {
		// 	console.log("dragend "+this.keyframe.time);
		// 	pattern_stage.current_design.commit_operation({ updated_keyframes: [keyframe] });
		// });
		this.k_cp_circle.on("dragmove", ev => {
			this.update_control_point({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() });
		});
		this.k_cp_circle.on("transformstart", ev => {
			// console.log("transformstart "+this.keyframe.time);
		});
		this.k_cp_circle.on("transformend", ev => {
			// console.log("transformend "+this.keyframe.time);
		});
		this.k_cp_circle.on("transform", ev => {
			// console.log("transform "+this.keyframe.time);
			this.k_cp_circle.scale({ x: 1, y: 1 });
			this.k_cp_circle.skew({ x: 0, y: 0 });
			this.k_cp_circle.rotation(0);
			this.update_control_point({ raw_x: this.k_cp_circle.x(), raw_y: this.k_cp_circle.y() });
		});

		const listener_abort = new AbortController();
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
			
			this.k_cp_circle.destroy();

			listener_abort.abort();

		}, { signal: listener_abort.signal });
		pattern_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_control_point();
		}, { signal: listener_abort.signal });

		pattern_stage.current_design.state_change_events.addEventListener("kf_select", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.k_cp_circle.stroke(getComputedStyle(document.body).getPropertyValue("--control-point-stroke-selected"));
			this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().concat([this.k_cp_circle]));
		}, { signal: listener_abort.signal });
		pattern_stage.current_design.state_change_events.addEventListener("kf_deselect", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.k_cp_circle.stroke(getComputedStyle(document.body).getPropertyValue("--control-point-stroke"));
			this.pattern_stage.transformer.nodes(this.pattern_stage.transformer.nodes().filter(n => n!=this.k_cp_circle));
		}, { signal: listener_abort.signal });

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;
	}

	/**
	 * 
	 * @param {boolean} ctrlKey 
	 */
	select_this(ctrlKey) {
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