# MediaPipe OSC Body Tracker

An Electron-based application that tracks body movements through your webcam using Google's MediaPipe Pose detection and sends skeleton data via OSC (Open Sound Control) to Unreal Engine or other applications.

## Features

- 🎥 Real-time body tracking using MediaPipe Pose
- 🦴 33 body landmarks detection (full body skeleton)
- 📡 OSC protocol for sending data to Unreal Engine
- 🎨 Visual feedback with skeleton overlay
- ⚙️ Configurable OSC settings (IP and port)
- 📊 Live statistics (FPS, landmarks, confidence)
- 🖥️ Clean, modern interface

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Webcam

## Installation

1. Clone or navigate to this directory:
```bash
cd /Users/dostrenko/Documents/devwork/mediapipeosc
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the application:
```bash
npm start
```

2. Configure OSC settings:
   - **Remote IP Address**: The IP address of the machine running Unreal Engine (default: `127.0.0.1` for local)
   - **Remote Port**: The port Unreal Engine is listening on (default: `8000`)
   - Click "Update OSC Config" to apply changes

3. Click "Start Tracking" to begin body tracking

4. The application will:
   - Access your webcam
   - Detect your body pose in real-time
   - Draw skeleton on the video feed
   - Send OSC messages with landmark data

## OSC Message Format

The application sends OSC messages in the following formats:

### Individual Landmark Position
```
Address: /pose/{landmark_name}/position
Args: [x, y, z] (floats, normalized 0-1)
```

### Individual Landmark Visibility
```
Address: /pose/{landmark_name}/visibility
Args: [visibility] (float, 0-1)
```

### Joint Rotations (NEW!)
```
Address: /pose/{joint_name}/rotation
Args: [pitch, yaw, roll] (floats, degrees)
```

Available joint rotations:
- `/pose/head/rotation` - Head rotation (from facial landmarks)
- `/pose/right_upper_arm/rotation` - Right shoulder to elbow
- `/pose/right_lower_arm/rotation` - Right elbow to wrist
- `/pose/left_upper_arm/rotation` - Left shoulder to elbow
- `/pose/left_lower_arm/rotation` - Left elbow to wrist
- `/pose/right_upper_leg/rotation` - Right hip to knee
- `/pose/right_lower_leg/rotation` - Right knee to ankle
- `/pose/left_upper_leg/rotation` - Left hip to knee
- `/pose/left_lower_leg/rotation` - Left knee to ankle
- `/pose/torso/rotation` - Torso orientation (shoulders to hips)

**Rotation values:**
- **Pitch**: Up/down rotation (degrees, -180 to 180)
- **Yaw**: Left/right rotation (degrees, -180 to 180)
- **Roll**: Tilt rotation (degrees, -180 to 180)

### All Landmarks Bundle
```
Address: /pose/all
Args: [x1, y1, z1, x2, y2, z2, ...] (99 floats total for 33 landmarks)
```

### Landmark Names

The 33 MediaPipe landmarks are:
- **Face**: nose, eyes (inner, center, outer), ears, mouth
- **Upper Body**: shoulders, elbows, wrists, hands (pinky, index, thumb)
- **Lower Body**: hips, knees, ankles, heels, feet (foot_index)

Full list:
```
nose, left_eye_inner, left_eye, left_eye_outer, right_eye_inner, right_eye,
right_eye_outer, left_ear, right_ear, mouth_left, mouth_right, left_shoulder,
right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_pinky,
right_pinky, left_index, right_index, left_thumb, right_thumb, left_hip,
right_hip, left_knee, right_knee, left_ankle, right_ankle, left_heel,
right_heel, left_foot_index, right_foot_index
```

## Unreal Engine Integration

### Method 1: Using OSC Plugin

1. **Install OSC Plugin in Unreal Engine:**
   - Go to Edit → Plugins
   - Search for "OSC" (Open Sound Control)
   - Enable the plugin and restart Unreal Engine

2. **Set up OSC Receiver:**
   - Create a Blueprint (Actor or similar)
   - Add an "OSC Server" component
   - Set the receive port to `8000` (or your configured port)
   - Bind OSC address patterns to events

3. **Blueprint Example:**
```
Event BeginPlay
  → Create OSC Server (Port: 8000)
  → Bind Event to Address "/pose/nose/position"
    → On Receive: Extract X, Y, Z values
    → Use values to update actor location/rotation
```

4. **Simple Blueprint Node Setup:**
   - Use "OSC Server Receive Message" node
   - Filter by address pattern (e.g., `/pose/*/position`)
   - Extract float values from OSC message
   - Map coordinates to your scene (you may need to scale/transform)

### Method 2: Using Blueprint UDP Socket

1. **Create a Blueprint Actor**
2. **Add UDP Receive Logic:**
   - Use "Create UDP Receiver" node
   - Listen on port `8000`
   - Parse incoming OSC data (requires custom parsing)

### Coordinate System Notes

- MediaPipe coordinates are normalized (0-1 range)
- X: 0 (left) to 1 (right)
- Y: 0 (top) to 1 (bottom)  
- Z: depth (negative = closer to camera)

You may need to:
- Scale coordinates to your Unreal scene dimensions
- Invert Y axis (Unreal uses bottom-to-top)
- Transform coordinate space to match your requirements

### Example Unreal Blueprint Logic

```
On OSC Receive "/pose/right_hand/position":
  1. Get X, Y, Z values from OSC message
  2. Convert to Unreal coordinates:
     - UnrealX = (X - 0.5) * ScaleFactor
     - UnrealY = (Y - 0.5) * ScaleFactor
     - UnrealZ = Z * DepthScale
  3. Set Actor Location or Drive IK rig
```

## Development

### Project Structure
```
mediapipeosc/
├── main.js           # Electron main process & OSC setup
├── preload.js        # Secure IPC bridge
├── renderer.js       # MediaPipe tracking & UI logic
├── index.html        # Application interface
├── package.json      # Dependencies & scripts
└── README.md         # This file
```

### Development Mode

Run with console logging enabled:
```bash
npm run dev
```

### Customization

**Adjust MediaPipe Settings** (in `renderer.js`):
```javascript
pose.setOptions({
    modelComplexity: 1,        // 0=Lite, 1=Full, 2=Heavy
    smoothLandmarks: true,     // Enable smoothing
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
```

**Change OSC Message Format** (in `renderer.js`):
Modify the `sendPoseDataViaOSC()` function to customize OSC addresses and data format.

**Modify UI** (in `index.html`):
Customize the interface styling and layout.

## Troubleshooting

### Camera Not Working
- Ensure you've granted camera permissions to Electron
- Check that no other application is using the webcam
- Try restarting the application

### No OSC Messages Received in Unreal
- Verify the IP address and port are correct
- Check firewall settings (allow UDP on specified port)
- Ensure Unreal's OSC plugin is properly configured
- Test with a simple OSC receiver app first

### Low FPS / Performance Issues
- Reduce MediaPipe model complexity (set to 0 for Lite)
- Lower camera resolution
- Disable skeleton/landmark drawing
- Close other resource-intensive applications

### Landmarks Not Detected
- Ensure good lighting
- Stand fully visible in frame
- Increase detection confidence threshold
- Move closer to camera

## Technical Details

- **MediaPipe Pose**: Google's ML solution for body pose estimation
- **OSC Protocol**: UDP-based protocol for real-time data transmission
- **Electron**: Cross-platform desktop application framework
- **Coordinate System**: Normalized coordinates (0-1) with origin at top-left

## License

MIT

## Credits

- MediaPipe by Google
- OSC protocol implementation
- Electron framework

## Support

For issues or questions, please check:
- MediaPipe documentation: https://google.github.io/mediapipe/solutions/pose
- OSC specification: http://opensoundcontrol.org/
- Unreal Engine OSC plugin documentation

---

**Made with ❤️ for creative technologists and game developers**
