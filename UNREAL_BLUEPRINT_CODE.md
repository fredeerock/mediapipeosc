# Unreal Engine Blueprint Code Reference

This file contains step-by-step blueprint node configurations you can recreate in Unreal Engine.

---

## SETUP 1: Create the Actor Blueprint

1. **Content Browser** → Right-click → **Blueprint Class** → **Actor**
2. Name it: `BP_BodyTracker`
3. Open the blueprint

---

## SETUP 2: Add Components

In the **Components** panel:

1. Click **Add Component** → **OSC Server**
   - Name: `OSCServer`
   - In **Details** panel:
     - **Receive Port**: `8000`
     - **Receive Address**: `0.0.0.0`
     - **Multicast Loopback**: ✓ (checked)

2. Click **Add Component** → **Static Mesh** (optional, for visualization)
   - Name: `RightHandSphere`
   - Mesh: `/Engine/BasicShapes/Sphere`
   - Scale: `(0.1, 0.1, 0.1)`

3. Repeat for other body parts (optional):
   - `LeftHandSphere`
   - `HeadSphere`
   - etc.

---

## SETUP 3: Create Variables

In the **Variables** panel, click **+ Add Variable** for each:

```
Variable Name         | Type      | Default Value | Category
---------------------|-----------|---------------|----------
RightHandPosition    | Vector    | (0,0,0)      | Tracking
LeftHandPosition     | Vector    | (0,0,0)      | Tracking
HeadPosition         | Vector    | (0,0,0)      | Tracking
RightHandTarget      | Vector    | (0,0,0)      | Tracking
SmoothSpeed          | Float     | 10.0         | Settings
ScaleFactor          | Float     | 1000.0       | Settings
IsTracking           | Boolean   | false        | State
```

---

## BLUEPRINT 1: Event BeginPlay - Setup OSC Listeners

### Node Graph:

```
[Event BeginPlay]
    |
    v
[Get OSC Server] (Get component reference)
    |
    v
[Bind Event to OSC Message]
    - Address Pattern: "/pose/right_wrist/position"
    - Event: "OnRightHandPosition" (create custom event)
    |
    v
[Bind Event to OSC Message]
    - Address Pattern: "/pose/left_wrist/position"
    - Event: "OnLeftHandPosition"
    |
    v
[Bind Event to OSC Message]
    - Address Pattern: "/pose/nose/position"
    - Event: "OnHeadPosition"
    |
    v
[Print String] "OSC Listeners Ready"
```

### Detailed Steps:

1. **Right-click** in Event Graph → **Add Event** → **Event BeginPlay**

2. Drag from BeginPlay → **Get OSC Server** (select your OSC Server component)

3. Drag from OSC Server → **Bind Event to OSC Message**
   - In the node settings:
     - **Address Pattern**: `/pose/right_wrist/position`
   - Click the **+** on the node to add an event
   - Select **Create Matching Function** → Name it: `OnRightHandPosition`

4. Repeat step 3 for other landmarks

---

## BLUEPRINT 2: Custom Event - OnRightHandPosition

### Node Graph:

```
[OnRightHandPosition] (Custom Event)
    Inputs: Address (String), Message (OSC Message)
    |
    v
[Break OSC Message]
    Input: Message
    |
    +-- Out Args (Array) --+
                          |
    v                     v                     v
[Get (Index 0)]      [Get (Index 1)]      [Get (Index 2)]
    |                     |                     |
    v                     v                     v
[Break OSC Address]  [Break OSC Address]  [Break OSC Address]
    |                     |                     |
    v (Float)            v (Float)            v (Float)
    X                     Y                     Z
    |                     |                     |
    +---------------------+---------------------+
                          |
                          v
            [ConvertMediaPipeToUnreal]
                    (Function)
                          |
                          v
                  [UnrealPosition Vector]
                          |
                          v
            [Set RightHandTarget]
                          |
                          v
                  [Print String]
                Format: "Hand: {0}, {1}, {2}"
```

### Detailed Steps:

1. In the **OnRightHandPosition** event (created automatically when you bound the event):

2. **Drag from Message pin** → **Break OSC Message**
   - This exposes the Args array

3. **Drag from Args** → **Get (a copy)**
   - Set Index: `0`
   - This gets the X value

4. **Drag from the result** → **Break OSC Address**
   - This extracts the float value

5. **Repeat steps 3-4** for indices `1` (Y) and `2` (Z)

6. **Drag from X, Y, Z** → **ConvertMediaPipeToUnreal** (function we'll create next)

7. **Drag from result** → **Set RightHandTarget** (variable)

8. Optional: **Add Print String** for debugging

---

## BLUEPRINT 3: Function - ConvertMediaPipeToUnreal

### Create Function:

1. **Functions** panel → **+ Add Function**
2. Name: `ConvertMediaPipeToUnreal`

### Function Inputs:

```
Name    | Type   | Pass by
--------|--------|----------
X       | Float  | Value
Y       | Float  | Value
Z       | Float  | Value
```

### Function Output:

```
Name            | Type
----------------|--------
UnrealPosition  | Vector
```

### Node Graph:

```
[Input X]
    |
    v
[Float - Float] (X - 0.5)
    |
    v
[Float * Float] (Result * ScaleFactor)
    |
    v
  UnrealX ----+
              |
[Input Y]     |
    |         |
    v         |
[Float - Float] (1.0 - Y)   |
    |                       |
    v                       |
[Float * Float] (Result * ScaleFactor) |
    |                       |
    v                       |
  UnrealZ --------+         |
                  |         |
[Input Z]         |         |
    |             |         |
    v             |         |
[Float * Float] (Z * -100.0)|
    |             |         |
    v             |         |
  UnrealY         |         |
    |             |         |
    +-------------+---------+
              |
              v
      [Make Vector]
         (UnrealX, UnrealY, UnrealZ)
              |
              v
      [Return Node]
      Output: UnrealPosition
```

### Detailed Steps:

1. Add input **X** (Float)

2. **Right-click** → **Float - Float**
   - Connect X to first input
   - Set second input: `0.5`

3. **Drag from result** → **Float * Float**
   - Connect to first input
   - Drag **Get ScaleFactor** variable → connect to second input

4. This gives you **UnrealX**

5. **Repeat for Y:**
   - `(1.0 - Y) * ScaleFactor` = **UnrealZ**

6. **For Z:**
   - `Z * -100.0` = **UnrealY**

7. **Right-click** → **Make Vector**
   - X: UnrealX
   - Y: UnrealY
   - Z: UnrealZ

8. **Connect to Return node** → UnrealPosition output

---

## BLUEPRINT 4: Event Tick - Update Positions with Smoothing

### Node Graph:

```
[Event Tick]
    Delta Seconds
    |
    v
[VInterp To]
    - Current: RightHandPosition (Get variable)
    - Target: RightHandTarget (Get variable)
    - Delta Time: Delta Seconds
    - Interp Speed: SmoothSpeed (Get variable)
    |
    v
[Set RightHandPosition] (variable)
    |
    v
[Get RightHandSphere] (component)
    |
    v
[Set World Location]
    - Target: RightHandSphere
    - New Location: RightHandPosition
```

### Detailed Steps:

1. **Add Event Tick**

2. **Right-click** → **VInterp To**
   - Current: Drag **Get RightHandPosition** variable
   - Target: Drag **Get RightHandTarget** variable
   - Delta Time: Connect from Event Tick's Delta Seconds
   - Interp Speed: Drag **Get SmoothSpeed** variable (10.0)

3. **Drag from Return Value** → **Set RightHandPosition**

4. **Drag from RightHandPosition** → **Set World Location**
   - Target: Drag **Get RightHandSphere** component

---

## BLUEPRINT 5: Simple Test - Print Incoming Data

### Node Graph:

```
[OnRightHandPosition]
    |
    v
[Break OSC Message]
    |
    v
[Get (Index 0)] [Get (Index 1)] [Get (Index 2)]
    |               |               |
    v               v               v
[Break OSC Address] [Break OSC Address] [Break OSC Address]
    |               |               |
    v (X)          v (Y)          v (Z)
    +---------------+---------------+
                    |
                    v
            [Format Text]
            "X:{0} Y:{1} Z:{2}"
                    |
                    v
            [Print String]
            Duration: 0.0
            Text Color: Green
```

---

## COMPLETE EXAMPLE: Track Right Hand Only

### Full Blueprint Setup:

#### **Variables:**
```
RightHandTarget (Vector)
RightHandCurrent (Vector)
SmoothSpeed (Float) = 10.0
ScaleFactor (Float) = 1000.0
```

#### **Event BeginPlay:**
```
Event BeginPlay
→ Get OSC Server
→ Bind Event to OSC Message
   - Address: "/pose/right_wrist/position"
   - Event: OnRightHandPosition
→ Print "Setup Complete"
```

#### **Custom Event: OnRightHandPosition:**
```
OnRightHandPosition (Address, Message)
→ Break OSC Message
→ Get Args[0] → Break OSC Address → X (float)
→ Get Args[1] → Break OSC Address → Y (float)
→ Get Args[2] → Break OSC Address → Z (float)
→ ConvertMediaPipeToUnreal(X, Y, Z) → WorldPos
→ Set RightHandTarget = WorldPos
```

#### **Function: ConvertMediaPipeToUnreal:**
```
Input: X, Y, Z (floats)
→ UnrealX = (X - 0.5) * ScaleFactor
→ UnrealY = Z * -100.0
→ UnrealZ = (1.0 - Y) * ScaleFactor
→ Return MakeVector(UnrealX, UnrealY, UnrealZ)
```

#### **Event Tick:**
```
Event Tick (Delta)
→ VInterp To
   - Current: RightHandCurrent
   - Target: RightHandTarget
   - Delta: Delta
   - Speed: SmoothSpeed
→ Set RightHandCurrent
→ Set World Location (RightHandSphere)
```

---

## MULTI-LANDMARK TRACKING

### For tracking multiple body parts:

1. **Create variables for each:**
   ```
   HeadTarget, HeadCurrent
   RightHandTarget, RightHandCurrent
   LeftHandTarget, LeftHandCurrent
   RightFootTarget, RightFootCurrent
   LeftFootTarget, LeftFootCurrent
   ```

2. **In BeginPlay, bind multiple events:**
   ```
   Bind "/pose/nose/position" → OnHeadPosition
   Bind "/pose/right_wrist/position" → OnRightHandPosition
   Bind "/pose/left_wrist/position" → OnLeftHandPosition
   Bind "/pose/right_ankle/position" → OnRightFootPosition
   Bind "/pose/left_ankle/position" → OnLeftFootPosition
   ```

3. **Create custom event for each:**
   - Each follows the same pattern as OnRightHandPosition
   - Just change the variable being set

4. **In Event Tick, update all:**
   ```
   VInterp To (Head) → Set World Location (HeadSphere)
   VInterp To (RightHand) → Set World Location (RightHandSphere)
   VInterp To (LeftHand) → Set World Location (LeftHandSphere)
   VInterp To (RightFoot) → Set World Location (RightFootSphere)
   VInterp To (LeftFoot) → Set World Location (LeftFootSphere)
   ```

---

## GESTURE DETECTION EXAMPLE

### Detect if both hands are raised:

#### **Variables:**
```
RightHandZ (Float)
LeftHandZ (Float)
RightShoulderZ (Float)
LeftShoulderZ (Float)
HandsRaised (Boolean)
```

#### **Event Tick:**
```
Event Tick
→ Branch (RightHandZ > RightShoulderZ AND LeftHandZ > LeftShoulderZ)
   → True: 
      → Set HandsRaised = True
      → Print "HANDS RAISED!"
      → [Your custom action here]
   → False:
      → Set HandsRaised = False
```

---

## DEBUGGING TIPS

### Add these to see what's happening:

1. **In OnRightHandPosition:**
   ```
   After getting X, Y, Z:
   → Format Text: "Received: X={0}, Y={1}, Z={2}"
   → Print String (Duration: 0.0)
   ```

2. **Test OSC Connection:**
   ```
   Event BeginPlay
   → Delay (2.0 seconds)
   → Print String: "Waiting for OSC on port 8000..."
   ```

3. **Check if component exists:**
   ```
   Event BeginPlay
   → Get OSC Server
   → Is Valid?
      → True: Print "OSC Server OK"
      → False: Print "ERROR: No OSC Server!"
   ```

---

## QUICK COPY-PASTE CHECKLIST

✅ **Enable OSC Plugin** (Edit → Plugins → OSC)  
✅ **Create BP_BodyTracker** (Blueprint Class → Actor)  
✅ **Add OSC Server Component** (Port: 8000)  
✅ **Add Static Mesh Components** (for visualization)  
✅ **Create Variables** (see variable list above)  
✅ **Event BeginPlay** → Bind OSC events  
✅ **Custom Events** → Handle each landmark  
✅ **Function** → ConvertMediaPipeToUnreal  
✅ **Event Tick** → Smooth and update positions  
✅ **Place in Level** → Drag into scene  
✅ **Press Play** → Test!  

---

## NODE SEARCH TERMS

When you need to add these nodes, search for:

- **Bind Event to OSC Message** - Right-click → search "OSC"
- **Break OSC Message** - Drag from OSC Message → search "Break"
- **Get (array element)** - Drag from array → search "Get"
- **Break OSC Address** - Drag from OSC Address → search "Break"
- **VInterp To** - Right-click → search "VInterp"
- **Make Vector** - Right-click → search "Make Vector"
- **Set World Location** - Drag from component → search "Set World Location"
- **Format Text** - Right-click → search "Format"
- **Print String** - Right-click → search "Print"

---

## READY TO BUILD!

Follow the blueprints above in order:
1. Setup (create actor, add components, variables)
2. Event BeginPlay (bind OSC listeners)
3. Custom Events (handle incoming data)
4. ConvertMediaPipeToUnreal function
5. Event Tick (smooth movement)
6. Test!

Each section can be copy-pasted as a reference while building your blueprint in the Unreal Editor.
