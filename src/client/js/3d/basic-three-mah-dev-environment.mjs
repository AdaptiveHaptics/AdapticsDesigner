import * as THREE from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { HapticDevice } from "./objects/haptic-device.mjs";
import { Hand3D } from "./objects/hand-3d.mjs";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";


export class BasicThreeMAHDevEnvironment {
	#_pattern_design;

	/** @type {import("./exps/base-experience.mjs").BaseExperience | null} */
	#_experience = null;
	/** @type {import("../device-ws-controller.mjs").TrackingFrame | null} */
	#_last_tracking_data = null;

	#_hand;

	/**
	 *
	 * @param {import("../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} container
	 */
	constructor(pattern_design, container) {
		this.#_pattern_design = pattern_design;
		this.container = container;

		try {
			this.renderer = new THREE.WebGLRenderer({
				// antialias: true,
				// alpha: true,
			});
		} catch (e) {
			this.#_create_message_div("WebGL is not supported on this device.");
			throw e;
		}
		const renderer = this.renderer;

		renderer.setClearColor(0x000000);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);
		renderer.domElement.tabIndex = 0;

		this.camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
		this.camera.position.set(-0.20, 0.28, 0.31);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.target.set(0, 0.1, 0);
		this.controls.listenToKeyEvents(this.renderer.domElement);
		this.controls.update();
		this.camera.updateProjectionMatrix();
		this.controls.saveState();
		renderer.domElement.addEventListener("keypress", ev => {
			if (ev.key === "r") {
				this.controls.reset();
				this.camera.updateProjectionMatrix();
				ev.preventDefault();
				ev.stopImmediatePropagation();
			}
		});


		this.scene = new THREE.Scene();

		this.composer =  new EffectComposer(renderer);
		this.render_pass = new RenderPass(this.scene, this.camera);
		// render_pass.clear = true;
		this.composer.addPass(this.render_pass);

		// for hand outline
		this.hand_outline_pass = Hand3D.create_outline_pass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
		this.composer.addPass(this.hand_outline_pass);

		// for playback visualization
		this.playback_vis_outline_pass = HapticDevice.create_outline_pass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
		this.composer.addPass(this.playback_vis_outline_pass);

		this.output_pass = new OutputPass();
		this.composer.addPass(this.output_pass);


		window.addEventListener("resize", _ev => this.fitStageIntoParentContainer());
		const resize_observer = new ResizeObserver(_entries => this.fitStageIntoParentContainer());
		resize_observer.observe(container);
		this.fitStageIntoParentContainer();



		this.scene.add(new THREE.AxesHelper(5));

		this.#_setup_lights(false);

		this.haptic_device = new HapticDevice();
		this.playback_vis_outline_pass.selectedObjects = [this.haptic_device.playback_vis.getObject3D()];
		this.scene.add(this.haptic_device.getObject3D());

		this.#_hand = new Hand3D(this, true);
		this.scene.add(this.#_hand.getObject3D());

		this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
			new THREE.MeshStandardMaterial({
				color: 0x808080,
				metalness: 0,
				roughness: 1,
			})
		);
		this.ground.rotation.x = -Math.PI / 2;
		this.ground.position.y = -0.08;
		this.ground.receiveShadow = true;
		this.scene.add(this.ground);

		this.#_create_skybox("sky");


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

	/**
	 *
	 * @param {import("./exps/base-experience.mjs").BaseExperience | null} experience
	 */
	load_experience(experience) {
		if (this.#_experience) this.scene.remove(this.#_experience.getObject3D());

		this.#_experience = experience;
		if (this.#_experience) this.scene.add(this.#_experience.getObject3D());
	}

	fitStageIntoParentContainer() {
		const cw = this.container.clientWidth;
		const ch = this.container.clientHeight;
		this.renderer.setSize(cw, ch, true);
		this.composer.setSize(cw, ch);
		this.camera.aspect = ch == 0 ? 1 : cw / ch;
		this.camera.updateProjectionMatrix();
	}

	/**
	 *
	 * @param {import("../device-ws-controller.mjs").TrackingFrame} tracking_frame
	 */
	update_tracking_data(tracking_frame) {
		this.#_last_tracking_data = tracking_frame;
	}

	/**
	 *
	 * @param {boolean} show_helpers
	 */
	#_setup_lights(show_helpers) {
		if (this.ambient_light) throw new Error("Lights already setup");

		this.ambient_light = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(this.ambient_light);

		this.hemisphere_light = new THREE.HemisphereLight(0xffffff, 0x0e0e0e, 0.8);
		this.scene.add(this.hemisphere_light);

		const dist = 1.25;

		this.key_light         = this.#_create_and_add_shadowed_point_light(0xffffff, -0.180*dist, 0.244,  0.120*dist, 0.080 * (dist ** 2), show_helpers);
		this.fill_light        = this.#_create_and_add_shadowed_point_light(0xffffff,  0.180*dist, 0.230,  0.160*dist, 0.045 * (dist ** 2), show_helpers);
		this.back_light        = this.#_create_and_add_shadowed_point_light(0xffffff,  0.080*dist, 0.340, -0.220*dist, 0.025 * (dist ** 2), show_helpers);

		const sun_light = new THREE.DirectionalLight(0xecbcab, 0.61);
		this.#_init_light(sun_light, Math.sin(this.skybox_eff.azimuth * Math.PI/180), 0.6, Math.cos(this.skybox_eff.azimuth * Math.PI/180));
		this.scene.add(sun_light);
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
	#_create_and_add_shadowed_point_light(color, x, y, z, intensity, show_helpers = false) {
		const light = new THREE.PointLight(color, intensity);
		this.#_init_light(light, x, y, z);
		if (show_helpers) this.scene.add(new THREE.PointLightHelper(light, 0.1));
		return light;
	}

	/**
	 *
	 * @param {THREE.Light<THREE.LightShadow<THREE.PerspectiveCamera | THREE.OrthographicCamera>>} light
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	#_init_light(light, x, y, z) {
		light.position.set(x, y, z);
		light.castShadow = true;
		light.shadow.camera.near = 0.001;
		light.shadow.camera.far = 10;
		light.shadow.mapSize.width = 1024;
		light.shadow.mapSize.height = 1024;
		this.scene.add(light);
	}


	skybox_eff = {
		turbidity: 1,
		rayleigh: 3,

		mieCoefficient: 0.005,
		mieDirectionalG: 0.7,
		// mieCoefficient: 0.0,
		// mieDirectionalG: 0.0,

		elevation: 2,
		azimuth: -120
	};

	/**
	 *
	 * @param {string} skybox_type
	 */
	#_create_skybox(skybox_type) {
		if (this.skybox) throw new Error("Skybox already created");
		if (skybox_type == "sky") {
			const sky = this.skybox = new Sky();
			sky.scale.setScalar(1000);
			this.scene.add(sky);
			const sun = new THREE.Vector3();

			const uniforms = sky.material.uniforms;

			uniforms["turbidity"].value = this.skybox_eff.turbidity;
			uniforms["rayleigh"].value = this.skybox_eff.rayleigh;
			uniforms["mieCoefficient"].value = this.skybox_eff.mieCoefficient;
			uniforms["mieDirectionalG"].value = this.skybox_eff.mieDirectionalG;

			const phi = THREE.MathUtils.degToRad(90 - this.skybox_eff.elevation);
			const theta = THREE.MathUtils.degToRad(this.skybox_eff.azimuth);

			sun.setFromSphericalCoords(1, phi, theta);

			uniforms["sunPosition"].value.copy(sun);
		} else {

			const skyboxGeometry = new THREE.BoxGeometry(500, 500, 500);

			const uniforms = {
				iTime: { value: 1.0 },
				iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
				iMouse: { value: new THREE.Vector2(0, 0) }
			};

			const starVertexShader = `
				varying vec3 vWorldDirection;

				void main() {
					vec4 worldPosition = modelMatrix * vec4(position, 1.0);
					vWorldDirection = normalize(worldPosition.xyz);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`;
			const loader = new THREE.FileLoader();

			loader.loadAsync(new URL("./stars-skybox.frag", import.meta.url).toString()).then(starFragmentShader => {
				// Create a shader material
				const skyboxMaterial = this.skyboxMaterial = new THREE.ShaderMaterial({
					side: THREE.BackSide,
					uniforms: uniforms,
					vertexShader: starVertexShader,
					fragmentShader: starFragmentShader.toString()
				});

				// skyboxGeometry.scale(1, 1, -1);

				// Create a Mesh with the geometry and material
				const skybox = this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

				// Add the skybox to the scene
				this.scene.add(skybox);
			});

		}
	}


	#_disabled_due_to_low_performance = false;
	#_last_performance_check = performance.now();
	#_frames_since_last_performance_check = 0;
	minimum_fps = 24;
	perf_check_interval_seconds = 1.5;

	#_no_performance_check = false;
	render() {
		const rsize = this.renderer.getSize(new THREE.Vector2());
		if (rsize.x == 0 || rsize.y == 0) {
			this.#_no_performance_check = false; // reset no performance check if the render tab is hidden
			this.#_last_performance_check = performance.now();
			this.#_frames_since_last_performance_check = 0;
			return;
		}
		if (this.#_disabled_due_to_low_performance) return;

		if (this.skyboxMaterial) this.skyboxMaterial.uniforms.iTime.value += 2**-20; // ~0.000001 == 10^-6

		{ // actual render steps
			this.#_hand.update(this.#_last_tracking_data);
			this.#_experience?.update(this.#_last_tracking_data);
			this.composer.render();
		}

		if (!this.#_no_performance_check) {
			this.#_frames_since_last_performance_check++;

			const now = performance.now();
			if (now - this.#_last_performance_check > 1000 * this.perf_check_interval_seconds) {
				if (this.#_frames_since_last_performance_check < this.perf_check_interval_seconds*0.90*this.minimum_fps) {
					this.#_disable_due_to_low_performance();
				}
				this.#_frames_since_last_performance_check = 0;
				this.#_last_performance_check = now;
			}
		}
	}

	/**
	 *
	 * @param {string} message_text
	 * @returns
	 */
	#_create_message_div(message_text) {
		const message_div = document.createElement("div");
		message_div.classList.add("three-modal-message");
		message_div.textContent = message_text;
		return message_div;
	}
	#_disable_due_to_low_performance() {
		console.warn("Disabling THREEJS scene due to low performance!");
		this.#_disabled_due_to_low_performance = true;

		// show a message to the user and if they click it, re-enable and set _no_performance_check
		const message_div = this.#_create_message_div("Due to low performance, the 3D WebGL scene has been disabled. Click to re-enable."); //maybe tell user: Check if WebGL hardware acceleration is available and enabled in the browser
		this.container.appendChild(message_div);
		message_div.addEventListener("click", () => {
			this.#_disabled_due_to_low_performance = false;
			this.#_no_performance_check = true;
			this.container.removeChild(message_div);
		});
	}
}