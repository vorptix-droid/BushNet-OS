import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  SunDim,
  Power,
  RotateCcw,
  Eye,
  Radio,
  Flashlight,
  Cpu,
  BatteryCharging,
  ChevronUp,
  AlertTriangle,
  Volume2,
  VolumeX,
  Compass,
  Moon,
} from 'lucide-react';
import { SensorTelemetry } from '../types';

interface QuickSettingsShadeProps {
  isOpen: boolean;
  onClose: () => void;
  brightness: number;
  onChangeBrightness: (val: number) => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  isAiPowered: boolean;
  onToggleAiPower: () => void;
  emergencyActive: boolean;
  onToggleEmergency: () => void;
  telemetry: SensorTelemetry;
  onOpenGpsCalibrator?: () => void;
}

export const QuickSettingsShade: React.FC<QuickSettingsShadeProps> = ({
  isOpen,
  onClose,
  brightness,
  onChangeBrightness,
  isNightMode,
  onToggleNightMode,
  isAiPowered,
  onToggleAiPower,
  emergencyActive,
  onToggleEmergency,
  telemetry,
  onOpenGpsCalibrator,
}) => {
  // Local state for interactive toggles inside Quick Settings
  const [isTorchActive, setIsTorchActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRfStealth, setIsRfStealth] = useState(false);
  const [gpsPowerSave, setGpsPowerSave] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState<number | null>(null);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  // Safe shutdown handler
  const handleTriggerShutdown = () => {
    if (shutdownCountdown !== null) return;
    setShutdownCountdown(3);
    const interval = setInterval(() => {
      setShutdownCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (onToggleAiPower && isAiPowered) {
            onToggleAiPower();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Safe reboot handler
  const handleTriggerReboot = () => {
    setIsRebooting(true);
    setTimeout(() => {
      setIsRebooting(false);
      onClose();
    }, 2500);
  };

  // Screen sleep wake
  if (isSleeping) {
    return (
      <div
        onClick={() => setIsSleeping(false)}
        className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center cursor-pointer select-none text-stone-600 font-mono text-xs"
      >
        <Moon className="w-8 h-8 text-stone-700 mb-2 animate-pulse" />
        <div>DISPLAY ASLEEP (BACKLIGHT OFF)</div>
        <div className="text-[10px] text-stone-700 mt-1">Tap anywhere to wake 5.0" DSI screen</div>
      </div>
    );
  }

  // Flashlight / Screen Torch Mode (Max brightness solid white screen)
  if (isTorchActive) {
    return (
      <div
        onClick={() => setIsTorchActive(false)}
        className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-between p-6 select-none cursor-pointer text-stone-900 font-mono font-bold"
      >
        <div className="text-xs tracking-widest uppercase text-stone-500">
          🔦 EMERGENCY CAMP FLASHLIGHT (100% WHITE LANTERN)
        </div>
        <div className="text-center">
          <Flashlight className="w-16 h-16 mx-auto text-amber-500 animate-pulse mb-3" />
          <div className="text-xl font-black">TAP SCREEN TO EXIT TORCH</div>
          <div className="text-xs font-normal text-stone-600 mt-1">
            Running at maximum 5.0" IPS LED backlight output
          </div>
        </div>
        <div className="text-[11px] text-stone-500">BushNet Outdoor Utility</div>
      </div>
    );
  }

  // Estimated power draw calculation (Pi 5 ~2.2W base + display brightness + AI daemon)
  const estimatedWatts = (
    2.2 +
    (brightness / 100) * 0.9 +
    (isAiPowered ? 1.8 : 0.2) +
    (telemetry.gpsSats > 0 ? 0.3 : 0.05)
  ).toFixed(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="quick-settings-shade-overlay"
          initial={{ y: '-100%', opacity: 0.7 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className={`absolute inset-0 z-40 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-md select-none font-mono ${
            isNightMode
              ? 'bg-stone-950/98 text-red-400 border-b-2 border-red-900 shadow-[0_15px_30px_rgba(185,28,28,0.3)]'
              : 'bg-stone-950/96 text-stone-200 border-b-2 border-stone-700 shadow-[0_15px_35px_rgba(0,0,0,0.9)]'
          }`}
        >
          {/* Top Header Bar inside Quick Settings */}
          <div className="px-4 py-2.5 bg-stone-900/90 border-b border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                QUICK SETTINGS
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                5.0" DSI PANEL
              </span>
            </div>

            {/* Close Shade Chevron Button */}
            <button
              id="close-quick-settings-btn"
              onClick={onClose}
              className="p-1 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 border border-stone-700"
              title="Close Settings Shade"
            >
              <span>CLOSE</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main Scrollable Quick Settings Content Grid */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
            
            {/* 1. System Vital Stats Strip */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-stone-900/70 p-2 rounded-xl border border-stone-800">
              <div className="flex flex-col items-center">
                <span className="text-stone-400 flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                  PWR
                </span>
                <span className="font-bold text-emerald-400 mt-0.5">100% • 5.1V</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-stone-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  LOAD
                </span>
                <span className="font-bold text-cyan-300 mt-0.5">{estimatedWatts} W</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-stone-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-amber-400" />
                  GPS
                </span>
                <span className="font-bold text-amber-300 mt-0.5">
                  {isRfStealth ? 'STEALTH' : `${telemetry.gpsSats} Sats`}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-stone-400 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-rose-400" />
                  VISION
                </span>
                <span className="font-bold text-rose-300 mt-0.5">
                  {isNightMode ? 'RED PHOSPHOR' : 'STANDARD'}
                </span>
              </div>
            </div>

            {/* 2. Display Brightness Slider Control */}
            <div className="bg-stone-900/80 border border-stone-800 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <Sun className="w-4 h-4" />
                  BACKLIGHT BRIGHTNESS
                </span>
                <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                  {brightness}%
                </span>
              </div>

              {/* Slider track */}
              <div className="flex items-center gap-3">
                <SunDim className="w-4 h-4 text-stone-500" />
                <input
                  id="screen-brightness-slider"
                  type="range"
                  min="15"
                  max="100"
                  value={brightness}
                  onChange={(e) => onChangeBrightness(Number(e.target.value))}
                  className="flex-1 h-2 bg-stone-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-stone-700"
                />
                <Sun className="w-4 h-4 text-amber-400" />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px]">
                <button
                  onClick={() => onChangeBrightness(20)}
                  className={`py-1 rounded border transition font-mono ${
                    brightness <= 25
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-400 border-stone-800'
                  }`}
                >
                  MIN 20%
                </button>
                <button
                  onClick={() => onChangeBrightness(50)}
                  className={`py-1 rounded border transition font-mono ${
                    brightness > 25 && brightness <= 65
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-400 border-stone-800'
                  }`}
                >
                  FIELD 50%
                </button>
                <button
                  onClick={() => onChangeBrightness(85)}
                  className={`py-1 rounded border transition font-mono ${
                    brightness > 65 && brightness < 95
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-400 border-stone-800'
                  }`}
                >
                  STD 85%
                </button>
                <button
                  onClick={() => onChangeBrightness(100)}
                  className={`py-1 rounded border transition font-mono ${
                    brightness >= 95
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-400 border-stone-800'
                  }`}
                >
                  MAX 100%
                </button>
              </div>
            </div>

            {/* 3. Primary Quick Toggles (Torch, Night Vision, RF Stealth, AI Power) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* Torch Flashlight Toggle */}
              <button
                id="toggle-torch-btn"
                onClick={() => setIsTorchActive(true)}
                className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 flex flex-col items-center justify-center gap-1 text-center transition active:scale-95"
              >
                <Flashlight className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[11px]">FLASHLIGHT</span>
                <span className="text-[9px] text-stone-400">White Screen</span>
              </button>

              {/* Night Vision Red Mode Toggle */}
              <button
                id="toggle-night-mode-shade-btn"
                onClick={onToggleNightMode}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition active:scale-95 ${
                  isNightMode
                    ? 'bg-red-950 text-red-400 border-red-700 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-stone-800'
                }`}
              >
                <Eye className={`w-4 h-4 ${isNightMode ? 'text-red-400' : 'text-stone-400'}`} />
                <span className="font-bold text-[11px]">NIGHT VISION</span>
                <span className="text-[9px] text-stone-400">{isNightMode ? 'Active (Red)' : 'Off'}</span>
              </button>

              {/* AI Daemon Power Toggle */}
              <button
                id="toggle-ai-power-shade-btn"
                onClick={onToggleAiPower}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition active:scale-95 ${
                  isAiPowered
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border-stone-800'
                }`}
              >
                <Cpu className={`w-4 h-4 ${isAiPowered ? 'text-emerald-400' : 'text-stone-500'}`} />
                <span className="font-bold text-[11px]">QWEN 1.5B</span>
                <span className="text-[9px] text-stone-400">{isAiPowered ? 'Daemon Running' : 'Standby Sleep'}</span>
              </button>

              {/* RF Stealth Mode (Kill Switch) */}
              <button
                id="toggle-rf-stealth-btn"
                onClick={() => setIsRfStealth(!isRfStealth)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition active:scale-95 ${
                  isRfStealth
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border-stone-800'
                }`}
              >
                <Radio className={`w-4 h-4 ${isRfStealth ? 'text-amber-400' : 'text-stone-400'}`} />
                <span className="font-bold text-[11px]">RF STEALTH</span>
                <span className="text-[9px] text-stone-400">{isRfStealth ? 'Radio Muted' : 'GPS Active'}</span>
              </button>

            </div>

            {/* 4. Secondary Field Controls: Audio Mute, GPS Rate, Altimeter, Screen Sleep */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              {/* Audio Mute */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1 text-stone-300">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-stone-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  AUDIO
                </span>
                <span className={isMuted ? 'text-stone-500' : 'text-emerald-400 font-bold'}>
                  {isMuted ? 'MUTED' : 'ON'}
                </span>
              </button>

              {/* GPS Rate Toggle */}
              <button
                onClick={() => setGpsPowerSave(!gpsPowerSave)}
                className="p-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1 text-stone-300">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  GPS RATE
                </span>
                <span className="text-cyan-400 font-bold">
                  {gpsPowerSave ? '0.1Hz' : '1.0Hz'}
                </span>
              </button>

              {/* Altimeter Calibrator Shortcut */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenGpsCalibrator) onOpenGpsCalibrator();
                }}
                className="p-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1 text-stone-300">
                  QNH
                </span>
                <span className="text-amber-400 font-bold">
                  {telemetry.baroQnhHpa || 1013.2} hPa
                </span>
              </button>

              {/* Display Sleep */}
              <button
                onClick={() => setIsSleeping(true)}
                className="p-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-1 text-stone-300">
                  <Moon className="w-3.5 h-3.5 text-purple-400" />
                  SLEEP
                </span>
                <span className="text-purple-400 font-bold">
                  STANDBY
                </span>
              </button>
            </div>

            {/* 5. Power & System Reboot Row */}
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-stone-300">
                  <Power className="w-3.5 h-3.5 text-red-400" />
                  SYSTEM POWER & RESET
                </span>
                <span className="text-[10px] text-stone-400">
                  Raspberry Pi 5 OS
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Safe Power Off Button */}
                <button
                  id="shade-safe-shutdown-btn"
                  onClick={handleTriggerShutdown}
                  disabled={shutdownCountdown !== null}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                    shutdownCountdown !== null
                      ? 'bg-red-600 text-white animate-pulse border-red-400'
                      : 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-800'
                  }`}
                  title="Executes sudo shutdown -h now"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>
                    {shutdownCountdown !== null
                      ? `HALTING ${shutdownCountdown}s...`
                      : 'SHUTDOWN'}
                  </span>
                </button>

                {/* Reboot Button */}
                <button
                  id="shade-reboot-btn"
                  onClick={handleTriggerReboot}
                  disabled={isRebooting}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                    isRebooting
                      ? 'bg-cyan-600 text-white animate-spin border-cyan-400'
                      : 'bg-stone-800 hover:bg-stone-750 text-cyan-300 border-stone-700'
                  }`}
                  title="Executes sudo reboot"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin' : ''}`} />
                  <span>{isRebooting ? 'REBOOTING...' : 'REBOOT'}</span>
                </button>

                {/* Emergency SOS Toggle Button */}
                <button
                  id="shade-emergency-sos-btn"
                  onClick={onToggleEmergency}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                    emergencyActive
                      ? 'bg-red-600 text-white animate-pulse border-red-300'
                      : 'bg-stone-800 hover:bg-stone-750 text-red-400 border-stone-700'
                  }`}
                  title="Toggle Emergency SOS Beacon"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{emergencyActive ? 'DISARM SOS' : 'SOS PANIC'}</span>
                </button>
              </div>

              {shutdownCountdown === 0 && (
                <div className="p-2 rounded bg-black text-red-400 font-mono text-[10px] text-center animate-pulse border border-red-900">
                  SYSTEM HALTED • SAFE TO DISCONNECT 5V POWER
                </div>
              )}
            </div>

          </div>

          {/* Bottom Pull-Up Handle / Swipe-Up Tab */}
          <div
            id="quick-settings-bottom-handle"
            onClick={onClose}
            className="w-full py-2 bg-stone-900/95 border-t border-stone-800 hover:bg-stone-850 flex flex-col items-center justify-center cursor-pointer transition select-none group"
            title="Swipe up or tap to close settings"
          >
            <div className="w-10 h-1 bg-stone-600 group-hover:bg-stone-400 rounded-full mb-1 transition-all" />
            <div className="text-[9px] text-stone-500 group-hover:text-stone-300 font-bold flex items-center gap-1">
              <ChevronUp className="w-3 h-3 text-stone-400" />
              <span>SWIPE OR TAP TO CLOSE</span>
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
