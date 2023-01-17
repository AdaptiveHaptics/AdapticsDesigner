type REVISION_STRING = "0.0.4-alpha.1";

export interface MidAirHapticsAnimationFileFormat {
    $DATA_FORMAT: "MidAirHapticsAnimationFileFormat",
    $REVISION: REVISION_STRING;

    name: string;

    keyframes: MAHKeyframe[],

    /** TODO */
    update_rate: number,

    /** If the haptic animation should be played in a plane above the device or should track the user's palm */
    projection: "plane" | "palm";

    /***** Animation Flags From CSS *****/

    // #not sure if useful
    // /** Specifies the delay before start of animation sequence */
    // delay: number,

    // /** Direction to play animation (Similar to CSS animation-direction) */
    // direction: "normal" | "reverse" | "alternate" | "alternate-reverse",

    // /** Specifies the length of time in which an animation completes one cycle in milliseconds */
    // duration: number,

    // /** Specifies the number of times an animation should repeat. */
    // iteration_count: number,

    // #not sure if useful
    // /** sets how an animation progresses through the duration of each cycle */
    // timing-function: MAHTimingFunction,
}
/**
 * x and y are used for the xy coordinate system in the 2d designer.
 * z is intended to be orthogonal to the phased array
 */
export interface MAHCoords {
    /** in millimeters, [-100, 100] */
    x: number,
    /** in millimeters, [-100, 100] */
    y: number,
    /** in millimeters, [0, 100] */
    z: number,
}
export interface MAHKeyframeTime {
    /** Time in milliseconds */
    time: number,
}
export interface MAHKeyframeBrush {
    brush: {
        brush: MAHBrush,
        transition: ReturnType<typeof TransitionLinear>
    }
}
export interface MAHKeyframeIntensity {
    intensity: {
        intensity: MAHIntensity,
        transition: MAHTransition
    }
}
export interface MAHKeyframeBasic
    extends
        MAHKeyframeTime,
        Partial<MAHKeyframeBrush>,
        Partial<MAHKeyframeIntensity>,
{};

export interface MAHKeyframeCoords {
    coords: {
        coords: MAHCoords,
        transition: MAHTransition,
    }
}

/** standard keyframe with coords, brush, intensity, and transitions */
export interface MAHKeyframeStandard
    extends MAHKeyframeBasic, MAHKeyframeCoords {
    type: "standard",
}

/** pauses the previous standard keyframe until timestamp reached */
export interface MAHKeyframePause
    extends MAHKeyframeBasic {
    type: "pause"
}

export type MAHKeyframe = MAHKeyframeStandard | MAHKeyframePause;


type Variant<Key extends string, Value = undefined> = {
    name: Key,
    params: Value,
};
// const make_variant = <Key extends string, Value = undefined>(name: Key) => (params: Value): Variant<Key, Value> => ({ name, params });

type BrushCircle = Variant<"circle", { radius: number }>;
type BrushLine = Variant<"line", { length: number, thickness: number, rotation: number }>;
type MAHBrush = BrushCircle | BrushLine;

type IntensityConstant = Variant<"constant", { value: number }>;
type IntensityRandom = Variant<"random", { min: number, max: number }>;
type MAHIntensity = IntensityConstant | IntensityRandom;


/** Linear interpolation between the keyframes */
type TransitionLinear = Variant<"linear", {}>;
/** Step/Jump between the keyframes */
type TransitionStep = Variant<"step", {}>;
type MAHTransition = TransitionLinear | TransitionStep;




export interface MidAirHapticsClipboardFormat {
    $DATA_FORMAT: "MidAirHapticsClipboardFormat",
    $REVISION: REVISION_STRING;

    keyframes: MAHKeyframe[]
}