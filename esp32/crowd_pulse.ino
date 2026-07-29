/*
 * CrowdPulse ESP32 - BULLETPROOF COUNTING SYSTEM
 * 
 * CRITICAL FIX: Exit sensor will ONLY count if people are inside
 * - Entry: Always allowed (totalEntered++, currentInside++)
 * - Exit: ONLY if currentInside > 0 (totalExited++, currentInside--)
 * - If currentInside == 0: EXIT IS COMPLETELY IGNORED
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// Hardware pins
#define ENTRY_SENSOR    34
#define EXIT_SENSOR     35
#define BUZZER          25
#define RESET_BUTTON    0

// Timing parameters
#define COOLDOWN_MS     800
#define SERVER_TIMEOUT  5000

// Global variables
Preferences preferences;
WiFiManager wifiManager;
String serverURL = "";

// BULLETPROOF COUNTING SYSTEM
struct CountingSystem {
  int totalEntered = 0;    // Total people who entered
  int totalExited = 0;     // Total people who exited
  int currentInside = 0;   // People currently inside
  
  // Add entry (always allowed)
  void addEntry() {
    totalEntered++;
    currentInside++;
    Serial.printf("✅ ENTRY: Total=%d, Inside=%d\n", totalEntered, currentInside);
  }
  
  // Add exit (ONLY if people inside)
  bool addExit() {
    if (currentInside > 0) {
      totalExited++;
      currentInside--;
      Serial.printf("✅ EXIT: Total=%d, Inside=%d\n", totalExited, currentInside);
      return true; // Valid exit
    } else {
      Serial.printf("❌ EXIT IGNORED: No people inside (Inside=%d)\n", currentInside);
      return false; // Invalid exit - ignored
    }
  }
  
  // Validate counting logic
  bool isValid() {
    return (currentInside >= 0 && 
            totalExited <= totalEntered && 
            currentInside == (totalEntered - totalExited));
  }
  
  void printStatus() {
    Serial.println("📊 COUNTING STATUS:");
    Serial.printf("   Entered: %d\n", totalEntered);
    Serial.printf("   Exited:  %d\n", totalExited);
    Serial.printf("   Inside:  %d\n", currentInside);
    Serial.printf("   Valid:   %s\n", isValid() ? "✅" : "❌");
  }
} counts;

// Sensor states
int lastEntryState = HIGH;
int lastExitState = HIGH;
unsigned long lastEntryTime = 0;
unsigned long lastExitTime = 0;

// Buzzer system
bool buzzerActive = false;
int buzzerBeeps = 0;
int buzzerTarget = 0;
unsigned long buzzerLastMs = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 CrowdPulse ESP32 - BULLETPROOF COUNTING");
  Serial.println("==========================================");
  
  // Initialize hardware
  pinMode(ENTRY_SENSOR, INPUT_PULLUP);
  pinMode(EXIT_SENSOR, INPUT_PULLUP);
  pinMode(BUZZER, OUTPUT);
  pinMode(RESET_BUTTON, INPUT_PULLUP);
  digitalWrite(BUZZER, LOW);
  
  // Initialize preferences
  preferences.begin("crowdpulse", false);
  
  // Test buzzer
  testBuzzer();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Discover server
  discoverServer();
  
  Serial.println("✅ System ready - Bulletproof counting active!");
  counts.printStatus();
}

void testBuzzer() {
  Serial.println("🔊 Testing buzzer...");
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(100);
    digitalWrite(BUZZER, LOW);
    delay(100);
  }
}

void connectToWiFi() {
  Serial.println("📶 Connecting to WiFi...");
  
  String savedSSID = preferences.getString("wifi_ssid", "");
  String savedPass = preferences.getString("wifi_pass", "");
  
  if (savedSSID.length() > 0) {
    WiFi.begin(savedSSID.c_str(), savedPass.c_str());
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi connected!");
      Serial.println("IP: " + WiFi.localIP().toString());
      return;
    }
  }
  
  // Start WiFi configuration portal
  Serial.println("\n🔧 Starting WiFi setup...");
  String apName = "CrowdPulse-" + String(ESP.getEfuseMac(), HEX);
  
  Serial.println("📱 CONNECT TO WIFI:");
  Serial.println("   Hotspot: " + apName);
  Serial.println("   Password: crowd123");
  Serial.println("   Setup URL: http://192.168.4.1");
  
  if (wifiManager.autoConnect(apName.c_str(), "crowd123")) {
    Serial.println("✅ WiFi connected via portal!");
    preferences.putString("wifi_ssid", WiFi.SSID());
    preferences.putString("wifi_pass", WiFi.psk());
  } else {
    Serial.println("❌ WiFi connection failed!");
    ESP.restart();
  }
}

void discoverServer() {
  Serial.println("🔍 Discovering server...");
  
  IPAddress localIP = WiFi.localIP();
  String networkBase = String(localIP[0]) + "." + String(localIP[1]) + "." + String(localIP[2]) + ".";
  
  // Get your computer's likely IP
  IPAddress gatewayIP = WiFi.gatewayIP();
  String computerIP = String(gatewayIP[0]) + "." + String(gatewayIP[1]) + "." + String(gatewayIP[2]) + ".";
  
  String candidates[] = {
    "10.61.190.197",        // Your computer's actual IP
    computerIP + "44",        // Common computer IP
    networkBase + "1",        // Router
    networkBase + "100",      // Common DHCP range
    networkBase + "44",       // Your computer might be here
    "192.168.1.44",          // Fallback
    "10.0.0.44"              // Another fallback
  };
  
  for (String candidate : candidates) {
    String testURL = "http://" + candidate + ":5000";
    Serial.println("Testing: " + testURL);
    
    if (testServerConnection(testURL)) {
      serverURL = testURL;
      Serial.println("✅ Server found: " + serverURL);
      triggerBuzzer(2);
      return;
    }
  }
  
  // Try gateway IP as last resort
  serverURL = "http://" + WiFi.gatewayIP().toString() + ":5000";
  Serial.println("⚠️ Using fallback: " + serverURL);
  triggerBuzzer(3);
}

bool testServerConnection(String url) {
  HTTPClient http;
  http.begin(url + "/api/stats");
  http.setTimeout(3000);
  
  int httpCode = http.GET();
  http.end();
  
  return (httpCode == 200);
}

bool readSensorDebounced(int pin) {
  int lowCount = 0;
  
  for (int i = 0; i < 3; i++) {
    if (digitalRead(pin) == LOW) {
      lowCount++;
    }
    delay(10);
  }
  
  return (lowCount >= 2);
}

void processSensors() {
  unsigned long now = millis();
  
  int entryState = digitalRead(ENTRY_SENSOR);
  int exitState = digitalRead(EXIT_SENSOR);
  
  // ==========================================
  // ENTRY SENSOR - ALWAYS ALLOWED
  // ==========================================
  if (lastEntryState == HIGH && entryState == LOW && 
      (now - lastEntryTime > COOLDOWN_MS)) {
    
    if (readSensorDebounced(ENTRY_SENSOR)) {
      lastEntryTime = now;
      
      // BULLETPROOF ENTRY LOGIC
      counts.addEntry();
      
      // Audio feedback
      if (counts.currentInside > 15) {
        triggerBuzzer(6); // Overcrowd alert
      } else {
        triggerBuzzer(1); // Normal beep
      }
      
      // Send to server
      postToServer("/api/iot/entry");
      counts.printStatus();
    }
  }
  
  // ==========================================
  // EXIT SENSOR - BULLETPROOF LOGIC
  // ==========================================
  if (lastExitState == HIGH && exitState == LOW && 
      (now - lastExitTime > COOLDOWN_MS)) {
    
    if (readSensorDebounced(EXIT_SENSOR)) {
      lastExitTime = now;
      
      // BULLETPROOF EXIT LOGIC - ONLY IF PEOPLE INSIDE
      if (counts.addExit()) {
        // Valid exit - send to server
        triggerBuzzer(1); // Normal beep
        postToServer("/api/iot/exit");
        counts.printStatus();
      } else {
        // Invalid exit - completely ignored
        triggerBuzzer(3); // Warning beeps
        Serial.println("⚠️ EXIT SENSOR TRIGGERED BUT IGNORED!");
        Serial.println("⚠️ REASON: No people inside to exit");
        
        // Optionally send warning to server
        postInvalidExitWarning();
      }
    }
  }
  
  // Update sensor states
  lastEntryState = entryState;
  lastExitState = exitState;
}

bool postToServer(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED || serverURL.length() == 0) {
    return false;
  }
  
  HTTPClient http;
  String url = serverURL + endpoint;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(SERVER_TIMEOUT);
  
  // Send current counts for server validation
  String payload = "{";
  payload += "\"count\":1,";
  payload += "\"deviceId\":\"" + WiFi.macAddress() + "\",";
  payload += "\"totalEntered\":" + String(counts.totalEntered) + ",";
  payload += "\"totalExited\":" + String(counts.totalExited) + ",";
  payload += "\"currentInside\":" + String(counts.currentInside);
  payload += "}";
  
  int httpCode = http.POST(payload);
  String response = http.getString();
  http.end();
  
  if (httpCode == 200) {
    Serial.printf("✅ POST %s → Success\n", endpoint);
    return true;
  } else {
    Serial.printf("❌ POST %s → Error %d\n", endpoint, httpCode);
    if (response.length() > 0) {
      Serial.println("Response: " + response);
    }
    return false;
  }
}

void postInvalidExitWarning() {
  if (WiFi.status() != WL_CONNECTED || serverURL.length() == 0) {
    return;
  }
  
  HTTPClient http;
  String url = serverURL + "/api/iot/invalid-exit";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(SERVER_TIMEOUT);
  
  String payload = "{";
  payload += "\"deviceId\":\"" + WiFi.macAddress() + "\",";
  payload += "\"message\":\"Invalid exit ignored - no people inside\",";
  payload += "\"currentInside\":" + String(counts.currentInside);
  payload += "}";
  
  int httpCode = http.POST(payload);
  http.end();
  
  if (httpCode == 200) {
    Serial.println("✅ Invalid exit warning sent to server");
  }
}

void triggerBuzzer(int beeps) {
  if (buzzerActive) return;
  
  buzzerTarget = beeps;
  buzzerBeeps = 0;
  buzzerActive = true;
  buzzerLastMs = millis();
}

void updateBuzzer() {
  if (!buzzerActive) return;
  
  unsigned long now = millis();
  static bool buzzerOn = false;
  
  if (now - buzzerLastMs >= (buzzerOn ? 100 : 150)) {
    buzzerLastMs = now;
    
    if (!buzzerOn) {
      digitalWrite(BUZZER, HIGH);
      buzzerOn = true;
    } else {
      digitalWrite(BUZZER, LOW);
      buzzerOn = false;
      buzzerBeeps++;
      
      if (buzzerBeeps >= buzzerTarget) {
        buzzerActive = false;
      }
    }
  }
}

void checkResetButton() {
  static unsigned long resetStart = 0;
  static bool resetPressed = false;
  
  bool buttonPressed = (digitalRead(RESET_BUTTON) == LOW);
  
  if (buttonPressed && !resetPressed) {
    resetPressed = true;
    resetStart = millis();
    Serial.println("🔄 Reset button pressed...");
  }
  
  if (buttonPressed && resetPressed) {
    if (millis() - resetStart >= 3000) {
      Serial.println("🔄 FACTORY RESET!");
      
      // Clear all data
      preferences.clear();
      wifiManager.resetSettings();
      
      // Reset counts
      counts.totalEntered = 0;
      counts.totalExited = 0;
      counts.currentInside = 0;
      
      // Buzzer feedback
      for (int i = 0; i < 5; i++) {
        digitalWrite(BUZZER, HIGH);
        delay(100);
        digitalWrite(BUZZER, LOW);
        delay(100);
      }
      
      ESP.restart();
    }
  }
  
  if (!buttonPressed) {
    resetPressed = false;
  }
}

void loop() {
  // Process sensors (highest priority)
  processSensors();
  
  // Update buzzer
  updateBuzzer();
  
  // Check reset button
  checkResetButton();
  
  // Validate counting system
  if (!counts.isValid()) {
    Serial.println("❌ CRITICAL ERROR: Invalid counting state!");
    counts.printStatus();
  }
  
  delay(10);
}