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

export class KonvaResizeScrollStage extends KonvaResizeStage {
	scrollbar_padding = 5;

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
			width: 10,
			height: 100,
			fill: getComputedStyle(document.body).getPropertyValue("--scrollbar-thumb-color"),
			opacity: 0.8,
			x: this.k_stage.width() - this.scrollbar_padding - 10,
			y: this.scrollbar_padding,
			draggable: true,
			dragBoundFunc: pos => {
				pos.x = this.k_stage.width() - this.scrollbar_padding - 10;
				pos.y = Math.max(
					Math.min(pos.y, this.k_stage.height() - this.vertical_scroll_bar.height() - this.scrollbar_padding),
					this.scrollbar_padding
				);
				return pos;
			},
		});
		this.scroll_bar_layer.add(this.vertical_scroll_bar);
		this.vertical_scroll_bar.on("dragmove", () => {
			const availableHeight = this.k_stage.height() - this.scrollbar_padding * 2 - this.vertical_scroll_bar.height();
			var delta = (this.vertical_scroll_bar.y() - this.scrollbar_padding) / availableHeight; //delta in %

			this.scrolling_layer.y(-(this.fullHeight - this.k_stage.height()) * delta);
		});

		this.horizontal_scroll_bar = new Konva.Rect({
			width: 100,
			height: 10,
			fill: getComputedStyle(document.body).getPropertyValue("--scrollbar-thumb-color"),
			opacity: 0.8,
			x: this.scrollbar_padding,
			y: this.k_stage.height() - this.scrollbar_padding - 10,
			draggable: true,
			dragBoundFunc: pos => {
				pos.x = Math.max(
					Math.min(pos.x, this.k_stage.width() - this.horizontal_scroll_bar.width() - this.scrollbar_padding),
					this.scrollbar_padding
				);
				pos.y = this.k_stage.height() - this.scrollbar_padding - 10;
				return pos;
			},
		});
		this.scroll_bar_layer.add(this.horizontal_scroll_bar);
		this.horizontal_scroll_bar.on("dragmove", _pos => {
			const availableWidth = this.k_stage.width() - this.scrollbar_padding * 2 - this.horizontal_scroll_bar.width();
			var delta = (this.horizontal_scroll_bar.x() - this.scrollbar_padding) / availableWidth; //delta in %

			this.scrolling_layer.x(-(this.fullWidth - this.k_stage.width()) * delta);
		});

		this.k_stage.on("wheel", ev => {
			if (ev.evt.ctrlKey || ev.evt.altKey) return;
			// prevent parent scrolling
			ev.evt.preventDefault();
			const [dx, dy] = this.flipDefaultScrollDirection != ev.evt.shiftKey ? [ev.evt.deltaY, ev.evt.deltaX] : [ev.evt.deltaX, ev.evt.deltaY];

			const minX = -(this.fullWidth - this.k_stage.width());
			const maxX = 0;

			const x = Math.max(minX, Math.min(this.scrolling_layer.x() - dx, maxX));

			const minY = -(this.fullHeight - this.k_stage.height());
			const maxY = 0;

			const y = Math.max(minY, Math.min(this.scrolling_layer.y() - dy, maxY));
			this.scrolling_layer.position({ x, y });

			this.fix_scrollbar_coords();
		});
	}

	fix_scrollbar_coords() {
		if (!this.vertical_scroll_bar && !this.horizontal_scroll_bar) return;

		const stage_width = this.k_stage.width() / this.k_stage.scaleX();
		const stage_height = this.k_stage.height() / this.k_stage.scaleY();

		this.vertical_scroll_bar.x(stage_width - this.scrollbar_padding - 10);
		this.horizontal_scroll_bar.y(stage_height - this.scrollbar_padding - 10);

		const availableHeight = stage_height - this.scrollbar_padding * 2 - this.vertical_scroll_bar.height();
		const vy = (this.scrolling_layer.y() / (-this.fullHeight + stage_height)) * availableHeight + this.scrollbar_padding;
		this.vertical_scroll_bar.y(vy);

		const availableWidth = stage_width - this.scrollbar_padding * 2 - this.horizontal_scroll_bar.width();
		const hx = (this.scrolling_layer.x() / (-this.fullWidth + stage_width)) * availableWidth + this.scrollbar_padding;
		this.horizontal_scroll_bar.x(hx);
	}

	fitStageIntoParentContainer() {
		this.k_stage.width(this.resize_container.offsetWidth);
		this.k_stage.height(this.resize_container.offsetHeight);

		this.fix_scrollbar_coords();
	}
}