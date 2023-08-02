import * as THREE from "three";

/**
 *
 * @param {import("../pattern-evaluator.mjs").MAHCoordsConst} haptic_coords
 * @returns {THREE.Vector3}
 */
export function haptic_to_three_coords(haptic_coords) {
	return new THREE.Vector3(haptic_coords.x / 1000, haptic_coords.z / 1000, - haptic_coords.y / 1000);
}

/**
 *
 * @param {import("../pattern-evaluator.mjs").MAHCoordsConst} haptic_vec
 * @returns {THREE.Vector3}
 */
export function haptic_to_three_vec(haptic_vec) {
	return new THREE.Vector3(haptic_vec.x, haptic_vec.z, - haptic_vec.y);
}