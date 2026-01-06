# BluetoothLedStrip.js Enhancement Proposal

## Executive Summary
Based on reverse engineering of the LEDnetWF protocol and user needs for white-only LED strips, this proposal outlines enhancements to add comprehensive white LED support to the BluetoothLedStrip.js library.

## Current State
The library currently supports:
- `setRGB(r, g, b)` - RGB color control (0-255 each)
- `setBrightness(value)` - Brightness (0-100 for LEDnetWF)
- `setSwitch(state)` - Power on/off
- `setMode(mode)` - Animation mode (1-113 for LEDnetWF)
- `setSpeed(value)` - Animation speed (0-100 for LEDnetWF)

## Problem
White-only (CCT - Correlated Color Temperature) LED strips cannot be controlled properly with the current API. These strips have:
- Warm white LEDs (~2700K)
- Cool white LEDs (~6500K)
- No RGB support

Users need to control the color temperature (warm to cool) but the library has no dedicated function for this.

## Protocol Analysis

### LEDnetWF White Packet Structure
Based on 8none1/zengge_lednetwf research:

```
WHITE_PACKET = [0x00, 0x10, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b, 
                0x3b, 0xb1, 0x00, 0x00, 0x00, TEMP, BRIGHT, 0x00, 
                0x00, 0x00, 0x00, 0x00, CHECKSUM]
```

Where:
- **Byte 13 (TEMP)**: White temperature 0x00-0x64 (0-100)
  - 0x00 = Warm white only (2700K)
  - 0x64 = Cool white only (6500K)
- **Byte 14 (BRIGHT)**: Brightness 0x00-0x64 (0-100)
- **Byte 20 (CHECKSUM)**: Sum of bytes from position 9 onwards (excluding checksum itself)

### Checksum Calculation
```javascript
function calculateChecksum(packet) {
    let sum = 0;
    for (let i = 9; i < packet.length - 1; i++) {
        sum += packet[i];
    }
    return sum & 0xFF; // Keep only the last byte
}
```

## Proposed Enhancements

### 1. Add `setWhiteTemperature(temperature, brightness)` Method

```javascript
/**
 * Set white LED temperature and brightness
 * @param {number} temperature - Color temperature 0-100 (0=warm/2700K, 100=cool/6500K)
 * @param {number} brightness - Brightness level 0-100
 * @returns {Promise} Resolves when command is sent
 */
async setWhiteTemperature(temperature, brightness) {
    if (temperature < 0 || temperature > 100) {
        throw new Error('Temperature must be between 0 and 100');
    }
    if (brightness < 0 || brightness > 100) {
        throw new Error('Brightness must be between 0 and 100');
    }
    
    const packet = new Uint8Array([
        0x00, 0x10, 0x80, 0x00, 0x00, 0x0d, 0x0e, 0x0b,
        0x3b, 0xb1, 0x00, 0x00, 0x00,
        Math.round(temperature), // byte 13
        Math.round(brightness),  // byte 14
        0x00, 0x00, 0x00, 0x00, 0x00,
        0x00 // checksum placeholder
    ]);
    
    // Calculate and set checksum
    let sum = 0;
    for (let i = 9; i < packet.length - 1; i++) {
        sum += packet[i];
    }
    packet[20] = sum & 0xFF;
    
    return await this.characteristic.writeValue(packet);
}
```

### 2. Add `setWarmWhite(level)` and `setCoolWhite(level)` Convenience Methods

```javascript
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
```

### 3. Add `setWhiteKelvin(kelvin, brightness)` Method

For users who prefer Kelvin temperature values:

```javascript
/**
 * Set white LED using Kelvin temperature
 * @param {number} kelvin - Color temperature in Kelvin (2700-6500)
 * @param {number} brightness - Brightness level 0-100
 */
async setWhiteKelvin(kelvin, brightness) {
    if (kelvin < 2700 || kelvin > 6500) {
        throw new Error('Kelvin must be between 2700 and 6500');
    }
    
    // Convert Kelvin to 0-100 scale
    const temperature = ((kelvin - 2700) / (6500 - 2700)) * 100;
    return await this.setWhiteTemperature(temperature, brightness);
}
```

### 4. Add Device Capability Detection

```javascript
/**
 * Detect device capabilities
 * @returns {Object} Device capabilities
 */
async getDeviceCapabilities() {
    // Send query packet (from protocol docs)
    const queryPacket = new Uint8Array([
        0x00, 0x02, 0x80, 0x00, 0x00, 0x05, 0x06, 0x0a,
        0x63, 0x12, 0x21, 0xf0, 0x86
    ]);
    
    await this.characteristic.writeValue(queryPacket);
    
    // Read response to determine RGB vs White vs RGBW
    // This would need proper implementation based on device response
    return {
        hasRGB: true,
        hasWhite: true,
        hasRGBW: false,
        deviceType: 'LEDnetWF',
        firmwareVersion: null
    };
}
```

### 5. Enhanced Mode 97 Support

Mode 97 appears to be the manual control mode for LEDnetWF. Add documentation:

```javascript
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
    // ... modes 1-113 available
};
```

## Implementation Priority

### Phase 1 (Critical)
1. ✅ `setWhiteTemperature(temperature, brightness)` - Core white control
2. ✅ Checksum calculation for white packets
3. ✅ `setWhiteKelvin()` - User-friendly Kelvin interface

### Phase 2 (Important)
4. ✅ `setWarmWhite()`, `setCoolWhite()`, `setNeutralWhite()` - Convenience methods
5. ✅ Mode constants documentation
6. ✅ Error handling and validation

### Phase 3 (Nice to have)
7. `getDeviceCapabilities()` - Auto-detect RGB vs White vs RGBW
8. Device state query/feedback
9. Firmware version detection

## Testing Requirements

### Test Cases
1. **White temperature range**: Test 0, 25, 50, 75, 100 values
2. **Brightness range**: Test 0-100 brightness with different temperatures
3. **Checksum validation**: Verify checksum calculation
4. **Mode compatibility**: Test white commands in mode 97
5. **RGB fallback**: Test behavior on RGB-only devices
6. **Edge cases**: Test invalid inputs, boundary values

### Test Devices Needed
- White-only CCT strip (warm/cool)
- RGB strip (existing support)
- RGBW strip (future support)
- Multiple LEDnetWF firmware versions

## Documentation Updates

### README.md
```markdown
## White LED Control

For white-only LED strips with color temperature control:

### Set White Temperature
\`\`\`javascript
// Temperature: 0 (warm/2700K) to 100 (cool/6500K)
device.setWhiteTemperature(temperature, brightness);

// Or use Kelvin directly
device.setWhiteKelvin(4000, 80); // 4000K at 80% brightness
\`\`\`

### Convenience Methods
\`\`\`javascript
device.setWarmWhite(100);    // Full warm white (2700K)
device.setCoolWhite(100);    // Full cool white (6500K)
device.setNeutralWhite(80);  // 80% neutral white (4600K)
\`\`\`

### Important Notes
- Set device to mode 97 (Manual) for manual temperature control
- Animation modes may override white temperature settings
- White commands may not work on RGB-only strips
\`\`\`

### API Reference

Add detailed JSDoc comments for all new methods with:
- Parameter descriptions and ranges
- Return types
- Example usage
- Error conditions

## Backward Compatibility

All existing functionality remains unchanged:
- ✅ `setRGB()` continues to work for RGB strips
- ✅ `setBrightness()` works as before
- ✅ All existing modes work as before
- ✅ No breaking changes to existing API

New methods are purely additive.

## Code Example: Updated example.html

```html
<!-- White Temperature Control -->
<div>
    <label>Color Temperature (Kelvin):</label>
    <input type="range" id="kelvin" min="2700" max="6500" value="4000">
    <span id="kelvinValue">4000K</span>
    <button onclick="setKelvin()">Set Temperature</button>
</div>

<script>
    function setKelvin() {
        const kelvin = document.getElementById('kelvin').value;
        const brightness = 100;
        device.setWhiteKelvin(kelvin, brightness);
        document.getElementById('kelvinValue').textContent = kelvin + 'K';
    }
</script>
```

## Additional Considerations

### 1. Protocol Variations
Different LEDnetWF firmware versions may have slight variations. Consider:
- Version detection
- Fallback strategies
- Protocol negotiation

### 2. RGBW Support (Future)
Some devices have both RGB and white channels. Future enhancement:
```javascript
setRGBW(r, g, b, white, temperature);
```

### 3. Transition Effects
Add smooth transitions for white temperature:
```javascript
transitionWhiteTemperature(targetTemp, duration);
```

### 4. Power Management
Optimize for battery-powered controllers:
- Batch commands when possible
- Implement command queuing
- Add delay between commands

## References

- [8none1/zengge_lednetwf](https://github.com/8none1/zengge_lednetwf) - Protocol reverse engineering
- [8none1/lednetwf_ble](https://github.com/raulgbcr/lednetwf_ble) - Home Assistant integration
- [LEDnetWF Protocol Documentation](https://github.com/8none1/zengge_lednetwf/blob/main/readme.md)

## Success Metrics

Enhancement is successful when:
1. ✅ White-only LED strips can be controlled via temperature slider
2. ✅ Smooth transition from warm (2700K) to cool (6500K)
3. ✅ Brightness control works independently of temperature
4. ✅ No regression in existing RGB functionality
5. ✅ Clear documentation with examples
6. ✅ At least 2 different white LED strip models tested

---

**Next Steps:**
1. Review and approve this proposal
2. Implement Phase 1 features
3. Test with actual white LED hardware
4. Create pull request with changes
5. Update documentation
6. Release new version

**Estimated Implementation Time:** 4-6 hours for Phase 1

**Questions/Feedback:** Please open an issue or PR at https://github.com/miguelitoelgrande/miguelitoelgrande.github.io
