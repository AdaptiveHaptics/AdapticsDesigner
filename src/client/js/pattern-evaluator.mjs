/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */
/**
 * @template T, K
 * @typedef {import("../../shared/util").OptExceptProp<T, K>} OptExceptProp
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
	 * @param {boolean} prev
	 * @private
	 */
	get_kf_config_type(t, prev) {
		let kfc = {};
		const keyframes = prev? this.mah_animation.keyframes : [...this.mah_animation.keyframes].reverse();
		for (const kf of keyframes) {
			if (prev) { if (kf.time > t) break; }
			else { if (kf.time <= t) break; }
			if ("coords" in kf) kfc.coords = Object.assign({ time: kf.time }, kf.coords);
			if (prev && kf.type == "pause" && kfc.coords) kfc.coords.time = kf.time;
			if ("brush" in kf) kfc.brush = Object.assign({ time: kf.time }, kf.brush);
			if ("intensity" in kf) kfc.intensity = Object.assign({ time: kf.time }, kf.intensity);
			kfc.keyframe_type = kf.type;
		}
		return kfc;
	}
	/**
	 * @typedef {OptExceptProp<ReturnType<typeof PatternEvaluator.prototype.get_kf_config_type>, "keyframe_type">} kf_config
	 */

	/**
	 *
	 * @param {number} t
	 * @returns {kf_config}
	 */
	get_prev_config(t) {
		return this.get_kf_config_type(t, true);
	}
	/**
	 *
	 * @param {number} t
	 * @returns {kf_config}
	 */
	get_next_config(t) {
		return this.get_kf_config_type(t, false);
	}


	/**
	 *
	 * @p {PatternEvaluatorParameters} p
	 * @param {number} prev_time
	 * @param {number} next_time
	 * @param {import("../../shared/types").MAHTransition} transition
	 * @returns {{ pf: number, nf: number }}
	 */
	perform_transition_interp(p, prev_time, next_time, transition) {
		const dt = (p.time - prev_time) / (next_time - prev_time);
		switch (transition.name) {
			case "linear":
				return { pf: (1 - dt), nf: dt };
			case "step":
				return { pf: dt < 0.5 ? 1 : 0, nf: dt < 0.5 ? 0 : 1 };
		}
	}


	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @param {kf_config} prev_kfc
	 * @param {kf_config} next_kfc
	 * @returns {number}
	 */
	eval_intensity(p, prev_kfc, next_kfc) {
		const prev_intensity = prev_kfc.intensity;
		const next_intensity = next_kfc.intensity;

		/**
		 *
		 * @param {import("../../shared/types").MAHIntensity} intensity
		 * @returns {number}
		 */
		function get_intensity_value(intensity) {
			switch (intensity.name) {
				case "constant":
					return intensity.params.value;
				case "random":
					return Math.random()*(intensity.params.min - intensity.params.max)+intensity.params.min;
			}
		}

		if (prev_intensity && next_intensity) {
			const piv = get_intensity_value(prev_intensity.intensity);
			const niv = get_intensity_value(next_intensity.intensity);
			const { pf, nf } = this.perform_transition_interp(p, prev_intensity.time, next_intensity.time, prev_intensity.transition);
			return pf*piv + nf*niv;
		} else if (prev_intensity) {
			return  get_intensity_value(prev_intensity.intensity);
		} else {
			return 1;
		}
	}
	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @param {kf_config} prev_kfc
	 * @param {kf_config} next_kfc
	 * @returns {{ x: number, y: number, z: number }}
	 */
	eval_coords(p, prev_kfc, next_kfc) {
		const prev_coords = prev_kfc.coords;
		const next_coords = next_kfc.coords;
		if (prev_coords && next_coords) {
			if (next_kfc.keyframe_type == "pause") {
				return prev_coords.coords;
			} else {
				const coords = { x: -1, y: -1, z: -1 };
				const { pf, nf } = this.perform_transition_interp(p, prev_coords.time, next_coords.time, prev_coords.transition);
				Object.keys(coords).map(k => coords[k] = prev_coords.coords[k] * pf + nf * next_coords.coords[k]);
				return coords;
			}
		} else if (prev_coords) {
			return prev_coords.coords;
		} else {
			return { x: 0, y: 0, z: 0 };
		}
	}

	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @returns {{ coords: { x: number, y: number, z: number }, intensity: number }}
	 */
	eval_stream_at_anim_local_time(p) {
		const prev_kfc = this.get_prev_config(p.time);
		const next_kfc = this.get_next_config(p.time);

		const coords = this.eval_coords(p, prev_kfc, next_kfc);
		const intensity = this.eval_intensity(p, prev_kfc, next_kfc);
		return { coords, intensity };
	}
}