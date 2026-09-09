import React from 'react';
import { Cpu, Shield, User, Download, Radio, AlertTriangle, Database, Zap, Power, CloudSun } from 'lucide-react';
import { UserProfile, SensorTelemetry, ModelSelection } from '../types';

interface HeaderProps {
  userProfile: UserProfile;
  telemetry: SensorTelemetry;
  modelPreference: ModelSelection;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  isAiPowered: boolean;
  activePage: 'handheld' | 'simulator' | 'weather' | 'downloads';
  onSelectPage: (page: 'handheld' | 'simulator' | 'weather' | 'downloads') => void;
  onOpenFirstBoot: () => void;
  onOpenExportModal: () => void;
  onToggleEmergency: () => void;
  onToggleAiPower: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  telemetry,
  modelPreference,
  activeModel,
  isAiPowered,
  activePage,
  onSelectPage,
  onOpenFirstBoot,
  onOpenExportModal,
  onToggleEmergency,
  onToggleAiPower,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Brand logo & Model Status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-wider text-slate-100 uppercase">
                  BUSH<span className="text-emerald-400">NET</span>
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded">
                  ASPEN AI v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <span>RPi 5 (2GB Headless)</span>
                <span>•</span>
                <span className="text-slate-300">VK-162 GPS</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {activeModel === 'qwen-1.5b' ? 'Qwen 2.5 1.5B (1.1GB RAM)' : 'Qwen 2.5 0.5B (380MB RAM)'}
                </span>
              </p>
            </div>
          </div>

          {/* Center: Live Sensor Telemetry Badges */}
          <div className="hidden lg:flex items-center space-x-2 font-mono text-xs">
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="text-amber-400">DHT11:</span>
              <span>{telemetry.dhtTemp}°C</span>
              <span className="text-slate-500">|</span>
              <span>{telemetry.dhtHum}% RH</span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="text-cyan-400">BMP180:</span>
              <span>{telemetry.bmpPressure} hPa</span>
              <span className="text-slate-500">({telemetry.bmpAlt}m)</span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <span className="text-emerald-400">GPS:</span>
              <Radio className={`w-3.5 h-3.5 ${telemetry.gpsSats > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{telemetry.gpsSats} Sats</span>
            </div>
          </div>

          {/* Right: Actions (AI Power, Profile, Emergency SOS, Export Code) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleAiPower}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 border ${
                isAiPowered
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-700/80'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title="Toggle AI Daemon Power On/Off"
            >
              <Power className={`w-3.5 h-3.5 ${isAiPowered ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isAiPowered ? 'AI ON' : 'AI OFF'}</span>
            </button>

            <button
              onClick={onToggleEmergency}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md ${
                telemetry.emergencyActive
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-bounce ring-2 ring-red-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-900/50'
              }`}
              title="Cyberdeck Physical Emergency Panic Button (Direct Pi 5 GPIO)"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{telemetry.emergencyActive ? 'SOS ACTIVE' : 'CYBERDECK SOS'}</span>
            </button>

            <button
              onClick={onOpenFirstBoot}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              title="User Profile & Medical Settings"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-mono">{userProfile.name || 'Setup Profile'}</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
              title="Download Python & Arduino Code for Pi 5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Code</span>
            </button>
          </div>

        </div>

        {/* Primary Page Navigation Tabs */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectPage('handheld')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition ${
                activePage === 'handheld'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-inner'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>1. Handheld OS (3.5" Touch + Rii)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500 text-slate-950 font-black uppercase tracking-wider">
                New
              </span>
            </button>

            <button
              onClick={() => onSelectPage('simulator')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition ${
                activePage === 'simulator'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-inner'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>2. Telemetry Studio & Controls</span>
            </button>

            <button
              onClick={() => onSelectPage('weather')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition ${
                activePage === 'weather'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-inner'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <CloudSun className="w-4 h-4 text-cyan-400" />
              <span>3. Weather History & Graphs</span>
            </button>

            <button
              onClick={() => onSelectPage('downloads')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition relative ${
                activePage === 'downloads'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-inner'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>4. Deployment Code (Pi 5 & Arduino)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center text-slate-400 text-[11px]">
            <span>Operator: <strong className="text-emerald-400">{userProfile.name}</strong></span>
          </div>
        </div>

      </div>
    </header>
  );
};
