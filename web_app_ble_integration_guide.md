# AS7343-BIO Web Bluetooth Integration Guide

This document is a comprehensive guide for frontend web developers integrating the **AS7343-BIO** device via the Web Bluetooth API. 

## ⚠️ Important Note: Binary Payload vs JSON
The ESP32 firmware communicates using **raw, packed binary structs**, not JSON strings. This is to maximize throughput and minimize latency over BLE. 
**DO NOT use `JSON.parse()` or `TextDecoder`** on incoming data from the device. Instead, use JavaScript's built-in `DataView` to read specific bytes according to the structures defined below.

---

## 1. BLE Service Architecture
Connect to the device using the main service UUID, then interface with the required characteristics:

*   **Service UUID**: `0000FFF0-0000-1000-8000-00805F9B34FB`

| Characteristic Name | UUID | Permissions | Purpose |
|---------------------|-------|-------------|---------|
| **Command** | `...FFF1...` | Write | Start/Stop scans |
| **Waveform** | `...FFF2...` | Notify | Live streaming 40Hz PPG data |
| **Biomarkers** | `...FFF3...` | Notify | Final 30s calculated results |
| **Status** | `...FFF4...` | Notify | Device state updates (Idle/Running/Finished) |
| **Calibration** | `...FFF5...` | Write | Push ground truth to auto-calibrate device |

*(Note: All UUIDs share the suffix `-0000-1000-8000-00805F9B34FB`)*

---

## 2. Starting Scans (FFF1 - Command)

To initiate a 30-second measurement scan, write a **single byte** (Uint8) to the `FFF1` characteristic.

### Command Bytes:
*   `0x01` : Start **Normal Mode** (~40Hz). Computes Hb, SpO2, Bilirubin, PI, SQI.
*   `0x03` : Start **Fast Mode** (200Hz). Computes HR, SDNN, RMSSD, BP, Respiration.
*   `0x02` : Stop current scan manually.

### JavaScript Implementation:
```javascript
// Example: Starting Normal Mode (0x01)
async function startNormalMode(commandCharacteristic) {
    const cmdArray = new Uint8Array([0x01]);
    await commandCharacteristic.writeValue(cmdArray);
    console.log("Sent Normal Scan Command (0x01)");
}

// Example: Starting Fast Mode (0x03)
async function startFastMode(commandCharacteristic) {
    const cmdArray = new Uint8Array([0x03]);
    await commandCharacteristic.writeValue(cmdArray);
    console.log("Sent Fast Scan Command (0x03)");
}
```

---

## 3. Monitoring Device State (FFF4 - Status)

Whenever the device state changes (e.g., from Idle to Running), it sends a 1-byte notification to `FFF4`.

### Status Bytes:
*   `0x00`: Idle (Ready for commands)
*   `0x01`: Running Normal Mode 
*   `0x03`: Running Fast Mode
*   `0x02`: Finished (Scan complete, expect Biomarker packet imminently)

### JavaScript Decoding:
```javascript
statusCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
    const dataView = event.target.value;
    const statusByte = dataView.getUint8(0);
    
    switch(statusByte) {
        case 0x00: console.log("Device is IDLE"); break;
        case 0x01: console.log("Device is RUNNING (Normal Mode)"); break;
        case 0x03: console.log("Device is RUNNING (Fast Mode)"); break;
        case 0x02: console.log("Device FINISHED scan!"); break;
        default: console.log("Unknown status:", statusByte);
    }
});
```

---

## 4. Decoding Live Waveforms (FFF2 - Waveform)

While scanning in any mode, the device constantly streams the raw pulse signals at roughly 40Hz. 
*In Fast Mode (200Hz), the device intelligently decimates the stream by 5 internally to output a 40Hz preview without congesting BLE.*

**Payload Length: 11 Bytes** (Packed Struct)

| Offset | Type | Name | Description |
|---|---|---|---|
| `0` | `Uint32` | `timestamp_ms` | Time elapsed since scan started (Little Endian) |
| `4` | `Uint16` | `raw_nir` | Primary PPG sensor value (Use this for charting) |
| `6` | `Uint16` | `raw_f8` | Secondary PPG value |
| `8` | `Uint16` | `raw_fz` | Tertiary sensor value |
| `10`| `Uint8`  | `sqi` / `hr` | *Ignore during live preview (set to 0)* |

### JavaScript Decoding:
```javascript
waveformCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
    const dataView = event.target.value;
    
    // IMPORTANT: Ensure payload is correct length before parsing
    if (dataView.byteLength === 11) {
        // True = Little Endian architecture of ESP32
        const timestamp = dataView.getUint32(0, true); 
        const nirSignal = dataView.getUint16(4, true); 
        
        // Push 'nirSignal' to your charting library using 'timestamp' for the X-axis
        updateChart(timestamp, nirSignal);
    }
});
```

---

## 5. Decoding Final Results (FFF3 - Biomarkers)
**🔥 This is the most critical calculation payload.**

Exactly after 30 seconds of scanning, the device finishes processing the high-fidelity buffers mathematically and sends a **single 21-byte packet** over Characteristic `FFF3`.

**Payload Length: 21 Bytes**

### Understanding Mode Offsets
The very first byte tells you which array to look at. If `mode == 0x01`, you decode offsets 1-9 and ignore 10-19. If `mode == 0x03`, you ignore offsets 1-9 and decode 10-19.

| Offset | Size | JS Type Decoder | Name | Active In Mode | Description |
|---|---|---|---|---|---|
| **0** | 1 | `getUint8` | **`mode`** | **BOTH** | `0x01` = Normal, `0x03` = Fast |
| **1** | 2 | `getUint16(true)/100` | `hb` | Normal | Hemoglobin (g/dL) |
| **3** | 2 | `getUint16(true)/100`| `spo2` | Normal | SpO2 (%) |
| **5** | 2 | `getUint16(true)/100`| `bili` | Normal | Bilirubin (mg/dL) |
| **7** | 2 | `getUint16(true)/1000`|`pi` | Normal | Perfusion Index (%) |
| **9** | 1 | `getUint8` | `sqi` | Normal | Signal Quality (0-100) |
| **10**| 2 | `getUint16(true)`| `sdnn` | Fast | HRV SDNN (ms) |
| **12**| 2 | `getUint16(true)`| `rmssd`| Fast | HRV RMSSD (ms) |
| **14**| 2 | `getUint16(true)`| `bp_sys`| Fast | Systolic BP (mmHg) |
| **16**| 2 | `getUint16(true)`| `bp_dia`| Fast | Diastolic BP (mmHg) |
| **18**| 2 | `getUint16(true)`| `resp` | Fast | Respiration (bpm) |
| **20**| 1 | `getUint8` | `EOF` | BOTH | Always `0xFE` |

### Javascript Decoding:
```javascript
biomarkerCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
    const dataView = event.target.value;
    
    if (dataView.byteLength === 21) {
        const mode = dataView.getUint8(0); // Determine parsing mode
        
        if (mode === 0x01) {
            console.log("--- NORMAL MODE RESULTS ---");
            const hb   = dataView.getUint16(1, true) / 100.0;
            const spo2 = dataView.getUint16(3, true) / 100.0;
            const bili = dataView.getUint16(5, true) / 100.0;
            const pi   = dataView.getUint16(7, true) / 1000.0;
            const sqi  = dataView.getUint8(9);
            
            console.log(`Hb: ${hb} g/dL, SpO2: ${spo2}%, Bili: ${bili} mg/dL, PI: ${pi}%, SQI: ${sqi}`);
            // TODO: Render to UI
            
        } else if (mode === 0x03) {
            console.log("--- FAST MODE RESULTS ---");
            const sdnn   = dataView.getUint16(10, true);
            const rmssd  = dataView.getUint16(12, true);
            const bp_sys = dataView.getUint16(14, true);
            const bp_dia = dataView.getUint16(16, true);
            const resp   = dataView.getUint16(18, true);
            
            console.log(`SDNN: ${sdnn}ms, RMSSD: ${rmssd}ms, BP: ${bp_sys}/${bp_dia}, Resp: ${resp} bpm`);
            // TODO: Render to UI
        }
    } else {
        console.error("Malformed Biomarker Data: Invalid length " + dataView.byteLength);
    }
});
```

---

## 6. Self-Learning Calibration Data (FFF5 - Write)

If you wish to allow the ESP32 to permanently "learn" and calibrate to a clinical device using its internal Stochastic Gradient Descent algorithm, send a heavily strict **5-byte packet** to `FFF5` *only while the device is in Idle status (0x00)*.

*   `Byte 0`: `0x01` (Calibrate SpO2), `0x02` (Calibrate Hb), `0x03` (Calibrate Bili)
*   `Bytes 1-4`: Float32 of the actual test value (e.g. `98.6f` or `14.2f`)

### JavaScript Encoding Wrapper
```javascript
async function sendCalibrationTarget(calibCharacteristic, targetId, floatValue) {
    // We construct a 5-byte buffer
    const buffer = new ArrayBuffer(5);
    const dataView = new DataView(buffer);
    
    // Set Target ID (Uint8)
    dataView.setUint8(0, targetId);
    
    // Set Ground Truth Value (Float32, Little Endian)
    dataView.setFloat32(1, floatValue, true); 
    
    // Send to device
    await calibCharacteristic.writeValue(buffer);
    console.log(`Sent Calibration: ID ${targetId}, Truth ${floatValue}`);
}

// Example: Calibrating Hb to precisely 14.5 g/dL
// await sendCalibrationTarget(charFFF5, 0x02, 14.5);
```
