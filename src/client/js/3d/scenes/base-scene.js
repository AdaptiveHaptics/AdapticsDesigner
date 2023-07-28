import * as THREE from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";


export class BaseScene {

	/**
	 *
	 * @param {HTMLDivElement} container
	 */
	constructor(container) {
		this.container = container;

		const renderer = this.renderer = new THREE.WebGLRenderer();
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor( 0xfff6e6 );
		renderer.setClearColor( 0x000000 );
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);


		this.scene = new THREE.Scene();

		const axesHelper = new THREE.AxesHelper(5);
		this.scene.add(axesHelper);

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.set(-2.0, 2.4, 4.0);
		this.camera.lookAt(new THREE.Vector3(0,0,0));

		this.#_setup_lights();

		const ground = this.ground = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100),
			new THREE.MeshStandardMaterial({
				color: 0x808080,
				metalness: 0,
				roughness: 1,
			})
		);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.5;
		ground.receiveShadow = true;
		this.scene.add(ground);

		const cube = this.cube = new THREE.Mesh(
			new THREE.BoxGeometry(2, 0.5, 2),
			new THREE.MeshStandardMaterial({
				// color: 0xff0051,
				color: 0x00FF00,
				metalness: 0,
				roughness: 1,
			})
		);
		cube.position.set(0, 0, 0);
		cube.castShadow = true;
		cube.receiveShadow = true;
		this.scene.add(cube);

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
	}

	#_setup_lights() {
		if (this.ambient_light) throw new Error("Lights already setup");

		this.ambient_light = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(this.ambient_light);

		this.hemisphere_light = new THREE.HemisphereLight(0xffffff, 0x0e0e0e, 0.8);
		this.scene.add(this.hemisphere_light);

		const key_light = this.key_light = new THREE.PointLight(0xffffff);
		key_light.intensity = 7.6;
		key_light.position.set(-1.8, 1.44, 1.2); //angle to camera is 26deg
		key_light.castShadow = true;
		key_light.shadow.mapSize.width = 1024;
		key_light.shadow.mapSize.height = 1024;
		this.scene.add(key_light);
		// const pointLightHelper = new THREE.PointLightHelper(key_light, 1);
		// this.scene.add(pointLightHelper);

		const fill_light = this.fill_light = new THREE.PointLight(0xffffff);
		fill_light.intensity = 4;
		fill_light.position.set(1.8, 1.3, 1.6);
		fill_light.castShadow = true;
		fill_light.shadow.mapSize.width = 1024;
		fill_light.shadow.mapSize.height = 1024;
		this.scene.add(fill_light);
		// const pointLightHelper2 = new THREE.PointLightHelper(fill_light, 1);
		// this.scene.add(pointLightHelper2);

		const back_light = this.back_light = new THREE.PointLight(0xffffff);
		back_light.intensity = 2;
		back_light.position.set(0.8, 2.4, -2.2);
		back_light.castShadow = true;
		back_light.shadow.mapSize.width = 1024;
		back_light.shadow.mapSize.height = 1024;
		this.scene.add(back_light);
		// const pointLightHelper3 = new THREE.PointLightHelper(back_light, 1);
		// this.scene.add(pointLightHelper3);
	}

	render() {
		// cube.rotation.x += 0.01;
		// cube.rotation.y += 0.01;
		this.renderer.render(this.scene, this.camera);
		this.renderer.render(this.scene, this.camera);

	}


}