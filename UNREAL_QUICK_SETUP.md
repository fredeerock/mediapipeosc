# Quick Setup: Control Skeleton in Unreal Engine

This is a step-by-step walkthrough to get your skeleton controlled by OSC rotation data in under 15 minutes.

---

## Prerequisites

✅ OSC data streaming (rotation + position data)  
✅ Unreal Engine 5.x or 4.27+ installed  
✅ OSC Plugin enabled in Unreal  

---

## Step 1: Enable OSC Plugin (2 minutes)

1. Open your Unreal Engine project
2. Go to **Edit → Plugins**
3. Search for "**OSC**"
4. Check the box to enable the **OSC** plugin
5. Click **Restart Now**

---

## Step 2: Create Blueprint Actor (3 minutes)

### 2.1 Create the Blueprint

1. In **Content Browser**, right-click
2. Select **Blueprint Class → Actor**
3. Name it `BP_OSC_BodyTracker`
4. Double-click to open it

### 2.2 Add Skeletal Mesh

1. In the **Components** panel (left side), click **Add Component**
2. Search for and add **Skeletal Mesh**
3. In the **Details** panel (right side):
   - Set **Skeletal Mesh** to your character skeleton (e.g., `SK_Mannequin`, MetaHuman, etc.)
   - Set **Animation Mode** to "Use Animation Blueprint" or leave as default

---

## Step 3: Create Variables (2 minutes)

In the Blueprint's **Event Graph** or **My Blueprint** panel, create these variables:

| Variable Name | Type | Default Value |
|---------------|------|---------------|
| `HeadRotation` | Rotator | (0, 0, 0) |
| `RightUpperArmRotation` | Rotator | (0, 0, 0) |
| `LeftUpperArmRotation` | Rotator | (0, 0, 0) |
| `SkeletalMeshComponent` | Skeletal Mesh Component | (set in BeginPlay) |

💡 **Tip:** You can add more variables for legs, lower arms, etc. later. Start with just the head and upper arms.

---

## Step 4: Setup OSC Server (5 minutes)

### 4.1 Event BeginPlay Setup

In the **Event Graph**, find the **Event BeginPlay** node and do the following:

```
Event BeginPlay
  ↓
[1] Get Component by Class (Skeletal Mesh Component)
  → Set variable: SkeletalMeshComponent
  ↓
[2] Create OSC Server
  → Receive IP Address: 0.0.0.0
  → Port: 8000
  → Multicast Loopback: true
  → Start Listening: true
  ↓
[3] Store as variable: OSCServer
  ↓
[4] Bind Event to Address
  → OSC Server: OSCServer variable
  → Address Pattern: /pose/head/rotation
  → Event to Call: OnHeadRotationReceived (create custom event)
  ↓
[5] Bind Event to Address
  → OSC Server: OSCServer variable
  → Address Pattern: /pose/right_upper_arm/rotation
  → Event to Call: OnRightArmRotationReceived
  ↓
[6] Bind Event to Address
  → OSC Server: OSCServer variable
  → Address Pattern: /pose/left_upper_arm/rotation
  → Event to Call: OnLeftArmRotationReceived
```

**Blueprint Nodes You Need:**

1. **Event BeginPlay** (already exists)
2. **Create OSC Server** (search: "Create OSC Server")
3. **Bind OSC Address to Event** (search: "Bind" - do this 3 times, one for each rotation)

---

## Step 5: Create Custom Events to Receive Rotation (3 minutes)

### 5.1 Create Event: OnHeadRotationReceived

1. Right-click in Event Graph → **Add Custom Event**
2. Name it: `OnHeadRotationReceived`
3. Add inputs (click the + button on the event):
   - **OSCAddress** (OSC Address type)
   - **Message** (OSC Message type)

### 5.2 Extract Rotation Values

Connect the following nodes to `OnHeadRotationReceived`:

```
OnHeadRotationReceived
  → Message pin
  ↓
Get Float (Index 0) → Pitch
Get Float (Index 1) → Yaw
Get Float (Index 2) → Roll
  ↓
Make Rotator
  → Pitch: from index 0
  → Yaw: from index 1
  → Roll: from index 2
  ↓
Set HeadRotation variable
```

**Blueprint Nodes:**

1. **Get Float** - Drag from Message pin, search "Get Float", set Index to 0, 1, 2 (make 3 of these)
2. **Make Rotator** - Combine the 3 floats into a Rotator
3. **Set** - Set your HeadRotation variable

### 5.3 Repeat for Arms

Create two more custom events:
- `OnRightArmRotationReceived` → sets `RightUpperArmRotation`
- `OnLeftArmRotationReceived` → sets `LeftUpperArmRotation`

(Same logic as head: Get Float x3 → Make Rotator → Set variable)

---

## Step 6: Apply Rotations to Skeleton (3 minutes)

### 6.1 Use Event Tick

In **Event Tick**, apply the stored rotations to the skeleton bones:

```
Event Tick
  ↓
[1] Set Bone Rotation by Name
  → Target: SkeletalMeshComponent
  → Bone Name: "head"
  → Rotation: HeadRotation variable
  → Bone Space: World Space
  ↓
[2] Set Bone Rotation by Name
  → Target: SkeletalMeshComponent
  → Bone Name: "upperarm_r"
  → Rotation: RightUpperArmRotation variable
  → Bone Space: World Space
  ↓
[3] Set Bone Rotation by Name
  → Target: SkeletalMeshComponent
  → Bone Name: "upperarm_l"
  → Rotation: LeftUpperArmRotation variable
  → Bone Space: World Space
```

**Blueprint Node:**

- **Set Bone Rotation by Name** (search this, make 3 copies)

⚠️ **Important:** Bone names depend on your skeleton! Common names:
- UE5 Mannequin: `head`, `upperarm_r`, `upperarm_l`
- UE4 Mannequin: `head`, `upperarm_r`, `upperarm_l`
- MetaHuman: May differ, check your skeleton asset

**To Find Bone Names:**
1. Open your Skeletal Mesh asset
2. Go to the **Skeleton Tree** tab
3. Look at the bone names listed there

---

## Step 7: Test It! (2 minutes)

### 7.1 Place Actor in Level

1. **Compile** and **Save** your blueprint
2. Drag `BP_OSC_BodyTracker` into your level
3. Position it where you can see it

### 7.2 Start Tracking

1. In Unreal, click **Play** (Alt+P)
2. In your Electron app, click **Start Tracking**
3. Move in front of the camera

**You should see:**
- Head rotating as you move your head
- Arms rotating as you move your arms

---

## Troubleshooting

### Problem: Nothing moves

**Check:**
- [ ] OSC Server created successfully? (Check Output Log for errors)
- [ ] Port 8000 not blocked by firewall?
- [ ] Electron app says "Tracking active - Sending OSC data"?
- [ ] Blueprint compiled without errors?

**Debug:**
- Add **Print String** nodes after receiving OSC to verify data is arriving
- Check the **Output Log** in Unreal (Window → Developer Tools → Output Log)

### Problem: Bones rotating incorrectly

**Solutions:**
- Try different **Bone Space**: Component Space instead of World Space
- Invert axes: Multiply pitch/yaw/roll by -1
- Add rotation offset: Add 90° to specific axis if needed
- Check bone names match your skeleton

### Problem: Jittery movement

**Solutions:**
- Add **RInterp To** (Rotator Interpolate) between stored rotation and applied rotation
- Increase interpolation speed (try 5.0 to 10.0)
- Enable smoothing in Electron app (already enabled by default)

---

## Next Steps: Expand to Full Body

Once head and arms work, add more joints:

### 7 more OSC addresses to bind:
```
/pose/right_lower_arm/rotation  → forearm
/pose/left_lower_arm/rotation   → forearm
/pose/right_upper_leg/rotation  → thigh
/pose/left_upper_leg/rotation   → thigh
/pose/right_lower_leg/rotation  → calf
/pose/left_lower_leg/rotation   → calf
/pose/torso/rotation            → spine
```

### Bone names you'll need:
```
lowerarm_r, lowerarm_l       (forearms)
thigh_r, thigh_l             (thighs)
calf_r, calf_l               (calves)
spine_01, spine_02           (torso)
```

---

## Visual Blueprint Reference

### Complete Flow Diagram:

```
[Event BeginPlay]
    ↓
Create OSC Server (port 8000)
    ↓
Bind Address "/pose/head/rotation" → OnHeadRotationReceived
Bind Address "/pose/right_upper_arm/rotation" → OnRightArmReceived
Bind Address "/pose/left_upper_arm/rotation" → OnLeftArmReceived

[Custom Event: OnHeadRotationReceived]
    Message → Get Float (0) → Pitch
    Message → Get Float (1) → Yaw
    Message → Get Float (2) → Roll
    ↓
    Make Rotator (Pitch, Yaw, Roll)
    ↓
    Set HeadRotation variable

[Event Tick]
    Get SkeletalMeshComponent
    ↓
    Set Bone Rotation by Name
      Bone: "head"
      Rotation: HeadRotation
    ↓
    Set Bone Rotation by Name
      Bone: "upperarm_r"
      Rotation: RightUpperArmRotation
    ↓
    Set Bone Rotation by Name
      Bone: "upperarm_l"
      Rotation: LeftUpperArmRotation
```

---

## Example Screenshot Locations

When you're in the Blueprint Editor:

**1. Create OSC Server node:**
- Right-click → search "Create OSC Server"
- Located in: OSC category

**2. Bind Event to Address:**
- Right-click → search "Bind"
- Located in: OSC category

**3. Get Float from OSC Message:**
- Drag from "Message" pin → search "Get Float"
- Set the Index parameter (0, 1, or 2)

**4. Set Bone Rotation by Name:**
- Drag from SkeletalMeshComponent → search "Set Bone Rotation"
- Fill in bone name as string

---

## Advanced: Add Smoothing

To reduce jitter, add interpolation in Event Tick:

```
Event Tick
  ↓
RInterp To
  → Current: CurrentHeadRotation (variable)
  → Target: HeadRotation (from OSC)
  → Delta Time: Get World Delta Seconds
  → Interp Speed: 10.0
  ↓
Set CurrentHeadRotation (smoothed)
  ↓
Use CurrentHeadRotation in Set Bone Rotation
```

This smooths the rotation changes over time.

---

## Summary Checklist

- [x] OSC Plugin enabled
- [x] Blueprint Actor created with Skeletal Mesh
- [x] Variables created (HeadRotation, etc.)
- [x] Event BeginPlay creates OSC Server (port 8000)
- [x] Events bound to OSC addresses
- [x] Custom events extract rotation from OSC
- [x] Event Tick applies rotations to bones
- [x] Actor placed in level and tested
- [x] Tracking data flowing from Electron app

---

## What You've Built

🎉 **Congratulations!** You now have:
- Real-time body tracking from webcam
- OSC data transmission with rotation values
- Live skeleton control in Unreal Engine
- Foundation to expand to full body tracking

---

## Additional Resources

- **ROTATION_DATA.md** - Full rotation data reference
- **UNREAL_SKELETON_RETARGETING.md** - Advanced skeleton control techniques
- **UNREAL_INTEGRATION.md** - Detailed Unreal setup guide
- **README.md** - Complete project documentation

---

**Need Help?**
- Check the Output Log in Unreal for OSC receive messages
- Add Print String nodes to debug data flow
- Verify bone names in your Skeleton asset
- Test with test-osc-receiver.js to confirm data is sending

**Your tracking data looks perfect!** Head, arms, and legs are all streaming correctly. Time to see it in action! 🎮
