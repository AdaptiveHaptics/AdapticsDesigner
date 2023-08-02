import * as THREE from "three";
import { haptic_to_three_coords } from "../util.mjs";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";

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
	 * @param {THREE.Vector2} resolution
	 * @param {THREE.Scene} scene
	 * @param {THREE.Camera} camera
	 * @returns
	 */
	static create_outline_pass(resolution, scene, camera) {
		return PlaybackVis.create_outline_pass(resolution, scene, camera);
	}
}

class PlaybackVis {
	static low_color = new THREE.Color(window.getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis-low"));
	static high_color = new THREE.Color(window.getComputedStyle(document.body).getPropertyValue("--pattern-playback-vis-high"));

	constructor() {
		const points = [
			new THREE.Vector3(-0.1, 0.2, -0.1),
			new THREE.Vector3(-0.1, 0.1, 0.1),
			new THREE.Vector3(0.1, 0.2, 0.1)
		];
		const colors = [
			PlaybackVis.high_color,
			PlaybackVis.low_color,
			PlaybackVis.high_color,
		];

		const curve = new THREE.CatmullRomCurve3(points);
		this.geometry = new THREE.TubeGeometry(curve, 20, 0.01, 8, false);
		this.material = new THREE.MeshBasicMaterial({
			vertexColors: true,
			// depthTest: false,
		});

		this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors.flatMap(c => c.toArray()), 3));

		this.tube = new THREE.Mesh(this.geometry, this.material);
	}

	/**
	 *
	 * @param {import("../../pattern-evaluator.mjs").BrushAtAnimLocalTime[]} last_eval
	 */
	update_playback_visualization(last_eval) {
		const points3d = last_eval.map(be => haptic_to_three_coords(be.ul_control_point.coords));
		const curve3d = new THREE.CatmullRomCurve3(points3d);
		const intensities = last_eval.map(be => new THREE.Vector3(be.ul_control_point.intensity, 0, 0));
		const curve_intensity = new THREE.CatmullRomCurve3(intensities);

		this.geometry = new THREE.TubeGeometry(curve3d, 32, 0.005, 7, false);

		if (this.geometry.attributes.position.count !== (this.geometry.parameters.tubularSegments + 1) * (this.geometry.parameters.radialSegments + 1)) {
			throw new Error("Unexpected geometry vertex count: " + this.geometry.attributes.position.count + " vs " + (this.geometry.parameters.tubularSegments + 1) * (this.geometry.parameters.radialSegments + 1));
		}
		let color_i = 0;
		const colors = new Float32Array(this.geometry.attributes.position.count * 3);
		for (let tub_i = 0; tub_i <= this.geometry.parameters.tubularSegments; tub_i++) {
			const intensity = curve_intensity.getPointAt(tub_i / this.geometry.parameters.tubularSegments).x;
			const color = PlaybackVis.low_color.clone().lerp(PlaybackVis.high_color, intensity);
			for (let rad_i = 0; rad_i <= this.geometry.parameters.radialSegments; rad_i++) {
				colors[color_i * 3] = color.r;
				colors[color_i * 3 + 1] = color.g;
				colors[color_i * 3 + 2] = color.b;
				color_i++;
			}
		}

		this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		this.tube.geometry = this.geometry;
	}

	getObject3D() {
		return this.tube;
	}

	/**
	 *
	 * @param {THREE.Vector2} resolution
	 * @param {THREE.Scene} scene
	 * @param {THREE.Camera} camera
	 * @returns
	 */
	static create_outline_pass(resolution = new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera) {
		const hand_outline_pass = new OutlinePass(resolution, scene, camera);
		hand_outline_pass.edgeStrength = 2.6;
		hand_outline_pass.edgeGlow = 0.7;
		hand_outline_pass.edgeThickness = 2;
		hand_outline_pass.visibleEdgeColor.set(PlaybackVis.high_color);
		hand_outline_pass.hiddenEdgeColor.set(PlaybackVis.high_color.clone().multiplyScalar(0.2));
		return hand_outline_pass;
	}
}