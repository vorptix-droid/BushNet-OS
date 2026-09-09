import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  HeartPulse,
  Flame,
  Snowflake,
  Timer,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Droplets,
  Bone,
} from 'lucide-react';
import { SensorTelemetry } from '../types';

interface FirstAidTriageAppProps {
  telemetry: SensorTelemetry;
}

export const FirstAidTriageApp: React.FC<FirstAidTriageAppProps> = ({ telemetry }) => {
  const [selectedTopic, setSelectedTopic] = useState<'bleeding' | 'hypothermia' | 'heatstroke' | 'snakebite' | 'water'>('bleeding');
  
  // Tourniquet timer state
  const [tqSeconds, setTqSeconds] = useState<number>(0);
  const [isTqRunning, setIsTqRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTqRunning) {
      interval = setInterval(() => {
        setTqSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTqRunning]);

  const formatTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Barometric Water Boiling Point Calculation based on BMP180
  const pressureHpa = telemetry.bmpPressure || 1013.25;
  // Magnus / Antoine formula approximation: T_boil (°C) ~ 100 - (1013.25 - P)/28
  const boilingPointC = Math.max(70, Math.min(100, 100 - ((1013.25 - pressureHpa) / 27.5)));
  const recommendedBoilMinutes = boilingPointC < 95 ? 3 : 1;

  return (
    <div className="space-y-2.5 font-mono text-xs select-none">
      {/* Top Protocol Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-stone-900/90 p-2 rounded-xl border border-stone-800 text-[10px]">
        {[
          { id: 'bleeding', label: 'BLEEDING & TQ', icon: HeartPulse, color: 'text-red-400' },
          { id: 'hypothermia', label: 'HYPOTHERMIA', icon: Snowflake, color: 'text-cyan-400' },
          { id: 'snakebite', label: 'SNAKEBITE', icon: AlertTriangle, color: 'text-amber-400' },
          { id: 'heatstroke', label: 'HEATSTROKE', icon: Flame, color: 'text-rose-400' },
          { id: 'water', label: 'WATER PURIFY', icon: Droplets, color: 'text-blue-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedTopic === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTopic(tab.id as typeof selectedTopic)}
              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition ${
                isSelected
                  ? 'bg-red-950 text-red-300 border-red-700 shadow-sm'
                  : 'bg-stone-950 hover:bg-stone-850 text-stone-400 border-stone-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Topic Container */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 space-y-2.5">
        
        {/* TOPIC 1: Severe Bleeding & Tourniquet Tracker */}
        {selectedTopic === 'bleeding' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" />
                ARTERIAL BLEEDING & TOURNIQUET TIME-LOG
              </span>
              <span className="text-[10px] text-stone-400">Tactical Combat Casualty Care (TCCC)</span>
            </div>

            {/* Live Tourniquet Stopwatch */}
            <div className="bg-stone-950 p-2.5 rounded-xl border border-red-900/60 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-stone-400 uppercase font-bold">TQ APPLICATION RUNNING TIME:</div>
                <div className="text-xl font-black text-red-400 font-mono tracking-wider">
                  {formatTimer(tqSeconds)}
                </div>
                <div className="text-[9px] text-stone-500">
                  {tqSeconds > 7200 ? '⚠️ EXCEEDS 2 HOURS: HIGH RISK OF NERVE DAMAGE' : 'Record time on victim forehead: "TK [TIME]"'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsTqRunning(!isTqRunning)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 border ${
                    isTqRunning
                      ? 'bg-red-600 text-white border-red-400 animate-pulse'
                      : 'bg-stone-800 hover:bg-stone-750 text-stone-200 border-stone-700'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{isTqRunning ? 'PAUSE TQ' : 'START TQ'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsTqRunning(false);
                    setTqSeconds(0);
                  }}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Protocol Steps */}
            <div className="space-y-1 text-[11px] text-stone-200">
              <div className="bg-stone-950 p-1.5 rounded border border-stone-800 flex items-start gap-1.5">
                <span className="text-red-400 font-bold">1.</span>
                <span>Apply direct fingertip pressure directly into the wound cavity onto bleeding bone/artery.</span>
              </div>
              <div className="bg-stone-950 p-1.5 rounded border border-stone-800 flex items-start gap-1.5">
                <span className="text-red-400 font-bold">2.</span>
                <span>If bleeding does not stop on limb: place tourniquet 2-3 inches above wound (never over a joint).</span>
              </div>
              <div className="bg-stone-950 p-1.5 rounded border border-stone-800 flex items-start gap-1.5">
                <span className="text-red-400 font-bold">3.</span>
                <span>Tighten windlass rod until bright red spurting stops and distal pulse vanishes. Lock rod in clip.</span>
              </div>
              <div className="bg-stone-950 p-1.5 rounded border border-stone-800 flex items-start gap-1.5">
                <span className="text-red-400 font-bold">4.</span>
                <span>DO NOT LOOSEN or remove tourniquet once applied; only hospital surgeons may release it.</span>
              </div>
            </div>
          </div>
        )}

        {/* TOPIC 2: Hypothermia Protocol */}
        {selectedTopic === 'hypothermia' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Snowflake className="w-4 h-4" />
                HYPOTHERMIA TRIAGE & REWARMING
              </span>
              <span className="text-[10px] text-stone-400">Cold Weather Protocols</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-stone-950 p-2 rounded border border-cyan-900/60">
                <div className="font-bold text-cyan-300">MILD (35-32°C)</div>
                <div className="text-stone-400 mt-1">Violent shivering, slurred speech ("umbles"), clumsy hands.</div>
                <div className="text-emerald-400 font-bold mt-1">Warm sweet drinks, dry base layers.</div>
              </div>
              <div className="bg-stone-950 p-2 rounded border border-amber-900/60">
                <div className="font-bold text-amber-300">MODERATE (32-28°C)</div>
                <div className="text-stone-400 mt-1">Shivering STOPS, stupor, irrational behavior (paradoxical undressing).</div>
                <div className="text-amber-400 font-bold mt-1">Hypo-wrap burrito in sleeping bag with hot bottles in armpits/groin.</div>
              </div>
              <div className="bg-stone-950 p-2 rounded border border-red-900/60">
                <div className="font-bold text-red-400">SEVERE (&lt;28°C)</div>
                <div className="text-stone-400 mt-1">Unconscious, barely perceptible pulse, rigid muscles.</div>
                <div className="text-red-400 font-bold mt-1">Handle EXTREMELY gently (rough handling triggers ventricular fibrillation).</div>
              </div>
            </div>

            <div className="p-2 rounded bg-red-950/40 border border-red-800 text-[10px] text-red-200">
              ⚠️ <strong>GOLDEN RULE:</strong> "A patient is not dead until warm and dead." Never rub frostbitten skin or give alcohol.
            </div>
          </div>
        )}

        {/* TOPIC 3: Snakebite Envenomation */}
        {selectedTopic === 'snakebite' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                PIT VIPER & RATTLESNAKE ENVENOMATION
              </span>
              <span className="text-[10px] text-stone-400">Emergency Protocol</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-stone-950 p-2 rounded border border-emerald-800/80 space-y-1">
                <div className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  DO IMMEDIATELY:
                </div>
                <ul className="list-disc pl-4 text-stone-300 space-y-0.5">
                  <li>Remove rings, bracelets, watches, boots BEFORE swelling begins.</li>
                  <li>Keep bitten extremity immobilized BELOW heart level.</li>
                  <li>Calm victim (lower heart rate slows venom dissemination).</li>
                  <li>Mark advancing swelling line with a pen + timestamp every 15m.</li>
                  <li>Trigger Cyberdeck SOS panic button for immediate evacuation.</li>
                </ul>
              </div>

              <div className="bg-stone-950 p-2 rounded border border-red-800/80 space-y-1">
                <div className="text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  STRICTLY FORBIDDEN:
                </div>
                <ul className="list-disc pl-4 text-stone-300 space-y-0.5">
                  <li>DO NOT apply a tourniquet (concentrates venom, causes necrosis).</li>
                  <li>DO NOT cut wound or use suction venom extractors.</li>
                  <li>DO NOT apply ice or submerge in cold water.</li>
                  <li>DO NOT administer aspirin, ibuprofen, or alcohol.</li>
                  <li>DO NOT try to catch or kill the snake.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TOPIC 4: Heatstroke */}
        {selectedTopic === 'heatstroke' && (
          <div className="space-y-2 text-[10px]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                HEAT EXHAUSTION VS LIFE-THREATENING HEATSTROKE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-stone-950 p-2 rounded border border-stone-800">
                <div className="font-bold text-amber-300">HEAT EXHAUSTION</div>
                <div className="text-stone-400 mt-1">Profuse sweating, pale cold clammy skin, dizziness, nausea. Mentation is NORMAL.</div>
                <div className="text-emerald-400 font-bold mt-1">Rest in shade, loosen gear, sip electrolyte water.</div>
              </div>
              <div className="bg-stone-950 p-2 rounded border border-red-800">
                <div className="font-bold text-red-400">HEATSTROKE (CRITICAL)</div>
                <div className="text-stone-400 mt-1">Confusion, delirium, hot RED skin, core temp &gt;40°C. Organs cooking.</div>
                <div className="text-red-400 font-bold mt-1">RAPID IMMERSION in cold creek or wet cloth fanning immediately. Evacuate.</div>
              </div>
            </div>
          </div>
        )}

        {/* TOPIC 5: Water Disinfection & Barometric Boiling Calculator */}
        {selectedTopic === 'water' && (
          <div className="space-y-2 text-[10px]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-blue-400 flex items-center gap-1.5">
                <Droplets className="w-4 h-4" />
                WATER PURIFICATION & BMP180 BOILING POINT
              </span>
              <span className="text-stone-400">Altitude Calibrated</span>
            </div>

            {/* BMP180 Barometric Altitude Boiling Calculation */}
            <div className="bg-stone-950 p-2.5 rounded-lg border border-blue-900/60 flex items-center justify-between">
              <div>
                <div className="text-stone-400">LOCAL ATMOSPHERIC PRESSURE:</div>
                <div className="text-base font-bold text-cyan-300">{pressureHpa.toFixed(1)} hPa (~{Math.round(telemetry.bmpAlt)}m Alt)</div>
                <div className="text-stone-500 mt-0.5">Water boils at a LOWER temperature at higher elevations.</div>
              </div>

              <div className="text-right">
                <div className="text-stone-400">CALCULATED BOILING POINT:</div>
                <div className="text-lg font-black text-amber-400">{boilingPointC.toFixed(1)}°C</div>
                <div className="text-emerald-400 font-bold">BOIL FOR: {recommendedBoilMinutes} MIN ROLLING</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-stone-950 p-2 rounded border border-stone-800">
                <div className="font-bold text-emerald-300">1. ROLLING BOIL</div>
                <div className="text-stone-400 mt-0.5">Kills 100% of Giardia, Cryptosporidium, bacteria, and viruses. Gold standard.</div>
              </div>
              <div className="bg-stone-950 p-2 rounded border border-stone-800">
                <div className="font-bold text-cyan-300">2. 0.1 MICRON FILTER</div>
                <div className="text-stone-400 mt-0.5">Removes protozoa and bacteria. Does NOT remove backcountry viruses without chlorine.</div>
              </div>
              <div className="bg-stone-950 p-2 rounded border border-stone-800">
                <div className="font-bold text-amber-300">3. CHEMICAL TABLETS</div>
                <div className="text-stone-400 mt-0.5">Chlorine dioxide requires 4 hours in cold snowmelt to neutralize Cryptosporidium cysts.</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
