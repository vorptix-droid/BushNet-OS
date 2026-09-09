import React from 'react';
import { Cpu, HardDrive, Zap, Thermometer, Activity, Layers, Power } from 'lucide-react';
import { ModelSelection } from '../types';

interface Pi5SystemMonitorProps {
  modelPreference: ModelSelection;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  isAiPowered: boolean;
  cpuTemp?: number;
  onSelectModel: (model: ModelSelection) => void;
  onToggleAiPower: () => void;
}

export const Pi5SystemMonitor: React.FC<Pi5SystemMonitorProps> = ({
  modelPreference,
  activeModel,
  isAiPowered,
  cpuTemp = 48.5,
  onSelectModel,
  onToggleAiPower,
}) => {
  const is15b = activeModel === 'qwen-1.5b';

  const osRam = 420; // MB
  const modelRam = isAiPowered ? (is15b ? 1120 : 380) : 0; // 0 MB if AI powered off
  const totalUsed = osRam + modelRam;
  const totalRam = 2048; // 2GB
  const ramPct = Math.round((totalUsed / totalRam) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-4">
      
      {/* Header with AI Power Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold font-mono text-sm uppercase text-slate-200">
            Raspberry Pi 5 (2GB) System Resource Monitor
          </h3>
        </div>

        {/* Physical AI Power Switch */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">BCM2712 Quad-core ARM @ 2.4GHz</span>
          <button
            onClick={onToggleAiPower}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 border shadow ${
              isAiPowered
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-950/40'
                : 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-800'
            }`}
            title="Toggle ASPEN Local AI Daemon Power"
          >
            <Power className="w-3.5 h-3.5" />
            <span>AI DAEMON: {isAiPowered ? 'POWER ON' : 'POWER OFF'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Model Selection Toolbar (Scrollable & Clickable) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Local Model Selection (Qwen 2.5 Engine):
          </span>
          <span className="text-[10px] text-slate-500">2GB RAM Budget Management</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
          <button
            onClick={() => onSelectModel('auto')}
            className={`px-3 py-1.5 rounded-lg font-bold transition border flex items-center gap-1.5 shrink-0 ${
              modelPreference === 'auto'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span>AUTO (Dynamic 0.5B / 1.5B)</span>
          </button>

          <button
            onClick={() => onSelectModel('qwen-0.5b')}
            className={`px-3 py-1.5 rounded-lg font-bold transition border flex items-center gap-1.5 shrink-0 ${
              modelPreference === 'qwen-0.5b'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span>Qwen 2.5 0.5B (380 MB RAM)</span>
          </button>

          <button
            onClick={() => onSelectModel('qwen-1.5b')}
            className={`px-3 py-1.5 rounded-lg font-bold transition border flex items-center gap-1.5 shrink-0 ${
              modelPreference === 'qwen-1.5b'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span>Qwen 2.5 1.5B (1120 MB RAM)</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        
        {/* Metric 1: RAM Allocation */}
        <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>2GB LPDDR4X RAM:</span>
            <span className="font-bold text-emerald-400">{totalUsed} MB / 2048 MB ({ramPct}%)</span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700 flex">
            {/* OS Baseline */}
            <div
              style={{ width: `${(osRam / totalRam) * 100}%` }}
              className="bg-slate-500 h-full"
              title="Linux Kernel & OS (420 MB)"
            />
            {/* Active Model */}
            {isAiPowered && (
              <div
                style={{ width: `${(modelRam / totalRam) * 100}%` }}
                className={`h-full ${is15b ? 'bg-amber-500' : 'bg-emerald-500'}`}
                title={`Qwen 2.5 ${is15b ? '1.5B' : '0.5B'} (${modelRam} MB)`}
              />
            )}
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> OS: 420M
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isAiPowered ? (is15b ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-700'}`} />
              Model: {modelRam}M
            </span>
            <span>Free: {totalRam - totalUsed}M</span>
          </div>
        </div>

        {/* Metric 2: Active Qwen Model */}
        <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-lg space-y-1">
          <span className="text-slate-400 block text-[10px]">ACTIVE INFERENCE ENGINE:</span>
          <div className={`font-bold text-sm ${isAiPowered ? 'text-emerald-400' : 'text-slate-500'}`}>
            {isAiPowered ? (is15b ? 'Qwen 2.5 1.5B Instruct' : 'Qwen 2.5 0.5B Instruct') : 'DAEMON POWERED OFF'}
          </div>
          <p className="text-[10px] text-slate-400">
            Mode: <span className="text-slate-200 font-bold">{modelPreference.toUpperCase()}</span> • Speed: {isAiPowered ? (is15b ? '~18 tok/s' : '~42 tok/s') : '0 tok/s'}
          </p>
        </div>

        {/* Metric 3: CPU Temp & Thermal */}
        <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-lg space-y-1">
          <span className="text-slate-400 block text-[10px]">CPU CORE TEMP:</span>
          <div className="flex items-center gap-2">
            <Thermometer className={`w-4 h-4 ${cpuTemp > 75 ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className={`font-bold text-sm ${cpuTemp > 75 ? 'text-red-400' : 'text-slate-100'}`}>
              {cpuTemp}°C
            </span>
            <span className="text-[10px] text-slate-400">(Throttle @ 80°C)</span>
          </div>
          <p className="text-[10px] text-slate-400">Fan Speed: 2400 RPM (Active Cooler)</p>
        </div>

        {/* Metric 4: Headless Pi Connect */}
        <div className="bg-slate-800/60 border border-slate-700/80 p-3 rounded-lg space-y-1">
          <span className="text-slate-400 block text-[10px]">HEADLESS OPERATIONAL STATE:</span>
          <div className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isAiPowered ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{isAiPowered ? 'Pi Connect & AI Active' : 'Sensor Logging Mode Only'}</span>
          </div>
          <p className="text-[10px] text-slate-400">CLI: /usr/local/bin/aspen-daemon</p>
        </div>

      </div>

    </div>
  );
};
