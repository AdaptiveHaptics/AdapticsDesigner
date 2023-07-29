import * as THREE from "three";

export class HapticDevice {
	constructor(device_dimensions = new THREE.Vector3(0.22, 0.04, 0.22)) {
		// Create a base object to hold all components of the prefab
		this.object3D = new THREE.Object3D();
		this.object3D.name = "Haptic Device";

		// Create the cube to represent the haptic device
		const cube = new THREE.Mesh(
			new THREE.BoxGeometry(device_dimensions.x, device_dimensions.y, device_dimensions.z),
			new THREE.MeshStandardMaterial({ color: 0x292B2E, metalness: 0, roughness: 1 })
		);
		cube.castShadow = true;
		cube.receiveShadow = true;
		cube.position.set(0, -device_dimensions.y / 2, 0); //move cube down so top of cube is at haptic origin
		this.object3D.add(cube);

		const playback_vis = this.playback_vis = new PlaybackVis();
		this.object3D.add(playback_vis.getObject3D());
	}

	// Method to get the base object for adding to the scene
	getObject3D() {
		return this.object3D;
	}

	/**
	 *
	 * @param {import("../pattern-evaluator.mjs").MAHCoordsConst} haptic_coords
	 * @returns {THREE.Vector3}
	 */
	static haptic_to_three_coords(haptic_coords) {
		return new THREE.Vector3(haptic_coords.x / 1000, haptic_coords.z / 1000, haptic_coords.y / 1000);
	}
}

class PlaybackVis {
	constructor() {
		this.low_color = new THREE.Color(window.getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis-low"));
		this.high_color = new THREE.Color(window.getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis-high"));



		const points = [
			new THREE.Vector3(-0.1, 0.2, -0.1),
			new THREE.Vector3(-0.1, 0.1, 0.1),
			new THREE.Vector3(0.1, 0.2, 0.1)
		];
		const colors = [
			this.high_color,
			this.low_color,
			this.high_color,
		];

		const curve = new THREE.CatmullRomCurve3(points);
		this.geometry = new THREE.TubeGeometry(curve, 20, 0.001, 8, false);
		this.material = new THREE.MeshBasicMaterial({ vertexColors: true });

		this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors.flatMap(c => c.toArray()), 3));

		this.tube = new THREE.Mesh(this.geometry, this.material);
	}

	/**
	 *
	 * @param {import("../pattern-evaluator.mjs").BrushAtAnimLocalTime[]} last_eval
	 */
	update_playback_visualization(last_eval) {
		const points = last_eval.map(be => HapticDevice.haptic_to_three_coords(be.ul_control_point.coords));
		const curve = new THREE.CatmullRomCurve3(points);
		this.geometry = new THREE.TubeGeometry(curve, 20, 0.001, 8, false);

		// Create an array of colors for each point
		const colors = new Float32Array(points.length * 3);
		last_eval.forEach((be, index) => {
			const color = this.low_color.clone().lerp(this.high_color, be.ul_control_point.intensity);
			colors[index * 3] = color.r;
			colors[index * 3 + 1] = color.g;
			colors[index * 3 + 2] = color.b;
		});
		this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		this.tube.geometry = this.geometry;
	}

	getObject3D() {
		return this.tube;
	}
}