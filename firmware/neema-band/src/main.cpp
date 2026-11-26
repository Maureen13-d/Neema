/**
 * Neema band firmware.
 * Reads MAX30102 heart rate + DS18B20 skin temperature, notifies over BLE
 * once per second using the @neema/core 12-byte packet layout. Demo scenarios
 * replace sensors when the phone sends a demo command or DEMO_SCENARIO is non-zero.
 */

#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <NimBLEDevice.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "config.h"

static MAX30105 particleSensor;
static OneWire oneWire(PIN_DS18B20_DATA);
static DallasTemperature tempSensor(&oneWire);

static NimBLECharacteristic *vitalsChar = nullptr;
static NimBLECharacteristic *commandChar = nullptr;

static uint16_t seq = 0;
static uint8_t demoScenario = 0; // 0 = real sensors
static bool sensorsOk = false;
static unsigned long sosPressStarted = 0;
static unsigned long sosUntilMs = 0;
static uint8_t ledMode = 0; // 0 off, 1 green, 2 yellow, 3 red

class CommandCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *pCharacteristic) override {
    std::string value = pCharacteristic->getValue();
    if (value.size() < NEEMA_CMD_LEN) return;
    uint8_t id = (uint8_t)value[0];
    uint8_t arg = (uint8_t)value[1];
    if (id == 0x01 && arg <= 3) {
      ledMode = arg;
    } else if (id == 0x02) {
      unsigned long ms = arg == 2 ? 400 : (arg == 3 ? 800 : 120);
      digitalWrite(PIN_VIBRATION, HIGH);
      delay(ms);
      digitalWrite(PIN_VIBRATION, LOW);
    } else if (id == 0x03 && arg <= 3) {
      demoScenario = arg;
    }
  }
};

static void applyLed() {
  digitalWrite(PIN_LED_GREEN, ledMode == 1 ? HIGH : LOW);
  digitalWrite(PIN_LED_YELLOW, ledMode == 2 ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, ledMode == 3 ? HIGH : LOW);
}

static bool sosActive() {
  return millis() < sosUntilMs;
}

static void readSos() {
  bool pressed = digitalRead(PIN_SOS_BUTTON) == LOW;
  if (pressed) {
    if (sosPressStarted == 0) sosPressStarted = millis();
    if (millis() - sosPressStarted >= SOS_LONG_PRESS_MS) {
      sosUntilMs = millis() + SOS_HOLD_MS;
      // Brief SOS vibration on latch.
      digitalWrite(PIN_VIBRATION, HIGH);
      delay(800);
      digitalWrite(PIN_VIBRATION, LOW);
      sosPressStarted = 0;
    }
  } else {
    sosPressStarted = 0;
  }
}

static bool readHeartRate(float &bpmOut) {
  if (!sensorsOk) return false;
  long ir = particleSensor.getIR();
  if (ir < 50000) return false;
  if (checkForBeat(ir)) {
    static unsigned long lastBeat = 0;
    unsigned long now = millis();
    unsigned long delta = now - lastBeat;
    lastBeat = now;
    if (delta > 0) {
      float bpm = 60.0f / (delta / 1000.0f);
      if (bpm > 40 && bpm < 180) {
        bpmOut = bpm;
        return true;
      }
    }
  }
  return false;
}

static bool readTempC(float &tempOut) {
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C || t < -10 || t > 50) return false;
  tempOut = t;
  return true;
}

static void demoValues(float &hr, bool &hrOk, float &tempC, bool &tempOk) {
  unsigned long t = millis() / 1000;
  switch (demoScenario) {
    case 1:
      hr = 72 + (t % 5);
      tempC = 36.5f + ((t % 3) * 0.05f);
      break;
    case 2:
      hr = 88 + (t % 6);
      tempC = 37.2f + ((t % 4) * 0.05f);
      break;
    case 3:
      hr = 116 + (t % 5);
      tempC = 38.3f + ((t % 3) * 0.05f);
      break;
    default:
      hr = 70;
      tempC = 36.5f;
      break;
  }
  hrOk = true;
  tempOk = true;
}

static void buildAndNotify() {
  float hr = 0;
  float tempC = 0;
  bool hrOk = false;
  bool tempOk = false;

  if (demoScenario > 0) {
    demoValues(hr, hrOk, tempC, tempOk);
  } else {
    hrOk = readHeartRate(hr);
    tempOk = readTempC(tempC);
  }

  uint8_t packet[NEEMA_PACKET_LEN] = {0};
  packet[0] = NEEMA_VERSION;

  uint8_t flags = 0;
  if (hrOk) flags |= FLAG_HR_VALID;
  if (tempOk) flags |= FLAG_TEMP_VALID;
  if (sosActive()) flags |= FLAG_SOS;
  if (demoScenario > 0) flags |= FLAG_DEMO;
  packet[1] = flags;

  uint16_t hrInt = hrOk ? (uint16_t)constrain((int)(hr + 0.5f), 30, 220) : 0;
  packet[2] = hrInt & 0xff;
  packet[3] = (hrInt >> 8) & 0xff;

  int16_t tempX100 = tempOk ? (int16_t)(tempC * 100.0f) : 0;
  packet[4] = tempX100 & 0xff;
  packet[5] = (tempX100 >> 8) & 0xff;

  packet[6] = seq & 0xff;
  packet[7] = (seq >> 8) & 0xff;
  seq++;

  packet[8] = 255; // battery unknown on prototype
  packet[9] = hrOk ? 90 : 10;
  // 10-11 reserved

  if (vitalsChar) {
    vitalsChar->setValue(packet, NEEMA_PACKET_LEN);
    vitalsChar->notify();
  }
}

void setup() {
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_VIBRATION, OUTPUT);
  digitalWrite(PIN_VIBRATION, LOW);
  applyLed();

  Wire.begin(PIN_MAX30102_SDA, PIN_MAX30102_SCL);
  sensorsOk = particleSensor.begin(Wire, I2C_SPEED_FAST);
  if (sensorsOk) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }
  tempSensor.begin();

  NimBLEDevice::init(NEEMA_DEVICE_NAME);
  NimBLEServer *server = NimBLEDevice::createServer();
  NimBLEService *service = server->createService(NEEMA_SERVICE_UUID);
  vitalsChar = service->createCharacteristic(
      NEEMA_VITALS_CHAR_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  commandChar = service->createCharacteristic(
      NEEMA_COMMAND_CHAR_UUID,
      NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  commandChar->setCallbacks(new CommandCallbacks());
  service->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(NEEMA_SERVICE_UUID);
  adv->setName(NEEMA_DEVICE_NAME);
  adv->start();
}

void loop() {
  readSos();
  applyLed();
  buildAndNotify();
  delay(SAMPLE_INTERVAL_MS);
}
