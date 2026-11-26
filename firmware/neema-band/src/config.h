#pragma once

// Pin map from project documentation (ESP32 DevKit). Adjust per board.
#define PIN_MAX30102_SDA 21
#define PIN_MAX30102_SCL 22
#define PIN_DS18B20_DATA 4
#define PIN_SOS_BUTTON 27
#define PIN_LED_GREEN 25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED 33
#define PIN_VIBRATION 32

// BLE UUIDs must match packages/core/src/protocol.ts (Cursor build brief).
#define NEEMA_SERVICE_UUID        "7a1c0001-5e3b-4f6d-9a21-8c4e2f1b0d00"
#define NEEMA_VITALS_CHAR_UUID    "7a1c0002-5e3b-4f6d-9a21-8c4e2f1b0d00"
#define NEEMA_COMMAND_CHAR_UUID   "7a1c0003-5e3b-4f6d-9a21-8c4e2f1b0d00"
#define NEEMA_DEVICE_NAME         "Neema-01"

// Packet constants (12-byte vitals notify, 2-byte command — matches @neema/core)
#define NEEMA_VERSION 0x01
#define NEEMA_PACKET_LEN 12
#define NEEMA_CMD_LEN 2

#define FLAG_HR_VALID   (1 << 0)
#define FLAG_TEMP_VALID (1 << 1)
#define FLAG_SOS        (1 << 2)
#define FLAG_DEMO       (1 << 3)

// Skin temp calibration offset is applied on the phone; firmware sends RAW.
#define SAMPLE_INTERVAL_MS 1000
#define SOS_LONG_PRESS_MS 2000
#define SOS_HOLD_MS 30000
