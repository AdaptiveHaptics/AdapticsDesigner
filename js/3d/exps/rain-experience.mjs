import { haptic_to_three_coords } from "../util.mjs";
import { BaseExperience } from "./base-experience.mjs";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";


export class RainExperience extends BaseExperience {
	axis_dist = 0.08;

	/**
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 */
	constructor(pattern_design) {
		super(pattern_design, ["rainfall_amount", "droplet_strength"], []);

		this.object3D = new THREE.Object3D();
		this.object3D.position.set(0, 0.18, 0);


		// create axis markers
		const loader = new OBJLoader();
		loader.load(new URL("./rain/Droplet.obj", import.meta.url).toString(), obj => {
			const mesh = /** @type {THREE.Mesh} */ (obj.getObjectByProperty("type", "Mesh"));
			mesh.material = new THREE.MeshStandardMaterial({ color: 0x0079FF, metalness: 0, roughness: 1 });

			const droplet_small = obj.clone();
			droplet_small.scale.setScalar(0.006);
			const droplet_small_many = [droplet_small.clone(), droplet_small.clone(), droplet_small.clone()];
			droplet_small.position.set(-this.axis_dist, 0, this.axis_dist);

			droplet_small_many[0].position.set(this.axis_dist, 0, this.axis_dist+0.005);
			droplet_small_many[1].position.set(this.axis_dist-0.012, 0, this.axis_dist-0.005);
			droplet_small_many[2].position.set(this.axis_dist+0.012, 0, this.axis_dist-0.010);

			const droplet_large = obj.clone();
			droplet_large.scale.setScalar(0.015);
			const droplet_large_many = [droplet_large.clone(), droplet_large.clone(), droplet_large.clone()];
			droplet_large.position.set(-this.axis_dist, 0, -this.axis_dist);

			droplet_large_many[0].position.set(this.axis_dist, 0, -this.axis_dist+0.012);
			droplet_large_many[1].position.set(this.axis_dist-0.03, 0, -this.axis_dist-0.014);
			droplet_large_many[2].position.set(this.axis_dist+0.03, 0, -this.axis_dist-0.026);


			this.object3D.add(droplet_small);
			droplet_small_many.forEach(d => this.object3D.add(d));
			this.object3D.add(droplet_large);
			droplet_large_many.forEach(d => this.object3D.add(d));
		});
	}

	/**
	 * @override
	 * @param {number} delta_time
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update_for_dt(delta_time, last_tracking_data) {
		if (last_tracking_data?.hand) {
			const hand_pos = haptic_to_three_coords(last_tracking_data.hand.palm.position);
			const rainfall_amount = THREE.MathUtils.mapLinear(hand_pos.x, -this.axis_dist, this.axis_dist, 0, 1);
			const droplet_strength = THREE.MathUtils.mapLinear(hand_pos.z, -this.axis_dist, this.axis_dist, 1, 0);
			this.set_expected_param("droplet_strength", droplet_strength);
			this.set_expected_param("rainfall_amount", rainfall_amount);
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