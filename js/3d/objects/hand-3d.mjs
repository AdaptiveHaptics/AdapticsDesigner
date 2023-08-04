import * as THREE from "three";
import { haptic_to_three_coords, haptic_to_three_vec } from "../util.mjs";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";

export class Hand3D {
	static HAND_MATERIAL = new THREE.MeshBasicMaterial({
		transparent: true,
		opacity: 0,
		color: 0x00ff00,
		depthWrite: false, // prevents causing other things to go invisible when clipping the (invisible) hand
		depthTest: false, // dont need this anyway ig
	});

	/**
	 *
	 * @param {import("../basic-three-mah-dev-environment.mjs").BasicThreeMAHDevEnvironment} base_environment
	 * @param {boolean} show_palm_position_helper
	 */
	constructor(base_environment, show_palm_position_helper) {
		this.object3D = new THREE.Object3D();
		this.object3D.name = "Hand";
		const palm_geometry = new THREE.BoxGeometry(0.08, 0.012, 0.06);
		palm_geometry.rotateY(0 * Math.PI / 180);
		palm_geometry.translate(0, 0, -0.02);
		const palm = this.palm = new THREE.Mesh(
			palm_geometry,
			Hand3D.HAND_MATERIAL
		);
		this.object3D.add(palm);
		this.palm_position_helper = new THREE.Mesh(
			new THREE.SphereGeometry(0.005),
			new THREE.MeshBasicMaterial({ color: 0x00ff00 })
		);
		if (show_palm_position_helper) this.object3D.add(this.palm_position_helper);

		/** @type {[Digit3D, Digit3D, Digit3D, Digit3D, Digit3D]} */
		this.digits = [
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
			new Digit3D(),
		];
		this.digits.forEach(d => this.object3D.add(d.getObject3D()));

		base_environment.hand_outline_pass.selectedObjects = [this.palm, ...this.digits.map(d => d.getObject3D())];

		this.update(null);
	}

	/**
	* @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	*/
	update(last_tracking_data) {
		if (last_tracking_data?.hand) {
			this.object3D.visible = true;

			{ // update palm
				this.palm.position.copy(haptic_to_three_coords(last_tracking_data.hand.palm.position));
				this.palm_position_helper.position.copy(this.palm.position);

				const direction = haptic_to_three_vec(last_tracking_data.hand.palm.direction);
				const normal = haptic_to_three_vec(last_tracking_data.hand.palm.normal);
				const binormal = new THREE.Vector3().crossVectors(normal, direction);
				this.palm.quaternion.setFromRotationMatrix( new THREE.Matrix4().makeBasis(binormal.normalize(), normal.normalize(), direction.normalize()) );
			}

			{ // update digits
				for (let i=0; i<5; i++) {
					const digit = this.digits[i];
					const digit_data = last_tracking_data.hand.digits[i];

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

	/**
	 *
	 * @param {THREE.Vector2} resolution
	 * @param {THREE.Scene} scene
	 * @param {THREE.Camera} camera
	 * @returns
	 */
	static create_outline_pass(resolution = new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera) {
		const hand_outline_pass = new OutlinePass(resolution, scene, camera);
		hand_outline_pass.edgeStrength = 3.0;  // The strength of the edges
		hand_outline_pass.edgeGlow = 0.7;      // The glow effect of the edges
		hand_outline_pass.edgeThickness = 2.0; // The thickness of the edges
		hand_outline_pass.visibleEdgeColor.set("#ffffff");  // The color of the visible edges
		hand_outline_pass.hiddenEdgeColor.set("#292929"); // The color of the hidden edges
		return hand_outline_pass;
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
		const bone_mesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			Hand3D.HAND_MATERIAL
		);
		return bone_mesh;
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