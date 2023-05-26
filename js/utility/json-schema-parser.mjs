const EXAMPLE_JSON_SCHEMA = {
	"$schema": "http://json-schema.org/draft-07/schema#",
	"title": "Tuple_of_MidAirHapticsAnimationFileFormat_and_PatternEvaluatorParameters_and_BrushAtAnimLocalTime_and_Array_of_BrushAtAnimLocalTime",
	"type": "array",
	"items": [
		{
			"$ref": "#/definitions/MidAirHapticsAnimationFileFormat"
		},
		{
			"$ref": "#/definitions/PatternEvaluatorParameters"
		},
		{
			"$ref": "#/definitions/BrushAtAnimLocalTime"
		},
		{
			"type": "array",
			"items": {
				"$ref": "#/definitions/BrushAtAnimLocalTime"
			}
		}
	],
	"maxItems": 4,
	"minItems": 4,
	"definitions": {
		"BrushAtAnimLocalTime": {
			"type": "object",
			"required": [
				"next_eval_params",
				"pattern_time",
				"stop",
				"ul_control_point"
			],
			"properties": {
				"next_eval_params": {
					"$ref": "#/definitions/NextEvalParams"
				},
				"pattern_time": {
					"type": "number",
					"format": "double"
				},
				"stop": {
					"type": "boolean"
				},
				"ul_control_point": {
					"$ref": "#/definitions/UltraleapControlPoint"
				}
			}
		},
		"BrushWithTransition": {
			"type": "object",
			"required": [
				"brush",
				"transition"
			],
			"properties": {
				"brush": {
					"$ref": "#/definitions/MAHBrush"
				},
				"transition": {
					"$ref": "#/definitions/MAHTransition"
				}
			}
		},
		"ConditionalJump": {
			"type": "object",
			"required": [
				"condition",
				"jump_to"
			],
			"properties": {
				"condition": {
					"$ref": "#/definitions/MAHCondition"
				},
				"jump_to": {
					"type": "number",
					"format": "double"
				}
			}
		},
		"CoordsWithTransition": {
			"type": "object",
			"required": [
				"coords",
				"transition"
			],
			"properties": {
				"coords": {
					"$ref": "#/definitions/MAHCoordsConst"
				},
				"transition": {
					"$ref": "#/definitions/MAHTransition"
				}
			}
		},
		"DataFormatRevision": {
			"type": "string",
			"enum": [
				"0.0.9-alpha.1"
			]
		},
		"GeometricTransformMatrix": {
			"type": "array",
			"items": {
				"type": "array",
				"items": {
					"type": "number",
					"format": "double"
				},
				"maxItems": 4,
				"minItems": 4
			},
			"maxItems": 4,
			"minItems": 4
		},
		"GeometricTransformsSimple": {
			"type": "object",
			"required": [
				"rotation",
				"scale",
				"translate"
			],
			"properties": {
				"rotation": {
					"description": "in degrees",
					"allOf": [
						{
							"$ref": "#/definitions/MAHDynamicF64"
						}
					]
				},
				"scale": {
					"$ref": "#/definitions/MAHScaleTuple"
				},
				"translate": {
					"$ref": "#/definitions/MAHCoordsDynamic"
				}
			}
		},
		"IntensityWithTransition": {
			"type": "object",
			"required": [
				"intensity",
				"transition"
			],
			"properties": {
				"intensity": {
					"$ref": "#/definitions/MAHIntensity"
				},
				"transition": {
					"$ref": "#/definitions/MAHTransition"
				}
			}
		},
		"MAHBrush": {
			"oneOf": [
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"circle"
							]
						},
						"params": {
							"type": "object",
							"required": [
								"am_freq",
								"radius"
							],
							"properties": {
								"am_freq": {
									"description": "AM frequency in HZ",
									"allOf": [
										{
											"$ref": "#/definitions/MAHDynamicF64"
										}
									]
								},
								"radius": {
									"description": "Millimeters",
									"allOf": [
										{
											"$ref": "#/definitions/MAHDynamicF64"
										}
									]
								}
							}
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"line"
							]
						},
						"params": {
							"type": "object",
							"required": [
								"am_freq",
								"length",
								"rotation",
								"thickness"
							],
							"properties": {
								"am_freq": {
									"description": "AM frequency in HZ",
									"allOf": [
										{
											"$ref": "#/definitions/MAHDynamicF64"
										}
									]
								},
								"length": {
									"description": "Millimeters",
									"allOf": [
										{
											"$ref": "#/definitions/MAHDynamicF64"
										}
									]
								},
								"rotation": {
									"description": "Degrees",
									"allOf": [
										{
											"$ref": "#/definitions/MAHDynamicF64"
										}
									]
								},
								"thickness": {
									"$ref": "#/definitions/MAHDynamicF64"
								}
							}
						}
					}
				}
			]
		},
		"MAHCondition": {
			"type": "object",
			"required": [
				"operator",
				"parameter",
				"value"
			],
			"properties": {
				"operator": {
					"$ref": "#/definitions/MAHConditionalOperator"
				},
				"parameter": {
					"type": "string"
				},
				"value": {
					"type": "number",
					"format": "double"
				}
			}
		},
		"MAHConditionalOperator": {
			"oneOf": [
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"lt"
							]
						},
						"params": {
							"type": "object"
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"lt_eq"
							]
						},
						"params": {
							"type": "object"
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"gt"
							]
						},
						"params": {
							"type": "object"
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"gt_eq"
							]
						},
						"params": {
							"type": "object"
						}
					}
				}
			]
		},
		"MAHCoordsConst": {
			"description": "x and y are used for the xy coordinate system in the 2d designer. z is intended to be orthogonal to the phased array",
			"type": "object",
			"required": [
				"x",
				"y",
				"z"
			],
			"properties": {
				"x": {
					"description": "in millimeters, [-100, 100]",
					"type": "number",
					"format": "double"
				},
				"y": {
					"description": "in millimeters, [-100, 100]",
					"type": "number",
					"format": "double"
				},
				"z": {
					"description": "in millimeters, [0, 100]",
					"type": "number",
					"format": "double"
				}
			}
		},
		"MAHCoordsDynamic": {
			"type": "object",
			"required": [
				"x",
				"y",
				"z"
			],
			"properties": {
				"x": {
					"$ref": "#/definitions/MAHDynamicF64"
				},
				"y": {
					"$ref": "#/definitions/MAHDynamicF64"
				},
				"z": {
					"$ref": "#/definitions/MAHDynamicF64"
				}
			}
		},
		"MAHDynamicF64": {
			"oneOf": [
				{
					"description": "Specify a parameter instead of a constant value",
					"type": "object",
					"required": [
						"type",
						"value"
					],
					"properties": {
						"type": {
							"type": "string",
							"enum": [
								"dynamic"
							]
						},
						"value": {
							"type": "string"
						}
					}
				},
				{
					"description": "Normal constant value",
					"type": "object",
					"required": [
						"type",
						"value"
					],
					"properties": {
						"type": {
							"type": "string",
							"enum": [
								"f64"
							]
						},
						"value": {
							"type": "number",
							"format": "double"
						}
					}
				}
			]
		},
		"MAHIntensity": {
			"oneOf": [
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"constant"
							]
						},
						"params": {
							"type": "object",
							"required": [
								"value"
							],
							"properties": {
								"value": {
									"$ref": "#/definitions/MAHDynamicF64"
								}
							}
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"random"
							]
						},
						"params": {
							"type": "object",
							"required": [
								"max",
								"min"
							],
							"properties": {
								"max": {
									"$ref": "#/definitions/MAHDynamicF64"
								},
								"min": {
									"$ref": "#/definitions/MAHDynamicF64"
								}
							}
						}
					}
				}
			]
		},
		"MAHKeyframe": {
			"oneOf": [
				{
					"description": "standard keyframe with coords, brush, intensity, and transitions",
					"type": "object",
					"required": [
						"cjumps",
						"coords",
						"time",
						"type"
					],
					"properties": {
						"brush": {
							"anyOf": [
								{
									"$ref": "#/definitions/BrushWithTransition"
								},
								{
									"type": "null"
								}
							]
						},
						"cjumps": {
							"type": "array",
							"items": {
								"$ref": "#/definitions/ConditionalJump"
							}
						},
						"coords": {
							"$ref": "#/definitions/CoordsWithTransition"
						},
						"intensity": {
							"anyOf": [
								{
									"$ref": "#/definitions/IntensityWithTransition"
								},
								{
									"type": "null"
								}
							]
						},
						"time": {
							"type": "number",
							"format": "double"
						},
						"type": {
							"type": "string",
							"enum": [
								"standard"
							]
						}
					}
				},
				{
					"description": "Holds the path coordinates of the previous keyframe until elapsed. can be used to animate the brush/intensity at a static location in the path, or just to create a pause in the animation path.",
					"type": "object",
					"required": [
						"cjumps",
						"time",
						"type"
					],
					"properties": {
						"brush": {
							"anyOf": [
								{
									"$ref": "#/definitions/BrushWithTransition"
								},
								{
									"type": "null"
								}
							]
						},
						"cjumps": {
							"type": "array",
							"items": {
								"$ref": "#/definitions/ConditionalJump"
							}
						},
						"intensity": {
							"anyOf": [
								{
									"$ref": "#/definitions/IntensityWithTransition"
								},
								{
									"type": "null"
								}
							]
						},
						"time": {
							"type": "number",
							"format": "double"
						},
						"type": {
							"type": "string",
							"enum": [
								"pause"
							]
						}
					}
				},
				{
					"description": "Stops the pattern and pauses the playback device",
					"type": "object",
					"required": [
						"time",
						"type"
					],
					"properties": {
						"time": {
							"type": "number",
							"format": "double"
						},
						"type": {
							"type": "string",
							"enum": [
								"stop"
							]
						}
					}
				}
			]
		},
		"MAHPercentageDynamic": {
			"description": "will parse 100 (%) in JSON exchange format as 1.00 (f64)",
			"allOf": [
				{
					"$ref": "#/definitions/MAHDynamicF64"
				}
			]
		},
		"MAHScaleTuple": {
			"type": "object",
			"required": [
				"x",
				"y",
				"z"
			],
			"properties": {
				"x": {
					"$ref": "#/definitions/MAHDynamicF64"
				},
				"y": {
					"$ref": "#/definitions/MAHDynamicF64"
				},
				"z": {
					"$ref": "#/definitions/MAHDynamicF64"
				}
			}
		},
		"MAHTransition": {
			"oneOf": [
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"linear"
							]
						},
						"params": {
							"type": "object"
						}
					}
				},
				{
					"type": "object",
					"required": [
						"name",
						"params"
					],
					"properties": {
						"name": {
							"type": "string",
							"enum": [
								"step"
							]
						},
						"params": {
							"type": "object"
						}
					}
				}
			]
		},
		"MidAirHapticsAnimationFileFormat": {
			"type": "object",
			"required": [
				"$DATA_FORMAT",
				"$REVISION",
				"keyframes",
				"name",
				"pattern_transform"
			],
			"properties": {
				"$DATA_FORMAT": {
					"$ref": "#/definitions/MidAirHapticsAnimationFileFormatDataFormatName"
				},
				"$REVISION": {
					"$ref": "#/definitions/DataFormatRevision"
				},
				"keyframes": {
					"type": "array",
					"items": {
						"$ref": "#/definitions/MAHKeyframe"
					}
				},
				"name": {
					"type": "string"
				},
				"pattern_transform": {
					"$ref": "#/definitions/PatternTransformation"
				}
			}
		},
		"MidAirHapticsAnimationFileFormatDataFormatName": {
			"type": "string",
			"enum": [
				"MidAirHapticsAnimationFileFormat"
			]
		},
		"NextEvalParams": {
			"type": "object",
			"required": [
				"last_eval_pattern_time",
				"time_offset"
			],
			"properties": {
				"last_eval_pattern_time": {
					"type": "number",
					"format": "double"
				},
				"time_offset": {
					"type": "number",
					"format": "double"
				}
			}
		},
		"PatternEvaluatorParameters": {
			"type": "object",
			"required": [
				"geometric_transform",
				"time",
				"user_parameters"
			],
			"properties": {
				"geometric_transform": {
					"$ref": "#/definitions/GeometricTransformMatrix"
				},
				"time": {
					"type": "number",
					"format": "double"
				},
				"user_parameters": {
					"type": "object",
					"additionalProperties": {
						"type": "number",
						"format": "double"
					}
				}
			}
		},
		"PatternTransformation": {
			"type": "object",
			"required": [
				"geometric_transforms",
				"intensity_factor",
				"playback_speed"
			],
			"properties": {
				"geometric_transforms": {
					"$ref": "#/definitions/GeometricTransformsSimple"
				},
				"intensity_factor": {
					"$ref": "#/definitions/MAHPercentageDynamic"
				},
				"playback_speed": {
					"$ref": "#/definitions/MAHPercentageDynamic"
				}
			}
		},
		"UltraleapControlPoint": {
			"type": "object",
			"required": [
				"coords",
				"intensity"
			],
			"properties": {
				"coords": {
					"$ref": "#/definitions/MAHCoordsConst"
				},
				"intensity": {
					"type": "number",
					"format": "double"
				}
			}
		}
	}
};

/**
 *
 * @param {typeof EXAMPLE_JSON_SCHEMA} json_schema
 */
function parse_json_schema(json_schema) {
	const types = new Map(Object.entries(json_schema.definitions));
}

function find_paths_to_all_of_type_from_parent(json_schema_parsed, wanted_type, parent_type) {

}