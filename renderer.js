// DOM Elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('startBtn');
const statusEl = document.getElementById('status');
const fpsEl = document.getElementById('fps');
const oscCountEl = document.getElementById('oscCount');
const landmarkCountEl = document.getElementById('landmarkCount');
const confidenceEl = document.getElementById('confidence');
const drawSkeletonCheckbox = document.getElementById('drawSkeleton');
const drawLandmarksCheckbox = document.getElementById('drawLandmarks');
const oscIpInput = document.getElementById('oscIp');
const oscPortInput = document.getElementById('oscPort');
const updateOscBtn = document.getElementById('updateOscBtn');
const cameraSelectEl = document.getElementById('cameraSelect');

// State
let pose;
let camera;
let isCameraActive = false;
let isTracking = false;
let oscMessageCount = 0;
let frameCount = 0;
let lastTime = Date.now();
let availableCameras = [];
let selectedCameraId = null;

// MediaPipe Pose Landmark names (33 landmarks)
const POSE_LANDMARKS = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
];

// Initialize MediaPipe Pose
function initPose() {
    pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);
}

// Process pose detection results
function onResults(results) {
    // Update canvas size to match video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        // Draw skeleton connections
        if (drawSkeletonCheckbox.checked) {
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF88',
                lineWidth: 4
            });
        }

        // Draw landmarks
        if (drawLandmarksCheckbox.checked) {
            drawLandmarks(canvasCtx, results.poseLandmarks, {
                color: '#FF0000',
                fillColor: '#00FF88',
                lineWidth: 2,
                radius: 6
            });
        }

        // Send OSC data
        sendPoseDataViaOSC(results.poseLandmarks);

        // Update stats
        landmarkCountEl.textContent = results.poseLandmarks.length;
        
        // Calculate average confidence
        const avgConfidence = results.poseLandmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / results.poseLandmarks.length;
        confidenceEl.textContent = Math.round(avgConfidence * 100) + '%';
    } else {
        landmarkCountEl.textContent = '0';
        confidenceEl.textContent = '0%';
    }

    canvasCtx.restore();

    // Update FPS
    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        fpsEl.textContent = frameCount;
        frameCount = 0;
        lastTime = now;
    }
}

// Send pose data via OSC
function sendPoseDataViaOSC(landmarks) {
    if (!landmarks || !isTracking) return; // Only send when tracking is active

    // Send each landmark as a separate OSC message
    landmarks.forEach((landmark, index) => {
        const landmarkName = POSE_LANDMARKS[index] || `landmark_${index}`;
        
        // Send position (x, y, z)
        window.electronAPI.sendOSC({
            address: `/pose/${landmarkName}/position`,
            args: [
                { type: 'f', value: landmark.x },
                { type: 'f', value: landmark.y },
                { type: 'f', value: landmark.z }
            ]
        });

        // Send visibility
        if (landmark.visibility !== undefined) {
            window.electronAPI.sendOSC({
                address: `/pose/${landmarkName}/visibility`,
                args: [
                    { type: 'f', value: landmark.visibility }
                ]
            });
        }
    });

    // Send a bundle message with all landmarks
    const allPositions = landmarks.map(lm => [lm.x, lm.y, lm.z]).flat();
    window.electronAPI.sendOSC({
        address: '/pose/all',
        args: allPositions.map(val => ({ type: 'f', value: val }))
    });

    oscMessageCount += landmarks.length + 1;
    oscCountEl.textContent = oscMessageCount;
}

// Start camera (separate from tracking)
async function startCamera(cameraId = null) {
    try {
        // Stop any existing video stream
        if (videoElement.srcObject) {
            console.log('Stopping existing video stream...');
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        statusEl.textContent = 'Initializing camera...';
        console.log('Starting camera with deviceId:', cameraId || 'default');

        // Build getUserMedia constraints
        const videoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        };

        // Add deviceId constraint if a specific camera is selected
        if (cameraId) {
            console.log('Using exact deviceId constraint:', cameraId);
            videoConstraints.deviceId = { exact: cameraId };
        } else {
            console.log('Using default camera');
        }

        console.log('Video constraints:', videoConstraints);

        // Get the camera stream directly using getUserMedia
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints 
        });
        
        console.log('Got media stream:', stream.getVideoTracks()[0].label);
        videoElement.srcObject = stream;
        
        // Wait for video to be ready and play
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                console.log('Video metadata loaded');
                videoElement.play();
                resolve();
            };
        });

        // Start the frame processing loop if not already running
        if (!camera) {
            console.log('Starting frame processing loop...');
            const processFrame = async () => {
                if (videoElement.srcObject && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                    await pose.send({ image: videoElement });
                }
                requestAnimationFrame(processFrame);
            };
            camera = true; // Use as a flag to prevent multiple loops
            requestAnimationFrame(processFrame);
        }
        
        isCameraActive = true;
        console.log('Camera started successfully, isCameraActive:', isCameraActive);
        
        if (isTracking) {
            statusEl.textContent = 'Tracking active - Sending OSC data';
            statusEl.classList.add('active');
        } else {
            statusEl.textContent = 'Camera ready - Click "Start Tracking" to send OSC';
            statusEl.classList.remove('active');
        }
    } catch (error) {
        console.error('Error starting camera:', error);
        console.error('Error details:', error.name, error.message, error.stack);
        statusEl.textContent = 'Error: ' + error.message;
        statusEl.classList.remove('active');
        isCameraActive = false;
    }
}

// Start/Stop tracking (OSC data transmission)
async function toggleTracking() {
    if (!isTracking) {
        // Start camera if not already active
        if (!isCameraActive) {
            await startCamera(selectedCameraId);
        }
        
        isTracking = true;
        startBtn.textContent = 'Stop Tracking';
        statusEl.textContent = 'Tracking active - Sending OSC data';
        statusEl.classList.add('active');
    } else {
        isTracking = false;
        startBtn.textContent = 'Start Tracking';
        statusEl.textContent = 'Camera ready - Click "Start Tracking" to send OSC';
        statusEl.classList.remove('active');
        
        // Clear canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
}

// Enumerate available cameras
async function getCameras() {
    try {
        // First, request camera permission to get proper labels
        await navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                // Stop the stream immediately, we just needed permission
                stream.getTracks().forEach(track => track.stop());
            });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        // Reverse the order so built-in camera appears first
        availableCameras.reverse();
        
        // Populate camera select dropdown (no default option)
        cameraSelectEl.innerHTML = '';
        availableCameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            cameraSelectEl.appendChild(option);
        });

        // Select the first camera by default (built-in)
        if (availableCameras.length > 0) {
            selectedCameraId = availableCameras[0].deviceId;
            cameraSelectEl.value = selectedCameraId;
        }

        console.log(`Found ${availableCameras.length} camera(s):`, availableCameras.map(c => c.label));
    } catch (error) {
        console.error('Error enumerating cameras:', error);
    }
}

// Handle camera selection change
async function onCameraChange() {
    const newCameraId = cameraSelectEl.value || null;
    console.log('========================================');
    console.log('Camera selection changed!');
    console.log('Previous camera:', selectedCameraId || 'default');
    console.log('New camera:', newCameraId || 'default');
    console.log('========================================');
    
    selectedCameraId = newCameraId;
    
    // Automatically switch to the new camera
    await startCamera(selectedCameraId);
}

// Update OSC configuration
function updateOSCConfig() {
    const config = {
        remoteAddress: oscIpInput.value,
        remotePort: parseInt(oscPortInput.value)
    };

    window.electronAPI.updateOSCConfig(config);
    statusEl.textContent = `OSC config updated: ${config.remoteAddress}:${config.remotePort}`;
    
    setTimeout(() => {
        if (isTracking) {
            statusEl.textContent = 'Tracking active - Sending OSC data';
        } else {
            statusEl.textContent = 'Ready to start';
        }
    }, 2000);
}

// Event listeners
startBtn.addEventListener('click', toggleTracking);
updateOscBtn.addEventListener('click', updateOSCConfig);
cameraSelectEl.addEventListener('change', onCameraChange);

// Load initial OSC config
window.electronAPI.onOSCConfig((config) => {
    oscIpInput.value = config.remoteAddress;
    oscPortInput.value = config.remotePort;
});

// Request initial config
window.electronAPI.getOSCConfig();

// Initialize on load
console.log('Initializing application...');
initPose();
getCameras().then(() => {
    console.log('Cameras enumerated, starting default camera...');
    // Auto-start camera with default device
    startCamera(selectedCameraId);
});
