# Unreal Engine OSC Integration Guide

## Quick Setup for Unreal Engine 5

### Step 1: Enable OSC Plugin

1. Open your Unreal Engine project
2. Go to **Edit → Plugins**
3. Search for "OSC" (Open Sound Control)
4. Check the box to enable it
5. Restart Unreal Engine

### Step 2: Create OSC Receiver Blueprint

1. In the Content Browser, right-click → **Blueprint Class → Actor**
2. Name it `BP_BodyTracker`
3. Open the blueprint

### Step 3: Add OSC Server Component

1. In the Components panel, click **Add Component**
2. Search for and add **OSC Server**
3. In the Details panel, set:
   - **Receive Port**: `8000`
   - **Multicast Loopback**: `True` (if running locally)

### Step 4: Blueprint Setup for Receiving Data

Add this to the Event Graph:

#### Option A: Receive Specific Landmark (e.g., Right Hand)

```
Event BeginPlay
  → OSC Server → Listen for OSC Message
    → Address Pattern: "/pose/right_wrist/position"
    → On Message Received:
      → Break OSC Message
      → Get Float at Index 0 (X)
      → Get Float at Index 1 (Y)
      → Get Float at Index 2 (Z)
      → Make Vector (X, Y, Z)
      → [Process/Use the position]
```

#### Option B: Receive All Landmarks at Once

```
Event BeginPlay
  → OSC Server → Listen for OSC Message
    → Address Pattern: "/pose/all"
    → On Message Received:
      → Break OSC Message
      → For Loop (0 to 98, step 3):
        → Get Float at Index (i)     = X
        → Get Float at Index (i+1)   = Y
        → Get Float at Index (i+2)   = Z
        → Store in Array or Map
```

### Step 5: Coordinate Conversion

MediaPipe coordinates need conversion for Unreal:

**Create a function "Convert MediaPipe to Unreal":**

Inputs:
- X (float)
- Y (float)  
- Z (float)

Outputs:
- Vector (Unreal World Position)

```
Function Body:
  UnrealX = (X - 0.5) * ScaleFactorX    // e.g., 1000
  UnrealY = (Z) * ScaleFactorZ          // e.g., 1000 (depth)
  UnrealZ = (1.0 - Y) * ScaleFactorZ    // Invert Y, e.g., 1000
  
  Return MakeVector(UnrealX, UnrealY, UnrealZ)
```

### Example: Control a Sphere with Right Hand

1. Add a **Sphere** component to your actor
2. In Event Graph:

```
Event Tick
  → If OSC Message Received for "/pose/right_wrist/position"
    → Get X, Y, Z from message
    → Convert to Unreal Coords (using function above)
    → Set Actor Location (Sphere)
```

### Example: Drive a Skeletal Mesh IK

For more advanced usage with IK:

1. Add a **Skeletal Mesh** component
2. Use **Control Rig** or **IK Rig**
3. Map landmark positions to IK targets:
   - Right Hand → `/pose/right_wrist/position`
   - Left Hand → `/pose/left_wrist/position`
   - Head → `/pose/nose/position`
   - Feet → `/pose/left_ankle/position`, `/pose/right_ankle/position`

### OSC Address Reference

Common landmarks for body tracking:

| Body Part | OSC Address |
|-----------|-------------|
| Nose/Head | `/pose/nose/position` |
| Left Hand | `/pose/left_wrist/position` |
| Right Hand | `/pose/right_wrist/position` |
| Left Elbow | `/pose/left_elbow/position` |
| Right Elbow | `/pose/right_elbow/position` |
| Left Shoulder | `/pose/left_shoulder/position` |
| Right Shoulder | `/pose/right_shoulder/position` |
| Left Hip | `/pose/left_hip/position` |
| Right Hip | `/pose/right_hip/position` |
| Left Knee | `/pose/left_knee/position` |
| Right Knee | `/pose/right_knee/position` |
| Left Foot | `/pose/left_ankle/position` |
| Right Foot | `/pose/right_ankle/position` |

### Testing the Connection

1. **Start the Electron app** (npm start)
2. **Configure OSC** to point to Unreal's IP (usually `127.0.0.1` for local)
3. **Click "Start Tracking"** in the app
4. **In Unreal**, add a **Print String** node after receiving OSC to verify data
5. **Play in Unreal** - you should see position values printing

### Troubleshooting

**No data received:**
- Check Windows Firewall / macOS Firewall settings
- Ensure port 8000 is not blocked
- Verify OSC Server component is active (Listen for OSC Message must be called)
- Check IP address is correct

**Jittery movement:**
- Enable smoothing in MediaPipe (already on by default)
- Add interpolation in Unreal (Use VInterp To)
- Lower the update rate if needed

**Wrong coordinate space:**
- Adjust scale factors in conversion function
- Try different axis mappings (X→Y, Y→Z, etc.)
- Add offset to center the tracking space

### Advanced: Recording and Playback

You can record OSC data for playback:

1. Use **Sequencer** in Unreal
2. Record the actor transforms driven by OSC
3. Play back later or export as animation

### Performance Tips

- Only listen for landmarks you need (not all 33)
- Use `/pose/all` and parse only required indices for better performance
- Consider reducing MediaPipe frame rate if not needed at 30+ FPS

## Network Setup for Remote Machines

If Unreal Engine is on a different computer:

1. **Find Unreal machine's IP:**
   - Windows: `ipconfig` in cmd
   - Mac/Linux: `ifconfig` in terminal

2. **In the Electron app:**
   - Set **Remote IP** to the Unreal machine's IP
   - Keep port as `8000`

3. **Firewall:**
   - Allow incoming UDP on port 8000 on Unreal machine

4. **Ensure both machines are on same network**

---

Happy tracking! 🎮🦴
