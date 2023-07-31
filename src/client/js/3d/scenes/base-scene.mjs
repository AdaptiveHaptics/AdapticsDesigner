import * as THREE from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { HapticDevice } from "../haptic-device.mjs";
import { Hand3D } from "../hand-3d.mjs";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";


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
			// alpha: true,
		});

		renderer.setClearColor(0x000000);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);

		const camera = this.camera = new THREE.PerspectiveCamera(75, 1, 0.01, 1000);
		this.camera.position.set(-0.20, 0.28, 0.31);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.target.set(0, 0.1, 0);
		this.controls.update();
		this.camera.updateProjectionMatrix();


		const scene = this.scene = new THREE.Scene();

		const composer = this.composer =  new EffectComposer(renderer);
		const render_pass = this.render_pass = new RenderPass(scene, camera);
		// render_pass.clear = true;
		composer.addPass(render_pass);

		// for hand outline
		const hand_outline_pass = this.hand_outline_pass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
		this.hand_outline_pass.edgeStrength = 3.0;  // The strength of the edges
		this.hand_outline_pass.edgeGlow = 0.7;      // The glow effect of the edges
		this.hand_outline_pass.edgeThickness = 2.0; // The thickness of the edges
		this.hand_outline_pass.visibleEdgeColor.set("#ffffff");  // The color of the visible edges
		this.hand_outline_pass.hiddenEdgeColor.set("#292929"); // The color of the hidden edges
		composer.addPass(hand_outline_pass);

		const output_pass = this.output_pass = new OutputPass();
		composer.addPass(output_pass);


		window.addEventListener("resize", _ev => this.fitStageIntoParentContainer());
		const resize_observer = new ResizeObserver(_entries => this.fitStageIntoParentContainer());
		resize_observer.observe(container);
		this.fitStageIntoParentContainer();



		this.scene.add(new THREE.AxesHelper(5));

		this.#_setup_lights(false);

		const haptic_device = this.haptic_device = new HapticDevice();
		this.scene.add(haptic_device.getObject3D());

		const hand = this.hand = new Hand3D(this);
		this.scene.add(hand.getObject3D());

		const ground = this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
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
	 * @param {boolean} show_helpers
	 */
	#_setup_lights(show_helpers) {
		if (this.ambient_light) throw new Error("Lights already setup");

		this.ambient_light = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(this.ambient_light);

		this.hemisphere_light = new THREE.HemisphereLight(0xffffff, 0x0e0e0e, 0.8);
		this.scene.add(this.hemisphere_light);

		const dist = 0.1;

		const key_light = this.key_light = this.#_create_shadowed_point_light(0xffffff, -1.8 * dist, 1.44 * dist, 1.2 * dist, 7 * (dist ** 2));
		this.scene.add(key_light);
		if (show_helpers) this.scene.add(new THREE.PointLightHelper(key_light, 0.1));

		const fill_light = this.fill_light = this.#_create_shadowed_point_light(0xffffff, 1.8 * dist, 1.3 * dist, 1.6 * dist, 4 * (dist ** 2));
		this.scene.add(fill_light);
		if (show_helpers) this.scene.add(new THREE.PointLightHelper(fill_light, 0.1));

		const back_light = this.back_light = this.#_create_shadowed_point_light(0xffffff, 0.8 * dist, 2.4 * dist, -2.2 * dist, 2 * (dist ** 2));
		this.scene.add(back_light);
		if (show_helpers) this.scene.add(new THREE.PointLightHelper(back_light, 0.1));
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

			const effectController = {
				turbidity: 1,
				rayleigh: 3,

				mieCoefficient: 0.005,
				mieDirectionalG: 0.7,
				// mieCoefficient: 0.0,
				// mieDirectionalG: 0.0,

				elevation: 2,
				azimuth: -120,
				exposure: this.renderer.toneMappingExposure,
			};

			const uniforms = sky.material.uniforms;

			uniforms["turbidity"].value = effectController.turbidity;
			uniforms["rayleigh"].value = effectController.rayleigh;
			uniforms["mieCoefficient"].value = effectController.mieCoefficient;
			uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

			const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
			const theta = THREE.MathUtils.degToRad(effectController.azimuth);

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

	render() {
		const rsize = this.renderer.getSize(new THREE.Vector2());
		if (rsize.x == 0 || rsize.y == 0) return;

		if (this.skyboxMaterial) this.skyboxMaterial.uniforms.iTime.value += 2**-20; // ~0.000001 == 10^-6

		this.composer.render();
	}
}