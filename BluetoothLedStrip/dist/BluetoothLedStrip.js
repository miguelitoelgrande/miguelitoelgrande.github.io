/**
 * BluetoothLedStrip.js - Enhanced Version with White LED Support
 * 
 * Supports both RGB and White (CCT) LED strips using LEDnetWF protocol
 * Based on protocol analysis from https://github.com/8none1/zengge_lednetwf
 */

export const BluetoothLedStrip = (function() {
    'use strict';

    const LEDNETWF_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
    const LEDNETWF_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

    /**
     * LEDnetWF Mode Constants
     */
    const MODES = {
        MANUAL: 97,        // For manual RGB or white temperature control
        JUMP_RGB: 1,       // Quick color changes
        FADE: 38,          // Smooth color transitions
        RAINBOW: 50,       // Rainbow effect
        STROBE: 80,        // Strobe/flash effect
        WAVE: 100          // Wave pattern
    };

    class Device {
        constructor() {
            this.device = null;
            this.characteristic = null;
            this.onConnectCallback = null;
            this.onDisconnectCallback = null;
            this.onErrorCallback = null;
        }

        /**
         * Calculate checksum for LEDnetWF packets
         * @private
         */
        _calculateChecksum(packet) {
            let sum = 0;
            for (let i = 9; i < packet.length - 1; i++) {
                sum += packet[i];
            }
            return sum & 0xFF;
        }

        /**
         * Write packet to device with error handling
         * @private
         */
        async _writePacket(packet) {
            try {
                if (!this.characteristic) {
                    throw new Error('Device not connected');
                }
                await this.characteristic.writeValue(packet);
                return true;
            } catch (error) {
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
                throw error;
            }
        }

        /**
         * Connect to LED strip device
         */
        async connect(onConnect, onDisconnect, onError) {
            this.onConnectCallback = onConnect;
            this.onDisconnectCallback = onDisconnect;
            this.onErrorCallback = onError;

            try {
                // Request device
                this.device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: [LEDNETWF_SERVICE_UUID] }]
                });

                // Connect to GATT server
                const server = await this.device.gatt.connect();
                
                // Get service
                const service = await server.getPrimaryService(LEDNETWF_SERVICE_UUID);
                
                // Get characteristic
                this.characteristic = await service.getCharacteristic(LEDNETWF_CHAR_UUID);

                // Setup disconnect handler
                this.device.addEventListener('gattserverdisconnected', () => {
                    if (this.onDisconnectCallback) {
                        this.onDisconnectCallback(this.device);
                    }
                });

                // Call connect callback
                if (this.onConnectCallback) {
                    this.onConnectCallback(this.device);
                }

            } catch (error) {
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
                throw error;
            }
        }

        /**
         * Disconnect from device
         */
        disconnect() {
            if (this.device && this.device.gatt.connected) {
                this.device.gatt.disconnect();
            }
        }

        /**
         * Set RGB color (0-255 each)
         * @param {number} red - Red value 0-255
         * @param {number} green - Green value 0-255
         * @param {number} blue - Blue value 0-255
         */
        async setRGB(red, green, blue) {
            red = Math.max(0, Math.min(255, Math.round(red)));
            green = Math.max(0, Math.min(255, Math.round(green)));
            blue = Math.max(0, Math.min(255, Math.round(blue)));

            const packet = new Uint8Array([
                0x00, 0x05, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, 0xa1, red, green, blue, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Set white LED temperature and brightness
         * @param {number} temperature - Color temperature 0-100 (0=warm/2700K, 100=cool/6500K)
         * @param {number} brightness - Brightness level 0-100
         */
        async setWhiteTemperature(temperature, brightness) {
            temperature = Math.max(0, Math.min(100, Math.round(temperature)));
            brightness = Math.max(0, Math.min(100, Math.round(brightness)));

            const packet = new Uint8Array([
                0x00, 0x10, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, 0xb1, 0x00, 0x00, 0x00,
                temperature,  // byte 13
                brightness,   // byte 14
                0x00, 0x00, 0x00, 0x00, 0x00,
                0x00 // checksum placeholder
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Set white LED using Kelvin temperature
         * @param {number} kelvin - Color temperature in Kelvin (2700-6500)
         * @param {number} brightness - Brightness level 0-100
         */
        async setWhiteKelvin(kelvin, brightness) {
            kelvin = Math.max(2700, Math.min(6500, kelvin));
            const temperature = ((kelvin - 2700) / (6500 - 2700)) * 100;
            return await this.setWhiteTemperature(temperature, brightness);
        }

        /**
         * Set warm white LED level (2700K)
         * @param {number} level - Brightness 0-100
         */
        async setWarmWhite(level) {
            return await this.setWhiteTemperature(0, level);
        }

        /**
         * Set cool white LED level (6500K)
         * @param {number} level - Brightness 0-100
         */
        async setCoolWhite(level) {
            return await this.setWhiteTemperature(100, level);
        }

        /**
         * Set neutral white (4600K)
         * @param {number} level - Brightness 0-100
         */
        async setNeutralWhite(level) {
            return await this.setWhiteTemperature(50, level);
        }

        /**
         * Set overall brightness (0-100 for LEDnetWF)
         * @param {number} value - Brightness 0-100
         */
        async setBrightness(value) {
            value = Math.max(0, Math.min(100, Math.round(value)));

            const packet = new Uint8Array([
                0x00, 0x06, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, 0x34, value, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Toggle power on/off
         * @param {number} value - 0=off, 1=on
         */
        async setSwitch(value) {
            const isOn = value ? 0x23 : 0x24;

            const packet = new Uint8Array([
                0x00, value ? 0x04 : 0x5b, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, isOn, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x32, 0x00, 0x00, 0x00
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Set animation mode (1-113 for LEDnetWF)
         * @param {number} mode - Mode number (use MODES constants or 1-113)
         */
        async setMode(mode) {
            mode = Math.max(1, Math.min(113, Math.round(mode)));

            const packet = new Uint8Array([
                0x00, 0x07, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, 0x2c, mode, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Set animation speed (0-100 for LEDnetWF, 0=slowest, 100=fastest)
         * @param {number} value - Speed 0-100
         */
        async setSpeed(value) {
            value = Math.max(0, Math.min(100, Math.round(value)));

            const packet = new Uint8Array([
                0x00, 0x08, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
                0x3b, 0x2b, value, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            packet[20] = this._calculateChecksum(packet);
            return await this._writePacket(packet);
        }

        /**
         * Query device settings (experimental)
         * @returns {Promise} Promise that resolves when query is sent
         */
        async queryDeviceSettings() {
            const packet = new Uint8Array([
                0x00, 0x02, 0x80, 0x00, 0x00, 0x05, 0x06, 0x0a,
                0x63, 0x12, 0x21, 0xf0, 0x86
            ]);

            return await this._writePacket(packet);
        }
    }

    return {
        Device: Device,
        MODES: MODES
    };
})();
