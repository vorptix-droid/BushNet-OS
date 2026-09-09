import React, { useState, useEffect } from 'react';
import { Monitor, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Compass, Navigation, Radio } from 'lucide-react';
import { SensorTelemetry, ModelSelection, UserProfile, ShelterItem, FoodItem } from '../types';

interface KeypadShieldSimulatorProps {
  telemetry: SensorTelemetry;
  userProfile: UserProfile;
  shelters: ShelterItem[];
  food: FoodItem[];
  modelPreference: ModelSelection;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  lcdOverride?: { line1: string; line2: string } | null;
  onSelectModel: (model: ModelSelection) => void;
  onToggleEmergency: () => void;
}

// Math helpers matching aspen_pi5_core.py exactly
function getCardinal(deg: number): string {
  const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.floor((((deg % 360) + 22.5) / 45.0)) % 8;
  return cardinals[idx];
}

function getCompassDial(deg: number): string {
  const d = Math.floor(deg) % 360;
  const ticks = ["N ", "NE", "E ", "SE", "S ", "SW", "W ", "NW"];
  const idx = Math.floor((((d % 360) + 22.5) / 45.0)) % 8;
  const prev_c = ticks[(idx - 1 + 8) % 8];
  const curr_c = ticks[idx];
  const next_c = ticks[(idx + 1) % 8];
  return `<-${prev_c}--[${curr_c}]--${next_c}->`;
}

function calculateCompassVector(
  currLat: number, currLng: number,
  destLat: number, destLng: number
): { bearingDeg: number; cardinal: string; distM: number } {
  if (isNaN(currLat) || isNaN(currLng) || isNaN(destLat) || isNaN(destLng)) {
    return { bearingDeg: 0, cardinal: "N", distM: 0 };
  }
  const phi1 = (currLat * Math.PI) / 180;
  const phi2 = (destLat * Math.PI) / 180;
  const deltaPhi = ((destLat - currLat) * Math.PI) / 180;
  const deltaLambda = ((destLng - currLng) * Math.PI) / 180;

  const R = 6371000;
  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * (Math.sin(deltaLambda / 2.0) ** 2);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  const distM = Math.round(R * c);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360.0) % 360.0);

  return { bearingDeg, cardinal: getCardinal(bearingDeg), distM };
}

function calculateDawnDusk(latDeg = 44.65): { dawn: string; dusk: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin(((360 / 365.0) * (dayOfYear - 81) * Math.PI) / 180);
  const latRad = (latDeg * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;

  try {
    let cosHa =
      (Math.sin((-0.83 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(decRad)) /
      (Math.cos(latRad) * Math.cos(decRad));
    cosHa = Math.max(-1.0, Math.min(1.0, cosHa));
    const hourAngle = (Math.acos(cosHa) * 180) / Math.PI;
    const solarNoon = 12.0;
    const dayLengthHours = (hourAngle * 2) / 15.0;
    const sunriseHr = solarNoon - dayLengthHours / 2.0;
    const sunsetHr = solarNoon + dayLengthHours / 2.0;

    const dawn = `${String(Math.floor(sunriseHr)).padStart(2, '0')}:${String(
      Math.floor((sunriseHr % 1) * 60)
    ).padStart(2, '0')}`;
    const dusk = `${String(Math.floor(sunsetHr)).padStart(2, '0')}:${String(
      Math.floor((sunsetHr % 1) * 60)
    ).padStart(2, '0')}`;
    return { dawn, dusk };
  } catch (e) {
    return { dawn: '05:45', dusk: '20:15' };
  }
}

export const KeypadShieldSimulator: React.FC<KeypadShieldSimulatorProps> = ({
  telemetry,
  userProfile,
  shelters,
  food,
  modelPreference,
  activeModel,
  lcdOverride,
  onSelectModel,
  onToggleEmergency,
}) => {
  const TOTAL_PAGES = 9;
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [sensorScrollIdx, setSensorScrollIdx] = useState<number>(0);
  const [shelterIdx, setShelterIdx] = useState<number>(0);
  const [shelterSub, setShelterSub] = useState<number>(0);
  const [foodIdx, setFoodIdx] = useState<number>(0);
  const [foodSub, setFoodSub] = useState<number>(0);
  const [compassIdx, setCompassIdx] = useState<number>(0);
  const [voiceOffset, setVoiceOffset] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('12:00:00');

  const [lastButtonPressed, setLastButtonPressed] = useState<string>('NONE');
  const [serialLog, setSerialLog] = useState<string[]>([
    '[INIT] LiquidCrystal(8, 9, 4, 5, 6, 7) display ready',
    '[BAUD] 9600 Baud Serial Stream connected to Pi 5 (/dev/ttyACM0)',
    '[ASPEN] 9-Page Master LCD Kernel Loop Online (P1/9 to P9/9)',
  ]);

  // Live real-time clock ticker for Page 4
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(
        d.toTimeString().split(' ')[0] || '12:00:00'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addSerialLog = (btn: string, txLine1: string, txLine2: string) => {
    setLastButtonPressed(btn);
    const rxLog = `[RX ← UNO] BTN:${btn}`;
    const txLog = `[TX → UNO] LCD:${txLine1.trim()}|${txLine2.trim()}`;
    setSerialLog((prev) => [txLog, rxLog, ...prev.slice(0, 14)]);
  };

  const handleNextPage = () => {
    const nextP = (currentPage + 1) % TOTAL_PAGES;
    setCurrentPage(nextP);
    setSensorScrollIdx(0);
    setShelterSub(0);
    setFoodSub(0);
    const { l1, l2 } = getPageDisplay(nextP, 0, shelterIdx, 0, foodIdx, 0, compassIdx);
    addSerialLog('RIGHT', l1, l2);
  };

  const handlePrevPage = () => {
    const prevP = (currentPage - 1 + TOTAL_PAGES) % TOTAL_PAGES;
    setCurrentPage(prevP);
    setSensorScrollIdx(0);
    setShelterSub(0);
    setFoodSub(0);
    const { l1, l2 } = getPageDisplay(prevP, 0, shelterIdx, 0, foodIdx, 0, compassIdx);
    addSerialLog('LEFT', l1, l2);
  };

  const handleUp = () => {
    let nextSensIdx = sensorScrollIdx;
    let nextSIdx = shelterIdx;
    let nextSSub = shelterSub;
    let nextFIdx = foodIdx;
    let nextFSub = foodSub;
    let nextCIdx = compassIdx;

    if (currentPage === 1) {
      nextSensIdx = (sensorScrollIdx - 1 + 3) % 3;
      setSensorScrollIdx(nextSensIdx);
    } else if (currentPage === 4 && shelters.length > 0) {
      nextSSub = Math.max(0, shelterSub - 1);
      if (nextSSub === 0) {
        nextSIdx = (shelterIdx - 1 + shelters.length) % shelters.length;
      }
      setShelterIdx(nextSIdx);
      setShelterSub(nextSSub);
    } else if (currentPage === 5 && food.length > 0) {
      nextFSub = Math.max(0, foodSub - 1);
      if (nextFSub === 0) {
        nextFIdx = (foodIdx - 1 + food.length) % food.length;
      }
      setFoodIdx(nextFIdx);
      setFoodSub(nextFSub);
    } else if (currentPage === 6 && shelters.length > 0) {
      nextCIdx = (compassIdx - 1 + shelters.length) % shelters.length;
      setCompassIdx(nextCIdx);
    }

    const { l1, l2 } = getPageDisplay(currentPage, nextSensIdx, nextSIdx, nextSSub, nextFIdx, nextFSub, nextCIdx);
    addSerialLog('UP', l1, l2);
  };

  const handleDown = () => {
    let nextSensIdx = sensorScrollIdx;
    let nextSIdx = shelterIdx;
    let nextSSub = shelterSub;
    let nextFIdx = foodIdx;
    let nextFSub = foodSub;
    let nextCIdx = compassIdx;

    if (currentPage === 1) {
      nextSensIdx = (sensorScrollIdx + 1) % 3;
      setSensorScrollIdx(nextSensIdx);
    } else if (currentPage === 4 && shelters.length > 0) {
      nextSSub = (shelterSub + 1) % 2;
      if (nextSSub === 0) {
        nextSIdx = (shelterIdx + 1) % shelters.length;
      }
      setShelterIdx(nextSIdx);
      setShelterSub(nextSSub);
    } else if (currentPage === 5 && food.length > 0) {
      nextFSub = (foodSub + 1) % 2;
      if (nextFSub === 0) {
        nextFIdx = (foodIdx + 1) % food.length;
      }
      setFoodIdx(nextFIdx);
      setFoodSub(nextFSub);
    } else if (currentPage === 6 && shelters.length > 0) {
      nextCIdx = (compassIdx + 1) % shelters.length;
      setCompassIdx(nextCIdx);
    }

    const { l1, l2 } = getPageDisplay(currentPage, nextSensIdx, nextSIdx, nextSSub, nextFIdx, nextFSub, nextCIdx);
    addSerialLog('DOWN', l1, l2);
  };

  const handleSelect = () => {
    const nextModel: ModelSelection =
      modelPreference === 'auto' ? 'qwen-0.5b' : modelPreference === 'qwen-0.5b' ? 'qwen-1.5b' : 'auto';
    onSelectModel(nextModel);
    const { l1, l2 } = getPageDisplay(currentPage, sensorScrollIdx, shelterIdx, shelterSub, foodIdx, foodSub, compassIdx);
    addSerialLog('SELECT', l1, l2);
  };

  const handleReset = () => {
    setCurrentPage(0);
    setSensorScrollIdx(0);
    setShelterIdx(0);
    setShelterSub(0);
    setFoodIdx(0);
    setFoodSub(0);
    setCompassIdx(0);
    setSerialLog([
      '[RESET] Arduino Hardware Reset button pulsed (RST Pin)',
      '[LCD] Initialized Page 1/9 (Overview)',
      ...serialLog.slice(0, 10),
    ]);
    setLastButtonPressed('RESET');
  };

  // Helper to format exactly 16 chars
  const pad16 = (s: string): string => {
    return (s + '                ').substring(0, 16);
  };

  // 9-Page Master Display generator with dedicated GPS Page (P3/9) and clean Env Hub (P2/9)
  const getPageDisplay = (
    page: number,
    sensIdx: number,
    sIdx: number,
    sSub: number,
    fIdx: number,
    fSub: number,
    cIdx: number
  ): { l1: string; l2: string } => {
    const pageNumStr = `P${page + 1}/${TOTAL_PAGES}`;
    const activeTemp = telemetry.kyTemp ?? telemetry.dhtTemp;
    const tStr = `${activeTemp.toFixed(1)}C`;

    let l1 = '';
    let l2 = '';

    switch (page) {
      case 0: // Page 1: Overview
        l1 = pad16(`BUSHNET     ${pageNumStr}`);
        l2 = pad16(`${tStr} | ${Math.round(telemetry.bmpPressure)}hPa`);
        break;

      case 1: // Page 2: Environmental Sensors Hub (UP/DOWN scrolls 3 items: [1/3], [2/3], [3/3])
        if (sensIdx === 0) {
          l1 = pad16(`BARO & ALT  ${pageNumStr}`);
          l2 = pad16(`${telemetry.bmpPressure.toFixed(1)}hPa ${Math.round(telemetry.bmpAlt)}m`);
        } else if (sensIdx === 1) {
          l1 = pad16(`KY001 PROBE ${pageNumStr}`);
          l2 = telemetry.kyTemp !== null && telemetry.kyTemp !== undefined
            ? pad16(`TEMP: ${telemetry.kyTemp.toFixed(1)} C`)
            : pad16('TEMP: 21.4 C');
        } else {
          l1 = pad16(`DHT11 SENS  ${pageNumStr}`);
          l2 = pad16(`T:${tStr} HUM:${telemetry.dhtHum}%`);
        }
        break;

      case 2: // Page 3: Dedicated GPS Navigation Page
        const fixStr = telemetry.gpsSats >= 4 ? '3DFIX' : 'SRCH';
        const latStr = telemetry.gpsLat ? `${telemetry.gpsLat.toFixed(2)}N` : 'NO GPS';
        const lngStr = telemetry.gpsLng ? `${Math.abs(telemetry.gpsLng).toFixed(2)}W` : 'SIGNAL';
        l1 = pad16(`GPS:${fixStr}     ${pageNumStr}`);
        l2 = pad16(`${latStr},${lngStr}`);
        break;

      case 3: // Page 4: Solar Clock & Ephemeris
        const { dawn, dusk } = calculateDawnDusk(telemetry.gpsLat || 44.65);
        l1 = pad16(`${currentTimeStr.substring(0, 8)}    ${pageNumStr}`);
        l2 = pad16(`DWN:${dawn} DSK:${dusk}`);
        break;

      case 4: // Page 5: Shelter Logger (Sub-views with UP/DOWN)
        if (shelters.length === 0) {
          l1 = pad16(`SHELTERS    ${pageNumStr}`);
          l2 = pad16('NO LOGS YET');
        } else {
          const sItem = shelters[sIdx % shelters.length];
          l1 = pad16(`SHLTR ${sIdx + 1}/${shelters.length}   ${pageNumStr}`);
          l2 = pad16(sItem.name || sItem.type || 'SHELTER');
        }
        break;

      case 5: // Page 6: Food & Rations (Sub-views with UP/DOWN)
        if (food.length === 0) {
          l1 = pad16(`FOOD RATS   ${pageNumStr}`);
          l2 = pad16('EMPTY (0 ITEMS)');
        } else {
          const fItem = food[fIdx % food.length];
          l1 = pad16(`FOOD ${fIdx + 1}/${food.length}    ${pageNumStr}`);
          l2 = pad16(`${fItem.name.substring(0, 10)} x${fItem.quantity}`);
        }
        break;

      case 6: // Page 7: Return-to-Shelter Homing Vector
        if (shelters.length === 0) {
          l1 = pad16(`HOMING      ${pageNumStr}`);
          l2 = pad16('NO SHELTER SET');
        } else {
          const targetCamp = shelters[cIdx % shelters.length];
          const destLat = targetCamp.locationLat ?? telemetry.gpsLat;
          const destLng = targetCamp.locationLng ?? telemetry.gpsLng;
          const { bearingDeg, cardinal, distM } = calculateCompassVector(
            telemetry.gpsLat, telemetry.gpsLng,
            destLat, destLng
          );
          const distStr = distM < 1000 ? `${distM}m` : `${(distM / 1000.0).toFixed(1)}km`;
          l1 = pad16(`HOMING->${cardinal.padEnd(2, ' ')}  ${pageNumStr}`);
          l2 = pad16(`BRG:${String(bearingDeg).padStart(3, '0')}D ${distStr}`);
        }
        break;

      case 7: // Page 8: Live Rotating Digital Compass Dial
        const hdg = telemetry.headingDeg ?? 0;
        const card = getCardinal(hdg);
        l1 = pad16(`HDG:${String(Math.round(hdg)).padStart(3, '0')}D ${card.padEnd(2, ' ')}  ${pageNumStr}`);
        l2 = pad16(getCompassDial(hdg));
        break;

      case 8: // Page 9: Live Voice AI Message Review & Response
        l1 = pad16(`VOICE AI    ${pageNumStr}`);
        l2 = pad16('"weather forecast"');
        break;

      default:
        l1 = pad16(`BUSHNET ${pageNumStr}`);
        l2 = pad16('SYSTEM NOMINAL');
    }

    return { l1, l2 };
  };

  // Determine current lines
  const { l1: defaultL1, l2: defaultL2 } = getPageDisplay(
    currentPage,
    sensorScrollIdx,
    shelterIdx,
    shelterSub,
    foodIdx,
    foodSub,
    compassIdx
  );

  const displayLine1 = lcdOverride ? pad16(lcdOverride.line1) : defaultL1;
  const displayLine2 = lcdOverride ? pad16(lcdOverride.line2) : defaultL2;

  const PAGE_NAMES = [
    'Overview',
    'Env Sensors [1-3]',
    'GPS Navigation',
    'Solar Clock & Sun',
    'Shelters',
    'Food Rations',
    'Homing Vector',
    'Digital Compass',
    'Voice AI Communicator',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-4">
      
      {/* Module Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Monitor className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold font-mono text-sm uppercase tracking-wide text-slate-200">
            Arduino Uno 16x2 Keypad Shield (USB /dev/ttyACM0)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            10-PAGE KERNEL SYNC
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
            9600 Baud
          </span>
        </div>
      </div>

      {/* Physical Keypad Shield Hardware Enclosure Simulation */}
      <div className="bg-blue-950/40 border-2 border-slate-700 rounded-xl p-4 sm:p-5 shadow-2xl relative">
        
        {/* PCB Labeling */}
        <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          <span>KEYESTUDIO 1602 LCD KEYPAD SHIELD</span>
          <span>PINOUT: D4-D9, A0 (VOLTAGE DIVIDER)</span>
        </div>

        {/* 16x2 Character LCD Screen Box (Exact HD44780 Blue Backlight) */}
        <div className="bg-sky-950 border-4 border-slate-900 rounded-lg p-4 font-mono shadow-inner text-cyan-300 relative overflow-hidden select-none">
          
          {/* LCD Grid lines texture effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#082f49_1px,transparent_1px)] [background-size:8px_8px] opacity-40 pointer-events-none" />

          {/* LCD Backlight Glow header */}
          <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold mb-1 opacity-90">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
              [16x2 HD44780 DISPLAY]
            </span>
            <span className="text-sky-300 font-bold">
              PAGE {currentPage + 1}/{TOTAL_PAGES}: {PAGE_NAMES[currentPage]}
            </span>
          </div>

          {/* Text Lines with authentic LCD dot-matrix font rendering */}
          <div className="space-y-1 font-mono tracking-widest text-lg sm:text-xl font-bold text-sky-200 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
            <div className="bg-sky-900/40 px-2.5 py-1 rounded border border-sky-800/40 whitespace-pre">
              {displayLine1}
            </div>
            <div className="bg-sky-900/40 px-2.5 py-1 rounded border border-sky-800/40 whitespace-pre">
              {displayLine2}
            </div>
          </div>
        </div>

        {/* Page Fast Jump Indicators */}
        <div className="mt-3 flex items-center justify-center gap-1 overflow-x-auto py-1">
          {Array.from({ length: TOTAL_PAGES }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentPage(idx);
                setShelterSub(0);
                setFoodSub(0);
                const { l1, l2 } = getPageDisplay(idx, 0, shelterIdx, 0, foodIdx, 0, compassIdx);
                addSerialLog(`P${idx + 1}`, l1, l2);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                currentPage === idx
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={`Page ${idx + 1}: ${PAGE_NAMES[idx]}`}
            >
              P{idx + 1}
            </button>
          ))}
        </div>

        {/* Tactile Keypad Shield Push Buttons - Physical Keyestudio 1602 Layout */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col items-center gap-3">
          
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between w-full">
            <span className="text-slate-300 font-bold">PHYSICAL KEYESTUDIO PUSH BUTTONS:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold border border-slate-700">
              Analog A0 Voltage Ladder
            </span>
          </div>

          {/* Physical Keyestudio Board Layout */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full bg-slate-950/80 p-3 rounded-xl border border-slate-800 overflow-x-auto">
            
            {/* Button 1 (Far Left): SELECT */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-[9px] font-mono text-slate-400">A0: 500-750</span>
              <button
                onClick={handleSelect}
                className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-lg text-emerald-400 text-xs font-mono font-black flex items-center gap-1 shadow transition"
                title="SELECT Button: Cycle Model (Auto / 0.5B / 1.5B) & Recalibrate"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SELECT</span>
              </button>
            </div>

            {/* Button 2: LEFT (Prev Page) */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-[9px] font-mono text-slate-400">A0: 300-500</span>
              <button
                onClick={handlePrevPage}
                className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 text-xs font-mono font-bold flex items-center gap-1 shadow transition"
                title="LEFT Button: Previous Page (P10 -> P1)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                <span>LEFT</span>
              </button>
            </div>

            {/* Buttons 3 & 4 (Stacked Center): UP & DOWN */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 px-1 border-x border-slate-800">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-amber-400 font-bold">UP (A0: 50-150)</span>
              </div>
              <button
                onClick={handleUp}
                className="w-full px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-md text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1 shadow transition"
                title="UP Button: Cycle shelters/food sub-pages"
              >
                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                <span>UP</span>
              </button>

              <button
                onClick={handleDown}
                className="w-full px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-md text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1 shadow transition"
                title="DOWN Button: Cycle shelters/food sub-pages"
              >
                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                <span>DOWN</span>
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-amber-400 font-bold">DOWN (A0: 150-300)</span>
              </div>
            </div>

            {/* Button 5: RIGHT (Next Page) */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-[9px] font-mono text-slate-400">A0: 0-50</span>
              <button
                onClick={handleNextPage}
                className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 text-xs font-mono font-bold flex items-center gap-1 shadow transition"
                title="RIGHT Button: Next Page (P1 -> P10)"
              >
                <span>RIGHT</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>

            {/* Button 6 (Far Right): Hardcoded Hardware RST */}
            <div className="flex flex-col items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
              <span className="text-[9px] font-mono text-red-400 font-bold">PIN: RESET</span>
              <button
                onClick={handleReset}
                className="px-3.5 py-3 bg-red-950/90 hover:bg-red-900 active:bg-red-800 border border-red-700 rounded-lg text-red-300 text-xs font-mono font-bold flex items-center gap-1 shadow transition"
                title="HARDCODED ARDUINO RESET BUTTON (RST Pin)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                <span>RST</span>
              </button>
            </div>

          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between gap-3 w-full pt-1">
            <div className="text-[10px] font-mono text-slate-400">
              Active Screen: <span className="text-cyan-300 font-bold">Page {currentPage + 1}/10 ({PAGE_NAMES[currentPage]})</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Last Input: <span className="text-cyan-400 font-bold">{lastButtonPressed}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Arduino Serial Stream Output Log */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold border-b border-slate-800/80 pb-1">
          <span>SERIAL STREAM LOG (/dev/ttyACM0 • 9600 BAUD)</span>
          <span className="text-emerald-400">● LIVE LINK OK</span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1 pt-1 font-mono text-[11px]">
          {serialLog.map((log, i) => (
            <div
              key={i}
              className={
                log.startsWith('[TX')
                  ? 'text-cyan-300'
                  : log.startsWith('[RX')
                  ? 'text-amber-300'
                  : 'text-slate-400'
              }
            >
              {log}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
