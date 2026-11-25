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

// BLE UUIDs must match packages/core/src/protocol.ts
#define NEEMA_SERVICE_UUID        "6e65656d-6100-1000-8000-00805f9b34fb"
#define NEEMA_VITALS_CHAR_UUID    "6e65656d-6101-1000-8000-00805f9b34fb"
#define NEEMA_COMMAND_CHAR_UUID   "6e65656d-6102-1000-8000-00805f9b34fb"
#define NEEMA_DEVICE_NAME         "Neema-Band"

// Packet constants (ASSUMPTION: matches @neema/core protocol)
#define NEEMA_MAGIC 0x4E
#define NEEMA_VERSION 0x01
#define NEEMA_PACKET_LEN 10
#define NEEMA_CMD_LEN 3

#define FLAG_SOS        (1 << 0)
#define FLAG_DEMO       (1 << 1)
#define FLAG_HR_VALID   (1 << 2)
#define FLAG_TEMP_VALID (1 << 3)
#define FLAG_BATT_VALID (1 << 4)

// Skin temp calibration offset is applied on the phone; firmware sends RAW.
#define SAMPLE_INTERVAL_MS 1000
#define SOS_LONG_PRESS_MS 3000
