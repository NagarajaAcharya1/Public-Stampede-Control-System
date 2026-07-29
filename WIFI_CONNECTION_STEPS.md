# 📶 ESP32 WiFi Connection Steps

## What You Need
- ESP32 with uploaded CrowdPulse code
- Phone or laptop with WiFi
- Your home/office WiFi password

## Step-by-Step Instructions

### Step 1: Power On ESP32
- Connect ESP32 to power (USB or external)
- Wait 10-15 seconds for startup
- ESP32 will create a WiFi hotspot

### Step 2: Find the Hotspot
- On your phone/laptop, look for WiFi networks
- Find network named: `CrowdPulse-XXXXXX` (X = random numbers)
- Connect to this network
- Password: `crowd123`

### Step 3: Open Setup Page
- Open any web browser
- Go to: `http://192.168.4.1`
- You'll see WiFi configuration page

### Step 4: Configure WiFi
- Click "Configure WiFi" button
- Select your home/office WiFi from the list
- Enter your WiFi password
- Click "Save" button

### Step 5: ESP32 Connects
- ESP32 will disconnect from setup mode
- It connects to your WiFi network
- ESP32 remembers this WiFi forever
- Green LED or buzzer confirms connection

## ✅ Success!
- ESP32 is now on your WiFi network
- It will auto-connect every time it powers on
- No need to repeat these steps

## 🔄 To Change WiFi Later
- Power on ESP32
- Hold BOOT button for 3 seconds
- ESP32 forgets old WiFi and starts setup again
- Repeat steps above

## 🚨 Troubleshooting

**Can't see CrowdPulse hotspot?**
- Reset ESP32 and wait 30 seconds
- Make sure ESP32 code is uploaded correctly

**Can't open 192.168.4.1?**
- Make sure you're connected to CrowdPulse hotspot
- Try `http://192.168.4.1` (not https)
- Disable mobile data on phone

**ESP32 won't connect to WiFi?**
- Check WiFi password is correct
- Use 2.4GHz WiFi (not 5GHz)
- Try moving ESP32 closer to router

**Still having issues?**
- Check Serial Monitor in Arduino IDE (115200 baud)
- Look for error messages and connection status