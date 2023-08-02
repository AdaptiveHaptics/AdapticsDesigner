import { haptic_to_three_coords } from "../util.mjs";
import { BaseExperience } from "./base-experience.mjs";
import * as THREE from "three";
const randFloat = THREE.MathUtils.randFloat;
const randFloatSpread = THREE.MathUtils.randFloatSpread;


/**
 *
 * @returns {number} current time in seconds since epoch
 */
function time_now() {
	return Date.now() / 1000;
}

export class AsteroidExperience extends BaseExperience {
	min_asteroid_spawn_interval = 1;
	max_asteroid_spawn_interval = 2;



	#_pattern_design;

	/**
	 * @param {import("../../fe/patterndesign.mjs").MAHPatternDesignFE} pattern_design
	 */
	constructor(pattern_design) {
		super(pattern_design, ["health", "taking_damage"], ["dead_pulse"]);

		this.#_pattern_design = pattern_design;

		this.object3D = new THREE.Object3D();
		this.object3D.position.set(0, 0.18, 0);


		this.spaceship = new Spaceship();
		this.object3D.add(this.spaceship.getObject3D());

		this.asteroids = new Set();

		this.#_spawn_asteroid();
	}

	#_spawn_asteroid() {
		const asteroid = new Asteroid();
		const asteroid_object3d = asteroid.getObject3D();

		asteroid_object3d.position.set(randFloatSpread(0.4), 0, randFloat(-0.3, -0.4));
		this.object3D.add(asteroid_object3d);
		this.asteroids.add(asteroid);
	}
	#_despawn_asteroid(asteroid) {
		this.object3D.remove(asteroid.getObject3D());
		this.asteroids.delete(asteroid);
	}


	#_last_update_hand_in_scene = false;
	#_last_update_time = time_now();
	#_next_asteroid_spawn_time = 0;
	/**
	 * @override
	 * @param {import("../../device-ws-controller.mjs").TrackingFrame | null} last_tracking_data
	 */
	update(last_tracking_data) {
		if (!this.#_last_update_hand_in_scene && last_tracking_data?.hand) this.#_on_hand_enter_scene();
		else if (this.#_last_update_hand_in_scene && !last_tracking_data?.hand) this.#_on_hand_exit_scene();

		const now = time_now();
		const delta_time = now - this.#_last_update_time;
		this.#_last_update_time = now;
		[...this.asteroids].filter(a => a.update(delta_time)).forEach(a => this.#_despawn_asteroid(a));


		if (last_tracking_data?.hand) {
			if (now > this.#_next_asteroid_spawn_time) {
				this.#_next_asteroid_spawn_time = now + randFloat(this.min_asteroid_spawn_interval, this.max_asteroid_spawn_interval);
				this.#_spawn_asteroid();
			}

			const hand_pos = haptic_to_three_coords(last_tracking_data.hand.palm.position);
			this.spaceship.target_position.x = hand_pos.x;
			this.spaceship.update(delta_time);
			this.spaceship.check_collisions(this.asteroids);

			super.set_param_or_warn("health", this.spaceship.health);
			super.set_param_or_warn("taking_damage", this.spaceship.is_in_hit_period() ? 1 : 0);
			super.set_param_or_ignore("dead_pulse", this.spaceship.dead_pulse() ? 1 : 0);
		}
	}

	#_on_hand_enter_scene() {
		this.#_last_update_hand_in_scene = true;
		this.spaceship.reset();
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

class Asteroid {

	static MATERIAL = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.2, roughness: 1 });
	// static MATERIAL = new THREE.MeshBasicMaterial({ color: 0xEEEEEE });

	constructor(
		num_points = 10,
		min_radius = 0.012,
		max_radius = 0.070,
		line_thickness = 0.004,
		destroy_distance = 0.4,
		min_move_speed = 0.1,
		max_move_speed = 0.3,
	) {
		this.object3D = new THREE.Object3D();

		this.move_speed = Math.random() * (max_move_speed - min_move_speed) + min_move_speed;
		this.destroy_distance = destroy_distance;

		this.asteroid_points = [];
		for (let i=0; i<num_points; i++) {
			const radius = Math.random() * (max_radius - min_radius) + min_radius;
			const angle = i / num_points * Math.PI * 2;
			this.asteroid_points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(radius));
		}
		const curve = new THREE.CatmullRomCurve3(this.asteroid_points, false, "catmullrom", 0);
		const geometry = new THREE.TubeGeometry(curve, num_points, line_thickness, 8, true);

		this.mesh = new THREE.Mesh(geometry, Asteroid.MATERIAL);
		// this.mesh.castShadow = true;

		this.object3D.add(this.mesh);
	}

	/**
	 *
	 * @param {number} delta_time
	 * @returns {boolean} true if this asteroid should be destroyed
	 */
	update(delta_time) {
		this.object3D.position.z += this.move_speed * delta_time;
		if (this.object3D.position.z > this.destroy_distance) return true;
		return false;
	}

	getObject3D() {
		return this.object3D;
	}
}

class Spaceship {

	static MATERIAL = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

	target_position = new THREE.Vector3(0, 0, 0);

	// How long the ship will rumble after being hit
	#_hit_period = 1;
	#_damage_per_hit = 0.1;

	#_health = 1; get health() { return this.#_health; }

	constructor(
		line_thickness = 0.003,
	) {
		this.object3D = new THREE.Object3D();

		const points = [
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(-0.025, 0, 0.02),
			new THREE.Vector3(0, 0, -0.035),
			new THREE.Vector3(0.025, 0, 0.02),
			new THREE.Vector3(0, 0, 0),
		];
		// const geometry = new MeshLineGeometry();
		// geometry.setPoints(points);
		// const material = new MeshLineMaterial({ color: 0xFFFFFF, resolution: new THREE.Vector2(1, 1), lineWidth: 0.04, sizeAttenuation: 0 });

		const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0);
		const geometry = new THREE.TubeGeometry(curve, 20, line_thickness, 3, true);

		this.mesh = new THREE.Mesh(geometry, Spaceship.MATERIAL);
		this.mesh.castShadow = true;
		this.object3D.add(this.mesh);

		geometry.computeBoundingBox();
		// this.geometry_bounding_box = notnull(geometry.boundingBox);
		this.bounding_box = new THREE.Box3().setFromObject(this.mesh).expandByVector(new THREE.Vector3(-0.01, 0, -0.015)).translate(new THREE.Vector3(0, 0, 0.005));
		this.bounding_box_helper = new THREE.Box3Helper(this.bounding_box, new THREE.Color(0x00FF00));
		// this.object3D.add(this.bounding_box_helper);
	}

	/**
	 * @param {THREE.ColorRepresentation} color
	 */
	set_color(color) {
		this.mesh.material.color.set(color);
	}

	/**
	 * @param {number} delta_time
	 */
	update(delta_time) {
		if (this.is_dead()) {
			if (this.dead_pulse()) this.set_color(0xF00000);
			else this.set_color(0x3E3E3E);
		} else {
			this.object3D.position.lerp(this.target_position, 2.5*delta_time);
			if (this.is_in_hit_period()) {
				if (time_now() % 0.1 < 0.05) this.set_color(0x7E7E7E);
				else this.set_color(0xFFFFFF);
			} else {
				this.set_color(0xFFFFFF);
			}
		}
	}


	#_last_hit_time = 0;

	/**
	 * @param {Set<Asteroid>} asteroids
	 * @returns {boolean} true if this spaceship collides with any of the asteroids
	 */
	check_collisions(asteroids) {
		for (const asteroid of asteroids) {
			if (this.#_check_collision(asteroid)) {
				if (!this.is_in_hit_period()) {
					this.#_health = Math.max(this.#_health - this.#_damage_per_hit, 0);
					this.#_last_hit_time = time_now();
				}
				return true;
			}
		}
		return false;
	}
	/**
	 *
	 * @param {Asteroid} asteroid
	 * @returns {boolean} true if this spaceship collides with the asteroid
	 */
	#_check_collision(asteroid) {
		for (const asteroid_point of asteroid.asteroid_points) {
			const asteroid_point_world = asteroid.object3D.localToWorld(asteroid_point.clone());
			const asteroid_point_local = this.mesh.worldToLocal(asteroid_point_world);
			if (this.bounding_box.containsPoint(asteroid_point_local)) {
				return true;
			}
		}
		return false;
	}

	is_in_hit_period() {
		return time_now() - this.#_last_hit_time < this.#_hit_period;
	}
	is_dead() {
		return this.#_health <= 0;
	}
	dead_pulse() {
		return time_now() % 2 < 1;
	}


	reset() {
		this.#_health = 1;
		this.set_color(0xFFFFFF);
	}


	getObject3D() {
		return this.object3D;
	}
}