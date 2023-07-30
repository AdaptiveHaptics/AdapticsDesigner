import * as THREE from "three";
import { haptic_to_three_coords } from "./util.mjs";


export class Hand3D {
	/**
	 *
	 * @param {import("./scenes/base-scene.mjs").BaseScene} base_scene
	 */
	constructor(base_scene) {
		this.object3D = new THREE.Object3D();
		this.object3D.name = "Hand";
		const palm = this.palm = new THREE.Mesh(
			new THREE.BoxGeometry(0.1, 0.025, 0.1),
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, color: 0x00ff00 })
		);
		palm.castShadow = true;
		palm.receiveShadow = true;
		this.object3D.add(palm);

		base_scene.hand_outline_pass.selectedObjects = [this.palm];
	}

	/**
	 *
	 * @param {import("../device-ws-controller.mjs").TrackingFrame} tracking_frame
	 */
	update_tracking_data(tracking_frame) {
		if (tracking_frame.hand) {
			this.palm.position.copy(haptic_to_three_coords(tracking_frame.hand));
			this.palm.visible = true;
		} else {
			this.palm.visible = false;
		}
	}

	getObject3D() {
		return this.object3D;
	}
}