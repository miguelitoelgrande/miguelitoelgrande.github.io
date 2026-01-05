# BluetoothLedStrip.js - Enhanced Version

Enhanced JavaScript library for controlling LEDnetWF Bluetooth LED strips with full support for both RGB and White (CCT) LED strips.

## Features

### ✨ New in Version 2.0
- ✅ **White Temperature Control** - Full support for CCT (Correlated Color Temperature) white LED strips
- ✅ **Kelvin Interface** - User-friendly temperature control in Kelvin (2700K-6500K)
- ✅ **Device Type Detection** - Automatically detects RGB vs White LED strips
- ✅ **Enhanced Error Handling** - Better error messages and validation
- ✅ **Full Backward Compatibility** - All existing RGB functions work as before

### Core Features
- RGB color control (0-255)
- White temperature control (warm/cool)
- Brightness control (0-100%)
- Power on/off
- 113 animation modes
- Animation speed control

## Quick Start

### Basic RGB Control

```javascript
import { BluetoothLedStrip } from './BluetoothLedStrip.js';

const device = new BluetoothLedStrip.Device();

// Connect
await device.connect(
    (dev) => console.log('Connected:', dev.name),
    (dev) => console.log('Disconnected'),
    (err) => console.error('Error:', err)
);

// Set RGB color
await device.setRGB(255, 0, 0); // Red

// Set brightness
await device.setBrightness(80); // 80%

// Set mode
await device.setMode(BluetoothLedStrip.MODES.RAINBOW);
```

### White Temperature Control (NEW!)

```javascript
// For white LED strips

// Set temperature using percentage (0=warm, 100=cool)
await device.setWhiteTemperature(50, 100); // Neutral white at 100% brightness

// Or use Kelvin directly
await device.setWhiteKelvin(4000, 80); // 4000K at 80% brightness

// Convenience methods
await device.setWarmWhite(100);    // Full warm white (2700K)
await device.setCoolWhite(100);    // Full cool white (6500K)
await device.setNeutralWhite(80);  // Neutral white at 80%
```

## API Reference

### Connection

#### `connect(onConnect, onDisconnect, onError)`
Connect to LED strip device via Bluetooth.

**Parameters:**
- `onConnect` (Function) - Called when connected, receives device object
- `onDisconnect` (Function) - Called when disconnected
- `onError` (Function) - Called on errors

**Example:**
```javascript
await device.connect(
    (dev) => console.log('Connected to', dev.name),
    (dev) => console.log('Disconnected'),
    (err) => console.error('Error:', err)
);
```

#### `disconnect()`
Manually disconnect from the device.

### RGB Control

#### `setRGB(red, green, blue)`
Set RGB color values.

**Parameters:**
- `red` (Number) - Red value 0-255
- `green` (Number) - Green value 0-255
- `blue` (Number) - Blue value 0-255

**Example:**
```javascript
await device.setRGB(255, 128, 0); // Orange
```

### White Temperature Control (NEW!)

#### `setWhiteTemperature(temperature, brightness)`
Set white LED temperature and brightness.

**Parameters:**
- `temperature` (Number) - Color temperature 0-100
  - 0 = Warm white (2700K)
  - 50 = Neutral white (4600K)
  - 100 = Cool white (6500K)
- `brightness` (Number) - Brightness 0-100

**Example:**
```javascript
await device.setWhiteTemperature(75, 80); // Cool-ish white at 80%
```

#### `setWhiteKelvin(kelvin, brightness)`
Set white LED using Kelvin temperature.

**Parameters:**
- `kelvin` (Number) - Temperature in Kelvin 2700-6500
- `brightness` (Number) - Brightness 0-100

**Example:**
```javascript
await device.setWhiteKelvin(3500, 100); // Warm white at 100%
```

#### `setWarmWhite(level)` / `setCoolWhite(level)` / `setNeutralWhite(level)`
Convenience methods for preset temperatures.

**Parameters:**
- `level` (Number) - Brightness 0-100

**Examples:**
```javascript
await device.setWarmWhite(90);    // 2700K at 90%
await device.setCoolWhite(70);    // 6500K at 70%
await device.setNeutralWhite(85); // 4600K at 85%
```

### Other Controls

#### `setBrightness(value)`
Set overall brightness.

**Parameters:**
- `value` (Number) - Brightness 0-100

#### `setSwitch(state)`
Turn power on or off.

**Parameters:**
- `state` (Number) - 0 = off, 1 = on

#### `setMode(mode)`
Set animation mode.

**Parameters:**
- `mode` (Number) - Mode number 1-113, or use MODES constants

**Example:**
```javascript
await device.setMode(BluetoothLedStrip.MODES.MANUAL);  // Mode 97
await device.setMode(BluetoothLedStrip.MODES.FADE);    // Mode 38
await device.setMode(50); // Custom mode
```

#### `setSpeed(value)`
Set animation speed.

**Parameters:**
- `value` (Number) - Speed 0-100 (0=slowest, 100=fastest)

### Mode Constants

```javascript
BluetoothLedStrip.MODES = {
    MANUAL: 97,    // For manual RGB or white control
    JUMP_RGB: 1,   // Quick color changes
    FADE: 38,      // Smooth transitions
    RAINBOW: 50,   // Rainbow effect
    STROBE: 80,    // Strobe effect
    WAVE: 100      // Wave pattern
    // Modes 1-113 available
}
```

## Important Notes

### For White LED Strips
1. **Set mode to 97 (Manual)** for manual temperature control
   ```javascript
   await device.setMode(97);
   await device.setWhiteTemperature(50, 100);
   ```

2. Animation modes may override white temperature settings

3. White commands may not work on RGB-only strips (deviceType !== 2)

### Device Types
- **deviceType = 2**: White-only (CCT) LED strip
- **deviceType = 1 or 3**: RGB or RGBW LED strip (verify)

Check `device.deviceType` after connection to determine capabilities.

## Browser Compatibility

Requires browsers with Web Bluetooth API support:
- ✅ Chrome/Edge 56+
- ✅ Opera 43+
- ✅ Chrome Android 56+
- ❌ Firefox (behind flag)
- ❌ Safari (not supported)

## Protocol Details

Based on reverse engineering by [8none1/zengge_lednetwf](https://github.com/8none1/zengge_lednetwf).

### White Temperature Packet Structure
```
[0x00, 0x10, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
 0x3b, 0xb1, 0x00, 0x00, 0x00,
 TEMP,        // byte 13: 0-100
 BRIGHTNESS,  // byte 14: 0-100
 0x00, 0x00, 0x00, 0x00, 0x00,
 CHECKSUM]    // byte 20: sum of bytes 9-19
```

## Examples

### Complete HTML Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>LED Controller</title>
</head>
<body>
    <button onclick="connect()">Connect</button>
    <input type="range" id="temp" min="2700" max="6500" value="4000">
    <span id="tempValue">4000K</span>
    
    <script type="module">
        import { BluetoothLedStrip } from './BluetoothLedStrip.js';
        
        let device;
        
        window.connect = async function() {
            device = new BluetoothLedStrip.Device();
            await device.connect(
                (d) => console.log('Connected:', d.name),
                (d) => console.log('Disconnected'),
                (e) => console.error('Error:', e)
            );
            
            // Set to manual mode for white control
            await device.setMode(97);
        }
        
        document.getElementById('temp').addEventListener('input', async (e) => {
            const kelvin = parseInt(e.target.value);
            document.getElementById('tempValue').textContent = kelvin + 'K';
            
            if (device) {
                await device.setWhiteKelvin(kelvin, 100);
            }
        });
    </script>
</body>
</html>
```

## Development

### File Structure
```
BluetoothLedStrip/
├── BluetoothLedStrip.js          # Main library (use this)
├── BluetoothLedStrip.min.js      # Minified version (optional)
├── BluetoothLedStrip.js.map      # Source map (if minified)
├── package.json                  # Build configuration
└── README.md                     # This file
```

### Building Minified Version (Optional)

```bash
# Install dependencies
npm install

# Build minified version
npm run build

# Run local server for testing
npm run dev
```

This creates `BluetoothLedStrip.min.js` with source map for production use.

## Migration from v1.x

All existing code continues to work! New white temperature functions are purely additive.

**Before (v1.x):**
```javascript
// RGB only
await device.setRGB(255, 255, 255); // White-ish
```

**After (v2.0):**
```javascript
// For RGB strips - still works!
await device.setRGB(255, 0, 0);

// For white strips - NEW!
await device.setWhiteKelvin(4000, 100);
```

## Troubleshooting

### White temperature not working?
1. Check device type: `console.log(device.deviceType)` (should be 2 for white strips)
2. Set mode to 97: `await device.setMode(97)`
3. Ensure device is powered on: `await device.setSwitch(1)`

### RGB not working on white strip?
White-only strips (deviceType=2) don't support RGB. Use white temperature functions instead.

### Connection issues?
1. Ensure Web Bluetooth is supported in your browser
2. Check that Bluetooth is enabled on your device
3. Make sure the LED strip is powered and in pairing mode

## License

MIT License - feel free to use in your projects!

## Contributing

Issues and pull requests welcome at:
https://github.com/miguelitoelgrande/miguelitoelgrande.github.io

## Credits

- Protocol reverse engineering: [8none1/zengge_lednetwf](https://github.com/8none1/zengge_lednetwf)
- Original library concept: miguelitoelgrande
- Enhanced white LED support: v2.0 contributors

## Changelog

### v2.0.0 (2026-01-05)
- ✨ Added white temperature control for CCT LED strips
- ✨ Added Kelvin-based temperature interface
- ✨ Added convenience methods (setWarmWhite, setCoolWhite, etc.)
- ✨ Added proper LEDnetWF white packet support
- ✨ Added device type detection
- ✨ Enhanced error handling and validation
- ✨ Added MODES constants
- 📝 Complete API documentation
- ✅ Full backward compatibility maintained

### v1.x
- Initial RGB LED strip support
- Basic LEDnetWF protocol implementation
