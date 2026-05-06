// =============================================
// CrowdPulse — ESP32 + 2 IR Sensors + Buzzer
// =============================================

#include <WiFi.h>
#include <HTTPClient.h>

// -------- WIFI --------
const char* ssid     = "NetKing";
const char* password = "11111111";

// -------- SERVER --------
const char* SERVER = "http://10.61.190.197:5000";

// -------- PINS --------
#define ENTRY_SENSOR 34
#define EXIT_SENSOR  35
#define BUZZER       25

// -------- SETTINGS --------
const unsigned long COOLDOWN_MS    = 1200;
const unsigned long WIFI_RETRY_MS  = 5000;   // how often to retry WiFi reconnect
const int           MAX_PEOPLE     = 15;     // buzzer alert threshold

// -------- STATE --------
int  peopleCount    = 0;
int  lastEntryState = HIGH;
int  lastExitState  = HIGH;

unsigned long lastEntryTime  = 0;
unsigned long lastExitTime   = 0;
unsigned long lastWifiRetry  = 0;

// -------- NON-BLOCKING BUZZER --------
bool          buzzerActive   = false;
int           buzzerBeeps    = 0;
int           buzzerTarget   = 0;
bool          buzzerOn       = false;
unsigned long buzzerLastMs   = 0;
const int     BEEP_ON_MS     = 120;
const int     BEEP_OFF_MS    = 120;

// -------- PENDING HTTP QUEUE (simple 1-slot retry) --------
// If a POST fails, we store it and retry next loop iteration
bool        pendingEntry = false;
bool        pendingExit  = false;

// =============================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(ENTRY_SENSOR, INPUT);
  pinMode(EXIT_SENSOR,  INPUT);
  pinMode(BUZZER,       OUTPUT);
  digitalWrite(BUZZER,  LOW);

  connectWiFi();
}

// =============================================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi FAILED — will retry in loop");
  }
}

// =============================================
// NON-BLOCKING POST — returns true on success
// =============================================
bool postToServer(const char* endpoint) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(SERVER) + endpoint;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);  // 3s timeout so loop doesn't hang forever

  int code = http.POST("{\"count\":1}");
  http.end();

  if (code == 200 || code == 201) {
    Serial.printf("POST %s -> %d\n", endpoint, code);
    return true;
  } else {
    Serial.printf("POST %s FAILED -> %d\n", endpoint, code);
    return false;
  }
}

// =============================================
// TRIGGER NON-BLOCKING BUZZER
// beeps = number of beep pulses
// =============================================
void triggerBuzzer(int beeps) {
  if (buzzerActive) return;  // don't interrupt ongoing beep
  buzzerTarget  = beeps;
  buzzerBeeps   = 0;
  buzzerOn      = false;
  buzzerActive  = true;
  buzzerLastMs  = millis();
}

// Call every loop — drives buzzer without delay()
void updateBuzzer() {
  if (!buzzerActive) return;

  unsigned long now = millis();
  unsigned long interval = buzzerOn ? BEEP_ON_MS : BEEP_OFF_MS;

  if (now - buzzerLastMs >= interval) {
    buzzerLastMs = now;
    if (!buzzerOn) {
      // Start a beep pulse
      digitalWrite(BUZZER, HIGH);
      buzzerOn = true;
    } else {
      // End the pulse
      digitalWrite(BUZZER, LOW);
      buzzerOn = false;
      buzzerBeeps++;
      if (buzzerBeeps >= buzzerTarget) {
        buzzerActive = false;
      }
    }
  }
}

// =============================================
void loop() {
  unsigned long now = millis();

  // ---- WiFi auto-reconnect ----
  if (WiFi.status() != WL_CONNECTED && (now - lastWifiRetry > WIFI_RETRY_MS)) {
    lastWifiRetry = now;
    Serial.println("WiFi lost — reconnecting...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }

  // ---- Retry pending HTTP posts ----
  if (pendingEntry && postToServer("/api/iot/entry")) pendingEntry = false;
  if (pendingExit  && postToServer("/api/iot/exit"))  pendingExit  = false;

  // ---- Read sensors ----
  int entryState = digitalRead(ENTRY_SENSOR);
  int exitState  = digitalRead(EXIT_SENSOR);

  // ---- ENTRY: HIGH → LOW falling edge ----
  if (lastEntryState == HIGH && entryState == LOW &&
      (now - lastEntryTime > COOLDOWN_MS)) {

    lastEntryTime = now;
    peopleCount++;
    Serial.printf("ENTERED | Count: %d\n", peopleCount);

    if (!postToServer("/api/iot/entry")) {
      pendingEntry = true;
    }

    if (peopleCount > MAX_PEOPLE) {
      // Force override any active buzzer and play alert tone
      buzzerActive = false;
      triggerBuzzer(6);  // 6 rapid beeps = overcrowd alert
      Serial.println("!!! OVERCROWD ALERT — " + String(peopleCount) + " people inside !!!");
    } else {
      triggerBuzzer(1);  // 1 short beep for normal entry
    }
  }

  // ---- EXIT: HIGH → LOW falling edge ----
  if (lastExitState == HIGH && exitState == LOW &&
      (now - lastExitTime > COOLDOWN_MS)) {

    lastExitTime = now;
    if (peopleCount > 0) peopleCount--;
    Serial.printf("EXITED  | Count: %d\n", peopleCount);

    triggerBuzzer(1);  // 1 short beep

    if (!postToServer("/api/iot/exit")) {
      pendingExit = true;  // queue retry
    }
  }

  // ---- Update edge state ----
  lastEntryState = entryState;
  lastExitState  = exitState;

  // ---- Drive buzzer (non-blocking) ----
  updateBuzzer();

  // Small yield — no delay() so sensor reads stay responsive
  delay(10);
}
