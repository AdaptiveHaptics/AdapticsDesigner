import { KonvaResizeScrollStage } from "./shared.mjs";
import { milliseconds_to_hhmmssms_format, notnull } from "../util.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */

const KonvaTimelineKeyframeSymbol = Symbol("KonvaTimelineKeyframe");

const timestamp_rect_height = 26;
const major_gridline_start = 0;
const keyframe_flag_size = 28;
const keyframe_rect_padding_top = 2;
const keyframe_rect_y = timestamp_rect_height - keyframe_rect_padding_top;
const keyframe_rect_height = keyframe_flag_size + keyframe_rect_padding_top;
const minor_gridline_start = keyframe_rect_y + keyframe_rect_height;

export class KonvaTimelineStage extends KonvaResizeScrollStage {
	static major_gridline_millisecond_presets = [10 / 10, 10 / 8, 10 / 5, 10 / 4, 10 / 2];

	/** best effort */
	maximum_pixels_per_major_gridline = 180;
	/** guaranteed */
	minimum_pixels_per_major_gridline = 140;

	milliseconds_per_pixel = 5;
	major_gridline_preset_index = 1;
	get milliseconds_per_major_gridline() {
		return 10 ** Math.floor(this.major_gridline_preset_index / KonvaTimelineStage.major_gridline_millisecond_presets.length) *
			KonvaTimelineStage.major_gridline_millisecond_presets[this.major_gridline_preset_index % KonvaTimelineStage.major_gridline_millisecond_presets.length];
	}
	minor_gridlines_per_major = 4;

	x_axis_left_padding_pixels = 30;

	milliseconds_snapping() {
		return this.milliseconds_per_major_gridline/20;
	}

	pixels_per_major_gridline() {
		return this.milliseconds_per_major_gridline / this.milliseconds_per_pixel;
	}

	transformer = new Konva.Transformer();
	selection_rect = new Konva.Rect();
	timestamp_rect = new Konva.Rect();
	keyframe_rect = new Konva.Rect();
	playback_head = new Konva.Line();

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
			// flipDefaultScrollDirection: true, //disabled because this sucks on trackpads. audacity also keeps regular scrolling directions
		});

		this.current_design = current_design;

		this.k_stage.on("wheel", ev => {
			if (!ev.evt.ctrlKey) return;
			ev.evt.preventDefault(); // prevent parent scrolling
			const dy = ev.evt.deltaY;
			this.milliseconds_per_pixel = Math.max(100/500, this.milliseconds_per_pixel + dy / 500);

			this.render_design();
		});
		resize_container.addEventListener("keydown", ev => {
			if (ev.key == "a" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
				ev.preventDefault();
				ev.stopPropagation();
				this.current_design.select_all_keyframes();
			}
		});

		{ //initialize selection_rect
			let x1, x2;
			this.k_stage.on("pointerdown", ev => {
				if (!(ev.target == this.k_stage || ev.target == this.keyframe_rect)) return;
				// ev.evt.preventDefault();
				x1 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;
				x2 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;

				this.selection_rect.visible(true);
				this.selection_rect.width(0);
				this.selection_rect.height(0);
			});
			this.k_stage.on("pointermove", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect.visible()) return;
				ev.evt.preventDefault();
				x2 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;

				this.selection_rect.setAttrs({
					x: Math.min(x1, x2),
					y: keyframe_rect_y,
					width: Math.abs(x2 - x1),
					height: keyframe_rect_height,
				});
			});
			document.body.addEventListener("pointerup", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect.visible()) return;
				ev.preventDefault();

				this.selection_rect.visible(false);

				// const box = this.selection_rect.getSelfRect();
				const keyframes_in_box = this.current_design.filedata.keyframes.filter(kf => {
					const time_low = this.x_coord_to_milliseconds(Math.min(x1, x2));
					const time_high = this.x_coord_to_milliseconds(Math.max(x1, x2));
					return time_low <= kf.time && kf.time <= time_high;
				});
				if (!ev.ctrlKey) this.current_design.deselect_all_keyframes();
				if (ev.ctrlKey && ev.shiftKey) this.current_design.deselect_keyframes(keyframes_in_box);
				else this.current_design.select_keyframes(keyframes_in_box);
			});
		}

		current_design.state_change_events.addEventListener("kf_new", ev => {
			const _timelinekeyframe = new KonvaTimelineKeyframe(ev.detail.keyframe, this);
		});
		current_design.state_change_events.addEventListener("rerender", _ev => {
			this.render_design();
		});

		this.render_design();
	}

	render_design() {
		this.update_zoom();
		
		for (const kf of this.current_design.filedata.keyframes) {
			kf[KonvaTimelineKeyframeSymbol]?.destroy();
		}
		this.scrolling_layer.destroyChildren();

		const keyframes = this.current_design.filedata.keyframes;

		this.timestamp_rect = new Konva.Rect({
			x: 0, y: 0, width: this.fullWidth, height: timestamp_rect_height,
			fill: getComputedStyle(document.body).getPropertyValue("--background-tertiary")
		});
		this.scrolling_layer.add(this.timestamp_rect);
		this.keyframe_rect = new Konva.Rect({
			x: 0, y: keyframe_rect_y, width: this.fullWidth, height: keyframe_rect_height,
			fill: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke")
		});
		this.scrolling_layer.add(this.keyframe_rect);
		this.keyframe_rect.on("pointerdblclick", ev => {
			if (ev.target != this.keyframe_rect) return;
			this.current_design.save_state();
			const { x } = this.keyframe_rect.getRelativePointerPosition();
			const t = this.raw_x_to_t({ raw_x: x, snap: true });
			const new_keyframe = this.current_design.insert_new_keyframe({ type: "standard", time: t });
			this.current_design.commit_operation({ new_keyframes: [new_keyframe] });
		});

		{ //init transformer
			this.transformer = new Konva.Transformer({
				// sometimes weird results because scaling box goes till end of label instead of stopping in the middle
				// centerScaling avoids this issue, but is stranger to use.
				// centeredScaling: true,
				rotateEnabled: false,
				enabledAnchors: ["middle-left", "middle-right"],
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
			this.scrolling_layer.add(this.transformer);
		}

		{ //initialize selection_rect
			this.selection_rect = new Konva.Rect({
				fill: getComputedStyle(document.body).getPropertyValue("--timeline-select-rect-fill"),
				visible: false,
			});

			this.scrolling_layer.add(this.selection_rect);
		}


		for (
			let i = 0, t = 0, x = this.milliseconds_to_x_coord(t);
			x < this.fullWidth;
			i++, t = i*this.milliseconds_per_major_gridline/this.minor_gridlines_per_major, x = this.milliseconds_to_x_coord(t)
		) {
			if (i % this.minor_gridlines_per_major == 0) { //major gridline
				const gridline = new Konva.Line({
					points: [x, major_gridline_start, x, this.fullHeight],
					stroke: getComputedStyle(document.body).getPropertyValue("--timeline-major-gridline-stroke"),
					strokeWidth: 2,
					listening: false,
				});
				this.scrolling_layer.add(gridline);
				const timestamp_text = new Konva.Text({
					x: x + 2,
					y: major_gridline_start + 5,
					fill: getComputedStyle(document.body).getPropertyValue("--timeline-major-gridline-text"),
					text: milliseconds_to_hhmmssms_format(t),
					fontSize: 16,
					fontStyle: "bold",
					listening: false,
				});
				this.scrolling_layer.add(timestamp_text);
			} else { //minor gridline
				const gridline = new Konva.Line({
					points: [x, minor_gridline_start, x, this.fullHeight],
					stroke: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke"),
					strokeWidth: 2,
					listening: false,
				});
				this.scrolling_layer.add(gridline);
			}
		}


		{ //initialize playback head
			this.playback_head = new Konva.Line({
				x: this.milliseconds_to_x_coord(this.current_design.evaluator_params.time),
				y: 0,
				points: [
					-timestamp_rect_height/3,timestamp_rect_height/2,
					timestamp_rect_height/3,timestamp_rect_height/2,
					0,timestamp_rect_height
				],
				opacity: 0.5,
				closed: true,
				fill: getComputedStyle(document.body).getPropertyValue("--timeline-playback-head-color"),
				draggable: true,
			});
			this.scrolling_layer.add(this.playback_head);
			this.playback_head.on("dragmove", _ev => {
				this.playback_head.x(Math.max(this.playback_head.x(), this.x_axis_left_padding_pixels));
				this.playback_head.y(0);
				const time = this.x_coord_to_milliseconds(this.playback_head.x());
				this.current_design.update_evaluator_params("time", time);
			});
			this.current_design.state_change_events.addEventListener("parameters_update", _ev => {
				this.playback_head.x(this.milliseconds_to_x_coord(this.current_design.evaluator_params.time));
			});
			this.playback_head.on("mouseenter", _ev => {
				document.body.style.cursor = "ew-resize";
			});
			this.playback_head.on("mouseleave", _ev => {
				document.body.style.cursor = "";
			});
		}


		// render control points
		const _timelinekeyframes = keyframes.map(keyframe => new KonvaTimelineKeyframe(keyframe, this));


	}

	update_zoom() {
		// console.log(this.major_gridline_preset_index, this.pixels_per_major_gridline());
		while (this.pixels_per_major_gridline() > this.maximum_pixels_per_major_gridline) {
			this.major_gridline_preset_index = Math.max(this.major_gridline_preset_index - 1, 0);
			if (this.major_gridline_preset_index == 0) break;
		}
		while (this.pixels_per_major_gridline() < this.minimum_pixels_per_major_gridline) {
			this.major_gridline_preset_index += 1;
		}
	}

	milliseconds_to_x_coord(time) {
		return this.x_axis_left_padding_pixels + time / this.milliseconds_per_pixel;
	}
	x_coord_to_milliseconds(x) {
		return (x - this.x_axis_left_padding_pixels) * this.milliseconds_per_pixel;
	}

	snap_time(t) {
		const ms_snapping = this.milliseconds_snapping();
		return Math.round(t / ms_snapping) * ms_snapping;
	}

	raw_x_to_t({ raw_x, snap = false }) {
		let raw_xt = this.x_coord_to_milliseconds(raw_x);
		raw_xt = Math.max(raw_xt, 0);
		if (snap) raw_xt = this.snap_time(raw_xt);
		const t = raw_xt;
		return t;
	}
}

class KonvaTimelineKeyframe {
	ycoord = minor_gridline_start + 3;

	/**
	 * 
	 * @param {MAHKeyframeFE} keyframe 
	 * @param {KonvaTimelineStage} timeline_stage 
	 */
	constructor(keyframe, timeline_stage) {
		this.keyframe = keyframe;
		this.timeline_stage = timeline_stage;


		/** @type {import("konva/lib/shapes/Label.js").TagConfig} */
		const shadow_settings = {
			shadowColor: getComputedStyle(document.body).getPropertyValue("--keyframe-flag-shadow"),
			shadowBlur: 3,
			shadowOffset: { x: 1, y: 1 } ,
		};

		/** @type {import("konva/lib/shapes/Label.js").TagConfig} */
		const pause_config = keyframe.type == "pause" ? {
			stroke: getComputedStyle(document.body).getPropertyValue("--paused-keyframe-color"),
			strokeWidth: 3,
		} : {};
		
		this.flag = new Konva.Label({
			x: -1,
			y: this.ycoord,
			draggable: true,
			dragBoundFunc: pos => {
				return {
					x: pos.x,
					y: this.ycoord,
				};
			},
		});
		this.flag.add(new Konva.Tag({
			pointerDirection: "down",
			pointerWidth: 10,
			pointerHeight: 5,
			cornerRadius: 1,
			lineJoin: "round",
			...shadow_settings,
			...pause_config,
		}));
		this.flag.add(new Konva.Text({
			text: "",
			fill: getComputedStyle(document.body).getPropertyValue("--keyframe-flag-text"),
			padding: 4,
			fontSize: 14,
			fontStyle: "bold",
		}));
		this.flag.on("click", ev => {
			this.select_this(ev.evt.ctrlKey, false);

			if (ev.evt.altKey) {
				timeline_stage.current_design.save_state();
				const deleted_keyframes = timeline_stage.current_design.delete_keyframes([keyframe]);
				timeline_stage.current_design.commit_operation({ deleted_keyframes });
				return;
			}
		});
		this.flag.on("mouseenter", _ev => {
			document.body.style.cursor = "pointer";
		});
		this.flag.on("mouseleave", _ev => {
			document.body.style.cursor = "";
		});
		this.flag.on("dragstart", ev => {
			this.select_this(ev.evt.ctrlKey, true);
		});
		this.flag.on("dragmove", _ev => {
			//TODO: it would be nice if perfectly overlapping control points were more obvious to the user
			this.update_time({ time: this.timeline_stage.raw_x_to_t({ raw_x: this.flag.x(), snap: this.timeline_stage.transformer.nodes().length<=1 }) });
		});
		this.flag.on("transform", _ev => {
			this.flag.scale({ x: 1, y: 1 });
			this.flag.skew({ x: 0, y: 0 });
			this.flag.rotation(0);
			this.update_time({ time: this.timeline_stage.raw_x_to_t({ raw_x: this.flag.x(), snap: false }) });
		});

		this.flag.on("dragend transformend", _ev => {
			this.update_time({ time: this.timeline_stage.raw_x_to_t({ raw_x: this.flag.x(), snap: true }) });
		});

		this.line = new Konva.Line({
			points: [0, this.ycoord, 0, timeline_stage.fullHeight],
			stroke: getComputedStyle(document.body).getPropertyValue("--keyframe-flag-fill"),
			strokeWidth: 1,
			listening: false,
			...shadow_settings,
		});
		timeline_stage.scrolling_layer.add(this.line);

		this.listener_abort = new AbortController();
		timeline_stage.current_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;	
			this.destroy();
		}, { signal: this.listener_abort.signal });

		timeline_stage.current_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_time({ time: keyframe.time });
		}, { signal: this.listener_abort.signal });

		timeline_stage.current_design.state_change_events.addEventListener("kf_select", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_select(true);
		}, { signal: this.listener_abort.signal });

		timeline_stage.current_design.state_change_events.addEventListener("kf_deselect", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_select(false);
		}, { signal: this.listener_abort.signal });

		timeline_stage.scrolling_layer.add(this.flag);

		keyframe[KonvaTimelineKeyframeSymbol] = this;

		this.update_time({ time: keyframe.time });
		this.update_select(timeline_stage.current_design.is_keyframe_selected(keyframe));
	}

	destroy() {
		this.flag.destroy();
		this.line.destroy();
		this.listener_abort.abort();
	}

	/**
	 * 
	 * @param {boolean} ctrlKey 
	 * @param {boolean} dont_deselect
	 */
	select_this(ctrlKey, dont_deselect) {
		if (this.timeline_stage.current_design.is_keyframe_selected(this.keyframe)) {
			if (ctrlKey && !dont_deselect) this.timeline_stage.current_design.deselect_keyframes([this.keyframe]);
			return;
		}

		if (!ctrlKey) this.timeline_stage.current_design.deselect_all_keyframes();
		this.timeline_stage.current_design.select_keyframes([this.keyframe]);
	}

	/**
	 * 
	 * @param {boolean} selected 
	 */
	update_select(selected) {
		const fill = selected?"--keyframe-flag-fill-selected":"--keyframe-flag-fill";
		this.flag.getTag().fill(getComputedStyle(document.body).getPropertyValue(fill));
		this.line.stroke(getComputedStyle(document.body).getPropertyValue(fill));
		if (selected) this.timeline_stage.transformer.nodes(this.timeline_stage.transformer.nodes().concat([this.flag]));
		else this.timeline_stage.transformer.nodes(this.timeline_stage.transformer.nodes().filter(n => n != this.flag));
	}

	update_time({ time }) {	
		const x = this.timeline_stage.milliseconds_to_x_coord(time);
		this.flag.x(x);
		this.flag.y(this.ycoord);
		this.line.points([x, this.ycoord, x, this.timeline_stage.fullHeight]);
		this.flag.getText().text(milliseconds_to_hhmmssms_format(time).slice(-6));
		this.keyframe.set_time(time);
	}
}