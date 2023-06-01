/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * @minItems 4
 * @maxItems 4
 */
export type TupleOf_MidAirHapticsAnimationFileFormatAnd_PatternEvaluatorParametersAnd_BrushAtAnimLocalTimeAnd_ArrayOf_BrushAtAnimLocalTime =
  [MidAirHapticsAnimationFileFormat, PatternEvaluatorParameters, BrushAtAnimLocalTime, BrushAtAnimLocalTime[]];
export type MidAirHapticsAnimationFileFormatDataFormatName = "MidAirHapticsAnimationFileFormat";
export type DataFormatRevision = "0.0.9-alpha.2";
export type MAHKeyframe =
  | {
      brush?: BrushWithTransition | null;
      cjumps: ConditionalJump[];
      coords: CoordsWithTransition;
      intensity?: IntensityWithTransition | null;
      time: number;
      type: "standard";
    }
  | {
      brush?: BrushWithTransition | null;
      cjumps: ConditionalJump[];
      intensity?: IntensityWithTransition | null;
      time: number;
      type: "pause";
    }
  | {
      time: number;
      type: "stop";
    };
export type MAHBrush =
  | {
      name: "circle";
      params: {
        /**
         * AM frequency in HZ
         */
        am_freq: MAHDynamicF64;
        /**
         * Millimeters
         */
        radius: MAHDynamicF64;
      };
    }
  | {
      name: "line";
      params: {
        /**
         * AM frequency in HZ
         */
        am_freq: MAHDynamicF64;
        /**
         * Millimeters
         */
        length: MAHDynamicF64;
        /**
         * Degrees
         */
        rotation: MAHDynamicF64;
        thickness: MAHDynamicF64;
      };
    };
export type MAHDynamicF64 =
  | {
      type: "dynamic";
      value: string;
    }
  | {
      type: "f64";
      value: number;
    };
export type MAHTransition =
  | {
      name: "linear";
      params: {};
    }
  | {
      name: "step";
      params: {};
    };
export type MAHConditionalOperator =
  | {
      name: "lt";
      params: {};
    }
  | {
      name: "lt_eq";
      params: {};
    }
  | {
      name: "gt";
      params: {};
    }
  | {
      name: "gt_eq";
      params: {};
    };
export type MAHIntensity =
  | {
      name: "constant";
      params: {
        value: MAHDynamicF64;
      };
    }
  | {
      name: "random";
      params: {
        max: MAHDynamicF64;
        min: MAHDynamicF64;
      };
    };
/**
 * @minItems 4
 * @maxItems 4
 */
export type GeometricTransformMatrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

export interface MidAirHapticsAnimationFileFormat {
  $DATA_FORMAT: MidAirHapticsAnimationFileFormatDataFormatName;
  $REVISION: DataFormatRevision;
  keyframes: MAHKeyframe[];
  name: string;
  pattern_transform: PatternTransformation;
}
export interface BrushWithTransition {
  brush: MAHBrush;
  transition: MAHTransition;
}
export interface ConditionalJump {
  condition: MAHCondition;
  jump_to: number;
}
export interface MAHCondition {
  operator: MAHConditionalOperator;
  parameter: string;
  value: number;
}
export interface CoordsWithTransition {
  coords: MAHCoordsConst;
  transition: MAHTransition;
}
/**
 * x and y are used for the xy coordinate system in the 2d designer. z is intended to be orthogonal to the phased array
 */
export interface MAHCoordsConst {
  /**
   * in millimeters, [-100, 100]
   */
  x: number;
  /**
   * in millimeters, [-100, 100]
   */
  y: number;
  /**
   * in millimeters, [0, 100]
   */
  z: number;
}
export interface IntensityWithTransition {
  intensity: MAHIntensity;
  transition: MAHTransition;
}
export interface PatternTransformation {
  geometric_transforms: GeometricTransformsSimple;
  intensity_factor: MAHDynamicF64;
  playback_speed: MAHDynamicF64;
}
export interface GeometricTransformsSimple {
  /**
   * in degrees
   */
  rotation: MAHDynamicF64;
  scale: MAHScaleTuple;
  translate: MAHCoordsDynamic;
}
export interface MAHScaleTuple {
  x: MAHDynamicF64;
  y: MAHDynamicF64;
  z: MAHDynamicF64;
}
export interface MAHCoordsDynamic {
  x: MAHDynamicF64;
  y: MAHDynamicF64;
  z: MAHDynamicF64;
}
export interface PatternEvaluatorParameters {
  geometric_transform: GeometricTransformMatrix;
  time: number;
  user_parameters: {
    [k: string]: number;
  };
}
export interface BrushAtAnimLocalTime {
  next_eval_params: NextEvalParams;
  pattern_time: number;
  stop: boolean;
  ul_control_point: UltraleapControlPoint;
}
export interface NextEvalParams {
  last_eval_pattern_time: number;
  time_offset: number;
}
export interface UltraleapControlPoint {
  coords: MAHCoordsConst;
  intensity: number;
}
