import { haptic_to_three_coords } from "../util.mjs";
import { BaseExperience } from "./base-experience.mjs";
import * as THREE from "three";


export class RainExperience extends BaseExperience {
	button_actuation_dist = 0.02;
	button_bottom_out_dist = 0.005;


	#_pattern_design;

	/**
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 */
	constructor(pattern_design) {
		super(pattern_design, ["proximity", "activation"], []);

		this.#_pattern_design = pattern_design;

		this.object3D = new THREE.Object3D();
		this.object3D.position.set(0, 0.18, 0);
	}

	/**
	 * @override
	 * @param {number} delta_time
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update_for_dt(delta_time, last_tracking_data) {
		if (last_tracking_data?.hand) {
			const hand_pos = haptic_to_three_coords(last_tracking_data.hand.palm.position);
			throw new Error("Not implemented");
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
	}

	/**
	 * @override
	 */
	getObject3D() {
		return this.object3D;
	}
}