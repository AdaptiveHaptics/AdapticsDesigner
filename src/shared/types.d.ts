type REVISION_STRING = "0.0.2-alpha.1";

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

    /** Direction to play animation (Similar to CSS animation-direction) */
    direction: "normal" | "reverse" | "alternate" | "alternate-reverse",

    /** Specifies the length of time in which an animation completes one cycle in milliseconds */
    duration: number,

    /** Specifies the number of times an animation should repeat. */
    iteration_count: number,

    // #not sure if useful
    // /** sets how an animation progresses through the duration of each cycle */
    // timing-function: MAHTimingFunction,
}

export interface MAHKeyframeBase {
    /** Time in milliseconds */
    time: number,
}
export interface MAHKeyframeBrush {
    brush: MAHBrush,
}
export interface MAHKeyframeIntensity {
    intensity: MAHIntensity,
}
export interface MAHKeyframeTransition {
    /** Describes the transition to the next keyframe */
    transition: MAHTransition,
}
export interface MAHKeyframeCoords {
    coords: {
        x: number,
        y: number,
        z: number,
    },
}
export interface MAHKeyframeBasic
    extends MAHKeyframeBase, MAHKeyframeBrush, MAHKeyframeIntensity, MAHKeyframeTransition {};

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
const make_variant = <Key extends string, Value = undefined>(key: Key) => (value: Value): Variant<Key, Value> => ({ key, value });

const BrushPoint = make_variant<"point", { size: number }>("point");
const BrushLine = make_variant<"line", { thickness: number, rotation: number }>("line");
type MAHBrush = ReturnType<typeof BrushPoint> | ReturnType<typeof BrushLine>;

const IntensityConstant = make_variant<"constant", { value: number }>("constant");
const IntensityRandom = make_variant<"random", { min: number, max: number }>("random");
type MAHIntensity = ReturnType<typeof IntensityConstant> | ReturnType<typeof IntensityRandom>;


/** Linear interpolation between the control points */
const TransitionLinear = make_variant<"linear", {}>("linear");
/** Step/Jump between the control points */
const TransitionStep = make_variant<"step", {}>("step");
type MAHTransition = ReturnType<typeof TransitionLinear> | ReturnType<typeof TransitionStep>;




export interface MidAirHapticsClipboardFormat {
    $DATA_FORMAT: "MidAirHapticsClipboardFormat",
    $REVISION: REVISION_STRING;

    keyframes: MAHKeyframe[]
}