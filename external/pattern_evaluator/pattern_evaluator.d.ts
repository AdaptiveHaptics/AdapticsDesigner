/* tslint:disable */
/* eslint-disable */
/**
*/
export class PatternEvaluator {
  free(): void;
/**
* @param {string} mah_animation_json
*/
  constructor(mah_animation_json: string);
/**
* @param {string} p
* @param {string} nep
* @returns {string}
*/
  eval_brush_at_anim_local_time(p: string, nep: string): string;
/**
* @param {string} p
* @param {string} nep
* @returns {string}
*/
  eval_brush_at_anim_local_time_for_max_t(p: string, nep: string): string;
/**
* @returns {string}
*/
  static default_next_eval_params(): string;
/**
* @returns {string}
*/
  static default_pattern_transformation(): string;
/**
* @returns {string}
*/
  static default_geo_transform_matrix(): string;
/**
* @param {string} gts
* @param {string} coords
* @param {string} user_parameters
* @returns {string}
*/
  static geo_transform_simple_apply(gts: string, coords: string, user_parameters: string): string;
/**
* @param {string} gts
* @param {string} coords
* @param {string} user_parameters
* @returns {string}
*/
  static geo_transform_simple_inverse(gts: string, coords: string, user_parameters: string): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_patternevaluator_free: (a: number) => void;
  readonly patternevaluator_new_json: (a: number, b: number) => number;
  readonly patternevaluator_eval_brush_at_anim_local_time: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly patternevaluator_eval_brush_at_anim_local_time_for_max_t: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly patternevaluator_default_next_eval_params: (a: number) => void;
  readonly patternevaluator_default_pattern_transformation: (a: number) => void;
  readonly patternevaluator_default_geo_transform_matrix: (a: number) => void;
  readonly patternevaluator_geo_transform_simple_apply: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly patternevaluator_geo_transform_simple_inverse: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
