const Konva = /** @type {import("konva").default} */ (window["Konva"]);

export class KonvaResizeStage {
	/**
	 *
	 * @param {HTMLDivElement} direct_container
	 * @param {HTMLElement} resize_container
	 */
	constructor(direct_container, resize_container, { stageWidth = 500, stageHeight = 500 }) {
		this.stageWidth = stageWidth;
		this.stageHeight = stageHeight;

		this.direct_container = direct_container;
		this.resize_container = resize_container;

		this.k_stage = new Konva.Stage({
			container: direct_container,
			width: this.stageWidth,
			height: this.stageHeight,
		});


		// adapt the stage on any window resize
		window.addEventListener("resize", _ev => this.fitStageIntoParentContainer());
		const resize_observer = new ResizeObserver(_entries => {
			this.fitStageIntoParentContainer();
		});
		resize_observer.observe(resize_container);
		this.fitStageIntoParentContainer();
	}

	fitStageIntoParentContainer() {
		const scale = Math.min(this.resize_container.offsetWidth / this.stageWidth, this.resize_container.offsetHeight / this.stageHeight);
		// console.log(container.offsetWidth / sceneWidth, container.offsetHeight / sceneHeight, scale);

		this.k_stage.width(this.stageWidth * scale);
		this.k_stage.height(this.stageHeight * scale);
		this.k_stage.scale({ x: scale, y: scale });
	}
}


const SCROLLBAR_WIDTH = 10;
const SCROLLBAR_HEIGHT = 100;
const SCROLLBAR_OPACITY = 0.8;
const SCROLLBAR_PADDING = 5;
export class KonvaResizeScrollStage extends KonvaResizeStage {

	scaled_stage_width() {
		return this.k_stage.width() / this.k_stage.scaleX();
	}
	scaled_stage_height() {
		return this.k_stage.height() / this.k_stage.scaleY();
	}

	vsb_x() {
		return this.scaled_stage_width() - SCROLLBAR_PADDING - SCROLLBAR_WIDTH;
	}
	vsb_max_y() {
		return this.scaled_stage_height() - this.vertical_scroll_bar.height() - SCROLLBAR_PADDING;
	}
	vsb_min_y() {
		return SCROLLBAR_PADDING;
	}
	/** @param {number} y */
	clamp_vsb_y(y) {
		return Math.max(Math.min(y, this.vsb_max_y()), this.vsb_min_y());
	}
	vsb_range() {
		return this.vsb_max_y() - this.vsb_min_y();
	}
	/** @param {number} y */
	vsb_y_to_perc(y) {
		return (y - this.vsb_min_y()) / this.vsb_range();
	}

	hsb_y() {
		return this.scaled_stage_height() - SCROLLBAR_PADDING - SCROLLBAR_WIDTH;
	}
	hsb_max_x() {
		return this.scaled_stage_width() - this.horizontal_scroll_bar.width() - SCROLLBAR_PADDING;
	}
	hsb_min_x() {
		return SCROLLBAR_PADDING;
	}
	/** @param {number} x */
	clamp_hsb_x(x) {
		return Math.max(Math.min(x, this.hsb_max_x()), this.hsb_min_x());
	}
	hsb_range() {
		return this.hsb_max_x() - this.hsb_min_x();
	}
	/** @param {number} x */
	hsb_x_to_perc(x) {
		return (x - this.hsb_min_x()) / this.hsb_range();
	}


	sl_min_y() {
		return -(this.fullHeight - this.k_stage.height());
	}
	sl_max_y() {
		return 0;
	}
	sl_perc_to_y(perc) {
		return this.sl_min_y() + (1 - perc) * (this.sl_max_y() - this.sl_min_y());
	}
	sl_dy_to_dperc(dy) {
		return dy / (this.sl_max_y() - this.sl_min_y());
	}
	sl_min_x() {
		return -(this.fullWidth - this.k_stage.width());
	}
	sl_max_x() {
		return 0;
	}
	sl_perc_to_x(perc) {
		return this.sl_min_x() + (1 - perc) * (this.sl_max_x() - this.sl_min_x());
	}
	sl_dx_to_dperc(dx) {
		return dx / (this.sl_max_x() - this.sl_min_x());
	}



	/**
	 *
	 * @param {HTMLDivElement} direct_container
	 * @param {HTMLElement} resize_container
	 */
	constructor(direct_container, resize_container, { stageWidth = 1500, stageHeight = 500, fullWidth = 2500, fullHeight = 800, flipDefaultScrollDirection = false }) {
		super(direct_container, resize_container, { stageWidth, stageHeight });

		this.fullWidth = fullWidth;
		this.fullHeight = fullHeight;
		this.flipDefaultScrollDirection = flipDefaultScrollDirection;

		this.scrolling_layer = new Konva.Layer();
		this.k_stage.add(this.scrolling_layer);

		this.scroll_bar_layer = new Konva.Layer();
		this.k_stage.add(this.scroll_bar_layer);

		this.vertical_scroll_bar = new Konva.Rect({
			fill: getComputedStyle(document.body).getPropertyValue("--scrollbar-thumb-color"),
			opacity: SCROLLBAR_OPACITY,
			draggable: true,

			width: SCROLLBAR_WIDTH,
			height: SCROLLBAR_HEIGHT,
			x: this.vsb_x(),
			y: this.vsb_min_y(),
			dragBoundFunc: pos => {
				pos.x = this.vsb_x();
				pos.y = this.clamp_vsb_y(pos.y);
				return pos;
			},
		});
		this.scroll_bar_layer.add(this.vertical_scroll_bar);
		this.vertical_scroll_bar.on("dragmove", () => {
			const perc = this.vsb_y_to_perc(this.vertical_scroll_bar.y());
			this.set_vscroll_perc(perc);
		});

		this.horizontal_scroll_bar = new Konva.Rect({
			fill: getComputedStyle(document.body).getPropertyValue("--scrollbar-thumb-color"),
			opacity: SCROLLBAR_OPACITY,
			draggable: true,

			width: SCROLLBAR_HEIGHT,
			height: SCROLLBAR_WIDTH,
			x: this.hsb_min_x(),
			y: this.hsb_y(),
			dragBoundFunc: pos => {
				pos.x = this.clamp_hsb_x(pos.x);
				pos.y = this.hsb_y();
				return pos;
			},
		});
		this.scroll_bar_layer.add(this.horizontal_scroll_bar);
		this.horizontal_scroll_bar.on("dragmove", _pos => {
			const perc = this.hsb_x_to_perc(this.horizontal_scroll_bar.x());
			this.set_hscroll_perc(perc);
		});

		this.k_stage.on("wheel", ev => {
			if (ev.evt.ctrlKey || ev.evt.altKey) return;
			// prevent parent scrolling
			ev.evt.preventDefault();
			const [dx, dy] = this.flipDefaultScrollDirection != ev.evt.shiftKey ? [ev.evt.deltaY, ev.evt.deltaX] : [ev.evt.deltaX, ev.evt.deltaY];

			const perc_y = this.vscroll_dy_to_dperc(dy) + this.get_vscroll_perc();
			this.set_vscroll_perc(perc_y);

			const perc_x = this.hscroll_dx_to_dperc(dx) + this.get_hscroll_perc();
			this.set_hscroll_perc(perc_x);

			this.fix_scrollbar_coords();
		});

		this.fix_scrollbar_coords();
	}

	fix_scrollbar_coords() {
		if (!this.vertical_scroll_bar && !this.horizontal_scroll_bar) return;

		this.vertical_scroll_bar.x(this.vsb_x());
		this.horizontal_scroll_bar.y(this.hsb_y());

		const vy = this.vsb_min_y() + this.get_vscroll_perc() * this.vsb_range();
		this.vertical_scroll_bar.y(this.clamp_vsb_y(vy));

		const hx = this.hsb_min_x() + this.get_hscroll_perc() * this.hsb_range();
		this.horizontal_scroll_bar.x(this.clamp_hsb_x(hx));
	}

	fitStageIntoParentContainer() {
		this.k_stage.width(this.resize_container.offsetWidth);
		this.k_stage.height(this.resize_container.offsetHeight);

		this.fix_scrollbar_coords();
	}



	/****  Overridable scroll functions  ****/

	/** @param {number} perc */
	set_vscroll_perc(perc) {
		perc = Math.max(0, Math.min(1, perc));
		this.scrolling_layer.y(this.sl_perc_to_y(perc));
	}
	get_vscroll_perc() {
		return this.scrolling_layer.y() / (-this.fullHeight + this.k_stage.height());
	}
	vscroll_dy_to_dperc(dy) {
		return this.sl_dy_to_dperc(dy);
	}


	/** @param {number} perc */
	set_hscroll_perc(perc) {
		perc = Math.max(0, Math.min(1, perc));
		this.scrolling_layer.x(this.sl_perc_to_x(perc));
	}
	get_hscroll_perc() {
		return this.scrolling_layer.x() / (-this.fullWidth + this.k_stage.width());
	}
	hscroll_dx_to_dperc(dx) {
		return this.sl_dx_to_dperc(dx);
	}
}