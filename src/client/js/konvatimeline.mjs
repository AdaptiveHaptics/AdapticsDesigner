import { KonvaResizeScrollStage, KonvaResizeStage } from "./konvashared.mjs";
import { milliseconds_to_hhmmssms_format } from "./util.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("./script.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaTimelineKeyframeSymbol = Symbol("KonvaTimelineKeyframe");

const major_gridline_start = 0;
const minor_gridline_start = 46;
const keyframe_flag_size = 20;

export class KonvaTimelineStage extends KonvaResizeScrollStage {

	milliseconds_per_pixel = 5;
	milliseconds_per_minor_gridline = 100;
	minor_gridlines_per_major = 5;
	x_axis_left_padding_pixels = 20;

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

		this.k_stage.on("wheel", ev => {
			if (!ev.evt.ctrlKey) return;
			ev.evt.preventDefault(); // prevent parent scrolling
			const dy = ev.evt.deltaY;
			this.milliseconds_per_pixel = Math.max(0.5, this.milliseconds_per_pixel + dy / 200);

			let pixels_per_major = this.minor_gridlines_per_major * this.milliseconds_per_minor_gridline / this.milliseconds_per_pixel;
			while (pixels_per_major > 200) {
				this.milliseconds_per_minor_gridline -= 25;
				pixels_per_major = this.minor_gridlines_per_major * this.milliseconds_per_minor_gridline / this.milliseconds_per_pixel;
			}
			while (pixels_per_major < 100) {
				this.milliseconds_per_minor_gridline += 25;
				pixels_per_major = this.minor_gridlines_per_major * this.milliseconds_per_minor_gridline / this.milliseconds_per_pixel;
			}

			this.render_design();
		});

		current_design.state_change_events.addEventListener("kf_newappend", ev => {
			const timelinekeyframe = new KonvaTimelineKeyframe(ev.detail.keyframe, this);
		});
		current_design.state_change_events.addEventListener("rerender", ev => {
			this.render_design();
		});

		this.render_design();
	}

	render_design() {
		this.scrolling_layer.destroyChildren(); // i assume no memory leak since external references to KonvaTimelineKeyframes should be overwritten by following code

		const keyframes = this.current_design.filedata.keyframes;

		this.scrolling_layer.add(new Konva.Rect({
			x: 0, y: 0, width: this.fullWidth, height: minor_gridline_start - keyframe_flag_size,
			fill: getComputedStyle(document.body).getPropertyValue("--background-tertiary")
		}));
		this.scrolling_layer.add(new Konva.Rect({
			x: 0, y: minor_gridline_start - keyframe_flag_size - 3, width: this.fullWidth, height: keyframe_flag_size + 3,
			fill: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke")
		}));
		for (
			let i = 0, t = 0, x = this.milliseconds_to_x_coord(t);
			x < this.fullWidth;
			t += this.milliseconds_per_minor_gridline, x = this.milliseconds_to_x_coord(t), i++) {
			if (i % this.minor_gridlines_per_major == 0) { //major gridline
				const gridline = new Konva.Line({
					points: [x, major_gridline_start, x, this.fullHeight],
					stroke: getComputedStyle(document.body).getPropertyValue("--timeline-major-gridline-stroke"),
					strokeWidth: 2
				});
				this.scrolling_layer.add(gridline);
				const timestamp_text = new Konva.Text({
					x: x + 2,
					y: major_gridline_start + 5,
					fill: getComputedStyle(document.body).getPropertyValue("--timeline-major-gridline-text"),
					text: milliseconds_to_hhmmssms_format(t),
					fontSize: 15,
					fontVariant: "bold"
				});
				this.scrolling_layer.add(timestamp_text);
			} else { //minor gridline
				const gridline = new Konva.Line({
					points: [x, minor_gridline_start, x, this.fullHeight],
					stroke: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke"),
					strokeWidth: 2
				});
				this.scrolling_layer.add(gridline);
			}
		}

		// render control points
		const timelinekeyframes = keyframes.map(keyframe => new KonvaTimelineKeyframe(keyframe, this));


	}

	milliseconds_to_x_coord(time) {
		return this.x_axis_left_padding_pixels + time / this.milliseconds_per_pixel;
	}
	x_coord_to_milliseconds(x) {
		return (x - this.x_axis_left_padding_pixels) * this.milliseconds_per_pixel;
	}
}

class KonvaTimelineKeyframe {
	ycoord = minor_gridline_start;
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 * @param {KonvaTimelineStage} timeline_stage 
	 */
	constructor(keyframe, timeline_stage) {
		this.flag = new Konva.Wedge({
			x: timeline_stage.milliseconds_to_x_coord(keyframe.time),
			y: this.ycoord,
			radius: keyframe_flag_size,
			angle: 60,
			rotation: -120,
			fill: getComputedStyle(document.body).getPropertyValue("--control-point-stroke"),
			draggable: true,
			dragBoundFunc: pos => {
				const index = timeline_stage.current_design.get_keyframe_index(keyframe);
				const prev_cp_time = timeline_stage.current_design.filedata.keyframes[index-1]?.time || 0;
				const next_cp_time = timeline_stage.current_design.filedata.keyframes[index+1]?.time || Infinity;
				//TODO: it would be nice if perfectly overlapping control points were more obvious to the user
				//TODO: allow reordering control points 
				return {
					x: Math.max(Math.min(pos.x, timeline_stage.milliseconds_to_x_coord(next_cp_time-1)), timeline_stage.milliseconds_to_x_coord(prev_cp_time+1)),
					y: this.ycoord
				};
			}
		});
		this.flag.on("click", ev => {
			if (ev.evt.altKey) {
				timeline_stage.current_design.save_state();
				const deleted_keyframes = timeline_stage.current_design.delete_keyframes([keyframe]);
				timeline_stage.current_design.commit_operation({ deleted_keyframes });
			}
		});
		this.flag.addEventListener("mouseenter", ev => {
			document.body.style.cursor = "ew-resize";
		});
		this.flag.addEventListener("mouseleave", ev => {
			document.body.style.cursor = "";
		});
		this.flag.addEventListener("dragstart", ev => {
			timeline_stage.current_design.save_state();
		});
		this.flag.addEventListener("dragend", ev => {
			timeline_stage.current_design.commit_operation({ updated_keyframes: [keyframe] });
		});
		this.flag.addEventListener("dragmove", ev => {
			const x = this.flag.x();
			keyframe.time = timeline_stage.x_coord_to_milliseconds(x);
		});

		const listener_abort = new AbortController();
		timeline_stage.current_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;
			
			this.flag.destroy();
			
			listener_abort.abort();

		}, { signal: listener_abort.signal });
		timeline_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.flag.x(timeline_stage.milliseconds_to_x_coord(keyframe.time));
		}, { signal: listener_abort.signal });

		timeline_stage.scrolling_layer.add(this.flag);

		keyframe[KonvaTimelineKeyframeSymbol] = this;
	}
}