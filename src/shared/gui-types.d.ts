/*** GUI TYPES ***/
import { MAHKeyframeBaseFE, MAHKeyframeStandardFE, MAHKeyframePauseFE } from "../client/js/script.mjs";
import { MidAirHapticsAnimationFileFormat } from "./types";

interface StateEventMap {
    "kf_new": { keyframe: MAHKeyframeFE };
    "kf_delete": { keyframe: MAHKeyframeFE };
    "kf_update": { keyframe: MAHKeyframeFE };
    "rerender": {};
    "kf_select": { keyframe: MAHKeyframeFE };
    "kf_deselect": { keyframe: MAHKeyframeFE };
    "kf_reorder": { keyframe: MAHKeyframeFE };
}

interface StateChangeEventTarget extends EventTarget {
    addEventListener<K extends keyof StateEventMap>(
        type: K,
        listener: (ev: CustomEvent<StateEventMap[K]>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    // addEventListener(
    //     type: string,
    //     callback: EventListenerOrEventListenerObject | null,
    //     options?: EventListenerOptions | boolean
    // ): void;
}

interface MAHAnimationFileFormatFE extends MidAirHapticsAnimationFileFormat {
    keyframes: MAHKeyframeFE[]
}

type MAHKeyframeFE = MAHKeyframeStandardFE | MAHKeyframePauseFE;