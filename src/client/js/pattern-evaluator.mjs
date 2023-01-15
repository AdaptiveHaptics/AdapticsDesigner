/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/types").MAHKeyframeStandard} MAHKeyframeStandard */
/** @typedef {import("../../shared/types").MAHBrush} MAHBrush */
/** @typedef {import("../../shared/types").MAHCoords} MAHCoords */
/** @typedef {import("../../shared/types").MAHIntensity} MAHIntensity */
/**
 * @template T
 * @typedef {import("../../shared/util").DeepImmutable<T>} DeepImmutable
 */
/**
 * @template T, K
 * @typedef {import("../../shared/util").OptExceptProp<T, K>} OptExceptProp
 */


/** @typedef {{ time: number, user_parameters: Map<string, number> }} PatternEvaluatorParameters */
/** @typedef {{ A: number, B: number, a: number, b: number, d: number, k: number, max_t: number, draw_frequency: number }} HapeV2PrimitiveParams */

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
				// return { pf: dt < 0.5 ? 1 : 0, nf: dt < 0.5 ? 0 : 1 }; //step at 50%
				return { pf: dt < 1 ? 1 : 0, nf: dt < 1 ? 0 : 1 }; //step at 100%
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
		 * @param {MAHIntensity} intensity
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
	 * @param {number} mahunit in mm
	 * @returns {number} in meters
	 */
	unit_convert_dist_to_hapev2(mahunit) {
		return mahunit / 1000;
	}
	/**
	 *
	 * @param {number} mahunit in degrees
	 * @returns {number} in radians
	 */
	unit_convert_rot_to_hapev2(mahunit) {
		return mahunit * (Math.PI / 180); //for fun: https://herbie.uwplse.org/demo/3e400deedf2314de665bdf48b7879b1c658e61da.1.6/graph.html
	}
	/**
	 *
	 * @param {{ x: number, y: number, z: number }} coords
	 * @returns {{ x: number, y: number, z: number }}
	 */
	coords_convert_to_hapev2(coords) {
		return {
			x: this.unit_convert_dist_to_hapev2(coords.x), // mm -> m
			y: this.unit_convert_dist_to_hapev2(coords.y),
			z: this.unit_convert_dist_to_hapev2(coords.z),
		};
	}

	/** @type {{ [x in MAHBrush['name']]: DeepImmutable<HapeV2PrimitiveParams> }} */
	static HAPEV2_BRUSH_PRIMITIVE_MAP = {
		"point": { A: 1, B: 1, a: 1, b: 1, d: Math.PI/2, k: 0, max_t: 2*Math.PI, draw_frequency: 100 },
		"line": { A: 1, B: 0, a: 1, b: 1, d: Math.PI/2, k: 0, max_t: 2*Math.PI, draw_frequency: 100 },
	};
	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @param {kf_config} prev_kfc
	 * @param {kf_config} next_kfc
	 * @returns {{ primitive_type: MAHBrush['name'], primitive: HapeV2PrimitiveParams, z_rot: number, x_scale: number, y_scale: number }}
	 */
	eval_brush_hapev2(p, prev_kfc, next_kfc) {
		const prev_brush = prev_kfc.brush;
		const next_brush = next_kfc.brush;

		/**
		 *
		 * @param {MAHBrush} brush
		 * @returns
		 */
		function eval_mahbrush(brush) {
			switch (brush.name) {
				case "point": {
					const amplitude = this.unit_convert_dist_to_hapev2(brush.params.size);
					return {
						primitive_type: brush.name,
						primitive: PatternEvaluator.HAPEV2_BRUSH_PRIMITIVE_MAP.point,
						z_rot: 0,
						x_scale: amplitude,
						y_scale: amplitude,
					};
				}
				case "line": {
					const thickness = this.unit_convert_dist_to_hapev2(brush.params.thickness);
					const rotation = this.unit_convert_dist_to_hapev2(brush.params.rotation);
					return {
						primitive_type: brush.name,
						primitive: PatternEvaluator.HAPEV2_BRUSH_PRIMITIVE_MAP.point,
						z_rot: this.unit_convert_rot_to_hapev2(rotation),
						x_scale: this.unit_convert_dist_to_hapev2(200),
						y_scale: thickness,
					};
				}
			}
		}

		if (prev_brush && next_brush) {
			const prev_brush_eval = eval_mahbrush(prev_brush.brush);
			const next_brush_eval = eval_mahbrush(prev_brush.brush);
			if (prev_brush_eval.primitive_type == next_brush_eval.primitive_type) {
				const { pf, nf } = this.perform_transition_interp(p, prev_brush.time, prev_brush.time, prev_brush.transition);
				prev_brush_eval.z_rot = prev_brush_eval.z_rot * pf + nf * next_brush_eval.z_rot;
				prev_brush_eval.x_scale = prev_brush_eval.x_scale * pf + nf * next_brush_eval.x_scale;
				prev_brush_eval.y_scale = prev_brush_eval.y_scale * pf + nf * next_brush_eval.y_scale;
			}
			return prev_brush_eval;
		} else {
			return {
				primitive_type: "point",
				primitive: PatternEvaluator.HAPEV2_BRUSH_PRIMITIVE_MAP.point,
				z_rot: 0,
				x_scale: 0,
				y_scale: 0,
			};
		}
	}

	/**
	 *
	 * @param {PatternEvaluatorParameters} p
	 * @returns {{ primitive: HapeV2PrimitiveParams }}
	 */
	get_hapev2_config_at_p_to_next_mahkeyframe(p) {
		this.eval_coords
	}


	/**
	 *
	 * @param {HapeV2PrimitiveParams} s
	 * @param {number} t
	 */
	eval_hapev2_primitive_equation(s, t) {
		//im not sure how they incorporate the rose curve
		return {
			x: s.A * Math.sin(s.a*t + s.d),
			y: s.B * Math.sin(s.b*t),
		};
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