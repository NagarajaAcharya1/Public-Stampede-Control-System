# CrowdPulse — ESP32 Firmware

Single ESP32 with two IR sensors (Entry + Exit) and a buzzer.

## Wiring

| Component        | ESP32 Pin  |
|------------------|------------|
| Entry IR — VCC   | 3.3V       |
| Entry IR — GND   | GND        |
| Entry IR — OUT   | GPIO 34    |
| Exit IR  — VCC   | 3.3V       |
| Exit IR  — GND   | GND        |
| Exit IR  — OUT   | GPIO 35    |
| Buzzer   — +     | GPIO 25    |
| Buzzer   — −     | GND        |

> GPIO 34 and 35 are input-only pins on ESP32 — do not use them as outputs.

## Configuration (top of sketch)

| Constant       | Default          | Description                                      |
|----------------|------------------|--------------------------------------------------|
| `ssid`         | `"NetKing"`      | Your WiFi SSID                                   |
| `password`     | `"11111111"`     | Your WiFi password                               |
| `SERVER`       | `http://10.61.190.197:5000` | Backend IP — must match your machine's LAN IP |
| `COOLDOWN_MS`  | `1200`           | Min ms between counts (prevents double-trigger)  |
| `MAX_PEOPLE`   | `50`             | Local buzzer overcrowd threshold                 |

## Upload Steps

1. Open **Arduino IDE**
2. Install board: **ESP32 by Espressif** via Board Manager
3. Select board: `ESP32 Dev Module`
4. Open `crowd_pulse.ino` → select the correct COM port → Upload
5. Open Serial Monitor at **115200 baud** to verify detections

## How it works

- IR sensor output is **HIGH** at rest, goes **LOW** when beam is broken
- Falling edge (HIGH → LOW) triggers entry or exit count
- Each event POSTs `{"count": 1}` to `/api/iot/entry` or `/api/iot/exit`
- The backend updates the zone occupancy and emits a `zone-update` socket event
- The dashboard receives the socket event and updates in real-time
- If WiFi drops, the ESP32 auto-reconnects every 5 seconds
- If an HTTP POST fails, it is retried on the next loop iteration
- Buzzer: 1 beep per person, 4 rapid beeps when `MAX_PEOPLE` is exceeded
