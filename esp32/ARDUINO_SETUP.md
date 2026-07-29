# ESP32 Arduino Libraries Required

## Installation Instructions

### 1. ESP32 Board Support
1. Open Arduino IDE
2. Go to File → Preferences
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to Tools → Board → Boards Manager
5. Search "ESP32" and install "esp32 by Espressif Systems"

### 2. Required Libraries
Install these libraries via Arduino IDE Library Manager (Tools → Manage Libraries):

#### WiFiManager
- **Name**: WiFiManager
- **Author**: tzapu
- **Version**: 2.0.16-rc.2 or later
- **Description**: Dynamic WiFi configuration with captive portal

#### ArduinoJson
- **Name**: ArduinoJson
- **Author**: Benoit Blanchon
- **Version**: 6.21.4 or later
- **Description**: JSON parsing and generation

#### HTTPClient
- **Name**: Built-in with ESP32 core
- **Description**: HTTP client for REST API calls

#### Preferences
- **Name**: Built-in with ESP32 core
- **Description**: Non-volatile storage for WiFi credentials

#### ESPmDNS
- **Name**: Built-in with ESP32 core
- **Description**: Network discovery support

### 3. Board Configuration
- **Board**: ESP32 Dev Module
- **Upload Speed**: 921600
- **CPU Frequency**: 240MHz (WiFi/BT)
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 4MB (32Mb)
- **Partition Scheme**: Default 4MB with spiffs
- **Core Debug Level**: None
- **PSRAM**: Disabled

### 4. Pin Configuration Verification
```cpp
// Verify these pins are available on your ESP32 board
#define ENTRY_SENSOR    34    // Input only pin
#define EXIT_SENSOR     35    // Input only pin  
#define BUZZER          25    // Output pin
#define RESET_BUTTON    0     // Built-in boot button
```

### 5. Upload Process
1. Connect ESP32 via USB
2. Select correct COM port in Tools → Port
3. Hold BOOT button while clicking upload (if needed)
4. Monitor Serial output at 115200 baud

### 6. First Time Setup
1. Upload firmware
2. ESP32 creates "CrowdPulse-XXXXXX" hotspot
3. Connect phone/laptop to hotspot (password: crowd123)
4. Navigate to http://192.168.4.1
5. Configure WiFi and server settings
6. ESP32 will remember settings permanently

### 7. Troubleshooting
- **Upload fails**: Hold BOOT button during upload
- **WiFi issues**: Use reset button (hold 3 seconds) to clear settings
- **Sensor issues**: Check wiring and pin assignments
- **Server not found**: Verify backend is running and accessible