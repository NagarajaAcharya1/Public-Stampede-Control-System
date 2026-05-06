#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiManager.h>

// =============================================
// CrowdPulse — ESP32 + 2 IR Sensors + Buzzer
// Dynamic WiFi Provisioning Version
// =============================================

// -------- SERVER --------
const char *SERVER = "http://10.61.190.197:5000";

// -------- PINS --------
#define ENTRY_SENSOR 34
#define EXIT_SENSOR 35
#define BUZZER 25

// -------- SETTINGS --------
const unsigned long COOLDOWN_MS = 1200;
const unsigned long WIFI_RETRY_MS = 5000;
const int MAX_PEOPLE = 15;

// -------- STATE --------
int peopleCount = 0;
int lastEntryState = HIGH;
int lastExitState = HIGH;

unsigned long lastEntryTime = 0;
unsigned long lastExitTime = 0;
unsigned long lastWifiRetry = 0;

// -------- NON-BLOCKING BUZZER --------
bool buzzerActive = false;
int buzzerBeeps = 0;
int buzzerTarget = 0;
bool buzzerOn = false;
unsigned long buzzerLastMs = 0;

const int BEEP_ON_MS = 120;
const int BEEP_OFF_MS = 120;

// -------- PENDING HTTP QUEUE --------
bool pendingEntry = false;
bool pendingExit = false;

// =============================================
void setup()
{

  Serial.begin(115200);
  delay(1000);

  pinMode(ENTRY_SENSOR, INPUT);
  pinMode(EXIT_SENSOR, INPUT);

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  setupWiFi();
}

// =============================================
// WIFI MANAGER SETUP
// =============================================
void setupWiFi()
{

  WiFiManager wm;

  // OPTIONAL:
  // Uncomment this if you want to reset saved WiFi
  // wm.resetSettings();

  Serial.println("\nStarting WiFi Manager...");

  bool connected;

  connected = wm.autoConnect("CrowdPulse-Setup");

  if (!connected)
  {

    Serial.println("WiFi Failed!");
    ESP.restart();
  }

  Serial.println("=================================");
  Serial.println("WiFi Connected Successfully");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("=================================");
}

// =============================================
// NON-BLOCKING POST
// =============================================
bool postToServer(const char *endpoint)
{

  if (WiFi.status() != WL_CONNECTED)
  {
    return false;
  }

  HTTPClient http;

  String url = String(SERVER) + endpoint;

  http.begin(url);

  http.addHeader("Content-Type", "application/json");

  http.setTimeout(3000);

  int code = http.POST("{\"count\":1}");

  http.end();

  if (code == 200 || code == 201)
  {

    Serial.printf("POST %s -> %d\n", endpoint, code);

    return true;
  }
  else
  {

    Serial.printf("POST %s FAILED -> %d\n", endpoint, code);

    return false;
  }
}

// =============================================
// BUZZER CONTROL
// =============================================
void triggerBuzzer(int beeps)
{

  if (buzzerActive)
    return;

  buzzerTarget = beeps;
  buzzerBeeps = 0;
  buzzerOn = false;

  buzzerActive = true;

  buzzerLastMs = millis();
}

// =============================================
void updateBuzzer()
{

  if (!buzzerActive)
    return;

  unsigned long now = millis();

  unsigned long interval =
      buzzerOn ? BEEP_ON_MS : BEEP_OFF_MS;

  if (now - buzzerLastMs >= interval)
  {

    buzzerLastMs = now;

    if (!buzzerOn)
    {

      digitalWrite(BUZZER, HIGH);

      buzzerOn = true;
    }
    else
    {

      digitalWrite(BUZZER, LOW);

      buzzerOn = false;

      buzzerBeeps++;

      if (buzzerBeeps >= buzzerTarget)
      {

        buzzerActive = false;
      }
    }
  }
}

// =============================================
void reconnectWiFi()
{

  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.println("WiFi Lost! Reconnecting...");

  WiFi.reconnect();
}

// =============================================
void loop()
{

  unsigned long now = millis();

  // ===========================================
  // WIFI RECONNECT
  // ===========================================
  if (WiFi.status() != WL_CONNECTED &&
      (now - lastWifiRetry > WIFI_RETRY_MS))
  {

    lastWifiRetry = now;

    reconnectWiFi();
  }

  // ===========================================
  // RETRY FAILED POSTS
  // ===========================================
  if (pendingEntry &&
      postToServer("/api/iot/entry"))
  {

    pendingEntry = false;
  }

  if (pendingExit &&
      postToServer("/api/iot/exit"))
  {

    pendingExit = false;
  }

  // ===========================================
  // SENSOR READINGS
  // ===========================================
  int entryState = digitalRead(ENTRY_SENSOR);

  int exitState = digitalRead(EXIT_SENSOR);

  // ===========================================
  // ENTRY DETECT
  // ===========================================
  if (lastEntryState == HIGH &&
      entryState == LOW &&
      (now - lastEntryTime > COOLDOWN_MS))
  {

    lastEntryTime = now;

    peopleCount++;

    Serial.printf(
        "ENTERED | Count: %d\n",
        peopleCount);

    if (!postToServer("/api/iot/entry"))
    {

      pendingEntry = true;
    }

    // OVERCROWD ALERT
    if (peopleCount > MAX_PEOPLE)
    {

      buzzerActive = false;

      triggerBuzzer(6);

      Serial.println(
          "!!! OVERCROWD ALERT !!!");
    }
    else
    {

      triggerBuzzer(1);
    }
  }

  // ===========================================
  // EXIT DETECT
  // ===========================================
  if (lastExitState == HIGH &&
      exitState == LOW &&
      (now - lastExitTime > COOLDOWN_MS))
  {

    lastExitTime = now;

    if (peopleCount > 0)
    {

      peopleCount--;
    }

    Serial.printf(
        "EXITED | Count: %d\n",
        peopleCount);

    triggerBuzzer(1);

    if (!postToServer("/api/iot/exit"))
    {

      pendingExit = true;
    }
  }

  // ===========================================
  // UPDATE STATES
  // ===========================================
  lastEntryState = entryState;

  lastExitState = exitState;

  // ===========================================
  // UPDATE BUZZER
  // ===========================================
  updateBuzzer();

  delay(10);
}