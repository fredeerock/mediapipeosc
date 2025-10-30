# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   ELECTRON APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐         ┌──────────────┐      ┌─────────────┐ │
│  │  Webcam    │────────▶│  MediaPipe   │─────▶│  Renderer   │ │
│  │  (Video)   │         │  Pose ML     │      │  Process    │ │
│  └────────────┘         └──────────────┘      └──────┬──────┘ │
│                                                       │         │
│                                                       │         │
│                                                       │         │
│                         ┌─────────────────────────────┘         │
│                         │                                       │
│                         ▼                                       │
│                  ┌─────────────┐                               │
│                  │   Preload   │                               │
│                  │ (IPC Bridge)│                               │
│                  └──────┬──────┘                               │
│                         │                                       │
│                         │                                       │
│                         ▼                                       │
│                  ┌─────────────┐                               │
│                  │    Main     │                               │
│                  │   Process   │                               │
│                  └──────┬──────┘                               │
│                         │                                       │
│                         ▼                                       │
│                  ┌─────────────┐                               │
│                  │ OSC Library │                               │
│                  │  (UDP Out)  │                               │
│                  └──────┬──────┘                               │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ UDP Port 8000
                          │ OSC Protocol
                          │
                          ▼
         ┌────────────────────────────────────┐
         │      UNREAL ENGINE                 │
         ├────────────────────────────────────┤
         │                                    │
         │  ┌──────────────┐                 │
         │  │  OSC Server  │                 │
         │  │  Component   │                 │
         │  └──────┬───────┘                 │
         │         │                          │
         │         ▼                          │
         │  ┌──────────────┐                 │
         │  │  Blueprint   │                 │
         │  │   Handlers   │                 │
         │  └──────┬───────┘                 │
         │         │                          │
         │         ▼                          │
         │  ┌──────────────┐                 │
         │  │ IK Rig /     │                 │
         │  │ Animations / │                 │
         │  │ Game Logic   │                 │
         │  └──────────────┘                 │
         │                                    │
         └────────────────────────────────────┘
```

## Data Flow

```
1. VIDEO CAPTURE
   Webcam → Video Element (HTML5)
   ↓

2. POSE DETECTION
   Video Frame → MediaPipe Pose Model
   ↓
   33 Body Landmarks (x, y, z, visibility)
   ↓

3. VISUALIZATION
   Landmarks → Canvas Drawing
   (Skeleton overlay on video)
   ↓

4. OSC PACKAGING
   For each landmark:
     /pose/{name}/position → [x, y, z]
     /pose/{name}/visibility → [confidence]
   
   Bundle:
     /pose/all → [x1,y1,z1, x2,y2,z2, ..., x33,y33,z33]
   ↓

5. IPC COMMUNICATION
   Renderer → Preload → Main Process
   ↓

6. NETWORK TRANSMISSION
   OSC Message → UDP Packet → Port 8000
   ↓

7. UNREAL RECEPTION
   OSC Server → Blueprint Event
   ↓

8. UNREAL PROCESSING
   Parse OSC → Convert Coordinates → Apply to Scene
```

## File Structure

```
mediapipeosc/
│
├── main.js                   # Electron main process
│   ├── Window management
│   ├── OSC setup (UDP port)
│   └── IPC handlers
│
├── preload.js                # Security bridge
│   └── Expose safe APIs to renderer
│
├── renderer.js               # Client-side logic
│   ├── MediaPipe initialization
│   ├── Camera/video handling
│   ├── Pose detection loop
│   ├── Canvas drawing
│   └── OSC message formatting
│
├── index.html                # UI
│   ├── Video/Canvas elements
│   ├── Control panel
│   └── Statistics display
│
├── package.json              # Dependencies
│   ├── electron
│   ├── @mediapipe/pose
│   ├── @mediapipe/camera_utils
│   ├── @mediapipe/drawing_utils
│   └── osc
│
├── README.md                 # Main documentation
├── UNREAL_INTEGRATION.md     # UE setup guide
└── UNREAL_EXAMPLES.md        # Blueprint examples
```

## OSC Message Formats

### Individual Landmark
```
Address: /pose/right_wrist/position
Type:    f f f (3 floats)
Data:    [0.523, 0.612, -0.045]
         │      │      │
         │      │      └─ Z (depth)
         │      └─ Y (vertical, 0=top, 1=bottom)
         └─ X (horizontal, 0=left, 1=right)
```

### Visibility
```
Address: /pose/right_wrist/visibility
Type:    f (1 float)
Data:    [0.98]
         │
         └─ Confidence (0.0 to 1.0)
```

### All Landmarks Bundle
```
Address: /pose/all
Type:    f f f ... (99 floats)
Data:    [x1, y1, z1, x2, y2, z2, ..., x33, y33, z33]
         └─────┬─────┘  └─────┬─────┘       └──────┬──────┘
            Landmark 0      Landmark 1           Landmark 32
            (Nose)          (L Eye Inner)        (R Foot Index)
```

## Coordinate Systems

### MediaPipe (Output)
```
      0.0 ────────────── 1.0 (X)
       │
       │    • Normalized coordinates
       │    • Origin: top-left
       │    • Range: 0.0 to 1.0
       │    
      1.0 (Y)

      Z: negative = closer to camera
```

### Unreal Engine (Input)
```
         Z (Up)
         │
         │
         │
         └────── Y (Forward)
        ╱
       ╱
      X (Right)

      • World space coordinates
      • Origin: configurable
      • Range: depends on scale factor
      • Units: centimeters (default)
```

### Conversion Example
```javascript
// MediaPipe → Unreal
UnrealX = (MediaPipeX - 0.5) * 1000;  // Center and scale
UnrealY = MediaPipeZ * -100;           // Depth to forward
UnrealZ = (1.0 - MediaPipeY) * 1000;  // Invert Y, map to up
```

## Network Configuration

### Local Setup (Default)
```
Electron App    Unreal Engine
    │                │
    │   127.0.0.1   │
    │   Port 8000   │
    └────────────────┘
    (Same machine)
```

### Remote Setup
```
Electron App          Unreal Engine
(192.168.1.10)       (192.168.1.20)
     │                     │
     │   UDP over LAN      │
     │   Port 8000         │
     └─────────────────────┘
```

## Performance Metrics

- **FPS**: 30-60 (depends on camera and MediaPipe model)
- **Latency**: ~50-100ms (webcam → Unreal)
- **OSC Messages/sec**: ~1000-2000 (33 landmarks × 2 messages × 30 FPS)
- **Bandwidth**: ~50-100 KB/s

## Landmark Map (Visual)

```
        1,2,3─●─4,5,6        Eyes
           7─●─●─8           Ears
             ●(0)             Nose
          9─●─●─10           Mouth
             │
       11●───┼───●12         Shoulders
         │   │   │
       13●   │   ●14         Elbows
         │   │   │
       15●   │   ●16         Wrists
      (Hand) │ (Hand)
             │
       23●───┼───●24         Hips
         │   │   │
       25●   │   ●26         Knees
         │   │   │
       27●   │   ●28         Ankles
        (Foot) (Foot)
```

Legend:
- ● = Landmark point
- │, ─ = Bone connections
- Numbers = Landmark indices (approximate)

## Use Cases

1. **Motion Capture**: Record actor movements for animation
2. **Interactive Installations**: Control visuals with body movement
3. **Game Control**: Use body as game controller
4. **VR/AR**: Drive virtual avatars
5. **Live Performance**: Real-time character control
6. **Prototyping**: Quick interaction design testing
