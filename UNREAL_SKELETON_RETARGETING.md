# Skeleton Retargeting: OSC Data to Unreal Skeleton

This guide shows you how to map incoming MediaPipe OSC joint positions to control an Unreal Engine skeleton/character.

---

## Overview

The MediaPipe tracking sends 33 body landmark positions via OSC. To control a skeleton in Unreal, you need to:

1. **Receive OSC position data** (already done)
2. **Store joint positions** in a data structure
3. **Calculate bone rotations** from position data
4. **Apply rotations** to your skeleton's bones

---

## Method 1: Direct Bone Control (Recommended for Beginners)

### Step 1: Create a Skeletal Mesh Actor

1. In Content Browser → Right-click → Blueprint Class → Character
2. Name it `BP_OSC_Character`
3. Add a Skeletal Mesh Component (e.g., Mannequin, MetaHuman, etc.)

### Step 2: Store Joint Positions as Variables

In your `BP_OSC_Character` blueprint, create these variables:

**Variable Name** | **Type** | **Description**
--- | --- | ---
`NosePosition` | Vector | Head/nose position
`LeftShoulderPosition` | Vector | Left shoulder
`RightShoulderPosition` | Vector | Right shoulder
`LeftElbowPosition` | Vector | Left elbow
`RightElbowPosition` | Vector | Right elbow
`LeftWristPosition` | Vector | Left wrist
`RightWristPosition` | Vector | Right wrist
`LeftHipPosition` | Vector | Left hip
`RightHipPosition` | Vector | Right hip
`LeftKneePosition` | Vector | Left knee
`RightKneePosition` | Vector | Right knee
`LeftAnklePosition` | Vector | Left ankle
`RightAnklePosition` | Vector | Right ankle

### Step 3: Create OSC Receiver Custom Events

For each joint you want to track, create a custom event:

**Example for Right Wrist:**

```
Event: OnRightWristReceived
Inputs:
  - X (Float)
  - Y (Float)
  - Z (Float)

Logic:
  1. Make Vector from X, Y, Z
  2. Set RightWristPosition variable
```

### Step 4: Bind OSC Addresses to Events

In **Event BeginPlay**:

1. Create OSC Server (port 8000)
2. Bind OSC Address `/pose/right_wrist/position` → Call `OnRightWristReceived`
3. Repeat for all joints you need

### Step 5: Calculate Bone Rotations

MediaPipe gives you **positions**, but skeletons need **rotations**. You need to calculate the rotation between two joints:

**Blueprint Function: CalculateBoneRotation**

```
Inputs:
  - StartJoint (Vector) - e.g., Shoulder
  - EndJoint (Vector) - e.g., Elbow
  
Output:
  - Rotation (Rotator)

Logic:
  1. Get direction vector: EndJoint - StartJoint
  2. Normalize the vector
  3. Convert to Rotator using "Make Rot from X"
  4. Return the rotator
```

### Step 6: Apply Rotations to Skeleton

In **Event Tick**:

```
1. Calculate Right Arm Rotation:
   - BoneRot = CalculateBoneRotation(RightShoulder, RightElbow)
   
2. Set Bone Rotation by Name:
   - Target: Skeletal Mesh Component
   - Bone Name: "upperarm_r" (or your skeleton's bone name)
   - Rotation: BoneRot
   - Space: World Space
```

---

## Method 2: Using Animation Blueprint (More Advanced)

### Step 1: Create Animation Blueprint

1. Content Browser → Right-click → Animation → Animation Blueprint
2. Select your skeleton (e.g., UE5_Mannequin_Skeleton)
3. Name it `ABP_OSC_Character`

### Step 2: Add Control Rig

1. Open Animation Blueprint
2. AnimGraph → Right-click → Add Node → "Control Rig"
3. Create a Control Rig asset for your skeleton

### Step 3: Create Bone Transform Variables

In Animation Blueprint, create variables:

```
RightShoulderRotation (Rotator)
RightElbowRotation (Rotator)
LeftShoulderRotation (Rotator)
... etc for all major joints
```

### Step 4: Set Bone Transforms in AnimGraph

1. Add "Transform (Modify) Bone" nodes for each bone
2. Connect your rotation variables to the transform inputs
3. Set the bone names to match your skeleton

### Step 5: Update from OSC in Character Blueprint

In your Character Blueprint's Event Tick:

```
1. Get Animation Instance
2. Cast to ABP_OSC_Character
3. Set rotation variables from calculated values
```

---

## Method 3: Full Body IK (Most Advanced)

For the most realistic retargeting, use Unreal's Full Body IK system:

### Step 1: Setup IK Rig

1. Create IK Rig asset for your skeleton
2. Define IK chains:
   - Spine chain: Pelvis → Spine → Chest → Neck → Head
   - Left Arm chain: LeftShoulder → LeftElbow → LeftWrist
   - Right Arm chain: RightShoulder → RightElbow → RightWrist
   - Left Leg chain: LeftHip → LeftKnee → LeftAnkle
   - Right Leg chain: RightHip → RightKnee → RightAnkle

### Step 2: Create IK Goals

For each end effector (hands, feet, head):
- Create IK Goal
- Name it (e.g., "LeftHandGoal", "RightFootGoal")

### Step 3: Animation Blueprint Setup

In AnimGraph:
1. Add "Full Body IK" node
2. Connect IK Rig asset
3. For each IK Goal, connect your OSC position data

### Step 4: Drive IK Goals from OSC

In Event Tick:
```
1. Get LeftWristPosition from OSC
2. Set IK Goal "LeftHandGoal" location to LeftWristPosition
3. Repeat for all end effectors
```

---

## Coordinate System Conversion

MediaPipe coordinates are normalized (0-1 range). You need to scale them for Unreal:

```
Blueprint Function: ConvertMediaPipeToUnreal

Inputs:
  - MediaPipePos (Vector) - Raw OSC position (0-1 range)
  
Output:
  - UnrealPos (Vector)

Logic:
  1. Scale X: (MediaPipePos.X - 0.5) * ScaleFactor (e.g., 200)
  2. Scale Y: (MediaPipePos.Y - 0.5) * ScaleFactor
  3. Scale Z: MediaPipePos.Z * DepthScale (e.g., 100)
  4. Return (ScaledX, ScaledY, ScaledZ)
```

Adjust `ScaleFactor` based on your scene scale.

---

## Bone Name Reference

Common bone names for UE5 Mannequin:

**MediaPipe Landmark** | **UE5 Mannequin Bone Name**
--- | ---
nose | head
left_shoulder | clavicle_l
right_shoulder | clavicle_r
left_elbow | lowerarm_l
right_elbow | lowerarm_r
left_wrist | hand_l
right_wrist | hand_r
left_hip | thigh_l
right_hip | thigh_r
left_knee | calf_l
right_knee | calf_r
left_ankle | foot_l
right_ankle | foot_r

**Note:** Bone names vary by skeleton. Check your skeleton asset to find exact names.

---

## Example Blueprint: Single Arm Control

Here's a complete example for controlling just the right arm:

### Variables:
```
RightShoulderPos (Vector)
RightElbowPos (Vector)
RightWristPos (Vector)
SkeletalMeshComp (Skeletal Mesh Component)
ScaleFactor (Float) = 200.0
```

### Event BeginPlay:
```
1. Create OSC Server (Port: 8000)
2. Store OSC Server as variable
3. Bind Address "/pose/right_shoulder/position" to OnRightShoulderReceived
4. Bind Address "/pose/right_elbow/position" to OnRightElbowReceived
5. Bind Address "/pose/right_wrist/position" to OnRightWristReceived
```

### Custom Event: OnRightShoulderReceived
```
Inputs: X (Float), Y (Float), Z (Float)
1. Make Vector from X, Y, Z
2. Convert to Unreal space (multiply by ScaleFactor, center on origin)
3. Set RightShoulderPos variable
```

### Event Tick:
```
1. Calculate Upper Arm Rotation:
   - Direction = RightElbowPos - RightShoulderPos
   - Rotation = Make Rotation from X (Direction)
   
2. Set Bone Transform by Name:
   - Skeletal Mesh: SkeletalMeshComp
   - Bone Name: "upperarm_r"
   - Rotation: Calculated Rotation
   - Space: World Space

3. Calculate Lower Arm Rotation:
   - Direction = RightWristPos - RightElbowPos
   - Rotation = Make Rotation from X (Direction)
   
4. Set Bone Transform by Name:
   - Skeletal Mesh: SkeletalMeshComp
   - Bone Name: "lowerarm_r"
   - Rotation: Calculated Rotation
   - Space: World Space
```

---

## Smoothing Joint Data

Raw OSC data can be jittery. Add smoothing:

### Blueprint Function: SmoothPosition

```
Inputs:
  - CurrentPos (Vector)
  - TargetPos (Vector)
  - SmoothSpeed (Float) = 10.0
  - DeltaTime (Float)

Output:
  - SmoothedPos (Vector)

Logic:
  1. Use VInterp To (Vector Interpolation)
  2. Current: CurrentPos
  3. Target: TargetPos
  4. Delta Time: DeltaTime
  5. Interp Speed: SmoothSpeed
  6. Return interpolated vector
```

Apply this in Event Tick before calculating rotations.

---

## Recommended Workflow

1. **Start Simple:** Get one limb working (e.g., right arm)
2. **Test Coordinates:** Print received positions to verify data flow
3. **Scale Appropriately:** Adjust ScaleFactor until motion looks natural
4. **Add Smoothing:** Reduce jitter with interpolation
5. **Expand to Full Body:** Repeat for all limbs
6. **Use IK (Optional):** For more realistic motion with constraints

---

## Debugging Tips

### Problem: Character not moving
- Check OSC port (8000) matches Electron app
- Verify OSC messages are being received (use Print String)
- Check bone names match your skeleton

### Problem: Weird rotations
- Ensure coordinate conversion is correct
- Check bone hierarchy in skeleton asset
- Try different rotation space (Component vs World)

### Problem: Jittery motion
- Add smoothing/interpolation
- Increase MediaPipe smoothing in Electron app
- Lower OSC message rate

### Problem: Inverted/mirrored motion
- Flip X or Y coordinates in conversion
- Check camera facing direction
- Adjust coordinate system mapping

---

## Next Steps

1. Implement basic arm control first
2. Test and tune coordinate scaling
3. Expand to full body
4. Add smoothing for natural motion
5. Consider using IK for hands/feet accuracy

---

## Additional Resources

- **Unreal Docs:** Control Rig and Full Body IK
- **MediaPipe Landmarks:** See README.md for all 33 landmark positions
- **Bone Names:** Check your skeleton asset in Content Browser

---

**For questions or improvements, open an issue on GitHub!**
