import {
    MidAirHapticsAnimationFileFormat,
    Projection,
    MAHKeyframe,
    MAHCoords,
    MAHBrush,
    MAHTransition,
    MAHIntensity,
    BrushWithTransition,
    CoordsWithTransition,
    IntensityWithTransition,
    DataFormatRevision
} from "../external/pattern_evaluator/rs-shared-types";
export {
    MidAirHapticsAnimationFileFormat,
    Projection,
    MAHKeyframe,
    MAHCoords,
    MAHBrush,
    MAHTransition,
    MAHIntensity,
    BrushWithTransition,
    CoordsWithTransition,
    IntensityWithTransition
};
import { SharedProperties } from "./util";


export type REVISION_STRING = DataFormatRevision;

export type MAHKeyframeStandard = Extract<MAHKeyframe, { type: "standard" }>;
export type MAHKeyframePause = Extract<MAHKeyframe, { type: "pause" }>;

export type MAHKeyframeBasic = SharedProperties<Omit<MAHKeyframeStandard, "type">, Omit<MAHKeyframePause, "type">>

export interface MidAirHapticsClipboardFormat {
    $DATA_FORMAT: "MidAirHapticsClipboardFormat",
    $REVISION: REVISION_STRING;

    keyframes: MAHKeyframe[]
}