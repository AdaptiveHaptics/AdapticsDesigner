/*** GUI TYPES ***/
import { MAHKeyframeFE, StateChangeEvent } from "../client/js/script.mjs";

interface StateEventMap {
    "kf_new": { keyframe: MAHKeyframeFE };
    "kf_delete": { keyframe: MAHKeyframeFE };
    "kf_update": { keyframe: MAHKeyframeFE };
    "rerender": {};
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