# Task15 Animation Review Editor Design

## Status

Design seed v0.1. The versioned architecture and implementation authority is
[RFC-0016](rfc/RFC-0016-animation-review-workspace.md); this document preserves
the original product intent and terminology.

## Purpose

Task15 不再只是实现角色动画播放能力，而是构建一个 AI Native
角色动画生产闭环。

核心目标：

> 让 AI
> 负责分析、诊断和验证，让人负责高价值的视觉调整，通过结构化数据完成动画生产闭环。

------------------------------------------------------------------------

# 1. 背景问题

当前 GameAI Pipeline 的动画验证流程：

    AI生成角色
        ↓
    绑定骨骼
        ↓
    生成动画
        ↓
    运行游戏
        ↓
    截图 / 视频
        ↓
    人工检查

存在问题：

1.  验证依赖视觉截图
2.  AI无法理解失败原因
3.  人工需要反复观看视频
4.  问题无法结构化记录
5.  修复过程不可复用

------------------------------------------------------------------------

# 2. 新设计目标

建立：

## Animation Authoring + Review Editor

它不是传统动画编辑器。

它不是 Spine 替代品。

它是：

> AI Agent 与人协作完成角色动画生产的工作空间。

核心循环：

    Generate
        ↓
    Analyze
        ↓
    Human Adjust
        ↓
    Validate
        ↓
    Contract Output

------------------------------------------------------------------------

# 3. 核心理念

## AI 不替代人编辑

AI负责：

-   发现问题
-   定位问题
-   分析原因
-   提供修改建议
-   自动验证

人负责：

-   审美判断
-   快速调整
-   风格选择
-   最终确认

------------------------------------------------------------------------

# 4. 系统架构

    Animation Agent

            ↓

    Animation Task

            ↓

    Animation Review Editor

            ↓

    Review Contract

            ↓

    AI Repair Agent

            ↓

    New Animation Version

------------------------------------------------------------------------

# 5. Editor 核心模块

## 5.1 Character Preview

职责：

展示当前角色动画状态。

支持：

-   播放
-   暂停
-   单帧查看
-   慢速播放
-   循环播放

显示：

-   Sprite
-   Skeleton
-   Bone
-   Pivot
-   Hitbox
-   Attachment

------------------------------------------------------------------------

## 5.2 Asset Structure Panel

展示 Character Contract。

作用：

AI和人共同理解角色结构。

------------------------------------------------------------------------

## 5.3 AI Diagnosis Panel

AI负责生成问题列表。

AI必须输出：

1.  问题位置
2.  问题原因
3.  修改建议
4.  修改参数范围

------------------------------------------------------------------------

## 5.4 Quick Edit Panel

目的：

提供人快速调整能力。

不是完整动画编辑器。

开放高频调整：

-   Pivot
-   Rotation
-   Scale
-   Bone Length
-   Weight
-   Layer Order
-   Animation Curve

原则：

> AI定位，人快速修改。

------------------------------------------------------------------------

## 5.5 Timeline Editor

显示：

Animation Keyframe。

支持：

-   查看关键帧
-   修改关键帧
-   标记问题时间点

------------------------------------------------------------------------

## 5.6 Validation Checklist

AI根据任务生成验证条件。

例如：

    ✓ 骨骼连接正确
    ✓ 部件层级正确
    ⚠ 循环流畅度不足
    ⚠ 重心变化异常
    ✓ 无明显穿模

------------------------------------------------------------------------

## 5.7 Evidence Export

输出：

    evidence/

    ├── preview.gif
    ├── animation.mp4
    ├── keyframes/
    ├── animation_metrics.json
    └── review.json

------------------------------------------------------------------------

# 6. Review Contract

标准输出 review.json。

包含：

-   当前角色
-   当前动画
-   问题列表
-   时间点
-   修改建议
-   人工审核结果

------------------------------------------------------------------------

# 7. AI Repair Workflow

    Review Contract

            ↓

    AI分析问题

            ↓

    定位参数

            ↓

    生成修改方案

            ↓

    Human Apply

            ↓

    重新验证

------------------------------------------------------------------------

# 8. 与 Character Contract 的关系

    Character Contract

            ↓

    Animation Contract

            ↓

    Edit Contract

            ↓

    Review Contract

            ↓

    Runtime Contract

------------------------------------------------------------------------

# 9. MVP 实现范围

## Phase 1

目标：

完成验证闭环。

实现：

-   Character Preview
-   Skeleton显示
-   Animation播放
-   Timeline
-   AI Checklist
-   Review JSON导出

## Phase 2

增加：

-   AI问题定位
-   Quick Edit
-   参数调整
-   自动重新验证

## Phase 3

增加：

-   AI自动修复
-   多角色支持
-   自动动画优化

------------------------------------------------------------------------

# 10. 非目标

当前阶段不做：

-   完整动画制作工具
-   替代 Spine
-   高级 Mesh Deformation
-   复杂 IK 系统

重点：

AI辅助生产闭环。

------------------------------------------------------------------------

# 11. 成功标准

Task15完成后：

    生成动画任务

    ↓

    分析动画

    ↓

    提出验证条件

    ↓

    定位问题

    ↓

    指导人调整

    ↓

    读取Review结果

    ↓

    完成验收

最终形成：

AI Native Animation Workflow。
