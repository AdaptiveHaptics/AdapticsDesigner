import * as THREE from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HapticDevice } from "../haptic-device.js";


export class BaseScene {
	#_pattern_design;

	/**
	 *
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} container
	 */
	constructor(pattern_design, container) {
		this.#_pattern_design = pattern_design;
		this.container = container;


		const renderer = this.renderer = new THREE.WebGLRenderer({
			// antialias: true,
		});

		renderer.setClearColor(0xfff6e6);
		renderer.setClearColor(0x000000);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);


		this.scene = new THREE.Scene();

		const axesHelper = new THREE.AxesHelper(5);
		this.scene.add(axesHelper);

		this.camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
		this.camera.position.set(-0.21, 0.24, 0.40);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		window.addEventListener("resize", _ev => this.fitStageIntoParentContainer());
		const resize_observer = new ResizeObserver(_entries => this.fitStageIntoParentContainer());
		resize_observer.observe(container);
		this.fitStageIntoParentContainer();

		this.#_setup_lights();


		const haptic_device = this.haptic_device = new HapticDevice();
		this.scene.add(haptic_device.getObject3D());

		const ground = this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100),
			new THREE.MeshStandardMaterial({
				color: 0x808080,
				metalness: 0,
				roughness: 1,
			})
		);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.08;
		ground.receiveShadow = true;
		this.scene.add(ground);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		if (WebGL.isWebGLAvailable()) {
			const animate = () => {
				requestAnimationFrame(animate);
				this.render();
			};
			animate();
		} else {
			const warning = WebGL.getWebGLErrorMessage();
			container.appendChild(warning);
		}

		this.#_pattern_design.state_change_events.addEventListener("playback_update", _ev => {
			this.haptic_device.playback_vis.update_playback_visualization(this.#_pattern_design.last_eval);
		});
		this.haptic_device.playback_vis.update_playback_visualization(this.#_pattern_design.last_eval);
	}

	fitStageIntoParentContainer() {
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, true);
		this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
		this.camera.updateProjectionMatrix();
		console.log(this.camera.aspect);
	}

	#_setup_lights() {
		if (this.ambient_light) throw new Error("Lights already setup");

		this.ambient_light = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(this.ambient_light);

		this.hemisphere_light = new THREE.HemisphereLight(0xffffff, 0x0e0e0e, 0.8);
		this.scene.add(this.hemisphere_light);

		const dist = 0.1;

		const key_light = this.key_light = this.#_create_shadowed_point_light(0xffffff, -1.8 * dist, 1.44 * dist, 1.2 * dist, 7 * (dist ** 2));
		this.scene.add(key_light);
		// this.scene.add(new THREE.PointLightHelper(key_light, 0.1));

		const fill_light = this.fill_light = this.#_create_shadowed_point_light(0xffffff, 1.8 * dist, 1.3 * dist, 1.6 * dist, 4 * (dist ** 2));
		this.scene.add(fill_light);
		// this.scene.add(new THREE.PointLightHelper(fill_light, 0.1));

		const back_light = this.back_light = this.#_create_shadowed_point_light(0xffffff, 0.8 * dist, 2.4 * dist, -2.2 * dist, 2 * (dist ** 2));
		this.scene.add(back_light);
		// this.scene.add(new THREE.PointLightHelper(back_light, 0.1));
	}

	/**
	 *
	 * @param {THREE.ColorRepresentation} color
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} intensity
	 * @returns
	 */
	#_create_shadowed_point_light(color, x, y, z, intensity) {
		const light = new THREE.PointLight(color, intensity);
		light.position.set(x, y, z);
		light.castShadow = true;
		light.shadow.camera.near = 0.001;
		light.shadow.camera.far = 10;
		light.shadow.mapSize.width = 1024;
		light.shadow.mapSize.height = 1024;
		return light;
	}

	render() {
		// cube.rotation.x += 0.01;
		// cube.rotation.y += 0.01;
		this.renderer.render(this.scene, this.camera);
		this.renderer.render(this.scene, this.camera);

	}
}