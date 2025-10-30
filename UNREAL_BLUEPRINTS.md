# Unreal Engine Blueprint Diagrams

This file contains Mermaid diagrams showing how to set up blueprints in Unreal Engine to receive and use OSC data from the body tracking application.

## Basic Blueprint Structure

```mermaid
graph TD
    A[BP_BodyTracker Actor] --> B[Components]
    A --> C[Event Graph]
    
    B --> B1[OSC Server Component]
    B1 --> B1a[Port: 8000]
    B1 --> B1b[Multicast Loopback: True]
    
    C --> C1[Event BeginPlay]
    C --> C2[Custom Events]
    C --> C3[Helper Functions]
    
    C1 --> D[Initialize OSC Listeners]
    D --> D1[Bind Address Pattern]
    D --> D2[Bind Address Pattern]
    D --> D3[Bind Address Pattern]
    
    C2 --> E1[OnRightHandPosition]
    C2 --> E2[OnLeftHandPosition]
    C2 --> E3[OnHeadPosition]
    
    C3 --> F1[ConvertMediaPipeToUnreal]
    C3 --> F2[SmoothPosition]
```

## Event Flow: Receiving OSC Data

```mermaid
sequenceDiagram
    participant App as Electron App
    participant OSC as OSC Server Component
    participant BP as Blueprint Event Graph
    participant Actor as Scene Actor
    
    App->>OSC: UDP Message on Port 8000
    Note over App,OSC: /pose/right_wrist/position<br/>[0.523, 0.612, -0.045]
    
    OSC->>BP: Trigger Bound Event
    Note over OSC,BP: OnRightHandPosition Event
    
    BP->>BP: Break OSC Message
    BP->>BP: Extract X, Y, Z (Floats)
    BP->>BP: ConvertMediaPipeToUnreal(X, Y, Z)
    BP->>BP: SmoothPosition (VInterp)
    BP->>Actor: Set Actor Location
    
    Actor-->>App: Visual Feedback (actor moves)
```

## Complete Blueprint: Single Hand Tracking

```mermaid
flowchart TD
    Start([Event BeginPlay]) --> GetOSC[Get OSC Server Component]
    GetOSC --> Bind[Bind Event to Address Pattern<br/>Pattern: /pose/right_wrist/position]
    Bind --> Ready[Ready to Receive]
    
    Ready -.-> Receive([On OSC Message Received])
    
    Receive --> Break[Break OSC Message]
    Break --> GetX[Get Float at Index 0 → X]
    Break --> GetY[Get Float at Index 1 → Y]
    Break --> GetZ[Get Float at Index 2 → Z]
    
    GetX --> Convert[ConvertMediaPipeToUnreal Function]
    GetY --> Convert
    GetZ --> Convert
    
    Convert --> Unreal[UnrealVector]
    Unreal --> Smooth[VInterp To<br/>Current → Target<br/>Speed: 10.0]
    Smooth --> SetLoc[Set Actor Location]
    SetLoc --> Update[Update Visual]
    
    style Start fill:#90EE90
    style Receive fill:#87CEEB
    style Convert fill:#FFD700
    style SetLoc fill:#FF6B6B
```

## Complete Blueprint: Full Body IK Setup

```mermaid
flowchart TD
    Start([Event BeginPlay]) --> Setup[Setup OSC Listeners]
    
    Setup --> Head[Listen: /pose/nose/position]
    Setup --> RHand[Listen: /pose/right_wrist/position]
    Setup --> LHand[Listen: /pose/left_wrist/position]
    Setup --> RFoot[Listen: /pose/right_ankle/position]
    Setup --> LFoot[Listen: /pose/left_ankle/position]
    
    Head -.-> HeadEvent([OnHeadPosition])
    RHand -.-> RHandEvent([OnRightHandPosition])
    LHand -.-> LHandEvent([OnLeftHandPosition])
    RFoot -.-> RFootEvent([OnRightFootPosition])
    LFoot -.-> LFootEvent([OnLeftFootPosition])
    
    HeadEvent --> Process1[Process & Convert]
    RHandEvent --> Process2[Process & Convert]
    LHandEvent --> Process3[Process & Convert]
    RFootEvent --> Process4[Process & Convert]
    LFootEvent --> Process5[Process & Convert]
    
    Process1 --> Store1[Store HeadPosition]
    Process2 --> Store2[Store RightHandPosition]
    Process3 --> Store3[Store LeftHandPosition]
    Process4 --> Store4[Store RightFootPosition]
    Process5 --> Store5[Store LeftFootPosition]
    
    Store1 --> Tick([Event Tick])
    Store2 --> Tick
    Store3 --> Tick
    Store4 --> Tick
    Store5 --> Tick
    
    Tick --> IK{IK Rig Ready?}
    IK -->|Yes| ApplyIK[Apply IK Targets]
    IK -->|No| Skip[Skip Frame]
    
    ApplyIK --> IK1[Set Head IK Target]
    ApplyIK --> IK2[Set Right Hand IK Target]
    ApplyIK --> IK3[Set Left Hand IK Target]
    ApplyIK --> IK4[Set Right Foot IK Target]
    ApplyIK --> IK5[Set Left Foot IK Target]
    
    IK1 --> Update[Update Character Pose]
    IK2 --> Update
    IK3 --> Update
    IK4 --> Update
    IK5 --> Update
    
    style Start fill:#90EE90
    style Tick fill:#87CEEB
    style ApplyIK fill:#FFD700
    style Update fill:#FF6B6B
```

## Function: ConvertMediaPipeToUnreal

```mermaid
flowchart LR
    Input1[X: Float 0.0-1.0] --> Calc1
    Input2[Y: Float 0.0-1.0] --> Calc2
    Input3[Z: Float depth] --> Calc3
    
    Calc1["UnrealX = (X - 0.5) × 1000"] --> MakeVec[Make Vector]
    Calc2["UnrealZ = (1.0 - Y) × 1000"] --> MakeVec
    Calc3["UnrealY = Z × -100"] --> MakeVec
    
    MakeVec --> Output[Return: FVector]
    
    style Input1 fill:#E6F3FF
    style Input2 fill:#E6F3FF
    style Input3 fill:#E6F3FF
    style Output fill:#90EE90
```

## Blueprint Component Hierarchy

```mermaid
graph TD
    A[BP_BodyTracker Actor] --> B[Scene Component Root]
    
    B --> C[OSC Server Component]
    B --> D[Static Mesh Components]
    
    C --> C1[Configuration]
    C1 --> C1a[Receive From Port: 8000]
    C1 --> C1b[Receive Address: 0.0.0.0]
    
    D --> D1[Head Sphere]
    D --> D2[Right Hand Sphere]
    D --> D3[Left Hand Sphere]
    D --> D4[Right Foot Sphere]
    D --> D5[Left Foot Sphere]
    
    style A fill:#FFD700
    style C fill:#87CEEB
    style D fill:#FFB6C1
```

## Variables Setup

```mermaid
classDiagram
    class BP_BodyTracker {
        +OSCServerComponent OSCServer
        +Vector HeadPosition
        +Vector RightHandPosition
        +Vector LeftHandPosition
        +Vector RightFootPosition
        +Vector LeftFootPosition
        +Float SmoothSpeed
        +Boolean IsTracking
        +ConvertMediaPipeToUnreal(X, Y, Z) Vector
        +SmoothPosition(Current, Target, Delta) Vector
        +OnHeadPosition(Address, Message)
        +OnRightHandPosition(Address, Message)
        +OnLeftHandPosition(Address, Message)
    }
    
    class OSCMessage {
        +String Address
        +Array Args
    }
    
    BP_BodyTracker --> OSCMessage : receives
```

## Advanced: Gesture Detection Blueprint

```mermaid
flowchart TD
    Start([Event Tick]) --> Check{Check Gesture}
    
    Check --> HandsUp[Hands Above Shoulders?]
    HandsUp -->|Yes| Gesture1[Trigger: Hands Raised]
    HandsUp -->|No| Next1
    
    Next1[Check Next] --> HandsClose[Hands Near Each Other?]
    HandsClose -->|Yes| Gesture2[Trigger: Clapping]
    HandsClose -->|No| Next2
    
    Next2[Check Next] --> Squat[Hips Low?]
    Squat -->|Yes| Gesture3[Trigger: Squatting]
    Squat -->|No| Idle[Idle State]
    
    Gesture1 --> Action1[Execute Game Action]
    Gesture2 --> Action2[Execute Game Action]
    Gesture3 --> Action3[Execute Game Action]
    
    style Gesture1 fill:#90EE90
    style Gesture2 fill:#90EE90
    style Gesture3 fill:#90EE90
    style Action1 fill:#FFD700
    style Action2 fill:#FFD700
    style Action3 fill:#FFD700
```

## Data Flow: App to Unreal

```mermaid
flowchart LR
    subgraph Electron["Electron App"]
        A1[Webcam] --> A2[MediaPipe]
        A2 --> A3[33 Landmarks]
        A3 --> A4[OSC Formatter]
    end
    
    subgraph Network["Network Layer"]
        N1[UDP Socket]
        N2[Port 8000]
    end
    
    subgraph Unreal["Unreal Engine"]
        U1[OSC Server]
        U2[Blueprint Events]
        U3[Coordinate Conversion]
        U4[Scene Update]
    end
    
    A4 --> N1
    N1 --> N2
    N2 --> U1
    U1 --> U2
    U2 --> U3
    U3 --> U4
    
    style Electron fill:#E6F3FF
    style Network fill:#FFE6E6
    style Unreal fill:#E6FFE6
```

## OSC Message Types

```mermaid
graph TD
    A[OSC Messages from App] --> B[Individual Landmarks]
    A --> C[Bundle Message]
    A --> D[Visibility Data]
    
    B --> B1["/pose/nose/position"]
    B --> B2["/pose/right_wrist/position"]
    B --> B3["/pose/left_ankle/position"]
    B --> B4["... 33 total landmarks"]
    
    C --> C1["/pose/all"]
    C1 --> C2["99 floats (33 × 3)"]
    
    D --> D1["/pose/nose/visibility"]
    D --> D2["... confidence values"]
    
    B1 --> E[Float, Float, Float]
    B2 --> E
    B3 --> E
    
    C2 --> F["[x1,y1,z1, x2,y2,z2, ...]"]
    
    D1 --> G[Float 0.0-1.0]
    
    style A fill:#FFD700
    style B fill:#87CEEB
    style C fill:#90EE90
    style D fill:#FFB6C1
```

## Quick Setup Flowchart

```mermaid
flowchart TD
    Start([Start]) --> Step1[Enable OSC Plugin in Unreal]
    Step1 --> Step2[Restart Unreal Engine]
    Step2 --> Step3[Create BP_BodyTracker Actor]
    Step3 --> Step4[Add OSC Server Component]
    Step4 --> Step5[Set Port to 8000]
    Step5 --> Step6[Add Visual Components<br/>Spheres/Meshes]
    Step6 --> Step7[Create Custom Events<br/>for Each Landmark]
    Step7 --> Step8[Bind OSC Address Patterns<br/>in BeginPlay]
    Step8 --> Step9[Implement Convert Function]
    Step9 --> Step10[Add Event Handlers]
    Step10 --> Step11[Place Actor in Level]
    Step11 --> Step12[Press Play]
    Step12 --> Step13{Receiving Data?}
    
    Step13 -->|Yes| Success[✓ Success!<br/>Track body movements]
    Step13 -->|No| Debug[Check:<br/>- Firewall<br/>- Port 8000<br/>- IP Address<br/>- OSC Plugin enabled]
    
    Debug --> Step4
    
    style Start fill:#90EE90
    style Success fill:#FFD700
    style Debug fill:#FF6B6B
```

---

## Usage

You can view these diagrams by:
1. **GitHub/GitLab**: Automatically renders in markdown preview
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Copy to https://mermaid.live
4. **Documentation**: Use in your project wiki/docs

## Diagram Legend

- 🟢 **Green nodes**: Start/Success states
- 🔵 **Blue nodes**: Processing/Events
- 🟡 **Yellow nodes**: Important actions
- 🔴 **Red nodes**: End states/Updates
- ⬜ **White nodes**: Standard flow

---

These diagrams map directly to the blueprint setup described in `UNREAL_INTEGRATION.md` and `UNREAL_EXAMPLES.md`.
