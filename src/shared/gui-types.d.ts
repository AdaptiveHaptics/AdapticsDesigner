/*** GUI TYPES ***/
import { MAHKeyframeFE } from "../client/js/script.mjs";

interface StateEventMap {
    "kf_new": CustomEvent<{ keyframe: MAHKeyframeFE }>;
    "kf_delete": CustomEvent<{ keyframe: MAHKeyframeFE }>;
    "kf_update": CustomEvent<{ keyframe: MAHKeyframeFE }>;
}

interface StateChangeEventTarget extends EventTarget {
    addEventListener<K extends keyof StateEventMap>(
        type: K,
        listener: (ev: StateEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean
    ): void;
}