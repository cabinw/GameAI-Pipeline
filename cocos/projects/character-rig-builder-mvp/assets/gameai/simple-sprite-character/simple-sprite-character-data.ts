// Generated from examples/simple-sprite-character by TASK-008. Do not hand-edit.
export const SIMPLE_SPRITE_CHARACTER_PLAN = {
  "planVersion": "1.0.0",
  "rigId": "simple-sprite-character-layout",
  "sourceCanvas": {
    "width": 400,
    "height": 600
  },
  "referenceScale": 0.8,
  "parts": [
    {
      "jointId": "upper-arm-left",
      "parentId": "torso",
      "resourcePath": "simple-sprite-character/parts/upper-arm-left/spriteFrame",
      "drawOrder": 0,
      "restPose": {
        "position": {
          "x": 36,
          "y": 92
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 17.6,
        "y": -34.4
      },
      "visualSize": {
        "width": 56,
        "height": 92.80000000000001
      },
      "anchor": {
        "x": 0.18571428571428572,
        "y": 0.12931034482758622
      }
    },
    {
      "jointId": "lower-arm-left",
      "parentId": "upper-arm-left",
      "resourcePath": "simple-sprite-character/parts/lower-arm-left/spriteFrame",
      "drawOrder": 1,
      "restPose": {
        "position": {
          "x": 32,
          "y": -68
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 13.600000000000001,
        "y": -30.400000000000002
      },
      "visualSize": {
        "width": 48,
        "height": 84.80000000000001
      },
      "anchor": {
        "x": 0.21666666666666667,
        "y": 0.14150943396226415
      }
    },
    {
      "jointId": "hand-left",
      "parentId": "lower-arm-left",
      "resourcePath": "simple-sprite-character/parts/hand-left/spriteFrame",
      "drawOrder": 2,
      "restPose": {
        "position": {
          "x": 24,
          "y": -60
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 4.800000000000001,
        "y": -10.4
      },
      "visualSize": {
        "width": 33.6,
        "height": 44.800000000000004
      },
      "anchor": {
        "x": 0.35714285714285715,
        "y": 0.26785714285714285
      }
    },
    {
      "jointId": "thigh-left",
      "parentId": "pelvis",
      "resourcePath": "simple-sprite-character/parts/thigh-left/spriteFrame",
      "drawOrder": 3,
      "restPose": {
        "position": {
          "x": 14.4,
          "y": -24
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 8,
        "y": -46.400000000000006
      },
      "visualSize": {
        "width": 46.400000000000006,
        "height": 116.80000000000001
      },
      "anchor": {
        "x": 0.3275862068965517,
        "y": 0.10273972602739725
      }
    },
    {
      "jointId": "shin-left",
      "parentId": "thigh-left",
      "resourcePath": "simple-sprite-character/parts/shin-left/spriteFrame",
      "drawOrder": 4,
      "restPose": {
        "position": {
          "x": 9.6,
          "y": -92
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 4.800000000000001,
        "y": -38.400000000000006
      },
      "visualSize": {
        "width": 35.2,
        "height": 100.80000000000001
      },
      "anchor": {
        "x": 0.36363636363636365,
        "y": 0.11904761904761904
      }
    },
    {
      "jointId": "foot-left",
      "parentId": "shin-left",
      "resourcePath": "simple-sprite-character/parts/foot-left/spriteFrame",
      "drawOrder": 5,
      "restPose": {
        "position": {
          "x": 4,
          "y": -76
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 16.8,
        "y": -5.6000000000000005
      },
      "visualSize": {
        "width": 57.6,
        "height": 33.6
      },
      "anchor": {
        "x": 0.20833333333333334,
        "y": 0.3333333333333333
      }
    },
    {
      "jointId": "pelvis",
      "parentId": null,
      "resourcePath": "simple-sprite-character/parts/pelvis/spriteFrame",
      "drawOrder": 6,
      "restPose": {
        "position": {
          "x": 0,
          "y": -16
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
        "width": 64,
        "height": 56
      },
      "anchor": {
        "x": 0.5,
        "y": 0.2857142857142857
      }
    },
    {
      "jointId": "torso",
      "parentId": "pelvis",
      "resourcePath": "simple-sprite-character/parts/torso/spriteFrame",
      "drawOrder": 7,
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
        "y": 56
      },
      "visualSize": {
        "width": 88,
        "height": 136
      },
      "anchor": {
        "x": 0.5,
        "y": 0.9117647058823529
      }
    },
    {
      "jointId": "head",
      "parentId": "torso",
      "resourcePath": "simple-sprite-character/parts/head/spriteFrame",
      "drawOrder": 8,
      "restPose": {
        "position": {
          "x": 0,
          "y": 108
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": 0,
        "y": 28
      },
      "visualSize": {
        "width": 64,
        "height": 72
      },
      "anchor": {
        "x": 0.5,
        "y": 0.8888888888888888
      }
    },
    {
      "jointId": "upper-arm-right",
      "parentId": "torso",
      "resourcePath": "simple-sprite-character/parts/upper-arm-right/spriteFrame",
      "drawOrder": 9,
      "restPose": {
        "position": {
          "x": -36,
          "y": 92
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -17.6,
        "y": -34.4
      },
      "visualSize": {
        "width": 56,
        "height": 92.80000000000001
      },
      "anchor": {
        "x": 0.8142857142857143,
        "y": 0.12931034482758622
      }
    },
    {
      "jointId": "lower-arm-right",
      "parentId": "upper-arm-right",
      "resourcePath": "simple-sprite-character/parts/lower-arm-right/spriteFrame",
      "drawOrder": 10,
      "restPose": {
        "position": {
          "x": -32,
          "y": -68
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -13.600000000000001,
        "y": -30.400000000000002
      },
      "visualSize": {
        "width": 48,
        "height": 84.80000000000001
      },
      "anchor": {
        "x": 0.7833333333333333,
        "y": 0.14150943396226415
      }
    },
    {
      "jointId": "hand-right",
      "parentId": "lower-arm-right",
      "resourcePath": "simple-sprite-character/parts/hand-right/spriteFrame",
      "drawOrder": 11,
      "restPose": {
        "position": {
          "x": -24,
          "y": -60
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -4.800000000000001,
        "y": -10.4
      },
      "visualSize": {
        "width": 33.6,
        "height": 44.800000000000004
      },
      "anchor": {
        "x": 0.6428571428571429,
        "y": 0.26785714285714285
      }
    },
    {
      "jointId": "thigh-right",
      "parentId": "pelvis",
      "resourcePath": "simple-sprite-character/parts/thigh-right/spriteFrame",
      "drawOrder": 12,
      "restPose": {
        "position": {
          "x": -14.4,
          "y": -24
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -8,
        "y": -46.400000000000006
      },
      "visualSize": {
        "width": 46.400000000000006,
        "height": 116.80000000000001
      },
      "anchor": {
        "x": 0.6724137931034483,
        "y": 0.10273972602739725
      }
    },
    {
      "jointId": "shin-right",
      "parentId": "thigh-right",
      "resourcePath": "simple-sprite-character/parts/shin-right/spriteFrame",
      "drawOrder": 13,
      "restPose": {
        "position": {
          "x": -9.6,
          "y": -92
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -4.800000000000001,
        "y": -38.400000000000006
      },
      "visualSize": {
        "width": 35.2,
        "height": 100.80000000000001
      },
      "anchor": {
        "x": 0.6363636363636364,
        "y": 0.11904761904761904
      }
    },
    {
      "jointId": "foot-right",
      "parentId": "shin-right",
      "resourcePath": "simple-sprite-character/parts/foot-right/spriteFrame",
      "drawOrder": 14,
      "restPose": {
        "position": {
          "x": -4,
          "y": -76
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visualOffset": {
        "x": -16.8,
        "y": -5.6000000000000005
      },
      "visualSize": {
        "width": 57.6,
        "height": 33.6
      },
      "anchor": {
        "x": 0.7916666666666666,
        "y": 0.3333333333333333
      }
    }
  ],
  "clips": [
    {
      "schemaVersion": "1.0.0",
      "animationId": "simple-sprite-arm-wave",
      "rigId": "simple-sprite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 2,
      "loop": true,
      "tracks": [
        {
          "jointId": "hand-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 0,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.4,
              "value": 15,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.7,
              "value": -15,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1,
              "value": 15,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.3,
              "value": -15,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.6,
              "value": 15,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": 0,
              "interpolation": "linear",
              "easing": "linear"
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
              "time": 0.4,
              "value": -65,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.7,
              "value": -25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1,
              "value": -70,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.3,
              "value": -25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.6,
              "value": -65,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": 0,
              "interpolation": "linear",
              "easing": "linear"
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
              "time": 0.4,
              "value": 100,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.6,
              "value": 100,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": 0,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": "1.0.0",
      "animationId": "simple-sprite-rest-idle",
      "rigId": "simple-sprite-character-layout",
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
              "value": 2,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 2,
              "value": 0,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "torso",
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
              "easing": "linear"
            }
          ]
        }
      ]
    },
    {
      "schemaVersion": "1.0.0",
      "animationId": "simple-sprite-walk-cycle",
      "rigId": "simple-sprite-character-layout",
      "rigSchemaVersion": "1.0.0",
      "duration": 1.2,
      "loop": true,
      "tracks": [
        {
          "jointId": "foot-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -8,
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
              "value": -8,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "foot-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -12,
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
              "value": -12,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "lower-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -12,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -32,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -12,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "lower-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 32,
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
              "value": 32,
              "interpolation": "linear",
              "easing": "linear"
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
              "time": 0.3,
              "value": {
                "x": 0,
                "y": 4
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": {
                "x": 0,
                "y": 0
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": {
                "x": 0,
                "y": 4
              },
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": {
                "x": 0,
                "y": 0
              },
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "shin-left",
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
              "value": 38,
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
              "value": 8,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "shin-right",
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
              "value": -8,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.9,
              "value": -38,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -10,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "thigh-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 30,
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
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "thigh-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -30,
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
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "upper-arm-left",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": -25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": 25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": -25,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        },
        {
          "jointId": "upper-arm-right",
          "property": "rotation",
          "keyframes": [
            {
              "time": 0,
              "value": 25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 0.6,
              "value": -25,
              "interpolation": "linear",
              "easing": "ease-in-out-sine"
            },
            {
              "time": 1.2,
              "value": 25,
              "interpolation": "linear",
              "easing": "linear"
            }
          ]
        }
      ]
    }
  ]
} as const;
