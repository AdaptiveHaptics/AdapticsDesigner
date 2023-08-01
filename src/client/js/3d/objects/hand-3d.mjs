import * as THREE from "three";
import { haptic_to_three_coords } from "../util.mjs";

function haptic_to_three_vec(haptic_vec) {
	return new THREE.Vector3(haptic_vec.x, haptic_vec.z, - haptic_vec.y);
}

export class Hand3D {
	/**
	 *
	 * @param {import("../scenes/base-scene.mjs").BaseScene} base_scene
	 */
	constructor(base_scene) {
		this.object3D = new THREE.Object3D();
		this.object3D.name = "Hand";
		const palm_geometry = new THREE.BoxGeometry(0.08, 0.012, 0.06);
		palm_geometry.rotateY(0 * Math.PI / 180);
		// palm_geometry.translate(0, 0, -0.035);
		palm_geometry.translate(0, 0, -0.02);
		const palm = this.palm = new THREE.Mesh(
			palm_geometry,
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, color: 0x00ff00 })
		);
		palm.castShadow = true;
		palm.receiveShadow = true;
		this.object3D.add(palm);

		/** @type {[Digit3D, Digit3D, Digit3D, Digit3D, Digit3D]} */
		this.digits = [
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
		];
		this.digits.forEach(d => this.object3D.add(d.getObject3D()));

		base_scene.hand_outline_pass.selectedObjects = [this.palm, ...this.digits.map(d => d.getObject3D())];

		this.update_tracking_data({ hand: null });
	}

	/**
	 *
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame} tracking_frame
	 */
	update_tracking_data(tracking_frame) {
		if (tracking_frame.hand) {
			this.object3D.visible = true;

			{ // update palm
				this.palm.position.copy(haptic_to_three_coords(tracking_frame.hand.palm.position));

				const direction = haptic_to_three_vec(tracking_frame.hand.palm.direction);
				const normal = haptic_to_three_vec(tracking_frame.hand.palm.normal);
				const binormal = new THREE.Vector3().crossVectors(normal, direction);
				this.palm.quaternion.setFromRotationMatrix( new THREE.Matrix4().makeBasis(binormal.normalize(), normal.normalize(), direction.normalize()) );
			}

			{ // update digits
				for (let i=0; i<5; i++) {
					const digit = this.digits[i];
					const digit_data = tracking_frame.hand.digits[i];

					digit.update_tracking_data(digit_data);
				}
			}
		} else {
			this.object3D.visible = false;
		}
	}

	getObject3D() {
		return this.object3D;
	}
}

export class Digit3D {
	constructor() {
		this.object3D = new THREE.Object3D();
		this.object3D.name = "Digit";

		this.bones = [
			this.#_create_bone(),
			this.#_create_bone(),
			this.#_create_bone(),
			this.#_create_bone(),
		];
		this.bones.forEach(b => this.object3D.add(b));
	}

	#_create_bone() {
		return new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, color: 0x00ff00 })
		);
	}

	/**
	 * @param {import("../../../../shared/AdapticsWSServerMessage").TrackingFrameDigit} tracking_frame_digit
	 */
	update_tracking_data(tracking_frame_digit) {
		for (let i=0; i<4; i++) {
			const bone = tracking_frame_digit.bones[i];
			const three_bone = this.bones[i];

			const bone_start = haptic_to_three_coords(bone.start);
			const bone_end = haptic_to_three_coords(bone.end);
			const bone_width = bone.width / 1000;

			three_bone.position.copy(bone_start);
			three_bone.lookAt(bone_end);
			three_bone.scale.set(bone_width, bone_width, bone_start.distanceTo(bone_end));
		}
	}

	getObject3D() {
		return this.object3D;
	}
}