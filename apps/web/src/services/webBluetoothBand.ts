/**
 * Web Bluetooth band source (Chrome on Android).
 * No network calls — BLE only.
 */

import {
  NEEMA_BLE,
  encodeBandCommand,
  parseVitalsPacket,
  type BandCommand,
} from '@neema/core';
import type { BandSource, VitalsListener } from './bandSource';

/**
 * Creates a Web Bluetooth band source.
 * Throws a clear error when the browser lacks Web Bluetooth.
 */
export function createWebBluetoothBand(): BandSource {
  if (!('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth is not available in this browser. Use Chrome on Android, or the simulator.');
  }

  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let commandChar: BluetoothRemoteGATTCharacteristic | null = null;
  const listeners = new Set<VitalsListener>();

  const onCharacteristic = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    const bytes = new Uint8Array(value.buffer);
    const sample = parseVitalsPacket(bytes, Date.now());
    if (!sample) return;
    for (const listener of listeners) listener(sample);
  };

  return {
    id: 'web-bluetooth',
    async connect() {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'Neema-Band' }, { services: [NEEMA_BLE.serviceUuid] }],
        optionalServices: [NEEMA_BLE.serviceUuid],
      });
      server = await device.gatt!.connect();
      const service = await server.getPrimaryService(NEEMA_BLE.serviceUuid);
      const vitalsChar = await service.getCharacteristic(NEEMA_BLE.vitalsCharUuid);
      commandChar = await service.getCharacteristic(NEEMA_BLE.commandCharUuid);
      await vitalsChar.startNotifications();
      vitalsChar.addEventListener('characteristicvaluechanged', onCharacteristic);
    },
    async disconnect() {
      if (device?.gatt?.connected) device.gatt.disconnect();
      device = null;
      server = null;
      commandChar = null;
    },
    isConnected() {
      return Boolean(device?.gatt?.connected);
    },
    onVitals(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async sendCommand(command: BandCommand) {
      if (!commandChar) throw new Error('Band not connected');
      const packet = encodeBandCommand(command);
      const copy = new Uint8Array(packet.byteLength);
      copy.set(packet);
      await commandChar.writeValueWithoutResponse(copy);
    },
  };
}
