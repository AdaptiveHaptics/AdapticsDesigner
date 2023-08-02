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


	#_last_update_hand_in_scene = false;
	/**
	 * @override
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update(last_tracking_data) {
		if (!this.#_last_update_hand_in_scene && last_tracking_data?.hand) this.#_on_hand_enter_scene();
		else if (this.#_last_update_hand_in_scene && !last_tracking_data?.hand) this.#_on_hand_exit_scene();

		if (last_tracking_data?.hand) {
			const hand_pos = haptic_to_three_coords(last_tracking_data.hand.palm.position);
			throw new Error("Not implemented");
		}
	}

	#_on_hand_enter_scene() {
		this.#_last_update_hand_in_scene = true;
		this.#_pattern_design.update_playstart(0);
		this.#_pattern_design.update_pattern_time(0);
		this.#_pattern_design.update_playstart(Date.now());
	}

	#_on_hand_exit_scene() {
		this.#_last_update_hand_in_scene = false;
		this.#_pattern_design.update_playstart(0);
	}

	getObject3D() {
		return this.object3D;
	}
}