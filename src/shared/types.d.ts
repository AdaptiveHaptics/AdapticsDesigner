import {
    MidAirHapticsAnimationFileFormat,
    MAHKeyframe,
    MAHCoords,
    MAHBrush,
    MAHTransition,
    MAHIntensity,
    BrushWithTransition,
    CoordsWithTransition,
    IntensityWithTransition,
    ConditionalJump,
    PatternTransformation,
    MAHUserParameterDefinition,
    ATFormula,
    DataFormatRevision
} from "../client/external/pattern_evaluator/rs-shared-types";
export {
    MidAirHapticsAnimationFileFormat,
    MAHKeyframe,
    MAHBrush,
    MAHTransition,
    MAHIntensity,
    BrushWithTransition,
    CoordsWithTransition,
    IntensityWithTransition,
    ConditionalJump,
    PatternTransformation,
    MAHUserParameterDefinition,
    ATFormula,
};
import { SharedProperties } from "./util";


export type REVISION_STRING = DataFormatRevision;

export type MAHKeyframeStandard = Extract<MAHKeyframe, { type: "standard" }>;
export type MAHKeyframePause = Extract<MAHKeyframe, { type: "pause" }>;
export type MAHKeyframeStop = Extract<MAHKeyframe, { type: "stop" }>;

export type MAHKeyframeBasic = SharedProperties<SharedProperties<Omit<MAHKeyframeStandard, "type">, Omit<MAHKeyframePause, "type">>, Omit<MAHKeyframeStop, "type">>

export interface MidAirHapticsClipboardFormat {
    $DATA_FORMAT: "MidAirHapticsClipboardFormat",
    $REVISION: REVISION_STRING;

    keyframes: MAHKeyframe[],
    user_parameter_definitions: {
        [k: string]: MAHUserParameterDefinition;
    },
}