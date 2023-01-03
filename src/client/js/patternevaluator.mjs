/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */


/** @typedef {{ time: number, [x: string]: number }} PatternEvaluatorParameters */

export class PatternEvaluator {
	/**
	 * 
	 * @param {MidAirHapticsAnimationFileFormat} mah_animation 
	 */
	constructor(mah_animation) {
		mah_animation.keyframes.sort();
		/** @type {DeepImmutable<MidAirHapticsAnimationFileFormat>} */
		this.mah_animation = mah_animation;
	}


	/**
	 * 
	 * @param {number} t 
	 */
	get_prev_keyframe(t) {
		let lkf = null;
		for (const kf of this.mah_animation.keyframes) {
			if (kf.time <= t) lkf = kf;
			else break;
		}
		return lkf;
	}
	/**
	 * 
	 * @param {number} t 
	 */
	get_current_standard_keyframe(t) {
		let lkf = null;
		for (const kf of this.mah_animation.keyframes) {
			if (kf.type != "standard") continue;
			if (kf.time <= t) lkf = kf;
			else break;
		}
		return lkf;
	}
	/**
	 * 
	 * @param {number} t 
	 */
	get_next_keyframe(t) {
		for (const kf of this.mah_animation.keyframes) {
			if (kf.time <= t) continue;
			else return kf;
		}
		return null;
	}


	/**
	 * 
	 * @param {PatternEvaluatorParameters} p 
	 * @param {MAHKeyframeStandard} curr_keyframe 
	 * @param {MAHKeyframe} prev_keyframe 
	 * @param {MAHKeyframe} next_keyframe 
	 * @returns {number}
	 */
	eval_intensity(p, curr_keyframe, prev_keyframe, next_keyframe) {
		const intensity = curr_keyframe.intensity;
		switch (intensity.name) {
			case "Constant":
				return intensity.params.value;
			case "Random":
				return Math.random()*(intensity.params.min - intensity.params.max)+intensity.params.min;
			default:
				// @ts-ignore runtime check for never type
				throw new TypeError(`unknown intensity type '${intensity.name}'`);
		}
	}
	/**
	 * 
	 * @param {PatternEvaluatorParameters} p 
	 * @param {MAHKeyframeStandard} curr_keyframe 
	 * @param {MAHKeyframe} prev_keyframe 
	 * @param {MAHKeyframe} next_keyframe 
	 * @returns {{ x: number, y: number, z: number }}
	 */
	eval_coords(p, curr_keyframe, prev_keyframe, next_keyframe) {
		const dt = (p.time - prev_keyframe.time) / (next_keyframe.time - prev_keyframe.time);

		if (next_keyframe.type == "pause") {
			return curr_keyframe.coords;
		} else {
			const coords = { x: -1, y: -1, z: -1 };
			Object.keys(curr_keyframe.coords).map(k => coords[k] = curr_keyframe.coords[k] * (1 - dt) + dt * next_keyframe.coords[k]);
			return coords;
		}
	}

	/**
	 * 
	 * @param {PatternEvaluatorParameters} p
	 * @returns {{ coords: { x: number, y: number, z: number }, intensity: number }}
	 */
	eval_stream_at_anim_local_time(p) {
		const curr_keyframe = this.get_current_standard_keyframe(p.time);
		const prev_keyframe = this.get_prev_keyframe(p.time);
		const next_keyframe = this.get_next_keyframe(p.time);
		if (curr_keyframe && prev_keyframe) {
			if (next_keyframe) {
				const coords = this.eval_coords(p, curr_keyframe, prev_keyframe, next_keyframe);
				const intensity = this.eval_intensity(p, curr_keyframe, prev_keyframe, next_keyframe);
				return { coords, intensity };
			} else {
				// return { coords: { x: 0, y: 0, z: 0 }, intensity: 0 }; //assume stop
				return { coords: curr_keyframe.coords, intensity: 0 };
			}
		} else {
			return { coords: { x: 0, y: 0, z: 0 }, intensity: 0 };
			// throw new Error(`PatternEvaluatorParameter "time"=${p.time} is outside of animation bounds`);
		}


	}
}