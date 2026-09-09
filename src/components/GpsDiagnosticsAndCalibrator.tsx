import React, { useState, useEffect } from 'react';
import {
  Radio,
  Compass,
  Navigation,
  Gauge,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  TrendingDown,
  TrendingUp,
  Mountain,
  Image,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { SensorTelemetry } from '../types';

interface GpsDiagnosticsAndCalibratorProps {
  telemetry: SensorTelemetry;
  onUpdateTelemetry: (updated: Partial<SensorTelemetry>) => void;
  onOpenListingModal: () => void;
  baseCamp: { name: string; lat: number; lng: number };
}

export const GpsDiagnosticsAndCalibrator: React.FC<GpsDiagnosticsAndCalibratorProps> = ({
  telemetry,
  onUpdateTelemetry,
  onOpenListingModal,
  baseCamp,
}) => {
  const [gpsSubTab, setGpsSubTab] = useState<'field' | 'calibrate' | 'ucenter'>('field');

  // Calibration local inputs
  const [targetGpsAltInput, setTargetGpsAltInput] = useState<string>(String(Math.round(telemetry.gpsAlt)));
  const [targetBaroAltInput, setTargetBaroAltInput] = useState<string>(String(Math.round(telemetry.bmpAlt)));
  const [targetQnhInput, setTargetQnhInput] = useState<string>(
    String((telemetry.baroQnhHpa || 1013.25).toFixed(2))
  );

  // Update inputs if telemetry changes externally
  useEffect(() => {
    setTargetGpsAltInput(String(Math.round(telemetry.gpsAlt)));
  }, [telemetry.gpsAlt]);

  useEffect(() => {
    setTargetBaroAltInput(String(Math.round(telemetry.bmpAlt)));
  }, [telemetry.bmpAlt]);

  useEffect(() => {
    setTargetQnhInput(String((telemetry.baroQnhHpa || 1013.25).toFixed(2)));
  }, [telemetry.baroQnhHpa]);

  // Calibration calculations
  const rawGpsAlt = Math.round(telemetry.gpsAlt - (telemetry.gpsAltOffset || 0));
  const currentGpsAlt = Math.round(telemetry.gpsAlt);
  const currentBaroAlt = Math.round(telemetry.bmpAlt);
  const currentQnh = telemetry.baroQnhHpa || 1013.25;
  const currentPressure = telemetry.bmpPressure;

  // Altimeter Differential
  const altDiff = currentBaroAlt - currentGpsAlt;

  // Handler: Calibrate GPS Altitude to specific target elevation
  const handleCalibrateGpsAltitude = (targetAlt: number) => {
    if (isNaN(targetAlt)) return;
    const newOffset = Math.round(targetAlt - rawGpsAlt);
    onUpdateTelemetry({
      gpsAlt: Math.round(targetAlt),
      gpsAltOffset: newOffset,
    });
  };

  // Handler: Adjust GPS Altitude by delta
  const handleNudgeGpsAltitude = (deltaMeters: number) => {
    const newAlt = currentGpsAlt + deltaMeters;
    handleCalibrateGpsAltitude(newAlt);
  };

  // Handler: Reset GPS Altitude calibration
  const handleResetGpsAltitude = () => {
    onUpdateTelemetry({
      gpsAlt: rawGpsAlt,
      gpsAltOffset: 0,
    });
  };

  // Handler: Calibrate Barometric Altitude to target elevation (recalculates local QNH)
  // Formula: QNH = P / (1 - targetAlt / 44330.0) ^ 5.255
  const handleCalibrateBaroToAltitude = (targetAlt: number) => {
    if (isNaN(targetAlt)) return;
    const p = currentPressure;
    const denominator = Math.pow(1.0 - targetAlt / 44330.0, 5.255);
    const newQnh = p / denominator;

    onUpdateTelemetry({
      bmpAlt: Math.round(targetAlt),
      baroQnhHpa: parseFloat(newQnh.toFixed(2)),
    });
  };

  // Handler: Calibrate Barometer by setting Sea-Level Pressure (QNH)
  // Formula: Alt = 44330 * (1 - (P / QNH) ^ 0.1902949)
  const handleCalibrateBaroToQnh = (newQnh: number) => {
    if (isNaN(newQnh) || newQnh <= 0) return;
    const p = currentPressure;
    const calculatedAlt = Math.round(44330.0 * (1.0 - Math.pow(p / newQnh, 0.1902949)));

    onUpdateTelemetry({
      bmpAlt: calculatedAlt,
      baroQnhHpa: parseFloat(newQnh.toFixed(2)),
    });
  };

  // Handler: Nudge Barometric Altitude by delta
  const handleNudgeBaroAltitude = (deltaMeters: number) => {
    const newAlt = currentBaroAlt + deltaMeters;
    handleCalibrateBaroToAltitude(newAlt);
  };

  // Handler: Nudge QNH by delta
  const handleNudgeQnh = (deltaHpa: number) => {
    const newQnh = currentQnh + deltaHpa;
    handleCalibrateBaroToQnh(newQnh);
  };

  // Handler: Sync Barometer directly to current GPS Altitude
  const handleSyncBaroToGps = () => {
    handleCalibrateBaroToAltitude(currentGpsAlt);
  };

  // Handler: Reset Baro to standard atmosphere (1013.25 hPa)
  const handleResetBaroStandard = () => {
    handleCalibrateBaroToQnh(1013.25);
  };

  // Homing math
  const lat1 = (telemetry.gpsLat * Math.PI) / 180;
  const lon1 = (telemetry.gpsLng * Math.PI) / 180;
  const lat2 = (baseCamp.lat * Math.PI) / 180;
  const lon2 = (baseCamp.lng * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = 6371 * c;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

  // Satellite listing mock data (matching screenshot in listing: G28, G30, G8, G11, G1)
  const uCenterSatellites = [
    { sv: 'G28', az: 42, el: 68, snr: 38, locked: true, color: 'bg-emerald-400' },
    { sv: 'G30', az: 165, el: 54, snr: 32, locked: true, color: 'bg-emerald-400' },
    { sv: 'G08', az: 285, el: 41, snr: 28, locked: true, color: 'bg-emerald-500' },
    { sv: 'G11', az: 210, el: 22, snr: 22, locked: true, color: 'bg-cyan-400' },
    { sv: 'G01', az: 330, el: 18, snr: 19, locked: false, color: 'bg-blue-400' },
  ];

  return (
    <div className="space-y-2.5 font-mono text-xs">
      {/* Top Header Bar with Sub-Tabs & Listing Photo Button */}
      <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg flex flex-wrap items-center justify-between gap-2">
        {/* Navigation Mode Sub-Tabs */}
        <div className="flex bg-stone-950 p-0.5 rounded border border-stone-800 text-[10px]">
          <button
            id="tab-gps-field"
            onClick={() => setGpsSubTab('field')}
            className={`px-2.5 py-1 rounded transition font-bold flex items-center gap-1.5 ${
              gpsSubTab === 'field'
                ? 'bg-cyan-700 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Field Nav
          </button>

          <button
            id="tab-gps-calibrate"
            onClick={() => setGpsSubTab('calibrate')}
            className={`px-2.5 py-1 rounded transition font-bold flex items-center gap-1.5 ${
              gpsSubTab === 'calibrate'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            Altimeter Calibration
            {(telemetry.gpsAltOffset !== 0 || telemetry.baroQnhHpa !== 1013.25) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
            )}
          </button>

          <button
            id="tab-gps-ucenter"
            onClick={() => setGpsSubTab('ucenter')}
            className={`px-2.5 py-1 rounded transition font-bold flex items-center gap-1.5 ${
              gpsSubTab === 'ucenter'
                ? 'bg-emerald-700 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            u-center 8.21
          </button>
        </div>

        {/* View Listing Photo Button (As requested by user!) */}
        <button
          id="btn-open-listing-image"
          onClick={onOpenListingModal}
          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-cyan-300 border border-cyan-800/80 font-bold text-[10px] flex items-center gap-1.5 shadow transition"
          title="Inspect the original product listing image & u-center screenshot"
        >
          <Image className="w-3.5 h-3.5 text-cyan-400" />
          <span>📷 View Listing Photo</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. FIELD NAVIGATION VIEW                                       */}
      {/* ------------------------------------------------------------- */}
      {gpsSubTab === 'field' && (
        <div className="space-y-2.5">
          {/* Coordinates & Fix Status */}
          <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                CURRENT GPS POSITION (WGS84)
              </div>
              <div className="text-sm font-bold text-cyan-300 tracking-wide">
                {telemetry.gpsLat.toFixed(5)}°N, {Math.abs(telemetry.gpsLng).toFixed(5)}°W
              </div>
              <div className="text-[10px] text-stone-400">
                Grid: 10T EP 5849 9231 &bull; Datum: WGS84
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {telemetry.gpsSats} SATS (3D FIX)
              </span>
              <div className="text-[10px] text-stone-300 font-mono mt-1">
                GPS Alt: <strong className="text-amber-400">{currentGpsAlt}m</strong>
                {telemetry.gpsAltOffset ? (
                  <span className="text-[9px] text-stone-500"> ({telemetry.gpsAltOffset > 0 ? '+' : ''}{telemetry.gpsAltOffset}m)</span>
                ) : null}
              </div>
              <div className="text-[10px] text-stone-400">
                Baro Alt: <strong className="text-cyan-400">{currentBaroAlt}m</strong> &bull; Speed: {telemetry.gpsSpeed} km/h
              </div>
            </div>
          </div>

          {/* Dual Altitude Quick Status & Recalibration Shortcut Banner */}
          <div className="bg-stone-950 border border-stone-800 p-2 rounded-lg flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-stone-300">
                  Altitude Sync: GPS <strong className="text-amber-300">{currentGpsAlt}m</strong> vs Baro <strong className="text-cyan-300">{currentBaroAlt}m</strong>
                </span>
                <div className="text-stone-500">
                  Diff: <span className={Math.abs(altDiff) > 15 ? 'text-amber-400 font-bold' : 'text-stone-400'}>{altDiff > 0 ? '+' : ''}{altDiff}m</span> &bull; QNH: {currentQnh.toFixed(1)} hPa
                </div>
              </div>
            </div>
            <button
              onClick={() => setGpsSubTab('calibrate')}
              className="px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 font-bold transition text-[10px] flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Recalibrate
            </button>
          </div>

          {/* Basecamp Homing Vector */}
          <div className="bg-emerald-950/50 border border-emerald-800/80 p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-emerald-900/80 border border-emerald-500 flex items-center justify-center text-emerald-300 font-bold shadow"
                style={{ transform: `rotate(${bearingDeg}deg)` }}
              >
                <Navigation className="w-5 h-5 fill-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  HOMING TO: {baseCamp.name}
                </div>
                <div className="text-base font-black text-emerald-100">
                  {distanceKm.toFixed(2)} km
                </div>
                <div className="text-[10px] text-stone-400">
                  Bearing: <strong className="text-emerald-300">{bearingDeg}°</strong> &bull; Track Heading: <strong className="text-cyan-300">{telemetry.headingDeg}°</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Waypoint marked at ${telemetry.gpsLat.toFixed(5)}, ${telemetry.gpsLng.toFixed(5)} (GPS Alt: ${currentGpsAlt}m, Baro: ${currentBaroAlt}m)`)}
              className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-stone-950 font-bold text-[10px] shadow"
            >
              + MARK SPOT
            </button>
          </div>

          {/* Digital Compass Rose Ribbon */}
          <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg text-center">
            <div className="text-[10px] text-stone-400 mb-1 flex items-center justify-between px-1">
              <span>HEADING COMPASS: <strong className="text-emerald-400">{telemetry.headingDeg}°</strong></span>
              <span className="text-[9px] text-stone-500">Magnetic Declination: +14.2°E</span>
            </div>
            <div className="flex justify-around text-xs font-bold text-stone-300 py-1 bg-stone-950 rounded border border-stone-800">
              <span className={telemetry.headingDeg >= 315 || telemetry.headingDeg < 45 ? 'text-emerald-400 font-black' : 'text-stone-500'}>N</span>
              <span className={telemetry.headingDeg >= 45 && telemetry.headingDeg < 135 ? 'text-emerald-400 font-black' : 'text-stone-500'}>E</span>
              <span className={telemetry.headingDeg >= 135 && telemetry.headingDeg < 225 ? 'text-emerald-400 font-black' : 'text-stone-500'}>S</span>
              <span className={telemetry.headingDeg >= 225 && telemetry.headingDeg < 315 ? 'text-emerald-400 font-black' : 'text-stone-500'}>W</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DUAL ALTIMETER CALIBRATION VIEW                            */}
      {/* ------------------------------------------------------------- */}
      {gpsSubTab === 'calibrate' && (
        <div className="space-y-3">
          {/* Dual Altitude Comparison Master Card */}
          <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-200">
              <span className="flex items-center gap-1.5">
                <Mountain className="w-4 h-4 text-amber-400" />
                DUAL ALTIMETER COMPARISON &amp; SENSOR FUSION
              </span>
              <span className="text-[10px] text-stone-400">
                P: <strong className="text-cyan-400">{currentPressure.toFixed(1)} hPa</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              {/* GPS Geometric Altitude */}
              <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 space-y-1">
                <div className="text-[10px] text-stone-400 font-bold uppercase">
                  GPS GEOMETRIC ALT
                </div>
                <div className="text-2xl font-black text-amber-300">
                  {currentGpsAlt} <span className="text-xs font-normal text-stone-400">m</span>
                </div>
                <div className="text-[9px] text-stone-500">
                  Raw WGS84: {rawGpsAlt}m
                  {telemetry.gpsAltOffset ? ` (Offset: ${telemetry.gpsAltOffset > 0 ? '+' : ''}${telemetry.gpsAltOffset}m)` : ' (Uncalibrated)'}
                </div>
              </div>

              {/* Barometric Pressure Altitude */}
              <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 space-y-1">
                <div className="text-[10px] text-stone-400 font-bold uppercase">
                  BAROMETRIC ALT (BMP180)
                </div>
                <div className="text-2xl font-black text-cyan-300">
                  {currentBaroAlt} <span className="text-xs font-normal text-stone-400">m</span>
                </div>
                <div className="text-[9px] text-stone-500">
                  Sea Ref (QNH): <strong className="text-cyan-400">{currentQnh.toFixed(1)} hPa</strong>
                </div>
              </div>
            </div>

            {/* Differential & Atmospheric Shift Indicator */}
            <div className={`p-2 rounded-lg border text-[10px] flex items-center justify-between ${
              Math.abs(altDiff) <= 10
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : altDiff > 10
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : 'bg-blue-950/40 border-blue-800/80 text-blue-300'
            }`}>
              <div className="flex items-center gap-1.5">
                {altDiff > 10 ? (
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                ) : altDiff < -10 ? (
                  <TrendingDown className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <strong>Altimeter Delta (&Delta;): {altDiff > 0 ? '+' : ''}{altDiff} meters</strong>
                  <div className="text-[9px] opacity-80">
                    {Math.abs(altDiff) <= 10 && 'Altimeters synchronized. Atmospheric pressure matches local elevation curve.'}
                    {altDiff > 10 && 'Barometer reads higher than GPS. Ambient air pressure is falling (potential storm/low-pressure front!).'}
                    {altDiff < -10 && 'Barometer reads lower than GPS. Ambient air pressure is rising (clearing trend/high-pressure system).'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSyncBaroToGps}
                className="px-2 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-stone-200 font-bold shrink-0 flex items-center gap-1"
                title="Synchronize Barometric Altimeter to GPS Altitude"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                Sync Baro &rarr; GPS
              </button>
            </div>
          </div>

          {/* GPS Altitude Calibration Box */}
          <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-lg space-y-2">
            <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                RECALIBRATE GPS ALTITUDE (VK-162 / u-blox 7)
              </span>
              <span className="text-[10px] text-stone-400">Current: {currentGpsAlt}m</span>
            </div>

            <p className="text-[10px] text-stone-400 leading-tight">
              GPS vertical accuracy inherently deviates &plusmn;15m due to Earth geoid undulation (WGS84 ellipsoid). Enter a known topographic elevation or trail benchmark to offset.
            </p>

            <div className="flex items-center gap-2">
              <input
                id="input-gps-alt-target"
                type="number"
                value={targetGpsAltInput}
                onChange={(e) => setTargetGpsAltInput(e.target.value)}
                placeholder="Target elevation (m)"
                className="flex-1 bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
              />
              <button
                id="btn-apply-gps-alt"
                onClick={() => handleCalibrateGpsAltitude(parseFloat(targetGpsAltInput))}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition"
              >
                Calibrate GPS
              </button>
              <button
                onClick={handleResetGpsAltitude}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded text-xs transition"
                title="Reset to raw WGS84"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets & Nudge Buttons */}
            <div className="space-y-1 pt-1">
              <div className="text-[9px] text-stone-500 flex items-center justify-between">
                <span>FINE-TUNE ADJUSTMENT:</span>
                <span>QUICK BENCHMARKS:</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button onClick={() => handleNudgeGpsAltitude(-10)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded text-[10px] text-stone-300">-10m</button>
                  <button onClick={() => handleNudgeGpsAltitude(-1)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded text-[10px] text-stone-300">-1m</button>
                  <button onClick={() => handleNudgeGpsAltitude(1)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded text-[10px] text-stone-300">+1m</button>
                  <button onClick={() => handleNudgeGpsAltitude(10)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-amber-500 rounded text-[10px] text-stone-300">+10m</button>
                </div>

                <div className="flex gap-1">
                  <button onClick={() => handleCalibrateGpsAltitude(0)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-cyan-500 rounded text-[10px] text-cyan-300">Sea Level (0m)</button>
                  <button onClick={() => handleCalibrateGpsAltitude(840)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-cyan-500 rounded text-[10px] text-cyan-300">Basecamp (840m)</button>
                  <button onClick={() => handleCalibrateGpsAltitude(1425)} className="px-1.5 py-0.5 bg-stone-950 border border-stone-800 hover:border-cyan-500 rounded text-[10px] text-cyan-300">Pass (1425m)</button>
                </div>
              </div>
            </div>
          </div>

          {/* Barometric Altitude Calibration Box */}
          <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-lg space-y-2">
            <div className="text-xs font-bold text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                RECALIBRATE BAROMETRIC ALTIMETER (BMP180 I2C)
              </span>
              <span className="text-[10px] text-stone-400">Current: {currentBaroAlt}m</span>
            </div>

            <p className="text-[10px] text-stone-400 leading-tight">
              Calibrate via known physical altitude (trail sign) to calculate true sea-level QNH, or enter local airport altimeter setting.
            </p>

            {/* Method A: Known Elevation */}
            <div className="bg-stone-950 p-2 rounded border border-stone-800 space-y-1.5">
              <div className="text-[10px] text-stone-300 font-bold flex items-center justify-between">
                <span>METHOD A: CALIBRATE BY KNOWN ELEVATION</span>
                <span className="text-[9px] text-stone-500">Auto-derives QNH</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="input-baro-alt-target"
                  type="number"
                  value={targetBaroAltInput}
                  onChange={(e) => setTargetBaroAltInput(e.target.value)}
                  placeholder="Known altitude (m)"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <button
                  id="btn-apply-baro-alt"
                  onClick={() => handleCalibrateBaroToAltitude(parseFloat(targetBaroAltInput))}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold rounded text-xs transition"
                >
                  Set Known Alt
                </button>
              </div>
              <div className="flex items-center justify-between text-[9px] text-stone-400">
                <span>Nudge Altitude:</span>
                <div className="flex gap-1">
                  <button onClick={() => handleNudgeBaroAltitude(-10)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">-10m</button>
                  <button onClick={() => handleNudgeBaroAltitude(-1)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">-1m</button>
                  <button onClick={() => handleNudgeBaroAltitude(1)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">+1m</button>
                  <button onClick={() => handleNudgeBaroAltitude(10)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">+10m</button>
                </div>
              </div>
            </div>

            {/* Method B: Sea-Level Pressure (QNH) */}
            <div className="bg-stone-950 p-2 rounded border border-stone-800 space-y-1.5">
              <div className="text-[10px] text-stone-300 font-bold flex items-center justify-between">
                <span>METHOD B: CALIBRATE SEA-LEVEL PRESSURE (QNH)</span>
                <span className="text-[9px] text-cyan-400">Std: 1013.25 hPa</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="input-baro-qnh-target"
                  type="number"
                  step="0.1"
                  value={targetQnhInput}
                  onChange={(e) => setTargetQnhInput(e.target.value)}
                  placeholder="QNH in hPa (e.g. 1013.25)"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <button
                  id="btn-apply-baro-qnh"
                  onClick={() => handleCalibrateBaroToQnh(parseFloat(targetQnhInput))}
                  className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-cyan-300 border border-cyan-800 font-bold rounded text-xs transition"
                >
                  Set QNH
                </button>
                <button
                  onClick={handleResetBaroStandard}
                  className="px-2 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-xs transition"
                  title="Reset to Standard 1013.25 hPa"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[9px] text-stone-400">
                <span>Nudge QNH:</span>
                <div className="flex gap-1">
                  <button onClick={() => handleNudgeQnh(-1.0)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">-1 hPa</button>
                  <button onClick={() => handleNudgeQnh(-0.1)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">-0.1</button>
                  <button onClick={() => handleNudgeQnh(0.1)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">+0.1</button>
                  <button onClick={() => handleNudgeQnh(1.0)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-300">+1 hPa</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. U-CENTER 8.21 LIVE REPLICA (From Listing Screenshot!)       */}
      {/* ------------------------------------------------------------- */}
      {gpsSubTab === 'ucenter' && (
        <div className="space-y-2.5">
          {/* Top u-center Window Titlebar */}
          <div className="bg-stone-950 border border-stone-800 p-2 rounded-lg flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              <span className="font-bold text-stone-100">COM4 - u-center 8.21 &bull; u-blox 7</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-stone-900 text-stone-400 border border-stone-800 rounded">
                9600-8-N-1
              </span>
            </div>

            <button
              onClick={onOpenListingModal}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold flex items-center gap-1"
            >
              <span>View Original Listing Screenshot &rarr;</span>
            </button>
          </div>

          {/* Grid: Sky View Polar Radar & Signal Strength SNR Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Polar Radar Sky View */}
            <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
              <div className="text-[10px] text-stone-400 font-bold flex items-center justify-between">
                <span>SKY VIEW POLAR RADAR</span>
                <span className="text-emerald-400 text-[9px]">{uCenterSatellites.length} Satellites Tracked</span>
              </div>

              {/* Radar Circle Container */}
              <div className="relative w-44 h-44 mx-auto rounded-full border border-stone-700 bg-stone-900/60 flex items-center justify-center">
                {/* 30 deg & 60 deg elevation concentric rings */}
                <div className="w-28 h-28 rounded-full border border-dashed border-stone-700/80 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border border-dashed border-stone-700/80"></div>
                </div>

                {/* Axes crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-stone-800"></div>
                <div className="absolute inset-y-0 left-1/2 w-px bg-stone-800"></div>

                {/* Cardinal labels */}
                <span className="absolute top-1 text-[9px] font-bold text-stone-400">N</span>
                <span className="absolute right-1 text-[9px] font-bold text-stone-400">E</span>
                <span className="absolute bottom-1 text-[9px] font-bold text-stone-400">S</span>
                <span className="absolute left-1 text-[9px] font-bold text-stone-400">W</span>

                {/* Satellites positioned by Azimuth/Elevation */}
                {uCenterSatellites.map((s) => {
                  const rad = ((s.az - 90) * Math.PI) / 180;
                  const distanceRadius = ((90 - s.el) / 90) * 76; // px from center
                  const posX = 88 + distanceRadius * Math.cos(rad);
                  const posY = 88 + distanceRadius * Math.sin(rad);

                  return (
                    <div
                      key={s.sv}
                      className={`absolute w-5 h-5 rounded-full ${
                        s.locked ? 'bg-emerald-500 text-stone-950' : 'bg-cyan-500 text-stone-950'
                      } text-[8px] font-black flex items-center justify-center shadow-md border border-stone-950`}
                      style={{ left: `${posX - 10}px`, top: `${posY - 10}px` }}
                      title={`${s.sv}: Az ${s.az}°, El ${s.el}°, SNR ${s.snr} dB-Hz`}
                    >
                      {s.sv.replace('G', '')}
                    </div>
                  );
                })}
              </div>

              <div className="text-[9px] text-center text-stone-500">
                Elevation Rings: 0° (Horizon) &bull; 30° &bull; 60° &bull; 90° (Zenith)
              </div>
            </div>

            {/* Carrier to Noise Ratio (C/No) SNR Bar Chart */}
            <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-lg space-y-1.5 flex flex-col justify-between">
              <div className="text-[10px] text-stone-400 font-bold flex items-center justify-between">
                <span>SIGNAL STRENGTH (C/N0 dB-Hz)</span>
                <span className="text-cyan-400 text-[9px]">Carrier Lock</span>
              </div>

              {/* SNR Bars */}
              <div className="space-y-1.5 py-1">
                {uCenterSatellites.map((s) => (
                  <div key={s.sv} className="flex items-center gap-2 text-[10px]">
                    <span className="w-7 font-bold text-stone-300">{s.sv}</span>
                    <div className="flex-1 bg-stone-900 rounded-sm h-3 overflow-hidden border border-stone-800">
                      <div
                        className={`h-full ${s.color} transition-all duration-300`}
                        style={{ width: `${Math.min(100, (s.snr / 50) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="w-12 text-right font-bold text-stone-200">
                      {s.snr} <span className="text-[8px] font-normal text-stone-500">dB</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Diagnostic Parameters from Listing */}
              <div className="bg-stone-900/90 p-2 rounded border border-stone-800 text-[9px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-stone-400">Position Fix Mode:</span>
                  <strong className="text-emerald-400 font-mono">3D DGPS Fix</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">PDOP / HDOP / VDOP:</span>
                  <strong className="text-stone-200 font-mono">1.4 / 0.9 / 1.1</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Time-To-First-Fix (TTFF):</span>
                  <strong className="text-stone-200 font-mono">28.4 sec (Cold)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">3D Estimated Accuracy:</span>
                  <strong className="text-cyan-300 font-mono">&plusmn;1.8 meters</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Analog Instruments Bar (Matching listing screenshot) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
              <div className="text-stone-400 text-[9px]">HEADING ROSE</div>
              <div className="text-sm font-black text-emerald-400 my-0.5">{telemetry.headingDeg}°</div>
              <div className="text-[8px] text-stone-500">Magnetic Track</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
              <div className="text-stone-400 text-[9px]">SPEEDOMETER</div>
              <div className="text-sm font-black text-cyan-400 my-0.5">
                {(telemetry.gpsSpeed / 3.6).toFixed(2)} <span className="text-[8px] font-normal">m/s</span>
              </div>
              <div className="text-[8px] text-stone-500">{telemetry.gpsSpeed} km/h</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
              <div className="text-stone-400 text-[9px]">ALTIMETER CLOCK</div>
              <div className="text-sm font-black text-amber-400 my-0.5">{currentGpsAlt}m</div>
              <div className="text-[8px] text-stone-500">&times;100m dial scale</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
              <div className="text-stone-400 text-[9px]">UTC CLOCK</div>
              <div className="text-sm font-black text-stone-200 my-0.5">18:24:00</div>
              <div className="text-[8px] text-stone-500">Atomic GPS Sync</div>
            </div>
          </div>

          {/* Live NMEA 0183 Stream Feed */}
          <div className="bg-stone-950 border border-stone-800 p-2 rounded-lg space-y-1">
            <div className="text-[9px] text-stone-500 flex items-center justify-between">
              <span>RAW NMEA-0183 STREAM (/dev/ttyACM0 @ 9600 baud)</span>
              <span className="text-emerald-400 font-mono">1Hz STREAMING</span>
            </div>
            <div className="bg-black/60 p-1.5 rounded font-mono text-[9px] text-emerald-400/90 space-y-0.5 overflow-x-auto">
              <div>$GPGGA,182400.00,{telemetry.gpsLat.toFixed(4)},N,{Math.abs(telemetry.gpsLng).toFixed(4)},W,1,09,0.9,{currentGpsAlt}.0,M,-21.4,M,,*4A</div>
              <div>$GPRMC,182400.00,A,{telemetry.gpsLat.toFixed(4)},N,{Math.abs(telemetry.gpsLng).toFixed(4)},W,0.00,{telemetry.headingDeg}.0,050926,,,A*72</div>
              <div>$GPGSV,3,1,09,28,68,042,38,30,54,165,32,08,41,285,28,11,22,210,22*78</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
