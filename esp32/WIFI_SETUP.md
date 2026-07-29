# ESP32 WiFi Setup Guide

## 🔧 How to Connect ESP32 to Your WiFi

### First Time Setup

1. **Upload the code** to ESP32 using Arduino IDE
2. **Open Serial Monitor** (115200 baud) to see status
3. **ESP32 creates hotspot** named `CrowdPulse-XXXXXX`

### Connect to WiFi

4. **On your phone/laptop:**
   - Connect to WiFi: `CrowdPulse-XXXXXX`
   - Password: `crowd123`

5. **Open browser and go to:** `http://192.168.4.1`

6. **WiFi Configuration Page:**
   - Click "Configure WiFi"
   - Select your home/office WiFi network
   - Enter WiFi password
   - Click "Save"

7. **ESP32 connects** to your WiFi and remembers it forever

### What Happens Next

- ESP32 automatically connects to saved WiFi on boot
- Finds the backend server automatically
- Starts monitoring crowd with sensors
- If WiFi fails, it creates the hotspot again

### Reset WiFi Settings

To connect to different WiFi:
- Hold BOOT button on ESP32 for 3 seconds during startup
- ESP32 will forget WiFi and start setup again

### Troubleshooting

**Problem:** Can't see `CrowdPulse-XXXXXX` hotspot
- **Solution:** Reset ESP32, wait 30 seconds

**Problem:** Can't access `http://192.168.4.1`
- **Solution:** Make sure you're connected to ESP32 hotspot, not your regular WiFi

**Problem:** ESP32 won't connect to WiFi
- **Solution:** Check WiFi password, try 2.4GHz network (not 5GHz)

## 📱 Quick Steps Summary

1. Upload code → ESP32 creates hotspot
2. Connect phone to `CrowdPulse-XXXXXX` (password: `crowd123`)
3. Open `http://192.168.4.1` → Configure WiFi
4. Done! ESP32 remembers WiFi forever