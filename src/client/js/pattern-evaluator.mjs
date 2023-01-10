/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */


/** @typedef {{ time: number, user_parameters: Map<string, number> }} PatternEvaluatorParameters */

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
	get_prev_standard_keyframe(t) {
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
	get_next_standard_keyframe(t) {
		for (const kf of this.mah_animation.keyframes) {
			if (kf.type != "standard") continue;
			if (kf.time <= t) continue;
			else return kf;
		}
		return null;
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
	 * @param {MAHKeyframeStandard} prev_std_keyframe 
	 * @param {MAHKeyframe} prev_keyframe 
	 * @param {MAHKeyframe} next_keyframe 
	 * @param {MAHKeyframe | null} next_std_keyframe 
	 * @returns {number}
	 */
	eval_intensity(p, prev_std_keyframe, prev_keyframe, next_keyframe, next_std_keyframe) {
		const intensity = prev_std_keyframe.intensity;
		switch (intensity.name) {
			case "constant":
				return intensity.params.value;
			case "random":
				return Math.random()*(intensity.params.min - intensity.params.max)+intensity.params.min;
			default:
				// @ts-ignore runtime check for never type
				throw new TypeError(`unknown intensity type '${intensity.name}'`);
		}
	}
	/**
	 * 
	 * @param {PatternEvaluatorParameters} p 
	 * @param {MAHKeyframeStandard} prev_std_keyframe 
	 * @param {MAHKeyframe} prev_keyframe 
	 * @param {MAHKeyframe} next_keyframe 
	 * @param {MAHKeyframe | null} next_std_keyframe 
	 * @returns {{ x: number, y: number, z: number }}
	 */
	eval_coords(p, prev_std_keyframe, prev_keyframe, next_keyframe, next_std_keyframe) {
		const dt = (p.time - prev_keyframe.time) / (next_keyframe.time - prev_keyframe.time);

		if (next_keyframe.type == "pause") {
			return prev_std_keyframe.coords;
		} else {
			const coords = { x: -1, y: -1, z: -1 };
			Object.keys(prev_std_keyframe.coords).map(k => coords[k] = prev_std_keyframe.coords[k] * (1 - dt) + dt * next_keyframe.coords[k]);
			return coords;
		}
	}

	/**
	 * 
	 * @param {PatternEvaluatorParameters} p
	 * @returns {{ coords: { x: number, y: number, z: number }, intensity: number }}
	 */
	eval_stream_at_anim_local_time(p) {
		const prev_std_keyframe = this.get_prev_standard_keyframe(p.time);
		const prev_keyframe = this.get_prev_keyframe(p.time);
		const next_keyframe = this.get_next_keyframe(p.time);
		const next_std_keyframe = this.get_next_standard_keyframe(p.time);
		if (prev_std_keyframe && prev_keyframe) {
			if (next_keyframe) {
				const coords = this.eval_coords(p, prev_std_keyframe, prev_keyframe, next_keyframe, next_std_keyframe);
				const intensity = this.eval_intensity(p, prev_std_keyframe, prev_keyframe, next_keyframe, next_std_keyframe);
				return { coords, intensity };
			} else {
				// return { coords: { x: 0, y: 0, z: 0 }, intensity: 0 }; //assume stop
				return { coords: prev_std_keyframe.coords, intensity: 0 };
			}
		} else {
			if (next_std_keyframe) {
				return { coords: next_std_keyframe.coords, intensity: 0 };
			} else {
				return { coords: { x: 0, y: 0, z: 0 }, intensity: 0 };
			}
		}
	}
}