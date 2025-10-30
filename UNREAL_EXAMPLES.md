/**
 * Example OSC Message Handlers for Unreal Engine
 * 
 * These examples show how to handle OSC messages in Unreal Engine blueprints
 * Copy these patterns into your blueprint's Event Graph
 */

// EXAMPLE 1: Simple Position Tracking for One Landmark
// =======================================================
// This tracks the right hand and moves a sphere to match

Event BeginPlay
  ├─ Get OSC Server Component
  └─ Bind Event to OSC Address Pattern
     └─ Address Pattern: "/pose/right_wrist/position"

Custom Event "OnRightHandPosition" (OSC Address, OSC Message)
  ├─ Break OSC Message
  ├─ Get Float at Index [0] → X
  ├─ Get Float at Index [1] → Y
  ├─ Get Float at Index [2] → Z
  ├─ Call "ConvertMediaPipeToUnreal" (X, Y, Z)
  └─ Set Actor Location (Target Sphere)


// EXAMPLE 2: Convert MediaPipe Coordinates to Unreal
// ===================================================
// Function: ConvertMediaPipeToUnreal
// Inputs: X (float), Y (float), Z (float)
// Output: Vector

Function ConvertMediaPipeToUnreal(X, Y, Z)
  ├─ Set ScaleFactor = 1000.0
  ├─ UnrealX = (X - 0.5) * ScaleFactor
  ├─ UnrealY = Z * ScaleFactor * -100.0        // Depth
  ├─ UnrealZ = (1.0 - Y) * ScaleFactor         // Invert Y
  └─ Return Make Vector(UnrealX, UnrealY, UnrealZ)


// EXAMPLE 3: Track Multiple Landmarks
// ====================================
// This shows how to track both hands simultaneously

Event BeginPlay
  ├─ Bind "/pose/right_wrist/position" → OnRightHand
  └─ Bind "/pose/left_wrist/position" → OnLeftHand

Custom Event "OnRightHand" (Address, Message)
  ├─ Extract X, Y, Z
  ├─ Convert to Unreal Coords
  └─ Set RightHandSphere Location

Custom Event "OnLeftHand" (Address, Message)
  ├─ Extract X, Y, Z
  ├─ Convert to Unreal Coords
  └─ Set LeftHandSphere Location


// EXAMPLE 4: Parse All Landmarks Bundle
// ======================================
// Process the /pose/all message with all 33 landmarks

Custom Event "OnAllPoseLandmarks" (Address, Message)
  ├─ Break OSC Message
  ├─ Create/Clear Landmarks Array
  ├─ For Loop (Index = 0; Index < 99; Index += 3)
  │   ├─ X = Get Float at Index [Index]
  │   ├─ Y = Get Float at Index [Index + 1]
  │   ├─ Z = Get Float at Index [Index + 2]
  │   ├─ Position = Convert to Unreal (X, Y, Z)
  │   └─ Add Position to Landmarks Array
  └─ Process Landmarks Array
      ├─ Index 0 = Nose
      ├─ Index 11 = Left Shoulder
      ├─ Index 12 = Right Shoulder
      ├─ Index 15 = Left Wrist
      ├─ Index 16 = Right Wrist
      └─ etc.


// EXAMPLE 5: Smoothed Movement with Interpolation
// ================================================

Variables:
  - TargetPosition (Vector)
  - CurrentPosition (Vector)
  - SmoothSpeed (Float) = 10.0

Custom Event "OnHandPosition" (Address, Message)
  ├─ Extract and Convert Position
  └─ Set TargetPosition

Event Tick (Delta Time)
  ├─ CurrentPosition = VInterp To (CurrentPosition, TargetPosition, Delta, SmoothSpeed)
  └─ Set Actor Location (CurrentPosition)


// EXAMPLE 6: Check Visibility Before Using
// =========================================

Custom Event "OnLandmark" (Address, Message)
  └─ Branch (Execute in parallel):
      ├─ Listen for "/pose/right_wrist/position"
      │   └─ Store in RightHandPosition
      └─ Listen for "/pose/right_wrist/visibility"
          ├─ Get Float [0] → Visibility
          └─ Branch (Visibility > 0.5)
              ├─ True: Update RightHandSphere (visible & confident)
              └─ False: Hide RightHandSphere


// EXAMPLE 7: Drive Character IK Rig
// ==================================
// Assumes you have a character with IK setup

Event Tick
  ├─ If RightHandPosition is Valid
  │   └─ Set IK Target "RightHand" → RightHandPosition
  ├─ If LeftHandPosition is Valid
  │   └─ Set IK Target "LeftHand" → LeftHandPosition
  ├─ If HeadPosition is Valid
  │   └─ Set IK Target "Head" → HeadPosition
  └─ Update IK Rig


// EXAMPLE 8: Gesture Detection (Simple)
// ======================================
// Detect if hands are raised above shoulders

Variables:
  - RightHandZ, RightShoulderZ, LeftHandZ, LeftShoulderZ (Float)
  - HandsRaised (Boolean)

Event Tick
  ├─ If (RightHandZ > RightShoulderZ) AND (LeftHandZ > LeftShoulderZ)
  │   └─ Set HandsRaised = True
  │       └─ Print "Hands Raised!"
  └─ Else
      └─ Set HandsRaised = False


// LANDMARK INDEX REFERENCE FOR /pose/all
// =======================================
/*
  Index 0-2:   Nose (X, Y, Z)
  Index 3-5:   Left Eye Inner
  Index 6-8:   Left Eye
  Index 9-11:  Left Eye Outer
  Index 12-14: Right Eye Inner
  Index 15-17: Right Eye
  Index 18-20: Right Eye Outer
  Index 21-23: Left Ear
  Index 24-26: Right Ear
  Index 27-29: Mouth Left
  Index 30-32: Mouth Right
  Index 33-35: Left Shoulder    ← Important
  Index 36-38: Right Shoulder   ← Important
  Index 39-41: Left Elbow
  Index 42-44: Right Elbow
  Index 45-47: Left Wrist       ← Important (Left Hand)
  Index 48-50: Right Wrist      ← Important (Right Hand)
  Index 51-53: Left Pinky
  Index 54-56: Right Pinky
  Index 57-59: Left Index
  Index 60-62: Right Index
  Index 63-65: Left Thumb
  Index 66-68: Right Thumb
  Index 69-71: Left Hip
  Index 72-74: Right Hip
  Index 75-77: Left Knee
  Index 78-80: Right Knee
  Index 81-83: Left Ankle       ← Important (Left Foot)
  Index 84-86: Right Ankle      ← Important (Right Foot)
  Index 87-89: Left Heel
  Index 90-92: Right Heel
  Index 93-95: Left Foot Index
  Index 96-98: Right Foot Index
*/

// OSC DATA TYPES
// ==============
// All position values are sent as 'f' (float32)
// Range: 0.0 to 1.0 (normalized)
// X: 0.0 = left edge, 1.0 = right edge
// Y: 0.0 = top edge, 1.0 = bottom edge
// Z: negative values = closer to camera, positive = further
