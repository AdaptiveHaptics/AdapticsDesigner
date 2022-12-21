import { KonvaResizeStage } from "./konvashared.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaTimelineKeyframeSymbol = Symbol("KonvaTimelineKeyframe");

export class KonvaTimelineStage extends KonvaResizeStage {

	sceneWidth = 500;
	sceneHeight = 500;

	/**
	 * 
	 * @param {MAHPatternDesignFE} current_design 
	 * @param {string} direct_container_id 
	 * @param {HTMLElement} resize_container 
	 */
	constructor(current_design, direct_container_id, resize_container) {
		super(direct_container_id, resize_container);

		this.current_design = current_design;

		this.k_control_points_layer = new Konva.Layer();
		this.k_stage.add(this.k_control_points_layer);

		this.render_design();
	}
	
	render_design() {
		const keyframes = this.current_design.filedata.keyframes;
		
		// render control points
		const keyframe_1 = keyframes.map(keyframe => new KonvaPatternControlPoint(keyframe, this));

		
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
		this.k_cp_circle = new Konva.Circle({
			x: keyframe.coords.x,
			y: keyframe.coords.y,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,
		});
		this.k_cp_circle.addEventListener("mouseenter", ev => {
			document.body.style.cursor = "pointer";
		});
		this.k_cp_circle.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "default";
		});
		this.k_cp_circle.addEventListener("dragmove", ev => {
			const x = this.k_cp_circle.x();
			const y = this.k_cp_circle.y();
			keyframe.coords.x = x;
			keyframe.coords.y = y;

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
		});

		pattern_stage.k_control_points_layer.add(this.k_cp_circle);

		keyframe[KonvaPatternControlPointSymbol] = this;
	}
}