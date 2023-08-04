import { haptic_to_three_coords } from "../util.mjs";
import { BaseExperience } from "./base-experience.mjs";
import * as THREE from "three";


export class ButtonExperience extends BaseExperience {
	button_actuation_dist = 0.02;
	button_bottom_out_dist = 0.005;


	/**
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 */
	constructor(pattern_design) {
		super(pattern_design, ["proximity", "activation"], []);

		this.object3D = new THREE.Object3D();
		this.object3D.position.set(0, 0.18, 0);
		// this.object3D.add(new THREE.AxesHelper(0.1));

		this.button_body = new THREE.Mesh(
			new THREE.BoxGeometry(0.1, this.button_actuation_dist + this.button_bottom_out_dist, 0.1), //actuation dist + a little extra to hide clipping on bottom face (might as well be the same as the bottom_out dist)
			new THREE.MeshStandardMaterial({ color: 0xE7E7E7 })
		);
		this.button_body.position.set(0, -this.button_body.geometry.parameters.height/2, 0);
		this.button_body.castShadow = true;
		this.button_body.receiveShadow = true;
		this.object3D.add(this.button_body);

		this.proximity_meter = new THREE.Mesh(
			new THREE.PlaneGeometry(this.button_body.geometry.parameters.width, this.button_body.geometry.parameters.height / 2)
				.translate(this.button_body.geometry.parameters.width/2, this.button_body.geometry.parameters.height / 4, 0),
			new THREE.MeshStandardMaterial({ color: 0x899495, transparent: true, opacity: 1 })
		);
		this.proximity_meter.position.set(-this.button_body.geometry.parameters.width/2, 0, this.button_body.geometry.parameters.depth/2 + 0.0001);
		this.proximity_meter.scale.setX(0);
		this.button_body.add(this.proximity_meter);

		this.activation_meter = new THREE.Mesh(
			new THREE.PlaneGeometry(this.button_body.geometry.parameters.width, this.button_body.geometry.parameters.height / 2)
				.translate(this.button_body.geometry.parameters.width/2, -this.button_body.geometry.parameters.height / 4, 0),
			new THREE.MeshStandardMaterial({ color: 0xE53345, transparent: true, opacity: 1 })
		);
		this.activation_meter.position.set(-this.button_body.geometry.parameters.width/2, 0, this.button_body.geometry.parameters.depth/2 + 0.0002);
		this.activation_meter.scale.setX(0);
		this.button_body.add(this.activation_meter);


		const button_geometry = new THREE.CylinderGeometry(0.04, 0.04, this.button_actuation_dist + this.button_bottom_out_dist, 32);
		button_geometry.translate(0, button_geometry.parameters.height/2, 0);
		this.button = new THREE.Mesh(
			button_geometry,
			new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.7, roughness: 0.6 })
		);
		this.button.castShadow = true;
		this.button.receiveShadow = true;
		this.object3D.add(this.button);
	}

	#_set_proximity(proximity) {
		this.proximity_meter.scale.setX(proximity);
		super.set_expected_param("proximity", proximity);
	}
	#_set_activation(activation) {
		this.activation_meter.scale.setX(activation);
		this.button.position.setY(activation * -this.button_actuation_dist);
		super.set_expected_param("activation", activation);
	}

	#_activated = false;
	/**
	 * @override
	 * @param {number} delta_time
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update_for_dt(delta_time, last_tracking_data) {
		if (last_tracking_data?.hand) {
			if (this.#_activated) return;
			const local_hand_position = this.object3D.worldToLocal(haptic_to_three_coords(last_tracking_data.hand.palm.position));
			const cylindrical = new THREE.Cylindrical().setFromVector3(local_hand_position);
			const button_radius = this.button.geometry.parameters.radiusTop;
			const button_height = this.button.geometry.parameters.height;

			const radius_dist_signed = cylindrical.radius - button_radius;
			const radius_dist = Math.max(radius_dist_signed, 0);
			const height_dist_signed = Math.abs(cylindrical.y - button_height / 2) - button_height / 2;
			const height_dist = Math.max(height_dist_signed, 0);
			const dist = Math.hypot(radius_dist, height_dist);

			const proximity = Math.max(0, 1 - dist / 0.10);
			this.#_set_proximity(proximity);

			// document.querySelector("div.help").innerHTML = `
			// 	proximity: ${proximity.toFixed(3)} <br>
			// 	cylindrical.radius: ${cylindrical.radius.toFixed(3)} <br>
			// 	cylindrical.y: ${cylindrical.y.toFixed(3)} <br>
			// 	radius_dist_signed: ${radius_dist_signed.toFixed(3)} <br>
			// 	radius_dist: ${radius_dist.toFixed(3)} <br>
			// 	height_dist_signed: ${height_dist_signed.toFixed(3)} <br>
			// 	height_dist: ${height_dist.toFixed(3)} <br>
			// 	dist: ${dist.toFixed(3)} <br>
			// `;

			if (proximity > 0.80) {
				const activation = 1 - Math.max(Math.min((cylindrical.y - this.button_bottom_out_dist) / this.button_actuation_dist, 1), 0);
				this.#_set_activation(activation);
				if (activation >= 1) this.#_activated = true;
			} else {
				this.#_set_activation(0);
			}
		}
	}

	/**
	 * @override
	 */
	on_hand_enter_scene() {
	}

	/**
	 * @override
	 */
	on_hand_exit_scene() {
		this.#_reset();
	}

	#_reset() {
		this.#_activated = false;
		this.#_set_proximity(0);
		this.#_set_activation(0);
	}

	/**
	 * @override
	 */
	getObject3D() {
		return this.object3D;
	}
}