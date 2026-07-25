// Generated from tracked engine-neutral rig, animation, garment, accessory, prop, socket, and grip contracts. Do not hand-edit.
import type { PropBridgePlan } from "./prop-bridge-runtime-contract";

export const PROP_BRIDGE_PLAN = {
  "planVersion": "1.0.0",
  "rigId": "production-lite-character-layout",
  "defaultGarmentStateId": "garment-and-accessories",
  "defaultPropStateId": "no-prop",
  "defaultStateId": "garment-and-accessories-with-no-prop",
  "garment": {
    "planVersion": "1.0.0",
    "rigId": "production-lite-character-layout",
    "defaultStateId": "garment-and-accessories",
    "base": {
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
          "animationId": "production-lite-prop-swing",
          "rigId": "production-lite-character-layout",
          "rigSchemaVersion": "1.0.0",
          "duration": 2.4,
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
                  "time": 0.6,
                  "value": 18,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.2,
                  "value": -22,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.8,
                  "value": 14,
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
                  "value": 24,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.2,
                  "value": -36,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.8,
                  "value": 18,
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
                  "value": -32,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.2,
                  "value": 28,
                  "interpolation": "linear",
                  "easing": "ease-in-out-sine"
                },
                {
                  "time": 1.8,
                  "value": -20,
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
        }
      ]
    },
    "baseSortingOrders": {
      "hair-back": 10,
      "upper-arm-right": 12,
      "lower-arm-right": 14,
      "hand-right": 17,
      "thigh-right": 20,
      "shin-right": 21,
      "shoe-right": 22,
      "thigh-left": 23,
      "shin-left": 24,
      "shoe-left": 25,
      "torso": 27,
      "pelvis": 30,
      "head": 32,
      "hair-front": 34,
      "upper-arm-left": 37,
      "lower-arm-left": 39,
      "hand-left": 42
    },
    "wearableSetIds": [
      "casual-jacket"
    ],
    "states": [
      {
        "stateId": "base-only",
        "hudLabel": "Base Only",
        "garmentEnabled": false,
        "accessoriesEnabled": false,
        "enabledAttachmentIds": []
      },
      {
        "stateId": "garment-only",
        "hudLabel": "Garment Only",
        "garmentEnabled": true,
        "accessoriesEnabled": false,
        "enabledAttachmentIds": [
          "collar-back",
          "collar-front",
          "jacket-back",
          "jacket-cuff-left",
          "jacket-cuff-right",
          "jacket-front",
          "jacket-lower-sleeve-left",
          "jacket-lower-sleeve-right",
          "jacket-upper-sleeve-left",
          "jacket-upper-sleeve-right",
          "jacket-zipper-trim"
        ]
      },
      {
        "stateId": "accessories-only",
        "hudLabel": "Accessories Only",
        "garmentEnabled": false,
        "accessoriesEnabled": true,
        "enabledAttachmentIds": [
          "cap-back",
          "cap-front",
          "sunglasses"
        ]
      },
      {
        "stateId": "garment-and-accessories",
        "hudLabel": "Garment + Accessories",
        "garmentEnabled": true,
        "accessoriesEnabled": true,
        "enabledAttachmentIds": [
          "cap-back",
          "cap-front",
          "collar-back",
          "collar-front",
          "jacket-back",
          "jacket-cuff-left",
          "jacket-cuff-right",
          "jacket-front",
          "jacket-lower-sleeve-left",
          "jacket-lower-sleeve-right",
          "jacket-upper-sleeve-left",
          "jacket-upper-sleeve-right",
          "jacket-zipper-trim",
          "sunglasses"
        ]
      }
    ],
    "slots": [
      {
        "slotId": "collar-back",
        "parentPartId": "torso",
        "transform": {
          "position": {
            "x": 0,
            "y": 72.5
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "collar-front",
        "parentPartId": "torso",
        "transform": {
          "position": {
            "x": 0,
            "y": 72.5
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "face-accessory",
        "parentPartId": "head",
        "transform": {
          "position": {
            "x": 0,
            "y": 25
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "headwear",
        "parentPartId": "head",
        "transform": {
          "position": {
            "x": 0,
            "y": 60
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "lower-arm-left",
        "parentPartId": "lower-arm-left",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "lower-arm-right",
        "parentPartId": "lower-arm-right",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "torso-back",
        "parentPartId": "torso",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "torso-front",
        "parentPartId": "torso",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "upper-arm-left",
        "parentPartId": "upper-arm-left",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "upper-arm-right",
        "parentPartId": "upper-arm-right",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "wrist-left",
        "parentPartId": "hand-left",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      },
      {
        "slotId": "wrist-right",
        "parentPartId": "hand-right",
        "transform": {
          "position": {
            "x": 0,
            "y": 0
          },
          "rotationDegrees": 0,
          "scale": {
            "x": 1,
            "y": 1
          }
        }
      }
    ],
    "attachments": [
      {
        "attachmentId": "cap-back",
        "slotId": "headwear",
        "parentPartId": "head",
        "category": "accessory",
        "resourcePath": "production-lite-garment-layering/attachments/cap-back/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.609375
        },
        "visualOffset": {
          "x": 0,
          "y": 3.5
        },
        "visualSize": {
          "width": 56,
          "height": 32
        },
        "drawOrder": 0.5,
        "sortingOrder": 11,
        "layerRole": "back",
        "enabledByState": {
          "base-only": false,
          "garment-only": false,
          "accessories-only": true,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-upper-sleeve-right",
        "slotId": "upper-arm-right",
        "parentPartId": "upper-arm-right",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-upper-sleeve-right/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.8333333333333334,
          "y": 0.1896551724137931
        },
        "visualOffset": {
          "x": -13.000000000000002,
          "y": -18
        },
        "visualSize": {
          "width": 39,
          "height": 58
        },
        "drawOrder": 1.1,
        "sortingOrder": 13,
        "layerRole": "back",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-lower-sleeve-right",
        "slotId": "lower-arm-right",
        "parentPartId": "lower-arm-right",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-lower-sleeve-right/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5857142857142857,
          "y": 0.16363636363636364
        },
        "visualOffset": {
          "x": -3.000000000000001,
          "y": -18.5
        },
        "visualSize": {
          "width": 35,
          "height": 55
        },
        "drawOrder": 2.1,
        "sortingOrder": 15,
        "layerRole": "back",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-cuff-right",
        "slotId": "wrist-right",
        "parentPartId": "hand-right",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-cuff-right/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.43103448275862066,
          "y": 0.37142857142857144
        },
        "visualOffset": {
          "x": 2.000000000000001,
          "y": -2.25
        },
        "visualSize": {
          "width": 29,
          "height": 17.5
        },
        "drawOrder": 3.2,
        "sortingOrder": 18,
        "layerRole": "cover",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-back",
        "slotId": "torso-back",
        "parentPartId": "torso",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-back/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.898876404494382
        },
        "visualOffset": {
          "x": 0,
          "y": 35.5
        },
        "visualSize": {
          "width": 65,
          "height": 89
        },
        "drawOrder": 9.5,
        "sortingOrder": 26,
        "layerRole": "back",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-front",
        "slotId": "torso-front",
        "parentPartId": "torso",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-front/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.898876404494382
        },
        "visualOffset": {
          "x": 0,
          "y": 35.5
        },
        "visualSize": {
          "width": 60,
          "height": 89
        },
        "drawOrder": 10.2,
        "sortingOrder": 28,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-zipper-trim",
        "slotId": "torso-front",
        "parentPartId": "torso",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-zipper-trim/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.9666666666666667
        },
        "visualOffset": {
          "x": 0,
          "y": 35
        },
        "visualSize": {
          "width": 8,
          "height": 75
        },
        "drawOrder": 10.3,
        "sortingOrder": 29,
        "layerRole": "cover",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "collar-back",
        "slotId": "collar-back",
        "parentPartId": "torso",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/collar-back/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.6666666666666666
        },
        "visualOffset": {
          "x": 0,
          "y": 3.749999999999999
        },
        "visualSize": {
          "width": 40,
          "height": 22.5
        },
        "drawOrder": 11.5,
        "sortingOrder": 31,
        "layerRole": "back",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "sunglasses",
        "slotId": "face-accessory",
        "parentPartId": "head",
        "category": "accessory",
        "resourcePath": "production-lite-garment-layering/attachments/sunglasses/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.5142857142857142
        },
        "visualOffset": {
          "x": 0,
          "y": 0.2499999999999991
        },
        "visualSize": {
          "width": 46,
          "height": 17.5
        },
        "drawOrder": 12.5,
        "sortingOrder": 33,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": false,
          "accessories-only": true,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "collar-front",
        "slotId": "collar-front",
        "parentPartId": "torso",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/collar-front/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.4888888888888889
        },
        "visualOffset": {
          "x": 0,
          "y": -0.25000000000000033
        },
        "visualSize": {
          "width": 35,
          "height": 22.5
        },
        "drawOrder": 13.2,
        "sortingOrder": 35,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "cap-front",
        "slotId": "headwear",
        "parentPartId": "head",
        "category": "accessory",
        "resourcePath": "production-lite-garment-layering/attachments/cap-front/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.5,
          "y": 0.6428571428571429
        },
        "visualOffset": {
          "x": 0,
          "y": 5.000000000000002
        },
        "visualSize": {
          "width": 64,
          "height": 35
        },
        "drawOrder": 13.5,
        "sortingOrder": 36,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": false,
          "accessories-only": true,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-upper-sleeve-left",
        "slotId": "upper-arm-left",
        "parentPartId": "upper-arm-left",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-upper-sleeve-left/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.15853658536585366,
          "y": 0.17796610169491525
        },
        "visualOffset": {
          "x": 13.999999999999998,
          "y": -19
        },
        "visualSize": {
          "width": 41,
          "height": 59
        },
        "drawOrder": 14.1,
        "sortingOrder": 38,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-lower-sleeve-left",
        "slotId": "lower-arm-left",
        "parentPartId": "lower-arm-left",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-lower-sleeve-left/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.19444444444444445,
          "y": 0.14285714285714285
        },
        "visualOffset": {
          "x": 11,
          "y": -20
        },
        "visualSize": {
          "width": 36,
          "height": 56
        },
        "drawOrder": 15.1,
        "sortingOrder": 40,
        "layerRole": "front",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      },
      {
        "attachmentId": "jacket-cuff-left",
        "slotId": "wrist-left",
        "parentPartId": "hand-left",
        "category": "wearable",
        "wearableSetId": "casual-jacket",
        "resourcePath": "production-lite-garment-layering/attachments/jacket-cuff-left/spriteFrame",
        "transform": {
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
        "anchor": {
          "x": 0.3225806451612903,
          "y": 0.40540540540540543
        },
        "visualOffset": {
          "x": 5.5,
          "y": -1.7499999999999996
        },
        "visualSize": {
          "width": 31,
          "height": 18.5
        },
        "drawOrder": 16.2,
        "sortingOrder": 43,
        "layerRole": "cover",
        "enabledByState": {
          "base-only": false,
          "garment-only": true,
          "accessories-only": false,
          "garment-and-accessories": true
        }
      }
    ],
    "seams": [
      {
        "seamId": "collar-neck",
        "first": {
          "itemId": "collar-back",
          "itemKind": "attachment",
          "localBounds": {
            "left": -14,
            "right": 14,
            "bottom": -11.25,
            "top": 11.25
          }
        },
        "second": {
          "itemId": "head",
          "itemKind": "base",
          "localBounds": {
            "left": -9,
            "right": 16,
            "bottom": -36,
            "top": -20
          }
        },
        "minimumOverlap": 2
      },
      {
        "seamId": "collar-torso",
        "first": {
          "itemId": "collar-front",
          "itemKind": "attachment",
          "localBounds": {
            "left": -17.5,
            "right": 17.5,
            "bottom": -11.25,
            "top": 2.25
          }
        },
        "second": {
          "itemId": "jacket-front",
          "itemKind": "attachment",
          "localBounds": {
            "left": -20,
            "right": 20,
            "bottom": 22,
            "top": 44.5
          }
        },
        "minimumOverlap": 3
      },
      {
        "seamId": "cuff-hand-left",
        "first": {
          "itemId": "jacket-cuff-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -15.5,
            "right": 15.5,
            "bottom": -9.25,
            "top": 5.25
          }
        },
        "second": {
          "itemId": "hand-left",
          "itemKind": "base",
          "localBounds": {
            "left": -10.25,
            "right": 14.75,
            "bottom": -0.5,
            "top": 13.5
          }
        },
        "minimumOverlap": 2
      },
      {
        "seamId": "cuff-hand-right",
        "first": {
          "itemId": "jacket-cuff-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": -14.5,
            "right": 14.5,
            "bottom": -8.75,
            "top": 4.75
          }
        },
        "second": {
          "itemId": "hand-right",
          "itemKind": "base",
          "localBounds": {
            "left": -9.5,
            "right": 14.5,
            "bottom": -0.5,
            "top": 13.5
          }
        },
        "minimumOverlap": 2
      },
      {
        "seamId": "lower-cuff-left",
        "first": {
          "itemId": "jacket-lower-sleeve-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -6,
            "right": 18,
            "bottom": -28,
            "top": -11
          }
        },
        "second": {
          "itemId": "jacket-cuff-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -15.5,
            "right": 15.5,
            "bottom": -5.75,
            "top": 9.25
          }
        },
        "minimumOverlap": 2
      },
      {
        "seamId": "lower-cuff-right",
        "first": {
          "itemId": "jacket-lower-sleeve-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": -17.5,
            "right": 6.5,
            "bottom": -27.5,
            "top": -10.5
          }
        },
        "second": {
          "itemId": "jacket-cuff-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": -14.5,
            "right": 14.5,
            "bottom": -6.25,
            "top": 8.75
          }
        },
        "minimumOverlap": 2
      },
      {
        "seamId": "torso-upper-left",
        "first": {
          "itemId": "jacket-front",
          "itemKind": "attachment",
          "localBounds": {
            "left": 17,
            "right": 30,
            "bottom": 10.5,
            "top": 35.5
          }
        },
        "second": {
          "itemId": "jacket-upper-sleeve-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -20.5,
            "right": -8.5,
            "bottom": 1.5,
            "top": 25.5
          }
        },
        "minimumOverlap": 3
      },
      {
        "seamId": "torso-upper-right",
        "first": {
          "itemId": "jacket-front",
          "itemKind": "attachment",
          "localBounds": {
            "left": -30,
            "right": -17,
            "bottom": 10.5,
            "top": 35.5
          }
        },
        "second": {
          "itemId": "jacket-upper-sleeve-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": 8.5,
            "right": 19.5,
            "bottom": 1,
            "top": 25
          }
        },
        "minimumOverlap": 3
      },
      {
        "seamId": "upper-lower-left",
        "first": {
          "itemId": "jacket-upper-sleeve-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -2.5,
            "right": 18.5,
            "bottom": -29.5,
            "top": -9.5
          }
        },
        "second": {
          "itemId": "jacket-lower-sleeve-left",
          "itemKind": "attachment",
          "localBounds": {
            "left": -16,
            "right": 5,
            "bottom": 10,
            "top": 28
          }
        },
        "minimumOverlap": 3
      },
      {
        "seamId": "upper-lower-right",
        "first": {
          "itemId": "jacket-upper-sleeve-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": -16.5,
            "right": 4.5,
            "bottom": -29,
            "top": -10
          }
        },
        "second": {
          "itemId": "jacket-lower-sleeve-right",
          "itemKind": "attachment",
          "localBounds": {
            "left": -8.5,
            "right": 12.5,
            "bottom": 9.5,
            "top": 27.5
          }
        },
        "minimumOverlap": 3
      }
    ]
  },
  "states": [
    {
      "stateId": "base-only-with-no-prop",
      "garmentStateId": "base-only",
      "propStateId": "no-prop",
      "hudLabel": "Base Only / No Prop",
      "enabledGarmentAttachmentIds": [],
      "enabledPropAttachmentIds": [],
      "activePrimaryPropCount": 0
    },
    {
      "stateId": "base-only-with-left-hand-prop",
      "garmentStateId": "base-only",
      "propStateId": "left-hand-prop",
      "hudLabel": "Base Only / Left Prop",
      "enabledGarmentAttachmentIds": [],
      "enabledPropAttachmentIds": [
        "hand-overlay-left",
        "toolbox-left"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "base-only-with-right-hand-prop",
      "garmentStateId": "base-only",
      "propStateId": "right-hand-prop",
      "hudLabel": "Base Only / Right Prop",
      "enabledGarmentAttachmentIds": [],
      "enabledPropAttachmentIds": [
        "hand-overlay-right",
        "toolbox-right"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "garment-only-with-no-prop",
      "garmentStateId": "garment-only",
      "propStateId": "no-prop",
      "hudLabel": "Garment Only / No Prop",
      "enabledGarmentAttachmentIds": [
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim"
      ],
      "enabledPropAttachmentIds": [],
      "activePrimaryPropCount": 0
    },
    {
      "stateId": "garment-only-with-left-hand-prop",
      "garmentStateId": "garment-only",
      "propStateId": "left-hand-prop",
      "hudLabel": "Garment Only / Left Prop",
      "enabledGarmentAttachmentIds": [
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-left",
        "toolbox-left"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "garment-only-with-right-hand-prop",
      "garmentStateId": "garment-only",
      "propStateId": "right-hand-prop",
      "hudLabel": "Garment Only / Right Prop",
      "enabledGarmentAttachmentIds": [
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-right",
        "toolbox-right"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "accessories-only-with-no-prop",
      "garmentStateId": "accessories-only",
      "propStateId": "no-prop",
      "hudLabel": "Accessories Only / No Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [],
      "activePrimaryPropCount": 0
    },
    {
      "stateId": "accessories-only-with-left-hand-prop",
      "garmentStateId": "accessories-only",
      "propStateId": "left-hand-prop",
      "hudLabel": "Accessories Only / Left Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-left",
        "toolbox-left"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "accessories-only-with-right-hand-prop",
      "garmentStateId": "accessories-only",
      "propStateId": "right-hand-prop",
      "hudLabel": "Accessories Only / Right Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-right",
        "toolbox-right"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "garment-and-accessories-with-no-prop",
      "garmentStateId": "garment-and-accessories",
      "propStateId": "no-prop",
      "hudLabel": "Garment + Accessories / No Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [],
      "activePrimaryPropCount": 0
    },
    {
      "stateId": "garment-and-accessories-with-left-hand-prop",
      "garmentStateId": "garment-and-accessories",
      "propStateId": "left-hand-prop",
      "hudLabel": "Garment + Accessories / Left Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-left",
        "toolbox-left"
      ],
      "activePrimaryPropCount": 1
    },
    {
      "stateId": "garment-and-accessories-with-right-hand-prop",
      "garmentStateId": "garment-and-accessories",
      "propStateId": "right-hand-prop",
      "hudLabel": "Garment + Accessories / Right Prop",
      "enabledGarmentAttachmentIds": [
        "cap-back",
        "cap-front",
        "collar-back",
        "collar-front",
        "jacket-back",
        "jacket-cuff-left",
        "jacket-cuff-right",
        "jacket-front",
        "jacket-lower-sleeve-left",
        "jacket-lower-sleeve-right",
        "jacket-upper-sleeve-left",
        "jacket-upper-sleeve-right",
        "jacket-zipper-trim",
        "sunglasses"
      ],
      "enabledPropAttachmentIds": [
        "hand-overlay-right",
        "toolbox-right"
      ],
      "activePrimaryPropCount": 1
    }
  ],
  "slots": [
    {
      "slotId": "hand-left-prop",
      "parentPartId": "hand-left",
      "targetSocketId": "hand-left-grip",
      "transform": {
        "position": {
          "x": 0,
          "y": 0
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      }
    },
    {
      "slotId": "hand-right-prop",
      "parentPartId": "hand-right",
      "targetSocketId": "hand-right-grip",
      "transform": {
        "position": {
          "x": 0,
          "y": 0
        },
        "rotationDegrees": 0,
        "scale": {
          "x": 1,
          "y": 1
        }
      }
    }
  ],
  "attachments": [
    {
      "attachmentId": "toolbox-right",
      "slotId": "hand-right-prop",
      "parentPartId": "hand-right",
      "targetSocketId": "hand-right-grip",
      "propStateId": "right-hand-prop",
      "attachmentKind": "prop",
      "resourcePath": "production-lite-one-handed-prop/attachments/toolbox-right/spriteFrame",
      "transform": {
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
      "anchor": {
        "x": 0.5,
        "y": 0.12
      },
      "gripAnchor": {
        "x": 0.5,
        "y": 0.12
      },
      "gripLocalOffset": {
        "x": 0,
        "y": 0
      },
      "handOverlayAttachmentId": "hand-overlay-right",
      "visualOffset": {
        "x": 0,
        "y": -19
      },
      "visualSize": {
        "width": 55,
        "height": 50
      },
      "drawOrder": 2.5,
      "sortingOrder": 16,
      "layerRole": "behind-target",
      "enabledByPropState": {
        "no-prop": false,
        "left-hand-prop": false,
        "right-hand-prop": true
      }
    },
    {
      "attachmentId": "hand-overlay-right",
      "slotId": "hand-right-prop",
      "parentPartId": "hand-right",
      "targetSocketId": "hand-right-grip",
      "propStateId": "right-hand-prop",
      "attachmentKind": "hand-overlay",
      "resourcePath": "production-lite-one-handed-prop/attachments/hand-overlay-right/spriteFrame",
      "transform": {
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
      "anchor": {
        "x": 0.5,
        "y": 0.5
      },
      "visualOffset": {
        "x": 0,
        "y": 0
      },
      "visualSize": {
        "width": 17,
        "height": 12
      },
      "drawOrder": 3.5,
      "sortingOrder": 19,
      "layerRole": "target-overlay",
      "enabledByPropState": {
        "no-prop": false,
        "left-hand-prop": false,
        "right-hand-prop": true
      }
    },
    {
      "attachmentId": "toolbox-left",
      "slotId": "hand-left-prop",
      "parentPartId": "hand-left",
      "targetSocketId": "hand-left-grip",
      "propStateId": "left-hand-prop",
      "attachmentKind": "prop",
      "resourcePath": "production-lite-one-handed-prop/attachments/toolbox-left/spriteFrame",
      "transform": {
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
      "anchor": {
        "x": 0.5,
        "y": 0.12
      },
      "gripAnchor": {
        "x": 0.5,
        "y": 0.12
      },
      "gripLocalOffset": {
        "x": 0,
        "y": 0
      },
      "handOverlayAttachmentId": "hand-overlay-left",
      "visualOffset": {
        "x": 0,
        "y": -19
      },
      "visualSize": {
        "width": 55,
        "height": 50
      },
      "drawOrder": 15.5,
      "sortingOrder": 41,
      "layerRole": "behind-target",
      "enabledByPropState": {
        "no-prop": false,
        "left-hand-prop": true,
        "right-hand-prop": false
      }
    },
    {
      "attachmentId": "hand-overlay-left",
      "slotId": "hand-left-prop",
      "parentPartId": "hand-left",
      "targetSocketId": "hand-left-grip",
      "propStateId": "left-hand-prop",
      "attachmentKind": "hand-overlay",
      "resourcePath": "production-lite-one-handed-prop/attachments/hand-overlay-left/spriteFrame",
      "transform": {
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
      "anchor": {
        "x": 0.5,
        "y": 0.5
      },
      "visualOffset": {
        "x": 0,
        "y": 0
      },
      "visualSize": {
        "width": 17,
        "height": 12
      },
      "drawOrder": 16.5,
      "sortingOrder": 44,
      "layerRole": "target-overlay",
      "enabledByPropState": {
        "no-prop": false,
        "left-hand-prop": true,
        "right-hand-prop": false
      }
    }
  ]
} as unknown as PropBridgePlan;
