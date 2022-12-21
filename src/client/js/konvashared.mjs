const Konva = /** @type {import("konva").default} */ (window["Konva"]);

export class KonvaResizeStage {

	sceneWidth = 500;
	sceneHeight = 500;

	/**
	 * 
	 * @param {string} direct_container_id 
	 * @param {HTMLElement} resize_container 
	 */
	constructor(direct_container_id, resize_container) {

		this.direct_container_id = direct_container_id;
		this.resize_container = resize_container;

		this.k_stage = new Konva.Stage({
			container: direct_container_id,
			width: this.sceneWidth,
			height: this.sceneHeight,
		});


		// adapt the stage on any window resize
		window.addEventListener("resize", ev => this.fitStageIntoParentContainer());
		resize_container.addEventListener("resize", ev => this.fitStageIntoParentContainer());
		this.fitStageIntoParentContainer();
	}

	fitStageIntoParentContainer() {
		const scale = Math.min(this.resize_container.offsetWidth / this.sceneWidth, this.resize_container.offsetHeight / this.sceneHeight);
		// console.log(container.offsetWidth / sceneWidth, container.offsetHeight / sceneHeight, scale);

		this.k_stage.width(this.sceneWidth * scale);
		this.k_stage.height(this.sceneHeight * scale);
		this.k_stage.scale({ x: scale, y: scale });
	}
}