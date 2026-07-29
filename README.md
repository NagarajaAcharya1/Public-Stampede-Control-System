# CrowdPulse

A real-time crowd monitoring system with **automatic network discovery**. Connect any WiFi network, and all devices (ESP32, laptops, phones) automatically find and connect to each other. Two IR sensors on ESP32 track people entering/exiting, data flows to Node.js backend, and live updates appear on React dashboard across all connected devices.

## 🚀 Quick Setup

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev` 
3. **Upload ESP32**: Flash `esp32/crowd_pulse.ino`
4. **Connect ESP32 to WiFi**:
   - ESP32 creates `CrowdPulse-XXXXXX` hotspot
   - Connect phone to hotspot (password: `crowd123`)
   - Open `http://192.168.4.1` → Select your WiFi → Enter password
   - ESP32 connects and remembers WiFi forever
5. **Access Dashboard**: Open `http://localhost:5173` → Login with admin/password

**That's it!** ESP32 auto-discovers the backend server on your network.

## Key Features

- **🔍 Auto-Discovery**: ESP32 and frontend automatically find backend server
- **📱 Multi-Device**: Access from phones, tablets, laptops on same network  
- **🌐 Any WiFi**: Works on home, office, or public networks
- **⚡ Real-time**: Live updates via WebSocket across all devices
- **🔄 Resilient**: Auto-reconnects if connections drop
- **🚫 Zero Config**: No IP addresses to configure manually
- **💾 WiFi Memory**: ESP32 remembers network credentials

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware](#hardware)
- [Project Structure](#project-structure)
- [Backend](#backend)
- [Frontend](#frontend)
- [ESP32 Firmware](#esp32-firmware)
- [Database Models](#database-models)
- [API Reference](#api-reference)
- [Setup & Running](#setup--running)
- [Default Credentials](#default-credentials)

---

## Overview

| Layer | Technology |
|---|---|
| Hardware | ESP32 + 2x IR Sensors + Buzzer |
| Firmware | Arduino C++ (WiFi + HTTP) |
| Backend | Node.js, Express, Socket.IO, MongoDB (In-Memory) |
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Framer Motion |
| Real-time | WebSockets via Socket.IO |

**How it works:**
1. IR sensor at the entry detects a person → ESP32 POSTs to `/api/iot/entry`
2. IR sensor at the exit detects a person → ESP32 POSTs to `/api/iot/exit`
3. Backend updates the occupancy count and emits a `zone-update` WebSocket event
4. Dashboard receives the event and updates all stats instantly without page refresh
5. If occupancy exceeds the threshold, an alert is created and pushed to the dashboard via `new-alert` event
6. If local count on ESP32 exceeds 15, the buzzer plays 6 rapid beeps

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    HARDWARE LAYER                   │
│                                                     │
│   IR Sensor (Entry) ──┐                             │
│                       ├──► ESP32 ──► WiFi ──► HTTP  │
│   IR Sensor (Exit)  ──┘                             │
│   Buzzer ◄────────────── ESP32                      │
└─────────────────────────────────────────────────────┘
                            │
                            ▼ POST /api/iot/entry|exit
┌─────────────────────────────────────────────────────┐
│                    BACKEND LAYER                    │
│                                                     │
│   Express REST API  ──► MongoDB (In-Memory)         │
│   Socket.IO Server  ──► Emits zone-update / alerts  │
└─────────────────────────────────────────────────────┘
                            │
                            ▼ WebSocket (zone-update, new-alert)
┌─────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                    │
│                                                     │
│   React Dashboard  ──► Live stats, alerts, charts   │
│   Protected Routes ──► JWT Auth (Admin / Operator)  │
└─────────────────────────────────────────────────────┘
```

---

## Hardware

### Components

| Component | Quantity | Purpose |
|---|---|---|
| ESP32 Dev Module | 1 | WiFi + sensor controller |
| IR Sensor (FC-51 or similar) | 2 | Detect entry and exit |
| Buzzer (active) | 1 | Overcrowd audio alert |

### Wiring

| Component | Pin | ESP32 GPIO |
|---|---|---|
| IR Entry Sensor | OUT | GPIO 34 |
| IR Exit Sensor | OUT | GPIO 35 |
| Buzzer | + | GPIO 25 |
| All sensors | VCC | 3.3V |
| All sensors | GND | GND |

> GPIO 34 and 35 are input-only pins on ESP32 — perfect for sensor reads.

### Buzzer Behaviour

| Event | Beeps |
|---|---|
| Person enters (normal) | 1 short beep |
| Person exits | 1 short beep |
| Count exceeds 15 people | 6 rapid beeps |

---

## Project Structure

```
CrowdPulse/
│
├── backend/                        # Node.js REST API + WebSocket server
│   ├── models/
│   │   ├── Alert.js                # Alert schema (severity, status, zoneId)
│   │   ├── MissingPerson.js        # Missing person schema
│   │   ├── User.js                 # User schema (Admin / Operator roles)
│   │   └── Zone.js                 # Zone schema (occupancy, density, counts)
│   ├── routes/
│   │   └── api.js                  # All REST API routes
│   ├── .env                        # Environment variables
│   ├── index.js                    # Server entry point, DB seed, Socket.IO
│   └── package.json
│
├── frontend/                       # React + Vite web dashboard
│   └── src/
│       ├── components/
│       │   └── Layout.jsx          # Sidebar, header, dark mode, profile modal
│       ├── context/
│       │   └── AuthContext.jsx     # JWT auth state, login, logout
│       ├── pages/
│       │   ├── Dashboard.jsx       # Live stats: entered, exited, inside, alerts
│       │   ├── Zones.jsx           # Zone occupancy cards
│       │   ├── Analytics.jsx       # Charts and historical data
│       │   ├── Alerts.jsx          # Alert management
│       │   ├── MissingPersons.jsx  # Missing persons tracker
│       │   ├── Settings.jsx        # Admin-only settings
│       │   ├── Login.jsx           # Login page
│       │   └── Landing.jsx         # Public landing page
│       ├── services/
│       │   └── socket.js           # Socket.IO client instance
│       └── App.jsx                 # Routes and protected route logic
│
└── esp32/                          # Arduino firmware
    ├── crowd_pulse.ino             # Main ESP32 sketch (both sensors + buzzer)
    └── README.md                   # Wiring and upload instructions
```

---

## Backend

**Entry point:** `backend/index.js`

- Creates Express app and HTTP server
- Attaches Socket.IO to the HTTP server with CORS open to all origins
- Connects to an in-memory MongoDB instance (no external DB required)
- On startup, clears all zones and seeds a single `Entry` zone with capacity 10,000
- Seeds a default `admin` user if none exists
- Binds to `0.0.0.0` so the ESP32 on the same WiFi network can reach it

**Key design decisions:**

- The `Entry` zone is the single source of truth for all occupancy data
- Both `/iot/entry` and `/iot/exit` operate on the `Entry` zone — entry increments, exit decrements
- `totalEntered` and `totalExited` are cumulative counters that never reset during a session
- `currentOccupancy` = totalEntered − totalExited (never goes below 0)
- Every sensor POST emits a `zone-update` WebSocket event to all connected dashboard clients
- Alerts are created automatically when density reaches `High` or `Critical` and pushed via `new-alert` event

**Density thresholds:**

| Density | Condition | Color |
|---|---|---|
| Low | < 50% capacity | Green |
| Medium | 50% – 74% capacity | Yellow |
| High | 75% – 94% capacity | Orange |
| Critical | ≥ 95% capacity | Red |

---

## Frontend

**Stack:** React 18, Vite, Tailwind CSS, Socket.IO Client, Axios, Recharts, Framer Motion

### Pages

**Dashboard** (`/dashboard`)
The main page. Shows 4 live-updating metrics:
- Total people entered (cumulative)
- Total people exited (cumulative)
- People currently inside (entered − exited)
- Capacity usage bar with density status colour
- Overcrowd alert banner when density is High or Critical
- Live alert feed from WebSocket events

**Zones** (`/dashboard/zones`)
Cards for each zone showing current occupancy, capacity, density status badge, and animated progress bar. Updates in real-time via `zone-update` socket events.

**Analytics** (`/dashboard/analytics`)
Charts and summary statistics pulled from `/api/analytics`.

**Alerts** (`/dashboard/alerts`)
Full alert history with severity badges and resolve functionality.

**Missing Persons** (`/dashboard/missing-persons`)
Register and track missing persons with last-seen zone.

**Settings** (`/dashboard/settings`)
Admin-only. Manage users and system configuration.

### Auth

- JWT stored in `localStorage`
- `AuthContext` provides `user`, `login`, `logout`, `updateProfile` to all pages
- `ProtectedRoute` wrapper redirects unauthenticated users to `/login`
- Admin-only routes redirect Operators to `/dashboard`

### Real-time

`socket.js` exports a single Socket.IO client instance with `autoConnect: false`. Pages call `socket.connect()` in `useEffect` and clean up listeners on unmount.

---

## ESP32 Firmware

**File:** `esp32/crowd_pulse.ino`

### Configuration

No hardcoded WiFi credentials needed! The ESP32 uses WiFiManager for dynamic provisioning:

- **First boot**: Creates `CrowdPulse-XXXXXX` hotspot
- **Captive portal**: Go to `http://192.168.4.1` to select network
- **Persistent storage**: Remembers WiFi credentials using Preferences library
- **Auto-reconnect**: Connects to saved network on subsequent boots
- **Server discovery**: Automatically finds backend server on the network

```cpp
const int MAX_PEOPLE = 15;                   // Buzzer alert threshold
const unsigned long COOLDOWN_MS = 800;       // ms between detections (reduced for better response)
```

### How detection works

Uses **falling-edge detection with internal pullup resistors** — triggers only when the sensor output transitions from HIGH to LOW. This prevents a stationary object from being counted multiple times.

```
lastState == HIGH  →  currentState == LOW  →  person detected (one count)
```

A `COOLDOWN_MS` (800ms) gap is enforced between detections on each sensor to prevent double-counting a single person. The internal pullup resistors ensure stable HIGH state when no object is detected.

### Non-blocking buzzer

The buzzer is driven without `delay()` using a state machine (`buzzerActive`, `buzzerOn`, `buzzerBeeps`). This keeps the sensor read loop running at full speed while the buzzer plays.

### WiFi resilience

- **Persistent credentials**: Saves WiFi credentials using ESP32 Preferences library
- **Auto-reconnects**: Attempts to reconnect using saved credentials if WiFi drops
- **Fallback portal**: If saved credentials fail, starts captive portal again
- **Failed HTTP POSTs**: Queued (`pendingEntry` / `pendingExit`) and retried on the next loop iteration

### Loop flow

```
loop()
  ├── WiFi reconnect check
  ├── Retry pending HTTP posts
  ├── Read ENTRY_SENSOR
  │     ├── Falling edge detected?
  │     │     ├── peopleCount++
  │     │     ├── POST /api/iot/entry
  │     │     └── peopleCount > 15 → triggerBuzzer(6)  else triggerBuzzer(1)
  ├── Read EXIT_SENSOR
  │     ├── Falling edge detected?
  │     │     ├── peopleCount--
  │     │     ├── POST /api/iot/exit
  │     │     └── triggerBuzzer(1)
  └── updateBuzzer()   ← non-blocking buzzer state machine
```

---

## Database Models

### Zone
```
name             String    "Entry"
capacity         Number    10000
currentOccupancy Number    people currently inside
totalEntered     Number    cumulative entries
totalExited      Number    cumulative exits
densityStatus    String    Low | Medium | High | Critical
colorCode        String    green | yellow | orange | red
```

### Alert
```
zoneId    ObjectId  ref → Zone
message   String    description of the alert
severity  String    Low | Medium | High | Critical
status    String    Active | Resolved
createdAt Date      auto
```

### User
```
username  String    unique
password  String    bcrypt hashed
role      String    Admin | Operator
```

### MissingPerson
```
name          String
age           Number
description   String
lastSeenZone  ObjectId  ref → Zone
status        String    Missing | Found
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/register` | Register new user |
| PUT | `/api/auth/profile` | Update username / password |

### IoT (ESP32)
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/iot/entry` | `{ "count": 1 }` | Person entered |
| POST | `/api/iot/exit` | `{ "count": 1 }` | Person exited |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | totalEntered, totalExited, currentStrength, capacity, densityStatus, activeAlerts |
| GET | `/api/analytics` | Extended analytics data |

### Zones
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/zones` | All zones |
| POST | `/api/zones` | Create zone |
| DELETE | `/api/zones/:id` | Delete zone |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | All alerts (latest 50) |
| PATCH | `/api/alerts/:id/resolve` | Mark alert resolved |
| DELETE | `/api/alerts` | Clear all alerts |

### Missing Persons
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/missing-persons` | All records |
| POST | `/api/missing-persons` | Add record |
| PATCH | `/api/missing-persons/:id/found` | Mark as found |

### WebSocket Events
| Event | Direction | Payload | Description |
|---|---|---|---|
| `zone-update` | Server → Client | Zone object | Fired on every entry/exit |
| `new-alert` | Server → Client | Alert object | Fired when threshold crossed |
| `alert-resolved` | Server → Client | Alert object | Fired when alert resolved |

---

## Setup & Running

### Prerequisites
- Node.js v18+
- Arduino IDE with ESP32 board support installed

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://0.0.0.0:5000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at `http://localhost:5173`

### 3. ESP32

1. Open `esp32/crowd_pulse.ino` in Arduino IDE
2. Install required libraries:
   - WiFiManager by tzapu
   - ArduinoJson by Benoit Blanchon
3. Set board to `ESP32 Dev Module`
4. Upload to the ESP32
5. Open Serial Monitor at `115200 baud` to see connection process
6. **First time setup**:
   - ESP32 creates `CrowdPulse-XXXXXX` WiFi hotspot
   - Connect your phone/laptop to this hotspot (password: `crowdpulse123`)
   - Go to `http://192.168.4.1` in browser
   - Select your WiFi network and enter password
   - ESP32 will connect and remember these credentials
7. **Subsequent boots**: ESP32 automatically connects to saved WiFi

### Environment Variables (`backend/.env`)

```
PORT=5000
JWT_SECRET=supersecretpulsekey
NODE_ENV=development
```

---

## Default Credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `password` |
| Role | Admin |
#   I n t e r n s h i p P r o j e c t 2 _ C r o w d P u l s e  
 