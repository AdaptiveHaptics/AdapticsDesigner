import { KonvaResizeScrollStage, KonvaResizeStage } from "./konvashared.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaTimelineKeyframeSymbol = Symbol("KonvaTimelineKeyframe");

export class KonvaTimelineStage extends KonvaResizeScrollStage {

	/**
	 * 
	 * @param {MAHPatternDesignFE} current_design 
	 * @param {string} direct_container_id 
	 * @param {HTMLElement} resize_container 
	 */
	constructor(current_design, direct_container_id, resize_container) {
		super(direct_container_id, resize_container, {
			stageWidth: 1500, stageHeight: 500,
			fullWidth: 2500, fullHeight: 800,
			flipDefaultScrollDirection: true,
		});

		this.current_design = current_design;

		this.render_design();
	}
	
	render_design() {
		const keyframes = this.current_design.filedata.keyframes;
		
		// render control points
		const keyframe_1 = keyframes.map(keyframe => new KonvaTimelineKeyframe(keyframe, this));

		
	}
}

class KonvaTimelineKeyframe {
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 * @param {KonvaTimelineStage} timeline_stage 
	 */
	constructor(keyframe, timeline_stage) {
		this.flag = new Konva.Circle({
			x: keyframe.coords.x,
			y: keyframe.coords.y,
			radius: 20,
			stroke: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			strokeWidth: 2,
			draggable: true,

		});
		this.flag.addEventListener("mouseenter", ev => {
			document.body.style.cursor = "ew-resize";
		});
		this.flag.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "default";
		});
		this.flag.addEventListener("dragmove", ev => {
			const x = this.flag.x();
			const y = this.flag.y();
			keyframe.coords.x = x;
			keyframe.coords.y = y;
		});

		timeline_stage.scrolling_layer.add(this.flag);

		keyframe[KonvaTimelineKeyframeSymbol] = this;
	}
}