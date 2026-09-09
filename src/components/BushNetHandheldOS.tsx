import React, { useState, useEffect, useRef } from 'react';
import {
  CloudSun,
  Fish,
  Bot,
  Compass,
  Package,
  Cpu,
  Home,
  AlertTriangle,
  Radio,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Eye,
  Terminal,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Navigation,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  Zap,
  Plus,
  Minus,
  Trash2,
  Sunrise,
  Sunset,
  CloudRain,
  Sliders,
  Check,
  Waves,
  Info,
  ChevronDown,
  Sun,
  Footprints,
  Moon,
  HeartPulse,
} from 'lucide-react';
import { UserProfile, SensorTelemetry, ShelterItem, FoodItem, GearItem, MedicalCondition, ModelSelection } from '../types';
import { FISHING_HABITATS } from '../data/fishingHabitats';
import { RiiMiniKeyboard } from './RiiMiniKeyboard';
import { GpsListingModal } from './GpsListingModal';
import { GpsDiagnosticsAndCalibrator } from './GpsDiagnosticsAndCalibrator';
import { QuickSettingsShade } from './QuickSettingsShade';
import { WildlifeTrackerApp } from './WildlifeTrackerApp';
import { AstroEphemerisApp } from './AstroEphemerisApp';
import { FirstAidTriageApp } from './FirstAidTriageApp';

interface BushNetHandheldOSProps {
  userProfile: UserProfile;
  telemetry: SensorTelemetry;
  shelters: ShelterItem[];
  food: FoodItem[];
  gear: GearItem[];
  medical: MedicalCondition[];
  modelPreference: ModelSelection;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  isAiPowered: boolean;
  onUpdateTelemetry: (updated: Partial<SensorTelemetry>) => void;
  onToggleEmergency: () => void;
  onToggleAiPower: () => void;
  onUpdateFood?: (food: FoodItem[]) => void;
  onUpdateGear?: (gear: GearItem[]) => void;
}

type ActiveApp =
  | 'launcher'
  | 'weather'
  | 'fishing'
  | 'aspen'
  | 'gps'
  | 'rations'
  | 'wildlife'
  | 'astronomy'
  | 'firstaid'
  | 'system';

export const BushNetHandheldOS: React.FC<BushNetHandheldOSProps> = ({
  userProfile,
  telemetry,
  shelters,
  food,
  gear,
  medical,
  modelPreference,
  activeModel,
  isAiPowered,
  onUpdateTelemetry,
  onToggleEmergency,
  onToggleAiPower,
  onUpdateFood,
  onUpdateGear,
}) => {
  // Navigation & Screen View State
  const [activeApp, setActiveApp] = useState<ActiveApp>('launcher');
  const [isNightMode, setIsNightMode] = useState(false);
  const [isKioskFullscreen, setIsKioskFullscreen] = useState(false);
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  // Quick Settings Shade (Pull-Down / Control Center)
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [screenBrightness, setScreenBrightness] = useState<number>(85);
  const [topDragStartY, setTopDragStartY] = useState<number | null>(null);

  const handleTopPointerDown = (e: React.PointerEvent) => {
    setTopDragStartY(e.clientY);
  };

  const handleTopPointerMove = (e: React.PointerEvent) => {
    if (topDragStartY !== null && e.clientY - topDragStartY > 25) {
      setIsQuickSettingsOpen(true);
      setTopDragStartY(null);
    }
  };

  const handleTopPointerUp = () => {
    setTopDragStartY(null);
  };

  // Time clock
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather App State: AI Weather Training Ground Truth
  const [observedSky, setObservedSky] = useState<'Clear' | 'Overcast' | 'Light Rain' | 'Heavy Storm' | 'Snow' | 'Fog'>('Overcast');
  const [groundTruthTrained, setGroundTruthTrained] = useState<string | null>(null);

  // Fishing App State: Target Fish & Habitat Selectors
  const [selectedHabitatId, setSelectedHabitatId] = useState<string>('mountain_stream');
  const currentHabitat = FISHING_HABITATS.find((h) => h.id === selectedHabitatId) || FISHING_HABITATS[0];

  const [selectedFishId, setSelectedFishId] = useState<string>('brook_trout');
  const currentFish = currentHabitat.fishSpecies.find((f) => f.id === selectedFishId) || currentHabitat.fishSpecies[0];

  const handleHabitatChange = (newHabitatId: string) => {
    setSelectedHabitatId(newHabitatId);
    const nextHab = FISHING_HABITATS.find((h) => h.id === newHabitatId) || FISHING_HABITATS[0];
    if (!nextHab.fishSpecies.some((f) => f.id === selectedFishId)) {
      setSelectedFishId(nextHab.fishSpecies[0].id);
    }
  };

  // Rations & Gear App State: Active View & Quick Add Inputs
  const [rationsTab, setRationsTab] = useState<'food' | 'gear'>('food');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemCalories, setNewItemCalories] = useState('500');
  const [newItemWeight, setNewItemWeight] = useState('0.5');
  const [showAddForm, setShowAddForm] = useState(false);

  // GPS App State: Listing Spec Modal
  const [isGpsListingModalOpen, setIsGpsListingModalOpen] = useState(false);

  // Aspen Chat State inside the OS
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'aspen' | 'system'; text: string; time: string; manualCitation?: string }>>([
    {
      sender: 'aspen',
      text: `ASPEN Survival OS ready. Offline Qwen 2.5 1.5B loaded (1.1GB RAM allocated on Cores 1-3). Attached: BMP180, KY-001, DHT11 via Arduino USB, VK-162 GPS. Type query with Rii keyboard.`,
      time: '10:00',
      manualCitation: 'US Army FM 3-05.70 & NOAA Barometric Guide',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Terminal Shell State inside System App
  const [shellCommands, setShellCommands] = useState<Array<{ cmd: string; out: string }>>([
    { cmd: 'uname -a', out: 'Linux bushnet-pi5 6.6.20+rpt-rpi-2712 #1 SMP PREEMPT Debian 1:6.6.20-1+rpt1 (2024-03-07) aarch64' },
    { cmd: 'free -h', out: '               total        used        free      shared  buff/cache   available\nMem:           1.9Gi       1.1Gi       540Mi        12Mi       280Mi       780Mi\nSwap:          1.0Gi          0B       1.0Gi' },
    { cmd: 'lsusb', out: 'Bus 001 Device 004: ID 1546:01a7 U-Blox AG [u-blox 7 GPS]\nBus 001 Device 003: ID 2341:0043 Arduino SA Uno R3 (Sensor Hub)\nBus 001 Device 002: ID 1997:2433 Rii Mini X1 Wireless 2.4G Receiver' },
  ]);
  const [shellInput, setShellInput] = useState('');

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Global physical keyboard listener to type directly into Aspen or Shell
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside a standard HTML input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        setActiveApp('launcher');
        return;
      }

      if (activeApp === 'aspen') {
        if (e.key === 'Enter') {
          handleSendAspenChat();
        } else if (e.key === 'Backspace') {
          setInputPrompt((prev) => prev.slice(0, -1));
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setInputPrompt((prev) => prev + e.key);
        }
      } else if (activeApp === 'launcher') {
        const apps: ActiveApp[] = [
          'weather',
          'fishing',
          'aspen',
          'gps',
          'rations',
          'wildlife',
          'astronomy',
          'firstaid',
          'system',
        ];
        const total = apps.length;
        if (e.key === 'ArrowRight') setSelectedAppIndex((prev) => (prev + 1) % total);
        else if (e.key === 'ArrowLeft') setSelectedAppIndex((prev) => (prev - 1 + total) % total);
        else if (e.key === 'ArrowDown') setSelectedAppIndex((prev) => (prev + 3) % total);
        else if (e.key === 'ArrowUp') setSelectedAppIndex((prev) => (prev - 3 + total) % total);
        else if (e.key === 'Enter') {
          setActiveApp(apps[selectedAppIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeApp, selectedAppIndex, inputPrompt]);

  // Handle Rii Mini Keyboard inputs
  const handleVirtualKeyPress = (char: string) => {
    if (activeApp === 'aspen') {
      setInputPrompt((prev) => prev + char);
    } else if (activeApp === 'system') {
      setShellInput((prev) => prev + char);
    }
  };

  const handleVirtualBackspace = () => {
    if (activeApp === 'aspen') {
      setInputPrompt((prev) => prev.slice(0, -1));
    } else if (activeApp === 'system') {
      setShellInput((prev) => prev.slice(0, -1));
    }
  };

  const handleVirtualEnter = () => {
    const apps: ActiveApp[] = [
      'weather',
      'fishing',
      'aspen',
      'gps',
      'rations',
      'wildlife',
      'astronomy',
      'firstaid',
      'system',
    ];
    if (activeApp === 'aspen') {
      handleSendAspenChat();
    } else if (activeApp === 'system') {
      handleExecuteShellCmd();
    } else if (activeApp === 'launcher') {
      setActiveApp(apps[selectedAppIndex]);
    }
  };

  const handleVirtualArrow = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (activeApp === 'launcher') {
      const total = 9;
      if (direction === 'RIGHT') setSelectedAppIndex((p) => (p + 1) % total);
      if (direction === 'LEFT') setSelectedAppIndex((p) => (p - 1 + total) % total);
      if (direction === 'DOWN') setSelectedAppIndex((p) => (p + 3) % total);
      if (direction === 'UP') setSelectedAppIndex((p) => (p - 3 + total) % total);
    }
  };

  // Execute Shell Command inside System app
  const handleExecuteShellCmd = () => {
    const trimmed = shellInput.trim();
    if (!trimmed) return;

    let response = `bash: ${trimmed}: command not found`;
    if (trimmed === 'clear') {
      setShellCommands([]);
      setShellInput('');
      return;
    } else if (trimmed === 'sensors' || trimmed.includes('sensor')) {
      response = `BMP180: ${telemetry.bmpPressure} hPa (${telemetry.bmpAlt}m)\nDHT11: ${telemetry.dhtTemp}°C, ${telemetry.dhtHum}% RH\nKY-001: ${telemetry.kyTemp}°C (Waterproof Probe)\nArduino USB: /dev/ttyUSB0 (9600 baud streaming)`;
    } else if (trimmed === 'ollama ps') {
      response = `NAME              ID            SIZE      PROCESSOR    UNTIL\nqwen2.5:1.5b      a202d5a37172  1.1 GB    100% CPU     Forever (Pinned to Cores 1,2,3)`;
    } else if (trimmed === 'uptime') {
      response = ` 10:28:14 up  4:12,  1 user,  load average: 0.18, 0.22, 0.19`;
    } else if (trimmed === 'dmesg | tail') {
      response = `[   12.410291] rp1-i2c 1f00070000.i2c: I2C adapter registered\n[   12.890123] cdc_acm 1-1.3:1.0: ttyACM0: USB ACM device (Arduino Hub)\n[   13.119024] pl2303 1-1.2:1.0: pl2303 converter detected (VK-162 GPS)`;
    } else if (trimmed.includes('help')) {
      response = `Available commands: sensors, ollama ps, free -h, uptime, lsusb, uname -a, clear`;
    }

    setShellCommands((prev) => [...prev, { cmd: trimmed, out: response }]);
    setShellInput('');
  };

  // Call simulated Qwen AI backend
  const handleSendAspenChat = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const userMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: promptToSend, time: userMessageTime }]);
    if (!overridePrompt) setInputPrompt('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/aspen/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          modelPreference: activeModel,
          profile: userProfile,
          sensors: telemetry,
          shelters,
          food,
          gear,
          medical,
          activeEmergency: telemetry.emergencyActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        // Strip ```lcd code blocks for the compact chat screen
        const cleanText = data.text.replace(/```lcd[\s\S]*?```/g, '').trim();
        const citation = data.ragMatches && data.ragMatches.length > 0
          ? data.ragMatches[0].source
          : 'US Army FM 3-05.70 Wilderness Manual';

        setMessages((prev) => [
          ...prev,
          {
            sender: 'aspen',
            text: cleanText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            manualCitation: citation,
          },
        ]);
      } else {
        throw new Error(data.error || 'Offline AI daemon response error');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'aspen',
          text: `ASPEN OFFLINE FALLBACK: Based on barometric reading (${telemetry.bmpPressure} hPa, ${telemetry.pressureTrend}), maintain camp security and check rations. Error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          manualCitation: 'Internal Pi 5 Cache Protocol',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate Homing Vector to Basecamp
  const baseCamp = shelters[0] || { locationLat: 45.3125, locationLng: -65.5218, name: 'Base Camp' };
  const dLat = (baseCamp.locationLat || 45.3125) - telemetry.gpsLat;
  const dLng = (baseCamp.locationLng || -65.5218) - telemetry.gpsLng;
  const distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
  const bearingRad = Math.atan2(dLng, dLat);
  const bearingDeg = Math.round((bearingRad * (180 / Math.PI) + 360) % 360);

  // Solunar calculations
  const isFallingPressure = telemetry.pressureTrend.includes('Falling') || telemetry.pressureTrend.includes('Storm');
  const biteScore = isFallingPressure ? 92 : telemetry.bmpPressure > 1018 ? 58 : 74;
  const biteRating = biteScore > 80 ? 'EXCELLENT (BINGE FEEDING)' : biteScore > 65 ? 'MODERATE / ACTIVE' : 'SLOW (DEEP COVER)';

  // App Launcher List
  const appList = [
    {
      id: 'weather' as ActiveApp,
      title: 'Weather',
      icon: CloudSun,
      color: 'text-cyan-400',
      badge: `${telemetry.bmpPressure} hPa`,
      sub: telemetry.pressureTrend,
    },
    {
      id: 'fishing' as ActiveApp,
      title: 'Fishing',
      icon: Fish,
      color: 'text-emerald-400',
      badge: `Bite: ${biteScore}%`,
      sub: `${currentFish.name} • ${currentHabitat.name.split('&')[0].trim()}`,
    },
    {
      id: 'aspen' as ActiveApp,
      title: 'Aspen AI',
      icon: Bot,
      color: 'text-amber-400',
      badge: 'Qwen 1.5B',
      sub: 'Offline RAG Grounded',
    },
    {
      id: 'gps' as ActiveApp,
      title: 'GPS & Waypoint',
      icon: Compass,
      color: 'text-sky-400',
      badge: `${Math.round(telemetry.gpsAlt)}m Alt`,
      sub: `${telemetry.gpsSats} Sats • u-blox 7`,
    },
    {
      id: 'rations' as ActiveApp,
      title: 'Rations',
      icon: Package,
      color: 'text-emerald-300',
      badge: `${food.reduce((a, f) => a + (Number(f.totalCalories) || 0), 0)} kcal`,
      sub: `${food.length} Food • ${gear.length} Gear`,
    },
    {
      id: 'wildlife' as ActiveApp,
      title: 'Wildlife & Tracks',
      icon: Footprints,
      color: 'text-amber-400',
      badge: 'Dichotomous Key',
      sub: 'Prints, Scat & Safety',
    },
    {
      id: 'astronomy' as ActiveApp,
      title: 'Sun & Moon Ephemeris',
      icon: Moon,
      color: 'text-purple-400',
      badge: 'GPS Celestial',
      sub: 'Dawn, Dusk & Night Hike',
    },
    {
      id: 'firstaid' as ActiveApp,
      title: 'Wilderness Medicine',
      icon: HeartPulse,
      color: 'text-red-400',
      badge: 'TCCC Triage',
      sub: 'Tourniquet & Snakebite',
    },
    {
      id: 'system' as ActiveApp,
      title: 'System & Shell',
      icon: Cpu,
      color: 'text-purple-400',
      badge: 'RPi 5 Core 0/1-3',
      sub: 'Hardware Sensor Bus',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Outer Top Controls: Night Vision Red Mode & Kiosk Fullscreen Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-xs font-mono font-bold text-stone-200">
            FREENOVE 5.0" (800×480) IPS CAPACITIVE MIPI DSI + RII MINI X1
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
            ZERO INTERNET / 100% AIR-GAPPED
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Settings Pull-Down Trigger */}
          <button
            id="outer-quick-settings-btn"
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition border ${
              isQuickSettingsOpen
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-stone-700'
            }`}
            title="Open Phone-Style Pull-Down Quick Settings Shade (Power, Brightness, Radio)"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>{isQuickSettingsOpen ? 'CLOSE SETTINGS' : 'QUICK SETTINGS'}</span>
          </button>

          {/* Night Vision Red Mode Toggle */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition border ${
              isNightMode
                ? 'bg-red-950 text-red-400 border-red-800 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
            title="Toggle Tactical Night-Vision Red Phosphor Mode (Preserves Night Vision)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isNightMode ? 'NIGHT RED ON' : 'NIGHT RED OFF'}</span>
          </button>

          {/* Fullscreen Kiosk Mode Toggle */}
          <button
            onClick={() => setIsKioskFullscreen(!isKioskFullscreen)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-stone-950 font-mono font-bold text-xs flex items-center gap-1.5 transition shadow"
            title="Expand to Pure 800x480 Fullscreen Kiosk Mode (What Boots on Real Pi 5)"
          >
            {isKioskFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isKioskFullscreen ? 'EXIT KIOSK VIEW' : 'FULLSCREEN KIOSK'}</span>
          </button>
        </div>
      </div>

      {/* Main Handheld Device Casing Frame (Cyberdeck Body) */}
      <div
        className={`transition-all duration-300 ${
          isKioskFullscreen
            ? 'w-full max-w-4xl mx-auto'
            : 'bg-gradient-to-b from-stone-900 via-stone-950 to-black p-4 sm:p-7 rounded-3xl border-4 border-stone-700 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-w-2xl mx-auto relative'
        }`}
      >
        
        {/* Cyberdeck Header Silkscreen Labels, Physical LEDs & Hardware Panic Button */}
        {!isKioskFullscreen && (
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-stone-800/80 px-2 select-none gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black tracking-widest text-stone-400 font-mono">
                🌲 BUSH<span className="text-emerald-400">NET</span> CYBERDECK
              </span>
              <span className="text-[10px] font-mono text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                5.0" DSI • PI 5 • QWEN 1.5B
              </span>
            </div>

            {/* Hardware Status LEDs and Chassis Tactile Panic Button */}
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                <span className="text-stone-300">PWR 5.1V</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <span className={`w-2 h-2 rounded-full ${telemetry.gpsSats > 0 ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-stone-700'}`} />
                <span className="text-stone-300">GPS 3D</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span className="text-stone-300">PI GPIO (DSI)</span>
              </div>

              {/* INTEGRATED HARDWARE PANIC / SOS BUTTON */}
              <button
                id="cyberdeck-bezel-panic-button"
                onClick={onToggleEmergency}
                className={`px-3 py-1 rounded-lg font-mono font-black text-[11px] flex items-center gap-1.5 transition-all shadow-md active:scale-95 border cursor-pointer ${
                  telemetry.emergencyActive
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse border-red-300 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                    : 'bg-gradient-to-b from-red-950 via-stone-900 to-black hover:from-red-900 hover:to-stone-850 text-red-400 border-red-800/80 hover:border-red-500 hover:text-red-300'
                }`}
                title="Tactile Hardware Emergency Panic Button (Direct Pi 5 GPIO)"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${telemetry.emergencyActive ? 'animate-bounce text-white' : 'text-red-500'}`} />
                <span>{telemetry.emergencyActive ? 'SOS ACTIVE (DISARM)' : '⚠️ PANIC / SOS'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THE 5.0" (800x480) IPS CAPACITIVE TOUCHSCREEN SURFACE                     */}
        {/* ========================================================================= */}
        <div
          id="cyberdeck-touchscreen-panel"
          className={`relative rounded-xl overflow-hidden border-2 shadow-inner transition-all duration-200 select-none ${
            isNightMode
              ? 'bg-neutral-950 text-red-500 border-red-900 shadow-[0_0_20px_rgba(185,28,28,0.2)]'
              : 'bg-slate-950 text-slate-100 border-stone-800'
          }`}
          style={{
            minHeight: '380px',
            filter: `brightness(${0.35 + (screenBrightness / 100) * 0.65})`,
          }}
        >
          {/* Phone-Style Pull-Down Quick Settings Shade (Power, Brightness, Radio, Toggles) */}
          <QuickSettingsShade
            isOpen={isQuickSettingsOpen}
            onClose={() => setIsQuickSettingsOpen(false)}
            brightness={screenBrightness}
            onChangeBrightness={setScreenBrightness}
            isNightMode={isNightMode}
            onToggleNightMode={() => setIsNightMode(!isNightMode)}
            isAiPowered={isAiPowered}
            onToggleAiPower={onToggleAiPower}
            emergencyActive={telemetry.emergencyActive}
            onToggleEmergency={onToggleEmergency}
            telemetry={telemetry}
            onOpenGpsCalibrator={() => setActiveApp('gps')}
          />

          {/* OS Top Status Bar (Persistent on all apps, drag down or tap pill to open Quick Settings) */}
          <div
            id="os-top-status-bar"
            onPointerDown={handleTopPointerDown}
            onPointerMove={handleTopPointerMove}
            onPointerUp={handleTopPointerUp}
            className={`px-3 py-1.5 flex items-center justify-between text-[11px] font-mono border-b cursor-grab active:cursor-grabbing transition-colors ${
              isNightMode
                ? 'bg-red-950/60 border-red-900/60 text-red-400'
                : 'bg-slate-900/90 hover:bg-slate-850/95 border-slate-800 text-slate-300'
            }`}
            title="Drag down from top or click 'SETTINGS ⌄' to open Control Center / Quick Settings"
          >
            {/* Left: Home Button & App Title */}
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveApp('launcher')}
                className={`p-1 rounded transition flex items-center gap-1 ${
                  activeApp === 'launcher'
                    ? 'bg-emerald-600/30 text-emerald-300'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
                title="Home Menu (Esc)"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="font-bold hidden xs:inline">HOME</span>
              </button>

              <span className="font-black tracking-wider text-xs">
                {activeApp === 'launcher'
                  ? 'BUSHNET OS'
                  : activeApp === 'wildlife'
                  ? 'ANIMAL TRACKS & WILDLIFE'
                  : activeApp === 'astronomy'
                  ? 'SOLAR & LUNAR EPHEMERIS'
                  : activeApp === 'firstaid'
                  ? 'WILDERNESS MEDICINE'
                  : activeApp.toUpperCase()}
              </span>
            </div>

            {/* Center: Pull Down Handle / Pill (Touch & Click Friendly) */}
            <button
              id="top-drag-pull-down-pill"
              onClick={(e) => {
                e.stopPropagation();
                setIsQuickSettingsOpen(!isQuickSettingsOpen);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-stone-800/90 hover:bg-stone-700 text-[10px] text-amber-300 border border-stone-700/80 transition-all active:scale-95 shadow-sm group cursor-pointer"
              title="Drag down or tap to open Quick Settings"
            >
              <Sun className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform" />
              <span className="font-bold text-[9px] tracking-tight">SETTINGS</span>
              <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isQuickSettingsOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
            </button>

            {/* Right: Touchscreen Quick Panic, Clock & Battery */}
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <button
                id="touchscreen-quick-panic-btn"
                onClick={onToggleEmergency}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition flex items-center gap-1 border ${
                  telemetry.emergencyActive
                    ? 'bg-red-600 text-white animate-pulse border-red-300 shadow-[0_0_8px_#ef4444]'
                    : 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border-red-900/60'
                }`}
                title="Quick Touchscreen SOS Panic Toggle"
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>{telemetry.emergencyActive ? 'SOS' : 'PANIC'}</span>
              </button>
              <span className="font-bold">{currentTime || '10:28 AM'}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                100%
              </span>
            </div>
          </div>

          {/* Emergency SOS Banner (if triggered) */}
          {telemetry.emergencyActive && (
            <div className="bg-red-600 text-white px-3 py-1 text-xs font-mono font-bold flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>⚠️ EMERGENCY SOS TRANSMIT ACTIVE (CHASSIS BUTTON)</span>
              </div>
              <button
                onClick={onToggleEmergency}
                className="bg-black hover:bg-stone-900 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-800"
              >
                DISARM
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SCREEN BODY: ROUTED VIEWS                                             */}
          {/* ===================================================================== */}
          <div className="p-3 overflow-y-auto" style={{ height: '340px' }}>
            
            {/* ----------------------------------------------------------------- */}
            {/* 1. APP LAUNCHER (HOME SCREEN)                                     */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'launcher' && (
              <div className="h-full flex flex-col justify-between">
                
                {/* 9 App Tiles Grid (Clean 3x3 layout on 5.0" 800x480 screen) */}
                <div className="grid grid-cols-3 gap-2.5">
                  {appList.map((app, idx) => {
                    const Icon = app.icon;
                    const isSelected = selectedAppIndex === idx;
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          setSelectedAppIndex(idx);
                          setActiveApp(app.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-[88px] relative group shadow-sm active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-950/80 border-emerald-500/80 ring-2 ring-emerald-400/50'
                            : 'bg-stone-900/80 hover:bg-stone-800/90 border-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className={`p-1.5 rounded-lg bg-stone-950 border border-stone-800 ${app.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-950 text-stone-300 border border-stone-800">
                            {app.badge}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-stone-100 group-hover:text-emerald-300 transition truncate leading-tight">
                            {app.title}
                          </h4>
                          <p className="text-[10px] text-stone-400 truncate font-mono mt-0.5">
                            {app.sub}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Launcher Bar: Quick Survival Status Pill */}
                <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Pi 5 AI: <strong>Qwen 2.5 1.5B (Offline)</strong></span>
                  </div>
                  <div className="text-stone-400">
                    Use [Arrows + Enter] or Tap to Open
                  </div>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 2. WEATHER APP                                                    */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'weather' && (
              <div className="space-y-2.5 font-mono">
                
                {/* Main 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span>BMP180 PRESSURE</span>
                      <CloudSun className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-base font-black text-cyan-300 mt-0.5">
                      {telemetry.bmpPressure} <span className="text-[10px] font-normal text-stone-400">hPa</span>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Trend: <strong className="text-emerald-400">{telemetry.pressureTrend}</strong>
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span>ALTITUDE (BARO)</span>
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-base font-black text-emerald-300 mt-0.5">
                      {telemetry.bmpAlt} <span className="text-[10px] font-normal text-stone-400">m AMSL</span>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      GPS Alt: {telemetry.gpsAlt}m
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span>AIR TEMP & HUM (DHT11)</span>
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-base font-black text-amber-300 mt-0.5">
                      {telemetry.dhtTemp}°C <span className="text-xs font-normal text-stone-400">/ {telemetry.dhtHum}% RH</span>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Dew Point: {Math.round(telemetry.dhtTemp - (100 - telemetry.dhtHum) / 5)}°C
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="flex items-center justify-between text-stone-400 text-[10px]">
                      <span>THERMOMETER</span>
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-base font-black text-blue-300 mt-0.5">
                      {telemetry.kyTemp}°C
                    </div>
                    <div className="text-[10px] text-stone-400">
                      External Probe
                    </div>
                  </div>
                </div>

                {/* Dawn & Dusk Solar Schedule Widget */}
                <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                  <div className="text-[10px] text-stone-400 mb-1 flex items-center justify-between font-bold">
                    <span>SOLAR CYCLE • DAWN & DUSK</span>
                    <span className="text-amber-400 text-[9px]">13h 42m Daylight</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center space-x-2 bg-stone-950/80 p-1.5 rounded border border-stone-800/80">
                      <Sunrise className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[9px] text-stone-400">FIRST LIGHT / DAWN</div>
                        <div className="text-amber-300 font-bold">05:42 AM <span className="text-[9px] text-stone-400">(Sun: 06:11)</span></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-stone-950/80 p-1.5 rounded border border-stone-800/80">
                      <Sunset className="w-4 h-4 text-orange-400 shrink-0" />
                      <div>
                        <div className="text-[9px] text-stone-400">LAST LIGHT / DUSK</div>
                        <div className="text-orange-300 font-bold">19:54 PM <span className="text-[9px] text-stone-400">(Set: 19:26)</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 12-Hour Barometric Pressure Mini SVG Graph */}
                <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                    <span>12-HOUR BAROMETRIC TREND (hPa)</span>
                    <span className="text-cyan-400 font-bold">1013.2 hPa Normal</span>
                  </div>
                  
                  <div className="h-14 w-full relative flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 55">
                      {/* Storm threshold line at 1005 hPa */}
                      <line x1="0" y1="42" x2="300" y2="42" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.6" />
                      {/* Trend polyline */}
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        points="0,32 30,30 60,28 90,26 120,29 150,34 180,38 210,40 240,42 270,36 300,32"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[8px] text-stone-500 mt-1">
                    <span>-12h</span>
                    <span>-9h</span>
                    <span>-6h</span>
                    <span>-3h</span>
                    <span>NOW ({telemetry.bmpPressure}hPa)</span>
                  </div>
                </div>

                {/* Scrollable Weather Predictor & Rain Probability Graph */}
                <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-stone-400">
                    <span className="flex items-center gap-1 font-bold text-sky-400">
                      <CloudRain className="w-3.5 h-3.5" />
                      WEATHER PREDICTOR & RAIN PROBABILITY (NEXT 12H)
                    </span>
                    <span className="text-amber-400 font-bold">
                      Peak: {telemetry.pressureTrend.includes('Storm') ? '85%' : telemetry.pressureTrend.includes('Falling') ? '60%' : '15%'}
                    </span>
                  </div>

                  {/* Rain probability bar chart */}
                  <div className="h-16 w-full relative flex items-end justify-between gap-1 pt-2 pb-1 border-b border-stone-800">
                    {[
                      { h: '+1h', prob: telemetry.pressureTrend.includes('Storm') ? 65 : 20, precip: '0.2mm' },
                      { h: '+2h', prob: telemetry.pressureTrend.includes('Storm') ? 80 : 35, precip: '1.0mm' },
                      { h: '+3h', prob: telemetry.pressureTrend.includes('Storm') ? 85 : 55, precip: '2.4mm' },
                      { h: '+4h', prob: telemetry.pressureTrend.includes('Storm') ? 70 : 45, precip: '1.5mm' },
                      { h: '+6h', prob: telemetry.pressureTrend.includes('Storm') ? 40 : 25, precip: '0.4mm' },
                      { h: '+8h', prob: telemetry.pressureTrend.includes('Storm') ? 25 : 15, precip: '0.0mm' },
                      { h: '+10h', prob: 10, precip: '0.0mm' },
                      { h: '+12h', prob: 5, precip: '0.0mm' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <span className="text-[7px] text-stone-400 mb-0.5">{item.prob}%</span>
                        <div
                          className={`w-full rounded-t transition-all ${
                            item.prob > 60
                              ? 'bg-gradient-to-t from-blue-700 to-cyan-400'
                              : item.prob > 30
                              ? 'bg-gradient-to-t from-sky-800 to-sky-500'
                              : 'bg-stone-800'
                          }`}
                          style={{ height: `${Math.max(item.prob * 0.45, 4)}px` }}
                        />
                        <span className="text-[7px] text-stone-500 mt-1">{item.h}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-stone-400 pt-0.5">
                    <span>Forecast Engine: NOAA Baro-Empirical + Offline Bayesian Model</span>
                    <span className="text-cyan-400">Confidence: 89%</span>
                  </div>
                </div>

                {/* AI Weather Training & Ground Truth Feedback */}
                <div className="bg-stone-900/90 border border-emerald-900/60 p-2.5 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      TRAIN AI WEATHER MODEL (LOG CURRENT OBSERVATION)
                    </span>
                    <span className="text-[9px] text-stone-500">Fine-tune weights</span>
                  </div>
                  <p className="text-[9px] text-stone-400">
                    Click actual visible conditions to calibrate the local pressure gradient model against real ground truth:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {(['Clear', 'Overcast', 'Light Rain', 'Heavy Storm', 'Snow', 'Fog'] as const).map((cond) => (
                      <button
                        key={cond}
                        onClick={() => {
                          setObservedSky(cond);
                          setGroundTruthTrained(`Trained! Calibrated at ${telemetry.bmpPressure}hPa to "${cond}".`);
                          setTimeout(() => setGroundTruthTrained(null), 3500);
                        }}
                        className={`text-[10px] py-1 px-1.5 rounded text-center border transition-all ${
                          observedSky === cond
                            ? 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-[0_0_8px_#059669]'
                            : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {cond === 'Clear' && '☀️ '}
                        {cond === 'Overcast' && '☁️ '}
                        {cond === 'Light Rain' && '🌦️ '}
                        {cond === 'Heavy Storm' && '⛈️ '}
                        {cond === 'Snow' && '❄️ '}
                        {cond === 'Fog' && '🌫️ '}
                        {cond}
                      </button>
                    ))}
                  </div>
                  {groundTruthTrained && (
                    <div className="text-[10px] text-emerald-300 bg-emerald-950/80 p-1 rounded border border-emerald-800 text-center font-bold animate-pulse">
                      ✓ {groundTruthTrained}
                    </div>
                  )}
                </div>

                {/* Meteorological Warning Box */}
                <div className="p-2 rounded bg-cyan-950/50 border border-cyan-800/60 text-[11px] text-cyan-200">
                  <strong>Tactical Forecast:</strong> {telemetry.pressureTrend.includes('Storm')
                    ? '⚠️ CRITICAL: Rapid pressure drop detected. High winds & precipitation likely within 2-4 hours. Reinforce shelter.'
                    : telemetry.pressureTrend.includes('Rising')
                    ? 'Cold Front / Arctic Surge: Rapid pressure increase with clearing skies, followed by sharp drop in overnight temp.'
                    : 'Stable barometric gradient: Favorable camp conditions. Normal foraging & fishing patterns.'}
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 3. FISHING APP                                                    */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'fishing' && (
              <div className="space-y-2.5 font-mono text-xs">
                
                {/* Header Rating Box */}
                <div className="bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-emerald-400 font-bold">SOLUNAR BITE PREDICTION</div>
                    <div className="text-base font-black text-emerald-300">{biteRating}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-emerald-400">{biteScore}%</div>
                    <div className="text-[9px] text-stone-400">STRIKE INDEX</div>
                  </div>
                </div>

                {/* Habitat Selector & Filtered Target Fish Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  
                  {/* Habitat Selector */}
                  <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                    <div className="text-[10px] text-stone-400 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Waves className="w-3 h-3 text-emerald-400" />
                        AQUATIC HABITAT
                      </span>
                      <span className="text-emerald-400 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                        {currentHabitat.category}
                      </span>
                    </div>

                    <select
                      value={selectedHabitatId}
                      onChange={(e) => handleHabitatChange(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 font-mono focus:border-emerald-500 focus:outline-none"
                    >
                      <optgroup label="Flowing Water">
                        {FISHING_HABITATS.filter((h) => h.category === 'Flowing Water').map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.icon} {h.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Stillwater & Lakes">
                        {FISHING_HABITATS.filter((h) => h.category === 'Stillwater & Lakes').map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.icon} {h.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Wetlands & Specialized">
                        {FISHING_HABITATS.filter((h) => h.category === 'Wetlands & Specialized').map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.icon} {h.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {/* Habitat Spec Chips */}
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-stone-400 pt-0.5">
                      <div className="bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800/80 truncate">
                        <span className="text-stone-500">Depth: </span>
                        <span className="text-stone-300 font-bold">{currentHabitat.depthRange}</span>
                      </div>
                      <div className="bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800/80 truncate">
                        <span className="text-stone-500">Flow: </span>
                        <span className="text-stone-300 font-bold">{currentHabitat.flowVelocity}</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-stone-400 leading-tight">
                      {currentHabitat.description}
                    </p>
                  </div>

                  {/* Target Fish Selector (STRICTLY FILTERED TO RESIDENT SPECIES) */}
                  <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                    <div className="text-[10px] text-stone-400 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Fish className="w-3 h-3 text-cyan-400" />
                        TARGET SPECIES (HABITAT FILTERED)
                      </span>
                      <span className="text-cyan-400 text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                        {currentHabitat.fishSpecies.length} Resident Species
                      </span>
                    </div>

                    <select
                      value={selectedFishId}
                      onChange={(e) => setSelectedFishId(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-xs text-stone-100 font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      {currentHabitat.fishSpecies.map((f) => (
                        <option key={f.id} value={f.id}>
                          🐟 {f.name} ({f.family})
                        </option>
                      ))}
                    </select>

                    {/* Scientific & Thermal Info */}
                    <div className="flex items-center justify-between text-[9px] pt-0.5">
                      <span className="text-stone-400 italic">
                        {currentFish.scientificName}
                      </span>
                      <span className="text-amber-400 font-bold">
                        Opt: {currentFish.optimalTempMin}–{currentFish.optimalTempMax}°C (Max: {currentFish.thermalStressThreshold}°C)
                      </span>
                    </div>

                    {/* Water Temp Sensor Telemetry Comparison */}
                    <div className={`p-1.5 rounded text-[9px] border flex items-center gap-1.5 ${
                      telemetry.kyTemp > currentFish.thermalStressThreshold
                        ? 'bg-red-950/40 border-red-800/80 text-red-300'
                        : telemetry.kyTemp >= currentFish.optimalTempMin && telemetry.kyTemp <= currentFish.optimalTempMax
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                        : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-300'
                    }`}>
                      <Thermometer className="w-3 h-3 shrink-0" />
                      <div className="leading-tight">
                        {telemetry.kyTemp > currentFish.thermalStressThreshold && (
                          <span>
                            <strong>THERMAL STRESS ALERT:</strong> Sensor probe ({telemetry.kyTemp}°C) exceeds {currentFish.name} threshold ({currentFish.thermalStressThreshold}°C). Seek shaded springs or deep oxygen holes.
                          </span>
                        )}
                        {telemetry.kyTemp >= currentFish.optimalTempMin && telemetry.kyTemp <= currentFish.optimalTempMax && (
                          <span>
                            <strong>OPTIMAL FEEDING ZONE:</strong> Sensor probe ({telemetry.kyTemp}°C) matches {currentFish.name} metabolic peak. High bite probability!
                          </span>
                        )}
                        {telemetry.kyTemp < currentFish.optimalTempMin && (
                          <span>
                            <strong>COLD WATER METABOLISM:</strong> Sensor probe ({telemetry.kyTemp}°C) is below optimum ({currentFish.optimalTempMin}°C). Slow down presentation & fish bottom.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Tactical Rigging, Best Lure & Presentation Strategy */}
                <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-lg space-y-1.5 text-[11px]">
                  <div className="text-[10px] text-amber-400 font-bold flex items-center justify-between">
                    <span>TACTICAL RIGGING & PRESENTATION FOR {currentFish.name.toUpperCase()}</span>
                    <span className="text-stone-400 text-[9px]">{currentHabitat.substrate}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-stone-950 p-1.5 rounded border border-stone-800/80 space-y-0.5">
                      <div className="text-emerald-400 font-bold">🎣 Recommended Rig & Line:</div>
                      <div className="text-stone-300 leading-tight">{currentFish.recommendedRig}</div>
                    </div>
                    <div className="bg-stone-950 p-1.5 rounded border border-stone-800/80 space-y-0.5">
                      <div className="text-cyan-400 font-bold">✨ Best Lure / Bait:</div>
                      <div className="text-stone-300 leading-tight">{currentFish.bestLure}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-300 bg-stone-950 p-1.5 rounded border border-stone-800/80 leading-relaxed">
                    <strong className="text-amber-300">Presentation Technique:</strong> {currentFish.presentation} <span className="text-stone-400">{currentFish.notes}</span>
                  </div>
                </div>

                {/* Feeding Windows */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>MAJOR FEEDING WINDOWS</span>
                    </div>
                    <div className="mt-1 text-stone-200">
                      <div>🌅 Dawn: <strong>05:45 - 07:45</strong></div>
                      <div>🌇 Dusk: <strong>18:15 - 20:15</strong></div>
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-cyan-400 font-bold text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>MINOR FEEDING WINDOWS</span>
                    </div>
                    <div className="mt-1 text-stone-200">
                      <div>☀️ Midday: <strong>12:30 - 13:30</strong></div>
                      <div>🌙 Midnight: <strong>00:45 - 01:45</strong></div>
                    </div>
                  </div>
                </div>

                {/* Barometric Swim Bladder & Habitat Combination Analysis */}
                <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg text-[11px]">
                  <div className="text-stone-300 font-bold mb-1 flex items-center justify-between">
                    <span>
                      🐟 Swim-Bladder Dynamics ({currentFish.swimBladderType}):
                    </span>
                    <span className="text-[9px] text-emerald-400">BMP180: {telemetry.bmpPressure} hPa ({telemetry.pressureTrend})</span>
                  </div>
                  <p className="text-stone-400 text-[10px] leading-relaxed">
                    {currentFish.swimBladderType === 'Physostomous' ? (
                      <span>
                        <strong>Physostomous (Pneumatic Duct):</strong> {currentFish.name} has a direct duct connecting swim-bladder to gut, allowing rapid pressure equalisation.
                        {isFallingPressure
                          ? ` Falling barometric pressure does NOT cause bladder pain; triggers an aggressive pre-frontal binge in ${currentHabitat.name.toLowerCase()}.`
                          : ` Steady or rising pressure keeps fish active across depth columns without barotrauma.`}
                      </span>
                    ) : (
                      <span>
                        <strong>Physoclistous (Closed Gland):</strong> {currentFish.name} lacks an air duct and equalises pressure slowly via blood gas.
                        {isFallingPressure
                          ? ` Barometric drop causes swim bladder to expand uncomfortably. Fish will sink tight to bottom structure in ${currentHabitat.name.toLowerCase()} to use water pressure for compensation. Use slow bottom jigs.`
                          : ` High or rising pressure shrinks the bladder; stimulates active cruising and aggressive predator strikes.`}
                      </span>
                    )}
                  </p>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 4. ASPEN AI SURVIVAL ADVISOR APP                                 */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'aspen' && (
              <div className="h-full flex flex-col justify-between font-mono">
                
                {/* Chat Log View */}
                <div
                  ref={chatScrollRef}
                  className="overflow-y-auto space-y-2 pr-1 text-xs"
                  style={{ height: '220px' }}
                >
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-100 ml-6'
                          : m.sender === 'system'
                          ? 'bg-amber-950/60 border border-amber-800 text-amber-200'
                          : 'bg-stone-900/90 border border-stone-800 text-stone-100 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-stone-400 mb-1">
                        <span className="font-bold uppercase text-emerald-400">
                          {m.sender === 'user' ? `OPERATOR (${userProfile.name})` : 'ASPEN AI (QWEN 1.5B)'}
                        </span>
                        <span>{m.time}</span>
                      </div>

                      <div className="whitespace-pre-wrap text-[11px]">{m.text}</div>

                      {m.manualCitation && (
                        <div className="mt-1.5 pt-1 border-t border-stone-800 text-[9px] text-amber-300/80 flex items-center gap-1">
                          <span>📖 Source:</span>
                          <span className="italic">{m.manualCitation}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="p-2 rounded-lg bg-stone-900/90 border border-stone-800 text-xs text-stone-400 flex items-center gap-2 animate-pulse">
                      <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Qwen 2.5 1.5B generating response on Cores 1-3...</span>
                    </div>
                  )}
                </div>

                {/* Quick Survival Prompt Chips */}
                <div className="py-1 flex items-center gap-1 overflow-x-auto text-[10px]">
                  {[
                    'First aid for deep cut',
                    'Purify wild water',
                    'Wet wood firecraft',
                    'Bear defense steps',
                    'Edible pine needle tea',
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSendAspenChat(chip)}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 whitespace-nowrap border border-stone-700 active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Field + Send Button */}
                <div className="pt-1.5 flex items-center gap-1.5 border-t border-stone-800">
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAspenChat()}
                    placeholder="Type query with Rii keyboard..."
                    className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={() => handleSendAspenChat()}
                    disabled={isGenerating || !inputPrompt.trim()}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-1 transition"
                  >
                    <span>SEND</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 5. GPS & NAVIGATION APP                                           */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'gps' && (
              <GpsDiagnosticsAndCalibrator
                telemetry={telemetry}
                onUpdateTelemetry={onUpdateTelemetry}
                onOpenListingModal={() => setIsGpsListingModalOpen(true)}
                baseCamp={baseCamp}
              />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 6. RATIONS APP                                                    */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'rations' && (
              <div className="space-y-2 font-mono text-xs">
                
                {/* Rations summary card */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-[10px] text-stone-400">TOTAL FOOD RESERVES</div>
                    <div className="text-base font-black text-amber-300">
                      {food.reduce((a, f) => a + (Number(f.totalCalories) || 0) * (Number(f.quantity) || 1), 0).toLocaleString()} <span className="text-xs font-normal">kcal</span>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      ~{(food.reduce((a, f) => a + (Number(f.totalCalories) || 0) * (Number(f.quantity) || 1), 0) / (userProfile.baselineCalories || 2200)).toFixed(1)} days of burn
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-[10px] text-stone-400">GEAR TOTAL LOAD</div>
                    <div className="text-base font-black text-emerald-300">
                      {gear.reduce((a, g) => a + (Number(g.weightKg) || 0) * (Number(g.quantity) || 1), 0).toFixed(1)} <span className="text-xs font-normal">kg</span>
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {gear.length} unique items carried
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: Food vs Gear + Add Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex bg-stone-950 p-0.5 rounded border border-stone-800">
                    <button
                      onClick={() => { setRationsTab('food'); setShowAddForm(false); }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        rationsTab === 'food'
                          ? 'bg-amber-600 text-stone-950'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      🥫 FOOD ({food.length})
                    </button>
                    <button
                      onClick={() => { setRationsTab('gear'); setShowAddForm(false); }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        rationsTab === 'gear'
                          ? 'bg-emerald-600 text-stone-950'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      🎒 GEAR ({gear.length})
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddForm((prev) => !prev)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold border border-stone-700"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAddForm ? 'CANCEL' : rationsTab === 'food' ? '+ ADD FOOD' : '+ ADD GEAR'}</span>
                  </button>
                </div>

                {/* Inline Quick-Add Form */}
                {showAddForm && (
                  <div className="bg-stone-900 border border-stone-700 p-2 rounded-lg space-y-1.5">
                    <div className="text-[10px] text-amber-300 font-bold">
                      ADD NEW {rationsTab === 'food' ? 'FOOD RATION' : 'GEAR ITEM'}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder={rationsTab === 'food' ? 'e.g. Pemmican Bar, MRE' : 'e.g. Ferro Rod, Tarp, Hatchet'}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (!newItemName.trim()) return;
                            if (rationsTab === 'food') {
                              const newFood: FoodItem = {
                                id: Date.now().toString(),
                                name: newItemName.trim(),
                                category: 'MRE / Ration',
                                unit: 'pack',
                                expirationDate: '2028-12-31',
                                totalCalories: Number(newItemCalories) || 400,
                                quantity: Number(newItemQty) || 1,
                              };
                              onUpdateFood?.([...food, newFood]);
                            } else {
                              const newG: GearItem = {
                                id: Date.now().toString(),
                                name: newItemName.trim(),
                                category: 'Cutting & Fire',
                                weightKg: Number(newItemWeight) || 0.4,
                                condition: 'Good',
                                notes: `Qty: ${Number(newItemQty) || 1}`,
                              };
                              onUpdateGear?.([...gear, newG]);
                            }
                            setNewItemName('');
                            setShowAddForm(false);
                          }
                        }}
                        className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      {rationsTab === 'food' ? (
                        <input
                          type="number"
                          placeholder="kcal"
                          title="Calories per unit"
                          value={newItemCalories}
                          onChange={(e) => setNewItemCalories(e.target.value)}
                          className="w-16 bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-100 font-mono text-center focus:border-amber-400 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          placeholder="kg"
                          title="Weight in kg"
                          value={newItemWeight}
                          onChange={(e) => setNewItemWeight(e.target.value)}
                          className="w-16 bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-100 font-mono text-center focus:border-emerald-400 focus:outline-none"
                        />
                      )}
                      <input
                        type="number"
                        placeholder="qty"
                        title="Quantity"
                        min="1"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="w-12 bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-100 font-mono text-center focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!newItemName.trim()) return;
                          if (rationsTab === 'food') {
                            const newFood: FoodItem = {
                              id: Date.now().toString(),
                              name: newItemName.trim(),
                              category: 'MRE / Ration',
                              unit: 'pack',
                              expirationDate: '2028-12-31',
                              totalCalories: Number(newItemCalories) || 400,
                              quantity: Number(newItemQty) || 1,
                            };
                            onUpdateFood?.([...food, newFood]);
                          } else {
                            const newG: GearItem = {
                              id: Date.now().toString(),
                              name: newItemName.trim(),
                              category: 'Cutting & Fire',
                              weightKg: Number(newItemWeight) || 0.4,
                              condition: 'Good',
                              notes: `Qty: ${Number(newItemQty) || 1}`,
                            };
                            onUpdateGear?.([...gear, newG]);
                          }
                          setNewItemName('');
                          setShowAddForm(false);
                        }}
                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[10px]"
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                )}

                {/* List View with Quantity Increment/Decrement and Removal */}
                <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                  <div className="text-[10px] font-bold text-stone-300 mb-1.5 flex justify-between">
                    <span>
                      {rationsTab === 'food' ? `LOGGED RATIONS (${food.length} items)` : `LOGGED GEAR (${gear.length} items)`}
                    </span>
                    <span className={rationsTab === 'food' ? 'text-amber-400' : 'text-emerald-400'}>
                      {rationsTab === 'food'
                        ? `${food.reduce((a, f) => a + (Number(f.totalCalories) || 0) * (Number(f.quantity) || 1), 0).toLocaleString()} kcal`
                        : `${gear.reduce((a, g) => a + (Number(g.weightKg) || 0) * (Number(g.quantity) || 1), 0).toFixed(1)} kg`}
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {rationsTab === 'food' ? (
                      food.length === 0 ? (
                        <div className="text-[10px] text-stone-500 italic p-2 text-center">No rations logged. Click "+ ADD FOOD" above.</div>
                      ) : (
                        food.map((item) => {
                          const qty = item.quantity || 1;
                          return (
                            <div key={item.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-stone-950 border border-stone-800/80 gap-2">
                              <div className="truncate flex-1">
                                <div className="text-stone-200 font-bold truncate">{item.name}</div>
                                <div className="text-[9px] text-stone-400">
                                  {item.totalCalories} kcal ea • Total: {(item.totalCalories * qty).toLocaleString()} kcal
                                </div>
                              </div>

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  title="Decrease quantity"
                                  onClick={() => {
                                    if (qty > 1) {
                                      const updated = food.map((f) => f.id === item.id ? { ...f, quantity: qty - 1 } : f);
                                      onUpdateFood?.(updated);
                                    } else {
                                      const updated = food.filter((f) => f.id !== item.id);
                                      onUpdateFood?.(updated);
                                    }
                                  }}
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center font-bold text-amber-300 text-xs">{qty}</span>
                                <button
                                  title="Increase quantity"
                                  onClick={() => {
                                    const updated = food.map((f) => f.id === item.id ? { ...f, quantity: qty + 1 } : f);
                                    onUpdateFood?.(updated);
                                  }}
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                
                                {/* Direct Delete Button */}
                                <button
                                  title="Remove item"
                                  onClick={() => {
                                    const updated = food.filter((f) => f.id !== item.id);
                                    onUpdateFood?.(updated);
                                  }}
                                  className="w-5 h-5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/80 flex items-center justify-center text-red-400 hover:text-red-200 ml-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      gear.length === 0 ? (
                        <div className="text-[10px] text-stone-500 italic p-2 text-center">No gear items logged. Click "+ ADD GEAR" above.</div>
                      ) : (
                        gear.map((item) => {
                          const qty = item.quantity || 1;
                          return (
                            <div key={item.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-stone-950 border border-stone-800/80 gap-2">
                              <div className="truncate flex-1">
                                <div className="text-stone-200 font-bold truncate">{item.name}</div>
                                <div className="text-[9px] text-stone-400">
                                  {item.weightKg} kg ea • Condition: {item.condition}
                                </div>
                              </div>

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  title="Decrease quantity"
                                  onClick={() => {
                                    if (qty > 1) {
                                      const updated = gear.map((g) => g.id === item.id ? { ...g, quantity: qty - 1 } : g);
                                      onUpdateGear?.(updated);
                                    } else {
                                      const updated = gear.filter((g) => g.id !== item.id);
                                      onUpdateGear?.(updated);
                                    }
                                  }}
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center font-bold text-emerald-300 text-xs">{qty}</span>
                                <button
                                  title="Increase quantity"
                                  onClick={() => {
                                    const updated = gear.map((g) => g.id === item.id ? { ...g, quantity: qty + 1 } : g);
                                    onUpdateGear?.(updated);
                                  }}
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>

                                {/* Direct Delete Button */}
                                <button
                                  title="Remove item"
                                  onClick={() => {
                                    const updated = gear.filter((g) => g.id !== item.id);
                                    onUpdateGear?.(updated);
                                  }}
                                  className="w-5 h-5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/80 flex items-center justify-center text-red-400 hover:text-red-200 ml-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 7. SYSTEM & SHELL APP                                             */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'system' && (
              <div className="space-y-2 font-mono text-xs">
                
                {/* Raspberry Pi 5 Core Allocation & RAM Visualizer */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-stone-400 font-bold mb-1">PI 5 CPU & CORES</div>
                    <div>CPU Temp: <strong className="text-emerald-400">48.2°C</strong></div>
                    <div>Core 0: <strong className="text-cyan-400">BushNet OS UI</strong></div>
                    <div>Cores 1,2,3: <strong className="text-amber-400">Qwen 2.5 1.5B</strong></div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-800 p-2 rounded-lg">
                    <div className="text-stone-400 font-bold mb-1">RAM ALLOCATION (2GB)</div>
                    <div>Qwen 1.5B: <strong>1.12 GB</strong></div>
                    <div>Kiosk OS: <strong>115 MB</strong></div>
                    <div>Available: <strong className="text-emerald-400">~620 MB Free</strong></div>
                  </div>
                </div>

                {/* Emergency Command Shell Terminal */}
                <div className="bg-black border border-stone-800 rounded-lg p-2 text-[10px] text-green-400 font-mono">
                  <div className="text-stone-400 text-[9px] border-b border-stone-800 pb-1 mb-1.5 flex justify-between">
                    <span>EMERGENCY DIAGNOSTIC SHELL</span>
                    <span>Type: sensors, free -h, uptime</span>
                  </div>

                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {shellCommands.map((c, i) => (
                      <div key={i}>
                        <div className="text-stone-300">$ {c.cmd}</div>
                        <div className="text-stone-400 whitespace-pre-wrap pl-2">{c.out}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-stone-800">
                    <span className="text-emerald-400">$</span>
                    <input
                      type="text"
                      value={shellInput}
                      onChange={(e) => setShellInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteShellCmd()}
                      placeholder="cmd..."
                      className="flex-1 bg-transparent text-emerald-300 focus:outline-none text-[10px]"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 8. WILDLIFE & ANIMAL TRACK IDENTIFICATION APP                     */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'wildlife' && (
              <WildlifeTrackerApp
                onSelectSpeciesForPrompt={(speciesName) => {
                  setInputPrompt(`What are critical field encounter safety rules and track identification tips for ${speciesName}?`);
                  setActiveApp('aspen');
                }}
                isNightMode={isNightMode}
              />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 9. SOLAR & LUNAR EPHEMERIS APP                                    */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'astronomy' && (
              <AstroEphemerisApp
                telemetry={telemetry}
                currentTime={currentTime}
                isNightMode={isNightMode}
              />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 10. WILDERNESS MEDICINE & FIRST AID TRIAGE                        */}
            {/* ----------------------------------------------------------------- */}
            {activeApp === 'firstaid' && (
              <FirstAidTriageApp telemetry={telemetry} />
            )}

          </div>

        </div>

        {/* ========================================================================= */}
        {/* CYBERDECK HARDWARE CONTROLS STRIP (5.0" DSI & Pi GPIO Architecture)       */}
        {/* ========================================================================= */}
        {!isKioskFullscreen && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800/90 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider">HARDWARE BUS:</span>
              <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[10px] text-emerald-400 font-bold">
                ⚡ 40-PIN GPIO DIRECT (NO ARDUINO)
              </span>
              <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[10px] text-cyan-400 font-bold">
                5.0" MIPI DSI
              </span>
            </div>

            {/* Prominent Chassis Tactile Emergency Panic Button */}
            <div className="flex items-center gap-2">
              <button
                id="cyberdeck-chassis-panic-btn"
                onClick={onToggleEmergency}
                className={`px-3 py-1.5 rounded-lg font-mono font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 border cursor-pointer ${
                  telemetry.emergencyActive
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse border-red-300 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                    : 'bg-gradient-to-r from-red-950 via-stone-900 to-stone-950 hover:from-red-900 hover:to-stone-900 text-red-400 border-red-800/90 hover:border-red-500 hover:text-white'
                }`}
                title="Tactile Hardware Emergency Panic Button (Direct Pi 5 GPIO)"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${telemetry.emergencyActive ? 'text-white animate-bounce' : 'text-red-500'}`} />
                <span>{telemetry.emergencyActive ? '🚨 EMERGENCY SOS ACTIVE (PRESS TO CANCEL)' : '⚠️ CHASSIS PANIC BUTTON'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THE RII MINI X1 KEYBOARD (Interactive physical cyberdeck component)       */}
        {/* ========================================================================= */}
        {!isKioskFullscreen && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <RiiMiniKeyboard
              onKeyPress={handleVirtualKeyPress}
              onBackspace={handleVirtualBackspace}
              onEnter={handleVirtualEnter}
              onArrow={handleVirtualArrow}
              onEscape={() => setActiveApp('launcher')}
            />
          </div>
        )}

        {/* GPS Listing Image & u-center 8.21 Hardware Spec Modal */}
        <GpsListingModal
          isOpen={isGpsListingModalOpen}
          onClose={() => setIsGpsListingModalOpen(false)}
        />

      </div>

    </div>
  );
};
