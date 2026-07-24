// Generated from examples/production-lite-character by TASK-009. Do not hand-edit.
export const PRODUCTION_LITE_CHARACTER_PLAN = {
  "planVersion": "1.0.0",
  "rigId": "production-lite-character-layout",
  "sourceCanvas": {
    "width": 600,
    "height": 700
  },
  "referenceScale": 0.5,
  "referenceResourcePath": "production-lite-character/reference/reference-composite/spriteFrame",
  "reconstructionStatus": "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM",
  "parts": [
    {
      "jointId": "hair-back",
      "parentId": "head",
      "resourcePath": "production-lite-character/parts/hair-back/spriteFrame",
      "drawOrder": 0,
      "restPose": {
        "position": {
          "x": 0,
          "y": 0
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0,
        "y": 42
      },
      "visualSize": {
        "width": 58,
        "height": 83
      },
      "anchor": {
        "x": 0.5,
        "y": 0.9659090909090909
      }
    },
    {
      "jointId": "upper-arm-right",
      "parentId": "torso",
      "resourcePath": "production-lite-character/parts/upper-arm-right/spriteFrame",
      "drawOrder": 1,
      "restPose": {
        "position": {
          "x": -24,
          "y": 65
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -13.25,
        "y": -18.5
      },
      "visualSize": {
        "width": 30.5,
        "height": 48
      },
      "anchor": {
        "x": 0.8732394366197183,
        "y": 0.1574074074074074
      }
    },
    {
      "jointId": "lower-arm-right",
      "parentId": "upper-arm-right",
      "resourcePath": "production-lite-character/parts/lower-arm-right/spriteFrame",
      "drawOrder": 2,
      "restPose": {
        "position": {
          "x": -20.5,
          "y": -35.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -3.5,
        "y": -18
      },
      "visualSize": {
        "width": 26,
        "height": 45
      },
      "anchor": {
        "x": 0.6065573770491803,
        "y": 0.14
      }
    },
    {
      "jointId": "hand-right",
      "parentId": "lower-arm-right",
      "resourcePath": "production-lite-character/parts/hand-right/spriteFrame",
      "drawOrder": 3,
      "restPose": {
        "position": {
          "x": -10.5,
          "y": -38.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 1,
        "y": -11
      },
      "visualSize": {
        "width": 19,
        "height": 27
      },
      "anchor": {
        "x": 0.4583333333333333,
        "y": 0.14285714285714285
      }
    },
    {
      "jointId": "thigh-right",
      "parentId": "pelvis",
      "resourcePath": "production-lite-character/parts/thigh-right/spriteFrame",
      "drawOrder": 4,
      "restPose": {
        "position": {
          "x": -12.5,
          "y": -5.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -2.25,
        "y": -30.5
      },
      "visualSize": {
        "width": 28.5,
        "height": 66
      },
      "anchor": {
        "x": 0.5671641791044776,
        "y": 0.07042253521126761
      }
    },
    {
      "jointId": "shin-right",
      "parentId": "thigh-right",
      "resourcePath": "production-lite-character/parts/shin-right/spriteFrame",
      "drawOrder": 5,
      "restPose": {
        "position": {
          "x": -2.5,
          "y": -61
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0.25,
        "y": -30
      },
      "visualSize": {
        "width": 26.5,
        "height": 64
      },
      "anchor": {
        "x": 0.4838709677419355,
        "y": 0.07194244604316546
      }
    },
    {
      "jointId": "shoe-right",
      "parentId": "shin-right",
      "resourcePath": "production-lite-character/parts/shoe-right/spriteFrame",
      "drawOrder": 6,
      "restPose": {
        "position": {
          "x": -0.5,
          "y": -59
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -5,
        "y": -8.75
      },
      "visualSize": {
        "width": 40,
        "height": 22.5
      },
      "anchor": {
        "x": 0.6153846153846154,
        "y": 0.18181818181818182
      }
    },
    {
      "jointId": "thigh-left",
      "parentId": "pelvis",
      "resourcePath": "production-lite-character/parts/thigh-left/spriteFrame",
      "drawOrder": 7,
      "restPose": {
        "position": {
          "x": 12.5,
          "y": -5.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 2.25,
        "y": -30.5
      },
      "visualSize": {
        "width": 29.5,
        "height": 66
      },
      "anchor": {
        "x": 0.4264705882352941,
        "y": 0.0763888888888889
      }
    },
    {
      "jointId": "shin-left",
      "parentId": "thigh-left",
      "resourcePath": "production-lite-character/parts/shin-left/spriteFrame",
      "drawOrder": 8,
      "restPose": {
        "position": {
          "x": 2.5,
          "y": -61.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0.75,
        "y": -29.5
      },
      "visualSize": {
        "width": 27.5,
        "height": 64
      },
      "anchor": {
        "x": 0.47692307692307695,
        "y": 0.07246376811594203
      }
    },
    {
      "jointId": "shoe-left",
      "parentId": "shin-left",
      "resourcePath": "production-lite-character/parts/shoe-left/spriteFrame",
      "drawOrder": 9,
      "restPose": {
        "position": {
          "x": 0.5,
          "y": -59
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 7,
        "y": -8.75
      },
      "visualSize": {
        "width": 42,
        "height": 23.5
      },
      "anchor": {
        "x": 0.35106382978723405,
        "y": 0.17857142857142858
      }
    },
    {
      "jointId": "torso",
      "parentId": "pelvis",
      "resourcePath": "production-lite-character/parts/torso/spriteFrame",
      "drawOrder": 10,
      "restPose": {
        "position": {
          "x": 0,
          "y": 0
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -0.25,
        "y": 36.75
      },
      "visualSize": {
        "width": 51.5,
        "height": 82.5
      },
      "anchor": {
        "x": 0.5,
        "y": 0.9147727272727273
      }
    },
    {
      "jointId": "pelvis",
      "parentId": null,
      "resourcePath": "production-lite-character/parts/pelvis/spriteFrame",
      "drawOrder": 11,
      "restPose": {
        "position": {
          "x": 0,
          "y": -7.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0,
        "y": -12
      },
      "visualSize": {
        "width": 42,
        "height": 35
      },
      "anchor": {
        "x": 0.5,
        "y": 0.18292682926829268
      }
    },
    {
      "jointId": "head",
      "parentId": "torso",
      "resourcePath": "production-lite-character/parts/head/spriteFrame",
      "drawOrder": 12,
      "restPose": {
        "position": {
          "x": 0,
          "y": 75
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0,
        "y": 28.5
      },
      "visualSize": {
        "width": 42,
        "height": 60
      },
      "anchor": {
        "x": 0.5,
        "y": 0.9242424242424242
      }
    },
    {
      "jointId": "hair-front",
      "parentId": "head",
      "resourcePath": "production-lite-character/parts/hair-front/spriteFrame",
      "drawOrder": 13,
      "restPose": {
        "position": {
          "x": 0,
          "y": 0
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0,
        "y": 61.75
      },
      "visualSize": {
        "width": 58,
        "height": 39.5
      },
      "anchor": {
        "x": 0.5,
        "y": 0.9488636363636364
      }
    },
    {
      "jointId": "upper-arm-left",
      "parentId": "torso",
      "resourcePath": "production-lite-character/parts/upper-arm-left/spriteFrame",
      "drawOrder": 14,
      "restPose": {
        "position": {
          "x": 24,
          "y": 65
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 13.5,
        "y": -19.25
      },
      "visualSize": {
        "width": 32,
        "height": 49.5
      },
      "anchor": {
        "x": 0.1232876712328767,
        "y": 0.14545454545454545
      }
    },
    {
      "jointId": "lower-arm-left",
      "parentId": "upper-arm-left",
      "resourcePath": "production-lite-character/parts/lower-arm-left/spriteFrame",
      "drawOrder": 15,
      "restPose": {
        "position": {
          "x": 21,
          "y": -35.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 10.75,
        "y": -19
      },
      "visualSize": {
        "width": 26.5,
        "height": 46
      },
      "anchor": {
        "x": 0.15873015873015872,
        "y": 0.1188118811881188
      }
    },
    {
      "jointId": "hand-left",
      "parentId": "lower-arm-left",
      "resourcePath": "production-lite-character/parts/hand-left/spriteFrame",
      "drawOrder": 16,
      "restPose": {
        "position": {
          "x": 10,
          "y": -39.5
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 5.75,
        "y": -11.5
      },
      "visualSize": {
        "width": 20.5,
        "height": 27
      },
      "anchor": {
        "x": 0.26,
        "y": 0.140625
      }
    }
  ],
  "clips": [
    {
      "schemaVersion": "1.0.0",
      "animationId": "production-lite-arm-wave",
      "rigId": "production-lite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 1.2,
      "loop": true,
      "tracks": [
        {
          "jointId": "hand-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.3,
              "value": 12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": 12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "lower-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.3,
              "value": -72,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -112,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": -72,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "upper-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.3,
              "value": 118,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 92,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": 118,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": "1.0.0",
      "animationId": "production-lite-articulation-stress",
      "rigId": "production-lite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 2.4,
      "loop": true,
      "tracks": [
        {
          "jointId": "head",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": -8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "lower-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -68,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 38,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": -44,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "lower-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 52,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -64,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 48,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shin-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 34,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 46,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shin-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 34,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 46,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shoe-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 10,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": -8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shoe-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 10,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "thigh-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 30,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -30,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "thigh-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -30,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 30,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": -22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "upper-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 62,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -34,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": 44,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "upper-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -42,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 58,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.8,
              "value": -58,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2.4,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": "1.0.0",
      "animationId": "production-lite-rest-idle",
      "rigId": "production-lite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 2,
      "loop": true,
      "tracks": [
        {
          "jointId": "head",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1,
              "value": 1.5,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "pelvis",
          "property": "position",
          "keyframes": [
            {
              "time": 0,
              "value": {
                "x": 0,
                "y": 0
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1,
              "value": {
                "x": 0,
                "y": 2
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": {
                "x": 0,
                "y": 0
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": "1.0.0",
      "animationId": "production-lite-walk-cycle",
      "rigId": "production-lite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 1.2,
      "loop": true,
      "tracks": [
        {
          "jointId": "lower-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -10,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -26,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -10,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "lower-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -26,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -10,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -26,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shin-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 5,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.3,
              "value": 25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": 42,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 5,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shin-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.3,
              "value": 42,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 5,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": 25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shoe-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -4,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -4,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "shoe-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -4,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "thigh-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "thigh-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -24,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "upper-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        },
        {
          "jointId": "upper-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 22,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            }
          ]
        }
      ]
    }
  ]
} as const;
