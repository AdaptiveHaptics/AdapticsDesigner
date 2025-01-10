/* tslint:disable */
/* eslint-disable */
export class PatternEvaluator {
  free(): void;
  static try_parse_into_latest_version(mah_animation_json: string): string;
  constructor(mah_animation_json: string);
  eval_brush_at_anim_local_time(p: string, nep: string): string;
  eval_brush_at_anim_local_time_for_max_t(p: string, nep: string): string;
  static default_next_eval_params(): string;
  static default_pattern_transformation(): string;
  static default_geo_transform_matrix(): string;
  static geo_transform_simple_apply(gtsp: string): string;
  static geo_transform_simple_inverse(gtsp: string): string;
  static parse_formula(formula: string): string;
  static formula_to_string(formula: string): string;
  static dynf64_to_f64(dynf64: string, user_parameters: string, user_parameter_definitions: string): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_patternevaluator_free: (a: number, b: number) => void;
  readonly patternevaluator_try_parse_into_latest_version: (a: number, b: number) => [number, number, number, number];
  readonly patternevaluator_new_json: (a: number, b: number) => [number, number, number];
  readonly patternevaluator_eval_brush_at_anim_local_time: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly patternevaluator_eval_brush_at_anim_local_time_for_max_t: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly patternevaluator_default_next_eval_params: () => [number, number];
  readonly patternevaluator_default_pattern_transformation: () => [number, number];
  readonly patternevaluator_default_geo_transform_matrix: () => [number, number];
  readonly patternevaluator_geo_transform_simple_apply: (a: number, b: number) => [number, number];
  readonly patternevaluator_geo_transform_simple_inverse: (a: number, b: number) => [number, number];
  readonly patternevaluator_parse_formula: (a: number, b: number) => [number, number, number, number];
  readonly patternevaluator_formula_to_string: (a: number, b: number) => [number, number, number, number];
  readonly patternevaluator_dynf64_to_f64: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
