export interface MidAirHapticsAnimationFileFormat {
    revision: string;
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

export interface MAHKeyframe {
    /** Time in milliseconds */
    time: number,
    brush: MAHBrush,
    intensity: MAHIntensity,
    coords: {
        x: number,
        y: number,
        z: number,
    },
    /** Describes the transition to the next keyframe */
    transition: MAHTransition,
}


type Variant<Key extends string, Value = undefined> = {
    name: Key,
    params: Value,
};
const make_variant = <Key extends string, Value = undefined>(key: Key) => (value: Value): Variant<Key, Value> => ({ key, value });

const BrushPoint = make_variant<"Point", { size: number }>("Point");
const BrushLine = make_variant<"Line", { thickness: number, rotation: number }>("Line");
type MAHBrush = ReturnType<typeof BrushPoint> | ReturnType<typeof BrushLine>;

const IntensityConstant = make_variant<"Constant", { value: number }>("Constant");
const IntensityRandom = make_variant<"Random", { min: number, max: number }>("Random");
type MAHIntensity = ReturnType<typeof IntensityConstant> | ReturnType<typeof IntensityRandom>;


const TransitionLinear = make_variant<"Linear", {}>("Linear");
const TransitionSteps = make_variant<"Steps", {}>("Steps");
type MAHTransition = ReturnType<typeof TransitionLinear> | ReturnType<typeof TransitionSteps>;

