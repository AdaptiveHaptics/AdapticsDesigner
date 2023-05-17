import { KonvaResizeScrollStage } from "./shared.mjs";
import { milliseconds_to_hhmmssms_format, notnull } from "../util.mjs";

const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("../fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../../shared/types").ConditionalJump} ConditionalJump */

const KonvaTimelineKeyframeSymbol = Symbol("KonvaTimelineKeyframe");

const timestamp_rect_height = 26;
const major_gridline_start = 0;
const keyframe_flag_size = 28;
const keyframe_rect_padding_top = 2;
const keyframe_rect_y = timestamp_rect_height - keyframe_rect_padding_top;
const keyframe_rect_height = keyframe_flag_size + keyframe_rect_padding_top;
const minor_gridline_start = keyframe_rect_y + keyframe_rect_height;
const keyframe_flag_ycoord = minor_gridline_start + 3;
const cjump_arrow_size = 7;
const cjump_flag_size = 22;
const cjump_flag_y = keyframe_flag_ycoord + cjump_arrow_size + cjump_flag_size;
const cjump_flag_rect_padding = 2;
const cjump_flag_rect_y = cjump_flag_y - cjump_flag_size/2 - cjump_flag_rect_padding/2;
const cjump_flag_rect_height = cjump_flag_size + cjump_flag_rect_padding;

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

	x_axis_left_padding_pixels = 50;

	milliseconds_snapping() {
		return this.milliseconds_per_major_gridline/20;
	}

	pixels_per_major_gridline() {
		return this.milliseconds_per_major_gridline / this.milliseconds_per_pixel;
	}

	transformer = new Konva.Transformer();
	selection_rect_kf = new Konva.Rect();
	selection_rect_cjump = new Konva.Rect();
	timestamp_rect = new Konva.Rect();
	keyframe_rect = new Konva.Rect();
	playback_head = new Konva.Line();

	/** @type {Set<KonvaCJumpFlag>} */
	cjump_flags = new Set();

	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {string} direct_container_id
	 * @param {HTMLElement} resize_container
	 */
	constructor(pattern_design, direct_container_id, resize_container) {
		super(direct_container_id, resize_container, {
			stageWidth: 1500, stageHeight: 500,
			fullWidth: 2500, fullHeight: 800,
			// flipDefaultScrollDirection: true, //disabled because this sucks on trackpads. audacity also keeps regular scrolling directions
		});

		this.pattern_design = pattern_design;

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
				this.pattern_design.select_all_keyframes();
			}
		});

		{ //initialize selection_rect
			let x1, x2, y1, y2;
			const include_cjump_flags_in_selection_rect = () => {
				return y1 > cjump_flag_rect_y || y2 > cjump_flag_rect_y;
			};
			this.k_stage.on("pointerdown", ev => {
				if (!(ev.target == this.k_stage || ev.target == this.keyframe_rect || ev.target == this.cjump_flag_rect)) return;
				// ev.evt.preventDefault();
				x1 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;
				y1 = notnull(this.scrolling_layer.getRelativePointerPosition()).y;
				x2 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;
				y2 = notnull(this.scrolling_layer.getRelativePointerPosition()).y;

				this.selection_rect_kf.visible(true);
				this.selection_rect_kf.width(0);
				this.selection_rect_kf.height(0);

				this.selection_rect_cjump.visible(true);
				this.selection_rect_cjump.width(0);
				this.selection_rect_cjump.height(0);
			});
			this.k_stage.on("pointermove", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect_kf.visible()) return;
				ev.evt.preventDefault();
				x2 = notnull(this.scrolling_layer.getRelativePointerPosition()).x;
				y2 = notnull(this.scrolling_layer.getRelativePointerPosition()).y;

				this.selection_rect_kf.setAttrs({
					x: Math.min(x1, x2),
					y: keyframe_rect_y,
					width: Math.abs(x2 - x1),
					height: keyframe_rect_height,
				});

				if (include_cjump_flags_in_selection_rect()) {
					this.selection_rect_cjump.setAttrs({
						x: Math.min(x1, x2),
						y: cjump_flag_rect_y,
						width: Math.abs(x2 - x1),
						height: cjump_flag_rect_height,
					});
				} else {
					this.selection_rect_cjump.width(0);
					this.selection_rect_cjump.height(0);
				}
			});
			document.body.addEventListener("pointerup", ev => {
				// do nothing if we didn't start selection
				if (!this.selection_rect_kf.visible()) return;
				ev.preventDefault();

				this.selection_rect_kf.visible(false);
				this.selection_rect_cjump.visible(false);

				// const box = this.selection_rect.getSelfRect();
				const time_low = this.x_coord_to_milliseconds(Math.min(x1, x2));
				const time_high = this.x_coord_to_milliseconds(Math.max(x1, x2));
				const keyframes_in_box = this.pattern_design.filedata.keyframes.filter(kf => {
					return time_low <= kf.time && kf.time <= time_high;
				});
				const cjump_flags_in_box = include_cjump_flags_in_selection_rect() ? [...this.cjump_flags].filter(cjf => {
					return time_low <= cjf.current_time && cjf.current_time <= time_high;
				}) : [];

				this.pattern_design.group_select_logic({ keyframes: keyframes_in_box, cjump_flags: cjump_flags_in_box }, {}, { shiftKey: ev.shiftKey, ctrlKey: ev.ctrlKey, altKey: ev.altKey });
			});
		}

		this.pattern_design.state_change_events.addEventListener("kf_new", ev => {
			const _timelinekeyframe = new KonvaTimelineKeyframe(ev.detail.keyframe, this);
		});
		this.pattern_design.state_change_events.addEventListener("rerender", _ev => {
			this.render_design();
		});

		this.pattern_design.state_change_events.addEventListener("playback_update", _ev => {
			this.playback_head.x(this.milliseconds_to_x_coord(this.pattern_design.last_eval[0].pattern_time));
		},);

		this.render_design();
	}

	render_design() {
		this.update_zoom();

		for (const cjump_flag of this.cjump_flags.values()) {
			cjump_flag.destroy();
		}
		this.cjump_flags.clear();
		for (const kf of this.pattern_design.filedata.keyframes) {
			kf[KonvaTimelineKeyframeSymbol]?.destroy();
		}
		this.scrolling_layer.destroyChildren();

		const keyframes = this.pattern_design.filedata.keyframes;

		this.timestamp_rect = new Konva.Rect({
			x: 0, y: 0, width: this.fullWidth, height: timestamp_rect_height,
			fill: getComputedStyle(document.body).getPropertyValue("--background-tertiary")
		});
		this.timestamp_rect.on("click", ev => {
			if (ev.target != this.timestamp_rect) return;
			ev.evt.preventDefault();
			const { x } = this.keyframe_rect.getRelativePointerPosition();
			const time = this.raw_x_to_t({ raw_x: x, snap: false });
			this.pattern_design.update_pattern_time(time);
		});
		this.scrolling_layer.add(this.timestamp_rect);

		this.keyframe_rect = new Konva.Rect({
			x: 0, y: keyframe_rect_y, width: this.fullWidth, height: keyframe_rect_height,
			fill: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke")
		});
		this.scrolling_layer.add(this.keyframe_rect);
		this.keyframe_rect.on("pointerdblclick", ev => {
			if (ev.target != this.keyframe_rect) return;
			ev.evt.preventDefault();
			this.pattern_design.save_state();
			const { x } = this.keyframe_rect.getRelativePointerPosition();
			const t = this.raw_x_to_t({ raw_x: x, snap: true });
			const new_keyframe = this.pattern_design.insert_new_keyframe({ type: "standard", time: t });
			this.pattern_design.commit_operation({ new_keyframes: [new_keyframe] });

			this.selection_rect_kf.visible(false);
			if (!ev.evt.ctrlKey) this.pattern_design.deselect_all_items();
			this.pattern_design.select_items({ keyframes: [ new_keyframe ] });
		});

		this.cjump_flag_rect = new Konva.Rect({
			x: 0, y: cjump_flag_rect_y, width: this.fullWidth, height: cjump_flag_rect_height,
			fill: getComputedStyle(document.body).getPropertyValue("--timeline-minor-gridline-stroke")
		});
		this.scrolling_layer.add(this.cjump_flag_rect);

		{ //init transformer
			this.transformer = new Konva.Transformer({
				// sometimes weird results because scaling box goes till end of label instead of stopping in the middle
				// centerScaling avoids this issue, but is stranger to use.
				// centeredScaling: true,
				rotateEnabled: false,
				enabledAnchors: ["middle-left", "middle-right"],
			});
			this.transformer.on("dragstart", _ev => {
				this.pattern_design.save_state();
			});
			this.transformer.on("dragend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.pattern_design.commit_operation({ updated_keyframes: [
						...this.pattern_design.selected_keyframes,
						...[...this.pattern_design.selected_cjump_flags].flatMap(cjf => [...cjf.associated_keyframes.keys()])
					]});
				});
			});
			this.transformer.on("transformstart", _ev => {
				this.pattern_design.save_state();
			});
			this.transformer.on("transformend", _ev => {
				requestAnimationFrame(() => { //wait for child dragend events to snap/etc
					this.pattern_design.commit_operation({ updated_keyframes: [
						...this.pattern_design.selected_keyframes,
						...[...this.pattern_design.selected_cjump_flags].flatMap(cjf => [...cjf.associated_keyframes.keys()])
					]});
				});
			});
			this.scrolling_layer.add(this.transformer);
		}

		{ //initialize selection_rect
			this.selection_rect_kf = new Konva.Rect({
				fill: getComputedStyle(document.body).getPropertyValue("--timeline-select-rect-fill"),
				visible: false,
			});
			this.scrolling_layer.add(this.selection_rect_kf);

			this.selection_rect_cjump = new Konva.Rect({
				fill: getComputedStyle(document.body).getPropertyValue("--timeline-select-rect-fill"),
				visible: false,
			});
			this.scrolling_layer.add(this.selection_rect_cjump);
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
				x: this.milliseconds_to_x_coord(this.pattern_design.evaluator_params.time),
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
				this.pattern_design.update_pattern_time(time);
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
	ycoord = keyframe_flag_ycoord;

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
			shadowForStrokeEnabled: false,
			shadowColor: getComputedStyle(document.body).getPropertyValue("--keyframe-flag-shadow"),
			shadowBlur: 3,
			shadowOffset: { x: 1, y: 1 } ,
		};

		/** @type {import("konva/lib/shapes/Label.js").TagConfig} */
		const pause_config = keyframe.type == "pause" ? {
			stroke: getComputedStyle(document.body).getPropertyValue("--pause-keyframe-color"),
			strokeWidth: 3,
		} : {};
		/** @type {import("konva/lib/shapes/Label.js").TagConfig} */
		const stop_config = keyframe.type == "stop" ? {
			stroke: getComputedStyle(document.body).getPropertyValue("--stop-keyframe-color"),
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
			...stop_config,
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
				timeline_stage.pattern_design.save_state();
				const deleted_keyframes = timeline_stage.pattern_design.delete_keyframes([...timeline_stage.pattern_design.selected_keyframes]);
				timeline_stage.pattern_design.commit_operation({ deleted_keyframes });
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

		this.line = new Konva.Rect({
			y: this.ycoord,
			width: 0.1,
			// opacity: 0.65,
			height: timeline_stage.fullHeight,
			fill: getComputedStyle(document.body).getPropertyValue("--keyframe-flag-fill"),
			listening: false,
			...shadow_settings,
		});

		/** @type {import("konva/lib/shapes/RegularPolygon.js").RegularPolygonConfig} */
		const cjump_arrow_config = {
			x: 10,
			y: this.ycoord+cjump_arrow_size,
			sides: 3,
			radius: cjump_arrow_size,
			fill: getComputedStyle(document.body).getPropertyValue("--cjump-arrow-fill"),
			visible: false,
		};
		this.cjump_arrow_left = new Konva.RegularPolygon({
			rotation: -90,
			...cjump_arrow_config
		});
		this.cjump_arrow_right = new Konva.RegularPolygon({
			rotation: 90,
			...cjump_arrow_config
		});


		this.listener_abort = new AbortController();
		timeline_stage.pattern_design.state_change_events.addEventListener("kf_delete", ev => {
			if (ev.detail.keyframe != keyframe) return;
			if ("cjumps" in keyframe) this.update_cjump_flags([]);
			this.destroy();
		}, { signal: this.listener_abort.signal });

		timeline_stage.pattern_design.state_change_events.addEventListener("kf_update", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_time({ time: keyframe.time });
			if ("cjumps" in keyframe) this.update_cjump_flags(keyframe.cjumps);
		}, { signal: this.listener_abort.signal });

		timeline_stage.pattern_design.state_change_events.addEventListener("item_select", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_select(true);
		}, { signal: this.listener_abort.signal });

		timeline_stage.pattern_design.state_change_events.addEventListener("item_deselect", ev => {
			if (ev.detail.keyframe != keyframe) return;
			this.update_select(false);
		}, { signal: this.listener_abort.signal });

		timeline_stage.scrolling_layer.add(this.cjump_arrow_left);
		timeline_stage.scrolling_layer.add(this.cjump_arrow_right);
		timeline_stage.scrolling_layer.add(this.line);
		timeline_stage.scrolling_layer.add(this.flag);

		keyframe[KonvaTimelineKeyframeSymbol] = this;

		this.update_time({ time: keyframe.time });
		this.update_select(timeline_stage.pattern_design.is_item_selected({ keyframe }));
		if ("cjumps" in keyframe) this.update_cjump_flags(keyframe.cjumps);
	}

	destroy() {
		this.flag.destroy();
		this.line.destroy();
		this.cjump_arrow_left.destroy();
		this.cjump_arrow_right.destroy();
		this.listener_abort.abort();
	}

	/**
	 *
	 * @param {boolean} ctrlKey
	 * @param {boolean} dont_deselect
	 */
	select_this(ctrlKey, dont_deselect) {
		if (this.timeline_stage.pattern_design.is_item_selected({ keyframe: this.keyframe })) {
			if (ctrlKey && !dont_deselect) this.timeline_stage.pattern_design.deselect_items({ keyframes: [this.keyframe]});
			return;
		}

		if (!ctrlKey) this.timeline_stage.pattern_design.deselect_all_items();
		this.timeline_stage.pattern_design.select_items({ keyframes: [this.keyframe] });
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
		this.line.x(x-this.line.width()/2);

		this.cjump_arrow_left.x(x-cjump_arrow_size*0.63);
		this.cjump_arrow_right.x(x+cjump_arrow_size*0.63);

		this.flag.getText().text(milliseconds_to_hhmmssms_format(time).slice(-6));
		this.keyframe.set_time(time);
	}

	/**
	 *
	 * @param {ConditionalJump[]} cjumps
	 */
	update_cjump_flags(cjumps) {
		const to_delete = new Set([...this.timeline_stage.cjump_flags].filter(cjf => cjf.associated_keyframes.has(this.keyframe)));
		for (const cjump of cjumps) {
			const existing_cjf = [...this.timeline_stage.cjump_flags];
			const find_merge_or_create_cjf = () => {
				const existing_cjfs = existing_cjf.filter(cjf => cjf.current_time == cjump.jump_to);
				if (existing_cjfs.length > 0) { // find all existing cjfs that have the same current_time, and merge into the first one
					const cjf = existing_cjfs[0];
					for (const existing_cjf of existing_cjfs.slice(1)) {
						console.log("merge");
						for (const [keyframe, existing_cjset] of existing_cjf.associated_keyframes) {
							const cjset = cjf.associated_keyframes.get(keyframe) ?? new Set();
							for (const existing_cjump of existing_cjset) cjset.add(existing_cjump);
							cjf.associated_keyframes.set(keyframe, cjset);
						}
						existing_cjf.destroy();
					}
					return cjf;
				} else { // otherwise create a new one
					return new KonvaCJumpFlag(this.timeline_stage, cjump.jump_to);
				}
			};
			const cjf = find_merge_or_create_cjf();
			to_delete.delete(cjf);
			const cjset = cjf.associated_keyframes.get(this.keyframe) ?? new Set();
			cjset.add(cjump);
			cjf.associated_keyframes.set(this.keyframe, cjset);
		}
		for (const cjf of to_delete) {
			cjf.associated_keyframes.delete(this.keyframe);
			if (cjf.associated_keyframes.size == 0) cjf.destroy();
		}

		// add or remove the cjump arrows
		let add_left = false;
		let add_right = false;
		if ("cjumps" in this.keyframe) {
			for (const cj of this.keyframe.cjumps) {
				if (cj.jump_to > this.keyframe.time) {
					add_right = true;
				} else {
					add_left = true;
				}
			}
		}

		if (add_left) this.cjump_arrow_left.visible(true);
		else this.cjump_arrow_left.visible(false);
		if (add_right) this.cjump_arrow_right.visible(true);
		else this.cjump_arrow_right.visible(false);
	}
}

/**
 * Movable destination flag for conditional jumps
 */
// exported for use in select code
export class KonvaCJumpFlag {
	/** @type {Map<MAHKeyframeFE, Set<ConditionalJump>>} */
	associated_keyframes = new Map();

	/**
	 *
	 * @param {KonvaTimelineStage} timeline_stage
	 * @param {number} jump_to_time
	 */
	constructor(timeline_stage, jump_to_time) {
		this.timeline_stage = timeline_stage;
		this.current_time = jump_to_time; // set in update_time

		this.listener_abort = new AbortController();

		this.ycoord = cjump_flag_y;


		this.flag = new Konva.Label({
			x: 0,
			y: this.ycoord,
			draggable: true,
			opacity: 0.85,
		});
		this.flag.add(new Konva.Tag({
			fill: getComputedStyle(document.body).getPropertyValue("--cjump-flag-fill"),
			pointerDirection: "right",
			pointerWidth: 5,
			pointerHeight: cjump_flag_size,
			cornerRadius: 1,
			// lineJoin: "round",
			shadowColor: "black",
			shadowBlur: 2,
			shadowOffsetX: 1,
			shadowOffsetY: 1,
			shadowOpacity: 0.5,
		}));
		this.flag.add(new Konva.Text({
			text: "",
			fontSize: 12,
			padding: 5,
			fill: "white",
		}));

		this.flag.on("click", ev => {
			if (ev.evt.detail == 2) {
				console.log("double click");
				this.timeline_stage.pattern_design.deselect_all_items();
				this.timeline_stage.pattern_design.select_items({ keyframes: [...this.associated_keyframes.keys()] });
			} else {
				console.log("click");
				this.select_this(ev.evt.ctrlKey, false);
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
			this.update_time({ time: this.timeline_stage.raw_x_to_t({ raw_x: this.flag.x(), snap: true }) });
		});

		timeline_stage.pattern_design.state_change_events.addEventListener("item_select", ev => {
			if (ev.detail.cjump_flag != this) return;
			this.update_select(true);
		}, { signal: this.listener_abort.signal });

		timeline_stage.pattern_design.state_change_events.addEventListener("item_deselect", ev => {
			if (ev.detail.cjump_flag != this) return;
			this.update_select(false);
		}, { signal: this.listener_abort.signal });

		timeline_stage.scrolling_layer.add(this.flag);

		this.update_time({ time: jump_to_time });

		this.timeline_stage.cjump_flags.add(this);
	}

	destroy() {
		this.timeline_stage.pattern_design.deselect_items({ cjump_flags: [this] });
		this.timeline_stage.cjump_flags.delete(this);
		this.listener_abort.abort();
		this.flag.destroy();
	}

	/**
	 *
	 * @param {boolean} ctrlKey
	 * @param {boolean} dont_deselect
	 */
	select_this(ctrlKey, dont_deselect) {
		if (this.timeline_stage.pattern_design.is_item_selected({ cjump_flag: this })) {
			if (ctrlKey && !dont_deselect) this.timeline_stage.pattern_design.deselect_items({ cjump_flags: [this] });
			return;
		}

		if (!ctrlKey) this.timeline_stage.pattern_design.deselect_all_items();
		this.timeline_stage.pattern_design.select_items({ cjump_flags: [this] });
	}

	/**
	 *
	 * @param {boolean} selected
	 */
	update_select(selected) {
		const fill = selected?"--cjump-flag-fill-selected":"--cjump-flag-fill";
		this.flag.getTag().fill(getComputedStyle(document.body).getPropertyValue(fill));
		if (selected) this.timeline_stage.transformer.nodes(this.timeline_stage.transformer.nodes().concat([this.flag]));
		else this.timeline_stage.transformer.nodes(this.timeline_stage.transformer.nodes().filter(n => n != this.flag));
	}

	update_time({ time }) {
		this.current_time = time;
		const x = this.timeline_stage.milliseconds_to_x_coord(time);
		this.flag.x(x);
		this.flag.y(this.ycoord);
		this.flag.getText().text("Dest. "+milliseconds_to_hhmmssms_format(time).slice(-6));
		for (const [_kf, cjset] of this.associated_keyframes) {
			for (const cjump of cjset) {
				cjump.jump_to = time;
			}
		}
	}

	delete_cjumps_to_self() {
		return [...this.associated_keyframes].map(([kf, cjset]) => {
			if ("cjumps" in kf) kf.cjumps = kf.cjumps.filter(cj => !cjset.has(cj));
			return kf;
		});
	}

}