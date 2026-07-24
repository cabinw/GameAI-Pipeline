// Generated from examples/stickman-reference by TASK-007. Do not hand-edit.
export const STICKMAN_REFERENCE_PLAN = {
  "planVersion": "1.0.0",
  "rigId": "stickman-reference-layout",
  "parts": [
    {
      "jointId": "root",
      "parentId": null,
      "drawOrder": 0,
      "restPose": {
        "position": {
          "x": 0,
          "y": -130
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "root",
        "kind": "circle",
        "center": {
          "x": 0,
          "y": 0
        },
        "radius": 4,
        "color": "#94a3b8"
      }
    },
    {
      "jointId": "upper-arm-left",
      "parentId": "torso",
      "drawOrder": 1,
      "restPose": {
        "position": {
          "x": -31,
          "y": 56
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "upper-arm-left",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -52
        },
        "color": "#fbbf24"
      }
    },
    {
      "jointId": "lower-arm-left",
      "parentId": "upper-arm-left",
      "drawOrder": 2,
      "restPose": {
        "position": {
          "x": 0,
          "y": -52
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "lower-arm-left",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -48
        },
        "color": "#fde68a"
      }
    },
    {
      "jointId": "hand-left",
      "parentId": "lower-arm-left",
      "drawOrder": 3,
      "restPose": {
        "position": {
          "x": 0,
          "y": -48
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "hand-left",
        "kind": "circle",
        "center": {
          "x": 0,
          "y": -8
        },
        "radius": 9,
        "color": "#f8fafc"
      }
    },
    {
      "jointId": "thigh-left",
      "parentId": "pelvis",
      "drawOrder": 4,
      "restPose": {
        "position": {
          "x": -14,
          "y": -6
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "thigh-left",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -62
        },
        "color": "#fbbf24"
      }
    },
    {
      "jointId": "shin-left",
      "parentId": "thigh-left",
      "drawOrder": 5,
      "restPose": {
        "position": {
          "x": 0,
          "y": -62
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "shin-left",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -58
        },
        "color": "#fde68a"
      }
    },
    {
      "jointId": "foot-left",
      "parentId": "shin-left",
      "drawOrder": 6,
      "restPose": {
        "position": {
          "x": 0,
          "y": -58
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "foot-left",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": -28,
          "y": 0
        },
        "color": "#f8fafc"
      }
    },
    {
      "jointId": "pelvis",
      "parentId": "root",
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
      "visual": {
        "partId": "pelvis",
        "kind": "segment",
        "from": {
          "x": -20,
          "y": 0
        },
        "to": {
          "x": 20,
          "y": 0
        },
        "color": "#38bdf8"
      }
    },
    {
      "jointId": "torso",
      "parentId": "pelvis",
      "drawOrder": 8,
      "restPose": {
        "position": {
          "x": 0,
          "y": 18
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "torso",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 72
        },
        "color": "#38bdf8"
      }
    },
    {
      "jointId": "head",
      "parentId": "torso",
      "drawOrder": 9,
      "restPose": {
        "position": {
          "x": 0,
          "y": 72
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "head",
        "kind": "circle",
        "center": {
          "x": 0,
          "y": 23
        },
        "radius": 22,
        "color": "#f8fafc"
      }
    },
    {
      "jointId": "upper-arm-right",
      "parentId": "torso",
      "drawOrder": 10,
      "restPose": {
        "position": {
          "x": 31,
          "y": 56
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "upper-arm-right",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -52
        },
        "color": "#fb7185"
      }
    },
    {
      "jointId": "lower-arm-right",
      "parentId": "upper-arm-right",
      "drawOrder": 11,
      "restPose": {
        "position": {
          "x": 0,
          "y": -52
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "lower-arm-right",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -48
        },
        "color": "#fda4af"
      }
    },
    {
      "jointId": "hand-right",
      "parentId": "lower-arm-right",
      "drawOrder": 12,
      "restPose": {
        "position": {
          "x": 0,
          "y": -48
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "hand-right",
        "kind": "circle",
        "center": {
          "x": 0,
          "y": -8
        },
        "radius": 9,
        "color": "#f8fafc"
      }
    },
    {
      "jointId": "thigh-right",
      "parentId": "pelvis",
      "drawOrder": 13,
      "restPose": {
        "position": {
          "x": 14,
          "y": -6
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "thigh-right",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -62
        },
        "color": "#fb7185"
      }
    },
    {
      "jointId": "shin-right",
      "parentId": "thigh-right",
      "drawOrder": 14,
      "restPose": {
        "position": {
          "x": 0,
          "y": -62
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "shin-right",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": -58
        },
        "color": "#fda4af"
      }
    },
    {
      "jointId": "foot-right",
      "parentId": "shin-right",
      "drawOrder": 15,
      "restPose": {
        "position": {
          "x": 0,
          "y": -58
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      },
      "visual": {
        "partId": "foot-right",
        "kind": "segment",
        "from": {
          "x": 0,
          "y": 0
        },
        "to": {
          "x": 28,
          "y": 0
        },
        "color": "#f8fafc"
      }
    }
  ],
  "clips": [
    {
      "schemaVersion": "1.0.0",
      "animationId": "stickman-arm-wave",
      "rigId": "stickman-reference-layout",
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
      "animationId": "stickman-rest-idle",
      "rigId": "stickman-reference-layout",
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
      "animationId": "stickman-walk-cycle",
      "rigId": "stickman-reference-layout",
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
          "jointId": "root",
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
  ],
  "lineWidth": 12,
  "jointMarkerRadius": 4,
  "mirrorPairs": [
    [
      "upper-arm-left",
      "upper-arm-right"
    ],
    [
      "lower-arm-left",
      "lower-arm-right"
    ],
    [
      "hand-left",
      "hand-right"
    ],
    [
      "thigh-left",
      "thigh-right"
    ],
    [
      "shin-left",
      "shin-right"
    ],
    [
      "foot-left",
      "foot-right"
    ]
  ]
} as const;
