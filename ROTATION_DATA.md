# Rotation Data Reference

This document explains the rotation data calculated and sent by the MediaPipe OSC application.

---

## Overview

In addition to sending positional data for each landmark, the application now calculates and sends **rotation data** for major joints and body segments. This makes it much easier to drive skeletal animations in Unreal Engine, as you receive ready-to-use rotation values instead of having to calculate them yourself.

---

## Rotation Calculation Methods

### Method 1: Two-Point Rotation (Limbs)

For limbs (arms, legs), rotation is calculated from two connected points:

**Example: Upper Arm**
- Start Point: Shoulder landmark
- End Point: Elbow landmark
- Result: Direction vector converted to Euler angles (pitch, yaw, roll)

This gives you the orientation of the bone segment in 3D space.

### Method 2: Multi-Point Rotation (Head)

For the head, we use multiple facial landmarks for accurate rotation:

**Inputs:**
- Nose (forward direction)
- Left Eye & Right Eye (horizontal axis)
- Left Ear & Right Ear (optional, for better accuracy)

**Calculation:**
1. Eye center point is calculated
2. Forward vector = Nose - Eye Center
3. Horizontal axis from eye positions
4. Combined into pitch, yaw, roll values

---

## Available Rotations

### OSC Address Format
```
/pose/{joint_name}/rotation
```

Each rotation message contains 3 float values:
1. **Pitch** (float, degrees): Up/down rotation around X-axis
2. **Yaw** (float, degrees): Left/right rotation around Y-axis
3. **Roll** (float, degrees): Tilt rotation around Z-axis

---

## Joint Rotation Reference

### Head
**Address:** `/pose/head/rotation`  
**Calculated from:** Nose, Eyes, Ears (facial landmarks)  
**Use for:** Head bone, neck rotation  
**Notes:** Most accurate rotation as it uses multiple reference points

### Right Upper Arm
**Address:** `/pose/right_upper_arm/rotation`  
**Calculated from:** Right Shoulder (landmark 12) → Right Elbow (landmark 14)  
**Use for:** Upper arm bone (shoulder to elbow)  

### Right Lower Arm
**Address:** `/pose/right_lower_arm/rotation`  
**Calculated from:** Right Elbow (landmark 14) → Right Wrist (landmark 16)  
**Use for:** Forearm bone (elbow to wrist)  

### Left Upper Arm
**Address:** `/pose/left_upper_arm/rotation`  
**Calculated from:** Left Shoulder (landmark 11) → Left Elbow (landmark 13)  
**Use for:** Upper arm bone (shoulder to elbow)  

### Left Lower Arm
**Address:** `/pose/left_lower_arm/rotation`  
**Calculated from:** Left Elbow (landmark 13) → Left Wrist (landmark 15)  
**Use for:** Forearm bone (elbow to wrist)  

### Right Upper Leg
**Address:** `/pose/right_upper_leg/rotation`  
**Calculated from:** Right Hip (landmark 24) → Right Knee (landmark 26)  
**Use for:** Thigh bone (hip to knee)  

### Right Lower Leg
**Address:** `/pose/right_lower_leg/rotation`  
**Calculated from:** Right Knee (landmark 26) → Right Ankle (landmark 28)  
**Use for:** Calf bone (knee to ankle)  

### Left Upper Leg
**Address:** `/pose/left_upper_leg/rotation`  
**Calculated from:** Left Hip (landmark 23) → Left Knee (landmark 25)  
**Use for:** Thigh bone (hip to knee)  

### Left Lower Leg
**Address:** `/pose/left_lower_leg/rotation`  
**Calculated from:** Left Knee (landmark 25) → Left Ankle (landmark 27)  
**Use for:** Calf bone (knee to ankle)  

### Torso
**Address:** `/pose/torso/rotation`  
**Calculated from:** Center of Shoulders → Center of Hips  
**Use for:** Spine/torso orientation  
**Notes:** Represents overall body lean and twist

---

## Euler Angles Explanation

The rotation values are sent as **Euler angles** in degrees:

### Pitch (X-axis rotation)
- **Positive values**: Rotating upward
- **Negative values**: Rotating downward
- **Range**: -180° to +180°
- **Example**: Nodding your head up (positive) or down (negative)

### Yaw (Y-axis rotation)
- **Positive values**: Rotating right
- **Negative values**: Rotating left
- **Range**: -180° to +180°
- **Example**: Shaking your head "no" (left/right)

### Roll (Z-axis rotation)
- **Positive values**: Tilting clockwise
- **Negative values**: Tilting counter-clockwise
- **Range**: -180° to +180°
- **Example**: Tilting your head to the side

---

## Using Rotation Data in Unreal Engine

### Blueprint Setup

1. **Receive OSC Message:**
```
OSC Address: /pose/head/rotation
Bind to Event: OnHeadRotationReceived
```

2. **Extract Values:**
```
Event OnHeadRotationReceived
  Get Arg 0 (Pitch) → Store as Float
  Get Arg 1 (Yaw) → Store as Float
  Get Arg 2 (Roll) → Store as Float
```

3. **Make Rotator:**
```
Make Rotator
  Pitch: Pitch value
  Yaw: Yaw value
  Roll: Roll value
```

4. **Apply to Bone:**
```
Set Bone Rotation by Name
  Bone Name: "head"
  Rotation: Made Rotator
  Space: World or Component (depends on your setup)
```

### Example: Complete Head Control

```
Event BeginPlay:
  Create OSC Server (Port: 8000)
  Bind Address "/pose/head/rotation" to OnHeadRotationReceived

Event OnHeadRotationReceived:
  Extract pitch, yaw, roll from OSC message
  Make Rotator from values
  Apply to skeletal mesh head bone
  (Optional) Add smoothing/filtering
```

---

## Benefits of Rotation Data

### Before (Position Only):
❌ Receive X, Y, Z positions for each landmark  
❌ Calculate direction vectors in Unreal  
❌ Convert vectors to rotations  
❌ Handle coordinate system conversions  
❌ More complex blueprints  

### After (Position + Rotation):
✅ Receive ready-to-use rotation values  
✅ Directly apply to bone rotations  
✅ Euler angles in standard format  
✅ Less blueprint complexity  
✅ Easier to debug and tune  

---

## Coordinate System Notes

### MediaPipe Coordinates (Input):
- Normalized 0-1 range for positions
- Z-axis: depth (negative = closer to camera)

### Rotation Output:
- Standard Euler angles in degrees
- Rotation order: Pitch → Yaw → Roll (XYZ)
- Right-handed coordinate system
- Compatible with most 3D applications

### Unreal Engine:
- You may need to invert certain axes depending on your skeleton
- Test with different bone spaces (World vs Component vs Bone)
- Consider adding offset rotations if needed

---

## Advanced Usage

### Smoothing Rotations

Raw rotation data can be jittery. In Unreal Blueprint:

```
Current Rotation (variable)
Target Rotation (from OSC)
Smoothing Speed = 10.0

Event Tick:
  Smooth Rotation = RInterp To
    Current: Current Rotation
    Target: Target Rotation
    Delta Time: Get World Delta Seconds
    Interp Speed: Smoothing Speed
  
  Set Bone Rotation (Smooth Rotation)
  Update Current Rotation variable
```

### Filtering Small Changes

Ignore minor jitter by only applying significant rotation changes:

```
If (Rotation Delta > Threshold):
  Apply new rotation
Else:
  Keep current rotation
```

### Combining with Position Data

For best results, use both position and rotation:
- **Position data**: For root motion, IK targets, overall placement
- **Rotation data**: For bone orientations, joint rotations

---

## Troubleshooting

### Problem: Rotations look inverted
**Solution:** Negate specific axis values (pitch, yaw, or roll)

### Problem: Bone rotating wrong direction
**Solution:** Check bone orientation in skeleton, may need to add/subtract 90° offset

### Problem: Gimbal lock at extreme angles
**Solution:** Consider using quaternions instead of Euler angles (requires custom conversion)

### Problem: Jittery rotations
**Solution:** Add interpolation/smoothing in Unreal (see Advanced Usage)

### Problem: Rotation not matching expected movement
**Solution:** Verify coordinate system matches between MediaPipe and Unreal skeleton

---

## Landmark Index Reference

For reference when calculating custom rotations:

| Index | Landmark Name | Index | Landmark Name |
|-------|---------------|-------|---------------|
| 0 | nose | 17 | left_pinky |
| 1 | left_eye_inner | 18 | right_pinky |
| 2 | left_eye | 19 | left_index |
| 3 | left_eye_outer | 20 | right_index |
| 4 | right_eye_inner | 21 | left_thumb |
| 5 | right_eye | 22 | right_thumb |
| 6 | right_eye_outer | 23 | left_hip |
| 7 | left_ear | 24 | right_hip |
| 8 | right_ear | 25 | left_knee |
| 9 | mouth_left | 26 | right_knee |
| 10 | mouth_right | 27 | left_ankle |
| 11 | left_shoulder | 28 | right_ankle |
| 12 | right_shoulder | 29 | left_heel |
| 13 | left_elbow | 30 | right_heel |
| 14 | right_elbow | 31 | left_foot_index |
| 15 | left_wrist | 32 | right_foot_index |
| 16 | right_wrist |  |  |

---

## Future Enhancements

Potential additions for future versions:
- [ ] Hand rotations (from finger landmarks)
- [ ] Foot rotations (toe direction)
- [ ] Spine segments (upper, mid, lower back)
- [ ] Quaternion output option (to avoid gimbal lock)
- [ ] Configurable rotation calculation methods
- [ ] Rotation velocity/angular speed

---

**For more information, see:**
- `README.md` - Main documentation
- `UNREAL_SKELETON_RETARGETING.md` - Complete skeleton control guide
- `UNREAL_INTEGRATION.md` - Unreal Engine setup steps
