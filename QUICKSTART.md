# Quick Start Guide

## 🚀 Get Running in 3 Minutes

### Step 1: Start the Application
```bash
npm start
```

### Step 2: Configure (if needed)
- **Remote IP**: Leave as `127.0.0.1` for local testing
- **Remote Port**: Use `8000` (default)
- Click **"Update OSC Config"** if you made changes

### Step 3: Start Tracking
1. Click **"Start Tracking"** button
2. Allow camera access when prompted
3. Stand in front of your webcam
4. You should see:
   - Live video feed
   - Green skeleton overlay on your body
   - Red landmark dots
   - FPS counter updating
   - OSC message count increasing

### Step 4: Test in Unreal Engine

#### Quick Test Blueprint:
1. Create new Actor Blueprint
2. Add **OSC Server** component (port 8000)
3. In Event Graph:
   ```
   Event BeginPlay
   → Print String: "OSC Ready"
   
   OSC Server → Bind Event to Address Pattern
   → Pattern: "/pose/right_wrist/position"
   → On Receive:
      → Break OSC Message
      → Print String (format: "Hand: {0}, {1}, {2}")
   ```
4. Place in level
5. Press Play
6. Move your right hand - see position values print!

## ✅ Verification Checklist

- [ ] Application window opens
- [ ] Webcam feed visible when tracking starts
- [ ] Skeleton draws on body
- [ ] FPS shows 20-30+
- [ ] OSC message count increases
- [ ] No errors in status display

## 🔧 Quick Troubleshooting

### Camera doesn't start
- Grant camera permissions to Electron
- Close other apps using the camera
- Restart the application

### No skeleton detected
- Ensure good lighting
- Stand fully visible in frame
- Move closer to camera
- Check detection confidence (should be >50%)

### Unreal not receiving
- Check firewall (allow UDP port 8000)
- Verify IP address is correct
- Enable OSC plugin in Unreal
- Ensure OSC Server component is listening

## 📊 What You Should See

### In Electron App:
- **Status**: "Tracking active - Sending OSC data" (green)
- **FPS**: 20-60
- **OSC Messages**: Rapidly increasing number
- **Landmarks**: 33
- **Confidence**: 70-99%

### In Unreal Console:
- Position values printing (if you added debug prints)
- Format: `Hand: 0.523, 0.612, -0.045`

## 🎯 Next Steps

1. **Learn the landmarks**: See `ARCHITECTURE.md` for body map
2. **Blueprint examples**: Check `UNREAL_EXAMPLES.md`
3. **Full integration**: Read `UNREAL_INTEGRATION.md`
4. **Customize**: Edit OSC message format in `renderer.js`

## 💡 Pro Tips

- **Better tracking**: Use good lighting, stand 1-2 meters from camera
- **Lower latency**: Reduce MediaPipe model complexity (renderer.js)
- **Smooth movement**: Enable smoothing in both MediaPipe and Unreal
- **Network**: For remote machines, use actual IP instead of 127.0.0.1

## 🎮 Ready to Build?

You now have:
- ✅ Real-time body tracking
- ✅ OSC data streaming
- ✅ Unreal Engine integration

**Build something amazing!** 🚀

---

Need help? Check the other documentation files:
- `README.md` - Full documentation
- `UNREAL_INTEGRATION.md` - Detailed Unreal setup
- `UNREAL_EXAMPLES.md` - Blueprint code examples
- `ARCHITECTURE.md` - System design and data flow
