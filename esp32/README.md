# ESP32 CrowdPulse Firmware

## Wiring Diagram

| Component | Pin | ESP32 GPIO | Notes |
|---|---|---|---|
| IR Entry Sensor | OUT | GPIO 34 | Input-only pin with internal pullup |
| IR Exit Sensor | OUT | GPIO 35 | Input-only pin with internal pullup |
| Buzzer | + | GPIO 25 | Active buzzer |
| All sensors | VCC | 3.3V | Power supply |
| All sensors | GND | GND | Ground |

## Required Libraries

Install these libraries in Arduino IDE (Tools → Manage Libraries):

1. **WiFiManager** by tzapu (v2.0.16-rc.2 or later)
2. **ArduinoJson** by Benoit Blanchon (v6.21.3 or later)

## Upload Instructions

1. Open `crowd_pulse.ino` in Arduino IDE
2. Select **ESP32 Dev Module** as board
3. Set upload speed to **115200**
4. Connect ESP32 via USB and select correct COM port
5. Click Upload

## First Time Setup

1. **Power on ESP32** - it will create a WiFi hotspot
2. **Connect to hotspot**: `CrowdPulse-XXXXXX` (password: `crowdpulse123`)
3. **Open browser**: Go to `http://192.168.4.1`
4. **Select network**: Choose your WiFi network from the list
5. **Enter password**: Type your WiFi password
6. **Save**: ESP32 will connect and remember these credentials

## Subsequent Boots

- ESP32 automatically connects to saved WiFi network
- No need to repeat setup process
- If WiFi fails, it will create hotspot again

## Serial Monitor Output

Open Serial Monitor at **115200 baud** to see:
- WiFi connection status
- Server discovery process
- Sensor detection events
- HTTP POST results

## Troubleshooting

**ESP32 not creating hotspot:**
- Check power supply (use USB cable, not just power adapter)
- Press EN (reset) button on ESP32
- Verify upload was successful

**Sensors not detecting:**
- Check wiring connections
- Verify sensors have power (3.3V)
- Test sensors individually with multimeter
- Ensure sensors are positioned correctly (facing the detection area)

**WiFi connection fails:**
- Double-check WiFi password
- Ensure network is 2.4GHz (ESP32 doesn't support 5GHz)
- Try moving ESP32 closer to router

**Server not found:**
- Ensure backend is running on same network
- Check backend server IP in Serial Monitor
- Verify firewall isn't blocking port 5000

## Performance Optimizations

- **Fast Detection**: 300ms cooldown between detections (reduced from 800ms)
- **Debounced Reading**: 3-sample debouncing with 10ms intervals for accuracy
- **Quick HTTP**: 3-second timeout, minimal JSON payload
- **Faster Buzzer**: 80ms beep timing for immediate feedback
- **Reduced Delays**: 20ms main loop delay for responsive detection

## Sensor Behavior

- **Normal operation**: 1 beep per person entry/exit
- **Overcrowd alert**: 6 rapid beeps when local count > 15 people
- **Config mode**: 3 beeps when entering WiFi setup mode
- **Success**: 2 beeps when WiFi credentials saved

## Reset WiFi Credentials

To clear saved WiFi and start fresh:
1. Uncomment `// wifiManager.resetSettings();` in the code
2. Upload to ESP32
3. Power cycle the device
4. Comment out the line again and re-upload