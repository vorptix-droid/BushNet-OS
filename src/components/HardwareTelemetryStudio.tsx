import React from 'react';
import { Cpu, Thermometer, Wind, Gauge, Compass, AlertCircle, Droplets, MapPin, Radio, Zap, Navigation, Power, CheckCircle2 } from 'lucide-react';
import { SensorTelemetry } from '../types';

interface HardwareTelemetryStudioProps {
  telemetry: SensorTelemetry;
  isAiPowered?: boolean;
  onUpdateTelemetry: (updated: Partial<SensorTelemetry>) => void;
  onToggleEmergency: () => void;
  onToggleAiPower?: () => void;
}

function getCardinal(deg: number): string {
  const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.floor((((deg % 360) + 22.5) / 45.0)) % 8;
  return cardinals[idx];
}

export const HardwareTelemetryStudio: React.FC<HardwareTelemetryStudioProps> = ({
  telemetry,
  isAiPowered = true,
  onUpdateTelemetry,
  onToggleEmergency,
  onToggleAiPower,
}) => {
  const [countdown, setCountdown] = React.useState<number | null>(null);

  const handlePowerOffWithCountdown = () => {
    if (!isAiPowered) return;
    setCountdown(3);
    const timer3 = setTimeout(() => setCountdown(2), 1000);
    const timer2 = setTimeout(() => setCountdown(1), 2000);
    const timer1 = setTimeout(() => {
      setCountdown(null);
      if (onToggleAiPower) {
        onToggleAiPower();
      }
    }, 3000);
  };

  const handlePressureChange = (val: number) => {
    let trend: SensorTelemetry['pressureTrend'] = 'Stable';
    const diff = val - telemetry.bmpPressure;
    if (diff < -3) trend = 'Rapid Drop (Storm Alert)';
    else if (diff < -1) trend = 'Falling';
    else if (diff > 1) trend = 'Rising';

    // BMP180 barometric formula matching Pi 5 core daemon fix with calibrated QNH
    const qnh = telemetry.baroQnhHpa || 1013.25;
    const calculatedAlt = Math.round(44330.0 * (1.0 - Math.pow(val / qnh, 0.1902949)));

    onUpdateTelemetry({
      bmpPressure: val,
      bmpAlt: calculatedAlt,
      pressureTrend: trend,
    });
  };

  const isColdFront = (telemetry.bmpPressure >= 1018 || telemetry.pressureTrend === 'Rising') && telemetry.dhtTemp < 12;
  const isStorm = telemetry.pressureTrend.includes('Storm') || telemetry.bmpPressure < 1005;

  const simulateColdSurge = () => {
    const val = 1023.5;
    const qnh = telemetry.baroQnhHpa || 1013.25;
    const calculatedAlt = Math.round(44330.0 * (1.0 - Math.pow(val / qnh, 0.1902949)));
    onUpdateTelemetry({
      bmpPressure: val,
      bmpAlt: calculatedAlt,
      pressureTrend: 'Rising',
      dhtTemp: 3.5,
      kyTemp: 1.8,
      dhtHum: 85,
    });
  };

  const simulateStormDrop = () => {
    const val = 998.0;
    const qnh = telemetry.baroQnhHpa || 1013.25;
    const calculatedAlt = Math.round(44330.0 * (1.0 - Math.pow(val / qnh, 0.1902949)));
    onUpdateTelemetry({
      bmpPressure: val,
      bmpAlt: calculatedAlt,
      pressureTrend: 'Rapid Drop (Storm Alert)',
      dhtTemp: 16.0,
      dhtHum: 92,
    });
  };

  const resetBaseline = () => {
    const val = 1013.25;
    const qnh = telemetry.baroQnhHpa || 1013.25;
    const calculatedAlt = Math.round(44330.0 * (1.0 - Math.pow(val / qnh, 0.1902949)));
    onUpdateTelemetry({
      bmpPressure: val,
      bmpAlt: calculatedAlt,
      pressureTrend: 'Stable',
      dhtTemp: 21.5,
      kyTemp: 19.8,
      dhtHum: 58,
      headingDeg: 42.0,
      gpsSats: 8,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold font-mono text-sm uppercase tracking-wide text-slate-200">
            Hardware & Sensor Telemetry Studio (Raspberry Pi 5 + Arduino Pinout)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Active Environmental Telemetry Simulation</span>
        </div>
      </div>

      {/* Weather Simulation Scenario Quick Triggers */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Live Weather Anomaly & Telemetry Presets:
          </span>
          <span className="text-[10px] font-mono text-slate-500">Affects All 10 LCD Pages & AI Guidance</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={simulateColdSurge}
            className={`px-3 py-1.5 rounded font-bold transition border flex items-center gap-1.5 ${
              isColdFront 
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-800/60'
            }`}
          >
            <span>❄️ Cold Front Surge (+10 hPa Rise & 3.5°C Plunge)</span>
          </button>

          <button
            onClick={simulateStormDrop}
            className={`px-3 py-1.5 rounded font-bold transition border flex items-center gap-1.5 ${
              isStorm 
                ? 'bg-red-500 text-slate-950 border-red-400 shadow-lg shadow-red-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-red-300 border-red-800/60'
            }`}
          >
            <span>🌩️ Rapid Storm (-15 hPa Baro Drop)</span>
          </button>

          <button
            onClick={resetBaseline}
            className="px-3 py-1.5 rounded font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <span>☀️ Standard Sea Level (1013.2 hPa, 21.5°C, 42° NE)</span>
          </button>
        </div>
      </div>

      {/* Proactive Weather Anomaly Alert Banner */}
      {isColdFront && (
        <div className="bg-cyan-950/90 border-2 border-cyan-500 rounded-lg p-4 space-y-2 text-cyan-100 shadow-xl font-mono animate-pulse">
          <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm uppercase">
            <AlertCircle className="w-5 h-5 text-cyan-400 animate-spin" />
            <span>⚠️ AUTOMATIC ASPEN AI WEATHER ALERT: COLD FRONT / ARCTIC HIGH SURGE DETECTED</span>
          </div>
          <p className="text-xs leading-relaxed text-cyan-200">
            <strong>Meteorological Observation:</strong> Atmospheric pressure is rising rapidly ({telemetry.bmpPressure} hPa, Trend: {telemetry.pressureTrend}) while ambient temperature has plunged to <strong>{telemetry.dhtTemp}°C</strong> ({((telemetry.dhtTemp * 9/5) + 32).toFixed(1)}°F). Dense, heavy arctic air mass displacing warmer air.
          </p>
          <div className="text-[11px] bg-slate-950/60 p-2 rounded border border-cyan-800 text-cyan-300 flex items-center justify-between">
            <span>ASPEN AI Action: Auto-routed to Qwen 2.5 1.5B (High reasoning cold-weather prep)</span>
            <span className="font-bold text-emerald-400">LCD Page 1: ⚠️ COLD SURGE!</span>
          </div>
        </div>
      )}

      {isStorm && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-lg p-4 space-y-2 text-red-100 shadow-xl font-mono animate-pulse">
          <div className="flex items-center gap-2 text-red-300 font-extrabold text-sm uppercase">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>⚠️ AUTOMATIC ASPEN AI WEATHER ALERT: SEVERE STORM FRONT / LOW PRESSURE DROP</span>
          </div>
          <p className="text-xs leading-relaxed text-red-200">
            <strong>Meteorological Observation:</strong> Atmospheric pressure dropping fast ({telemetry.bmpPressure} hPa, Trend: {telemetry.pressureTrend}). High wind, precipitation, and storm risk imminent.
          </p>
          <div className="text-[11px] bg-slate-950/60 p-2 rounded border border-red-800 text-red-300 flex items-center justify-between">
            <span>ASPEN AI Action: Emergency shelter lockdown routing active</span>
            <span className="font-bold text-red-400">LCD Page 1: 🌩️ STORM ALERT!</span>
          </div>
        </div>
      )}

      {/* Sensor Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Sensor 1: Digital Compass Heading (Page 10 on LCD) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold text-xs text-slate-200">Digital Compass (LCD P10)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-900/40">
              GPS Vector / Dial
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Heading:</span>
                <span className="font-bold text-cyan-400">
                  {Math.round(telemetry.headingDeg)}° {getCardinal(telemetry.headingDeg)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                step="1"
                value={telemetry.headingDeg}
                onChange={(e) => {
                  onUpdateTelemetry({ headingDeg: parseFloat(e.target.value) });
                }}
                className="w-full accent-cyan-500 bg-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Navigation
                  className="w-4 h-4 text-cyan-400 transition-transform duration-300"
                  style={{ transform: `rotate(${telemetry.headingDeg}deg)` }}
                />
                <span className="text-slate-300">Dial Preview:</span>
              </div>
              <span className="text-cyan-300 font-bold tracking-wider">
                &lt;-[{getCardinal(telemetry.headingDeg)}]-&gt;
              </span>
            </div>
          </div>
        </div>

        {/* Sensor 2: BMP180 Calibrated Pressure & Altitude (Page 5 on LCD) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold text-xs text-slate-200">BMP180 Baro & Alt (LCD P5)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-900/40">
              I2C 0x77 (Pin 3/5)
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Barometric Pressure:</span>
                <span className="font-bold text-cyan-400">{telemetry.bmpPressure.toFixed(1)} hPa</span>
              </div>
              <input
                type="range"
                min="950"
                max="1040"
                step="0.5"
                value={telemetry.bmpPressure}
                onChange={(e) => handlePressureChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-slate-400">Calibrated Altitude:</span>
              <span className="font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {Math.round(telemetry.bmpAlt)} meters
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Formula: <span className="text-slate-300">44330 * (1 - (p/1013.25)^0.1903)</span>
            </div>
          </div>
        </div>

        {/* Sensor 3: DHT11 Ambient & KY-001 Waterproof Probe (Pages 3 & 4 on LCD) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-bold text-xs text-slate-200">Temp Probes (LCD P3/P4)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-900/40">
              DHT11 + KY-001 1-Wire
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Ambient / 1-Wire Probe Temp:</span>
                <span className="font-bold text-amber-400">
                  {telemetry.dhtTemp}°C ({((telemetry.dhtTemp * 9/5) + 32).toFixed(1)}°F)
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="45"
                step="0.5"
                value={telemetry.dhtTemp}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateTelemetry({
                    dhtTemp: val,
                    kyTemp: parseFloat((val - 0.5).toFixed(1)),
                  });
                }}
                className="w-full accent-amber-500 bg-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Relative Humidity:</span>
              <span className="font-bold text-cyan-400">{telemetry.dhtHum}% RH</span>
            </div>
          </div>
        </div>

        {/* Sensor 4: VK-162 GPS USB Receiver (Page 6 on LCD) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span className="font-mono font-bold text-xs text-slate-200">VK-162 USB GPS Receiver (LCD P6)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-sky-900/40">
              USB Serial (/dev/ttyUSB0)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Latitude (°N):</label>
              <input
                type="number"
                step="0.0001"
                value={telemetry.gpsLat}
                onChange={(e) => onUpdateTelemetry({ gpsLat: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Longitude (°W):</label>
              <input
                type="number"
                step="0.0001"
                value={telemetry.gpsLng}
                onChange={(e) => onUpdateTelemetry({ gpsLng: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Satellites Locked:</span>
                <span className="font-bold text-sky-400">{telemetry.gpsSats} Sats (3D Fix)</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                value={telemetry.gpsSats}
                onChange={(e) => onUpdateTelemetry({ gpsSats: parseInt(e.target.value) })}
                className="w-full accent-sky-500 bg-slate-900 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Water Reserve:</span>
                <span className="font-bold text-cyan-400">{telemetry.waterSupplyLiters} Liters</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={telemetry.waterSupplyLiters}
                onChange={(e) => onUpdateTelemetry({ waterSupplyLiters: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-900 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Breadboard Push Buttons: Power ON, Power OFF & Emergency Panic */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-4 space-y-3 md:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/70 pb-2 gap-2">
            <div className="flex items-center space-x-2">
              <Power className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-xs text-slate-200 uppercase">
                Hardware Power Buttons (Raspberry Pi 5 Power & Control)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-900/40">
                Panic Button Moved to Cyberdeck Chassis
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Button 1: Breadboard / Onboard Power ON Button */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Power className="w-3.5 h-3.5" />
                    POWER ON BUTTON
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Onboard Button / J2 Header
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-snug">
                  The Raspberry Pi 5 has a <strong>built-in physical power button</strong> on the board edge next to the USB-C port! Alternatively, wire a breadboard switch across the <strong>J2 Header</strong> to boot up from standby.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!isAiPowered && onToggleAiPower) {
                    onToggleAiPower();
                  }
                }}
                disabled={isAiPowered}
                className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow ${
                  isAiPowered
                    ? 'bg-slate-900 text-emerald-500/50 border border-emerald-900/30 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white animate-bounce'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAiPowered ? 'PI 5 RUNNING (POWER ON)' : 'PRESS TO POWER ON PI 5'}</span>
              </button>
            </div>

            {/* Button 2: Breadboard Power OFF / Safe Shutdown Button (Pin 11 / GPIO 17) */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Power className="w-3.5 h-3.5" />
                    POWER OFF BUTTON
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Pin 11 (GPIO 17) to Pin 9 (GND)
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-snug">
                  Tactile switch between <strong>Physical Pin 11 (GPIO 17)</strong> and <strong>Pin 9 (GND)</strong>. Shows a <strong>3, 2, 1 countdown</strong> on the LCD & screen, then safely executes <code className="text-slate-300">sudo shutdown -h now</code>!
                </p>
              </div>

              <button
                onClick={handlePowerOffWithCountdown}
                disabled={!isAiPowered || countdown !== null}
                className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow ${
                  !isAiPowered
                    ? 'bg-slate-900 text-amber-500/50 border border-amber-900/30 cursor-not-allowed'
                    : countdown !== null
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                    : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>
                  {!isAiPowered
                    ? 'PI 5 POWERED DOWN (OFF)'
                    : countdown !== null
                    ? `SHUTTING DOWN IN ${countdown}...`
                    : 'PRESS TO SAFE POWER OFF PI 5'}
                </span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
