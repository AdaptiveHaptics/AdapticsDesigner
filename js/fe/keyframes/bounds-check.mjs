export class BoundsCheck {
	static raw = {
		coords: {
			x: { min: -100, max: 100 },
			y: { min: -100, max: 100 },
			z: { min: 0, max: 100 },
		},
	};

	/**
	 *
	 * @param {import("../../../../shared/types").MAHCoords} coords
	 */
	static coords(coords) {
		const new_coords = {
			x: Math.min(Math.max(coords.x, this.raw.coords.x.min), this.raw.coords.x.max),
			y: Math.min(Math.max(coords.y, this.raw.coords.y.min), this.raw.coords.y.max),
			z: Math.min(Math.max(coords.z, this.raw.coords.z.min), this.raw.coords.z.max),
		};
		Object.keys(coords).forEach(k => { if (!Number.isFinite(coords[k])) throw new Error(`coords are not finite!, ${coords}`); });
		return new_coords;
	}
}