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
		this.k_stage.add(this.k_control_points_layer);

		this.k_stage.on("dblclick", ev => {
			current_design.save_state();
			const { x, y } = this.k_stage.getRelativePointerPosition();
			this.current_design.append_new_keyframe(x, y);
			current_design.commit_operation();
		});


		current_design.state_change_events.addEventListener("kf_new", ev => {
			const prev_cp = this.current_design.get_secondlast_keyframe()?.[KonvaPatternControlPointSymbol];
			const curr_cp = new KonvaPatternControlPoint(ev.detail.keyframe, this);
			if (prev_cp) {
				const kpcpl = new KonvaPatternControlPointLine(prev_cp, curr_cp, this);
			}
		});


		this.render_design();
	}
	
	render_design() {
		this.k_control_points_layer.destroyChildren(); // i assume no memory leak since external references to KonvaPatternControlPointLines should be overwritten by following code

		const keyframes = this.current_design.filedata.keyframes;
		
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
		const line = new Konva.Line({
			points: [curr_cp.k_cp_circle.x(), curr_cp.k_cp_circle.y(), next_cp.k_cp_circle.x(), next_cp.k_cp_circle.y()],
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-line-stroke"),
			strokeWidth: 2
		});
		curr_cp.lines.out = line;
		next_cp.lines.in = line;

		pattern_stage.k_control_points_layer.add(line);
	}
}

class KonvaPatternControlPoint {
	/** @type {{ in: import("konva/lib/shapes/Line.js").Line | null, out: import("konva/lib/shapes/Line.js").Line | null }} */
	lines = { in: null, out: null };
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 * @param {KonvaPatternStage} pattern_stage 
	 */
	constructor(keyframe, pattern_stage) {
		this.keyframe = keyframe;

		this.k_cp_circle = new Konva.Circle({
			x: keyframe.coords.x,
			y: keyframe.coords.y,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		this.k_cp_circle.on("click", ev => {
			if (ev.evt.altKey) {		
				pattern_stage.current_design.delete_keyframe(keyframe);
			}
		});
		this.k_cp_circle.addEventListener("mouseenter", ev => {
			document.body.style.cursor = "pointer";
		});
		this.k_cp_circle.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "";
		});
		this.k_cp_circle.addEventListener("dragstart", ev => {
			pattern_stage.current_design.save_state();
		});
		this.k_cp_circle.addEventListener("dragend", ev => {
			pattern_stage.current_design.commit_operation();
		});
		this.k_cp_circle.addEventListener("dragmove", ev => {
			const x = this.k_cp_circle.x();
			const y = this.k_cp_circle.y();
			keyframe.coords.x = x;
			keyframe.coords.y = y;

			this.update_control_point();
		});

		pattern_stage.current_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;
			const index = pattern_stage.current_design.get_keyframe_index(keyframe);
			const prev_cp = pattern_stage.current_design.filedata.keyframes[index-1]?.[KonvaPatternControlPointSymbol];
			const next_cp = pattern_stage.current_design.filedata.keyframes[index+1]?.[KonvaPatternControlPointSymbol];
			this.lines.in?.destroy();
			this.lines.out?.destroy();
			if (prev_cp && next_cp) new KonvaPatternControlPointLine(prev_cp, next_cp, pattern_stage);
			this.k_cp_circle.destroy();
		});
		pattern_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_control_point();
		});

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;
	}

	update_control_point() {
		const x = this.keyframe.coords.x;
		const y = this.keyframe.coords.y;
		
		this.k_cp_circle.x(x);
		this.k_cp_circle.y(y);

		if (this.lines.in) {
			const points = this.lines.in.points();
			points[2] = x;
			points[3] = y;
			this.lines.in.points(points);
		}
		if (this.lines.out) {
			const points = this.lines.out.points();
			points[0] = x;
			points[1] = y;
			this.lines.out.points(points);
		}
	}
}