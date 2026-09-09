import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Cpu, Shield, AlertTriangle, Sparkles, RefreshCw, Layers, CheckCircle2, Compass, MapPin, Database, Zap } from 'lucide-react';
import { ChatMessage, ModelSelection, UserProfile, SensorTelemetry, ShelterItem, FoodItem, GearItem, MedicalCondition } from '../types';

interface PiTerminalChatProps {
  userProfile: UserProfile;
  telemetry: SensorTelemetry;
  shelters: ShelterItem[];
  food: FoodItem[];
  gear: GearItem[];
  medical: MedicalCondition[];
  modelPreference: ModelSelection;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  isAiPowered: boolean;
  onSelectModel: (model: ModelSelection) => void;
  onLcdUpdate: (lcd: { line1: string; line2: string }) => void;
  onToggleAiPower: () => void;
  onAddGearItem?: (item: GearItem) => void;
  onUpdateShelters?: (shelters: ShelterItem[]) => void;
  onUpdateFood?: (food: FoodItem[]) => void;
  onUpdateTelemetry?: (updated: Partial<SensorTelemetry>) => void;
}

const COMMON_GEAR_KEYWORDS = [
  'mora knife', 'knife', 'hatchet', 'axe', 'machete', 'headlamp', 'flashlight',
  'tarp', 'compass', 'water filter', 'saw', 'multitool', 'paracord', 'fire starter',
  'ferro rod', 'sleeping bag', 'bivvy', 'stove', 'cookset', 'gloves',
  'boots', 'radio', 'entrenching tool', 'shovel', 'canteen'
];

function extractUnloggedGearItems(text: string, currentGear: GearItem[]): string[] {
  const textLower = text.toLowerCase();
  const currentGearNames = currentGear.map((g) => g.name.toLowerCase());
  const found: string[] = [];

  const explicitMatch = text.match(/possessing\s+([A-Za-z0-9\s]+?)(?=\.|\?|$)/i);
  if (explicitMatch && explicitMatch[1]) {
    const rawName = explicitMatch[1].trim();
    if (rawName && rawName.length < 30 && !currentGearNames.some((n) => n.includes(rawName.toLowerCase()) || rawName.toLowerCase().includes(n))) {
      found.push(rawName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  }

  for (const item of COMMON_GEAR_KEYWORDS) {
    if (textLower.includes(item)) {
      if (!currentGearNames.some((gName) => gName.includes(item) || item.includes(gName))) {
        const formatted = item.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!found.some((f) => f.toLowerCase() === formatted.toLowerCase())) {
          found.push(formatted);
        }
      }
    }
  }

  return found.slice(0, 2);
}

export interface WeatherHistoryPoint {
  timestamp: string;
  epoch: number;
  timeLabel: string;
  temp_c: number;
  pressure_hpa: number;
  humidity: number;
  alt_m: number;
  dew_point: number;
}

const getInitialWeatherHistory = (): WeatherHistoryPoint[] => {
  try {
    const saved = localStorage.getItem('bushnet_weather_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  const nowEpoch = Math.floor(Date.now() / 1000);
  const now = new Date();
  const points: WeatherHistoryPoint[] = [];
  for (let i = 6; i >= 1; i--) {
    const ptEpoch = nowEpoch - i * 3600;
    const ptDate = new Date(now.getTime() - i * 3600 * 1000);
    const pressOffset = (6 - i) * 0.15;
    const tempOffset = (i % 2 === 0 ? 0.3 : -0.2);
    points.push({
      timestamp: ptDate.toISOString().replace('T', ' ').substring(0, 19),
      epoch: ptEpoch,
      timeLabel: ptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp_c: Math.round((21.8 + tempOffset) * 10) / 10,
      pressure_hpa: Math.round((1013.8 - pressOffset) * 10) / 10,
      humidity: Math.round(52 + (i % 3)),
      alt_m: Math.round(42 + pressOffset * 8),
      dew_point: Math.round((11.2 + tempOffset) * 10) / 10,
    });
  }
  return points;
};

export const PiTerminalChat: React.FC<PiTerminalChatProps> = ({
  userProfile,
  telemetry,
  shelters,
  food,
  gear,
  medical,
  modelPreference,
  activeModel,
  isAiPowered,
  onSelectModel,
  onLcdUpdate,
  onToggleAiPower,
  onAddGearItem,
  onUpdateShelters,
  onUpdateFood,
  onUpdateTelemetry,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'system',
      text: `[SYSTEM BOOT] BushNet ASPEN OS v2.5 initialized on Raspberry Pi 5 (2GB RAM).
Loaded Models:
- Qwen 2.5 0.5B Instruct (Q4_K_M) -> 380MB RAM
- Qwen 2.5 1.5B Instruct (Q4_K_M) -> 1.1GB RAM
Active Mode: ${modelPreference.toUpperCase()} (Dynamic AI routing enabled)
Peripherals: VK-162 GPS (9600), BMP180 (0x77), DHT11 (GPIO4), KY-001 (1-Wire), Arduino Keypad Shield (/dev/ttyACM0).
Type /help for slash commands (/shelter, /food, /recalibrate, /compass, /clear, /switch).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'init-2',
      sender: 'aspen',
      text: `Greetings ${userProfile.name || 'Lachlan'}. I am ASPEN, your local offline survival assistant running on the Raspberry Pi 5. Sensor telemetry is nominal and live on the 16x2 Keypad LCD (Pages 1-10). How can I assist you in the field?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Qwen 2.5 0.5B Instruct',
      ramUsage: '380 MB RAM',
      inferenceSpeed: '42 tokens/sec',
      lcdLine1: 'BUSHNET P1/10',
      lcdLine2: `${(telemetry.kyTemp ?? telemetry.dhtTemp).toFixed(1)}C | ${Math.round(telemetry.bmpPressure)}hPa`,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextEnvelope, setShowContextEnvelope] = useState(false);
  const [weatherHistory, setWeatherHistory] = useState<WeatherHistoryPoint[]>(getInitialWeatherHistory);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle local CLI slash commands without invoking Gemini/Ollama if it's a direct utility action
  const handleSlashCommand = (cmdStr: string): boolean => {
    const parts = cmdStr.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (cmd === '/clear') {
      setMessages([
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `[TERMINAL BUFFER CLEARED] Temporary chat history wiped. Database and memory intact.`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/help') {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🌲 BUSHNET ASPEN CLI COMMANDS:
• /weather                    - Live tactical weather telemetry, barometer & rain probability
• /learn or /record           - Record live sensor snapshot & run empirical weather pattern learning engine
• /history                    - View recorded historical time-series data & extremes
• /shelter [name]             - View shelters or log new camp at current GPS
• /renameshelter <num> <name> - Rename an existing shelter (e.g. /renameshelter 1 Eagle Camp)
• /food [name] [qty] [kcal]   - View rations or log food into database
• /recalibrate                - Reset altitude baseline & refresh homing coordinates
• /compass                    - Read live digital heading, dial, and homing vector
• /status                     - Full hardware telemetry and daemon diagnostics
• /switch or /model           - Toggle between Qwen 0.5B (380MB) and 1.5B (1.1GB)
• /clear                      - Wipe temporary conversation buffer`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/switch' || cmd === '/toggle') {
      const nextModel: ModelSelection =
        modelPreference === 'qwen-0.5b' ? 'qwen-1.5b' : modelPreference === 'qwen-1.5b' ? 'auto' : 'qwen-0.5b';
      onSelectModel(nextModel);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `[MODEL SWITCHED] Active selection: ${nextModel.toUpperCase()}`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/recalibrate') {
      const baseAlt = Math.round(44330.0 * (1.0 - Math.pow(telemetry.bmpPressure / 1013.25, 0.1902949)));
      onUpdateTelemetry?.({
        bmpAlt: baseAlt,
        pressureTrend: 'Stable',
      });
      onLcdUpdate({ line1: 'CALIBRATION OK', line2: `ALT:${baseAlt}m SET` });
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `[RECALIBRATION COMPLETE]
• BMP180 Pressure Altitude: Recalibrated to ${baseAlt}m based on current ${telemetry.bmpPressure.toFixed(1)} hPa.
• GPS Origin: Locked to (${telemetry.gpsLat.toFixed(4)}N, ${Math.abs(telemetry.gpsLng).toFixed(4)}W).
• 16x2 Keypad Shield: Synced.`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/shelter') {
      if (!arg) {
        const shelterList = shelters.map((s, i) => `${i + 1}. ${s.name} (${s.type}) @ ${s.locationLat?.toFixed(4) || '--'}N, ${Math.abs(s.locationLng || 0).toFixed(4)}W`).join('\n') || 'No shelters recorded.';
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[SHELTER LOGS - LCD PAGE 7 & 9]\n${shelterList}\nTip: Type '/shelter <name>' to log a new camp, or '/renameshelter <number> <new name>' to rename.`,
            timestamp: nowTime,
          },
        ]);
      } else if (arg.startsWith('rename ')) {
        const renameArg = arg.substring(7).trim();
        const firstSpace = renameArg.indexOf(' ');
        if (firstSpace === -1) {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: 'system',
              text: `[ERROR] Format: /shelter rename <index> <new name>\nExample: /shelter rename 1 North Ridge Camp`,
              timestamp: nowTime,
            },
          ]);
        } else {
          const indexStr = renameArg.substring(0, firstSpace);
          const newName = renameArg.substring(firstSpace + 1).trim();
          const targetIndex = parseInt(indexStr, 10) - 1;

          if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= shelters.length) {
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: `[ERROR] Invalid shelter number '${indexStr}'. Valid range: 1 to ${shelters.length}.`,
                timestamp: nowTime,
              },
            ]);
          } else {
            const oldName = shelters[targetIndex].name;
            const updated = shelters.map((s, idx) => (idx === targetIndex ? { ...s, name: newName } : s));
            onUpdateShelters?.(updated);
            onLcdUpdate({ line1: `SHLTR ${targetIndex + 1}/${updated.length} P7/10`, line2: newName.substring(0, 16) });
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: `[SHELTER RENAMED] Shelter #${targetIndex + 1} renamed from "${oldName}" to "${newName}".
LCD Page 7 (Shelters) and Page 9 (Homing Vector) updated.`,
                timestamp: nowTime,
              },
            ]);
          }
        }
      } else {
        const newS: ShelterItem = {
          id: `sh-${Date.now()}`,
          name: arg,
          type: 'Lean-To',
          capacity: 2,
          rating: 5,
          locationLat: telemetry.gpsLat,
          locationLng: telemetry.gpsLng,
          locationName: `GPS Lat ${telemetry.gpsLat.toFixed(2)}N`,
          notes: `Logged via ASPEN terminal command at current GPS coordinates.`,
          buildDate: new Date().toISOString().split('T')[0],
        };
        const updated = [...shelters, newS];
        onUpdateShelters?.(updated);
        onLcdUpdate({ line1: `SHLTR ${updated.length}/${updated.length} P7/10`, line2: arg.substring(0, 16) });
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[SHELTER LOGGED] Added "${arg}" at (${telemetry.gpsLat.toFixed(4)}N, ${Math.abs(telemetry.gpsLng).toFixed(4)}W).
LCD Page 7 (Shelters) and Page 9 (Homing Vector) updated in realtime.`,
            timestamp: nowTime,
          },
        ]);
      }
      return true;
    }

    if (cmd === '/renameshelter' || cmd === '/rename_shelter') {
      if (!arg) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[ERROR] Usage: /renameshelter <index> <new name>\nExample: /renameshelter 1 North Ridge Camp`,
            timestamp: nowTime,
          },
        ]);
      } else {
        const firstSpace = arg.indexOf(' ');
        if (firstSpace === -1) {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: 'system',
              text: `[ERROR] Please specify both the shelter number and new name.\nExample: /renameshelter 1 Bear Creek Outpost`,
              timestamp: nowTime,
            },
          ]);
        } else {
          const indexStr = arg.substring(0, firstSpace);
          const newName = arg.substring(firstSpace + 1).trim();
          const targetIndex = parseInt(indexStr, 10) - 1;

          if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= shelters.length) {
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: `[ERROR] Invalid shelter index '${indexStr}'. Valid range: 1 to ${shelters.length}.`,
                timestamp: nowTime,
              },
            ]);
          } else {
            const oldName = shelters[targetIndex].name;
            const updated = shelters.map((s, idx) => (idx === targetIndex ? { ...s, name: newName } : s));
            onUpdateShelters?.(updated);
            onLcdUpdate({ line1: `SHLTR ${targetIndex + 1}/${updated.length} P7/10`, line2: newName.substring(0, 16) });
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}`,
                sender: 'system',
                text: `[SHELTER RENAMED] Shelter #${targetIndex + 1} changed from "${oldName}" to "${newName}".
LCD Page 7 (Shelters) and Page 9 (Homing Vector) updated.`,
                timestamp: nowTime,
              },
            ]);
          }
        }
      }
      return true;
    }

    if (cmd === '/food') {
      if (!arg) {
        const foodList = food.map((f, i) => `${i + 1}. ${f.name}: ${f.quantity} (${f.totalCalories} kcal)`).join('\n') || 'No food items recorded.';
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[FOOD STORAGE - LCD PAGE 8]\n${foodList}\nTip: Type '/food <name> <qty> <calories>' to add items.`,
            timestamp: nowTime,
          },
        ]);
      } else {
        const fParts = arg.split(' ');
        const fName = fParts[0] || 'Ration';
        const fQty = parseFloat(fParts[1]) || 1;
        const fCal = parseInt(fParts[2]) || 500;

        const newF: FoodItem = {
          id: `fd-${Date.now()}`,
          name: fName,
          category: 'MRE / Ration',
          quantity: fQty,
          unit: 'units',
          totalCalories: fCal,
          expirationDate: '2028-01-01',
          notes: 'Logged via ASPEN CLI.',
        };
        const updated = [...food, newF];
        onUpdateFood?.(updated);
        onLcdUpdate({ line1: `FOOD ${updated.length}/${updated.length} P8/10`, line2: `${fName.substring(0, 10)}:${fQty}` });
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[FOOD LOGGED] Added "${fName}" (${fQty} units, ${fCal} kcal). LCD Page 8 updated.`,
            timestamp: nowTime,
          },
        ]);
      }
      return true;
    }

    if (cmd === '/compass') {
      const hdg = telemetry.headingDeg;
      const targetCamp = shelters[0];
      let homingInfo = 'No shelter logged.';
      if (targetCamp && targetCamp.locationLat && targetCamp.locationLng) {
        const lat1 = telemetry.gpsLat * Math.PI / 180;
        const lat2 = targetCamp.locationLat * Math.PI / 180;
        const dLat = (targetCamp.locationLat - telemetry.gpsLat) * Math.PI / 180;
        const dLng = (targetCamp.locationLng - telemetry.gpsLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distM = Math.round(6371000 * c);
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const brg = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
        homingInfo = `Target: ${targetCamp.name} | Bearing: ${brg}° | Distance: ${distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🧭 COMPASS & HOMING DIAGNOSTIC:
• Digital Heading: ${Math.round(hdg)}° (LCD Page 10)
• GPS Track Speed: ${telemetry.gpsSpeed.toFixed(1)} km/h
• ${homingInfo} (LCD Page 9)`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/weather' || cmd === '/forecast' || cmd === '/baro') {
      const activeTemp = telemetry.kyTemp ?? telemetry.dhtTemp;
      const dewPt = Math.round((activeTemp - ((100 - telemetry.dhtHum) / 5)) * 10) / 10;
      const dewSpread = Math.round((activeTemp - dewPt) * 10) / 10;

      // Rate of change calculation
      let dp3h = 0.0;
      if (weatherHistory.length >= 2) {
        const nowSec = Date.now() / 1000;
        const pts3h = weatherHistory.filter((p) => (nowSec - p.epoch) <= 10800);
        if (pts3h.length >= 2) {
          dp3h = Math.round((telemetry.bmpPressure - pts3h[0].pressure_hpa) * 100) / 100;
        }
      }

      let rainProb = 15;
      let trendText = telemetry.pressureTrend as string;
      if (telemetry.pressureTrend === 'Rapid Drop (Storm Alert)' || dp3h <= -2.0) {
        rainProb = 88;
        trendText = 'Rapidly Falling (Storm Warning)';
      } else if (telemetry.pressureTrend === 'Falling' || dp3h <= -0.8) {
        rainProb = 65;
        trendText = 'Falling (Rain/Cold Front Likely)';
      } else if (telemetry.pressureTrend === 'Rising' || dp3h >= 1.2) {
        rainProb = 10;
        trendText = 'Rising (Clearing/High Pressure)';
      } else {
        rainProb = 15;
        trendText = 'Stable (Fair Weather Equilibrium)';
      }

      if (dewSpread <= 2.0 && telemetry.dhtHum >= 80) {
        rainProb = Math.min(95, rainProb + 25);
        trendText += ' [High Condensation / Fog Risk]';
      }

      onLcdUpdate({
        line1: `WX:${Math.round(telemetry.bmpPressure)}hPa ${telemetry.pressureTrend.substring(0, 3).toUpperCase()}`,
        line2: `RAIN:${rainProb}% ${activeTemp.toFixed(1)}C P3`,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🌤️ BUSHNET ASPEN - TACTICAL METEOROLOGICAL TELEMETRY:
• Ambient Temperature:    ${activeTemp.toFixed(1)}°C (DHT11 / KY-001)
• Barometric Pressure:    ${telemetry.bmpPressure.toFixed(1)} hPa (3h Δ: ${dp3h >= 0 ? '+' : ''}${dp3h.toFixed(2)} hPa)
• Barometric Trend:       ${trendText}
• Relative Humidity:      ${telemetry.dhtHum}% RH
• Calculated Dew Point:   ${dewPt.toFixed(1)}°C (Dew Spread: ${dewSpread.toFixed(1)}°C)
• Altimeter Elevation:    ${Math.round(telemetry.bmpAlt)} meters (Calibrated from 1013.25 hPa)
• Rain Probability:       ${rainProb}% (Zambretti empirical pressure tendency algorithm)
-------------------------------------------------------------
💡 Code Action: Type '/learn' to record a sensor snapshot & train pattern signatures.
              Type '/history' to view the historical sensor log.`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/learn' || cmd === '/record' || cmd === '/train') {
      const activeTemp = telemetry.kyTemp ?? telemetry.dhtTemp;
      const dewPt = Math.round((activeTemp - ((100 - telemetry.dhtHum) / 5)) * 10) / 10;
      const dewSpread = Math.round((activeTemp - dewPt) * 10) / 10;
      const nowEpoch = Math.floor(Date.now() / 1000);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newEntry: WeatherHistoryPoint = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        epoch: nowEpoch,
        timeLabel: nowStr.substring(0, 5),
        temp_c: Math.round(activeTemp * 10) / 10,
        pressure_hpa: Math.round(telemetry.bmpPressure * 10) / 10,
        humidity: Math.round(telemetry.dhtHum),
        alt_m: Math.round(telemetry.bmpAlt),
        dew_point: dewPt,
      };

      const updatedHistory = [...weatherHistory, newEntry].slice(-1440);
      setWeatherHistory(updatedHistory);
      try {
        localStorage.setItem('bushnet_weather_history', JSON.stringify(updatedHistory));
      } catch (e) {}

      // Calculate statistical gradients across time-windows
      const pts1h = updatedHistory.filter((p) => (nowEpoch - p.epoch) <= 3600);
      const pts3h = updatedHistory.filter((p) => (nowEpoch - p.epoch) <= 10800);
      const pts6h = updatedHistory.filter((p) => (nowEpoch - p.epoch) <= 21600);

      const dp1h = pts1h.length >= 2 ? Math.round((telemetry.bmpPressure - pts1h[0].pressure_hpa) * 100) / 100 : 0.0;
      const dp3h = pts3h.length >= 2 ? Math.round((telemetry.bmpPressure - pts3h[0].pressure_hpa) * 100) / 100 : 0.0;
      const dp6h = pts6h.length >= 2 ? Math.round((telemetry.bmpPressure - pts6h[0].pressure_hpa) * 100) / 100 : 0.0;

      const allTemps = updatedHistory.map((h) => h.temp_c);
      const allPress = updatedHistory.map((h) => h.pressure_hpa);
      const minTemp = Math.min(...allTemps);
      const maxTemp = Math.max(...allTemps);
      const minPress = Math.min(...allPress);
      const maxPress = Math.max(...allPress);

      const earliestEpoch = updatedHistory[0]?.epoch || nowEpoch;
      const spanHours = Math.max(0.1, Math.round(((nowEpoch - earliestEpoch) / 3600) * 10) / 10);

      let trendClass = 'STABLE (Fair Weather Equilibrium)';
      let learnedRain = 15;
      let stormRisk = 'LOW';

      if (dp3h <= -2.0 || telemetry.pressureTrend === 'Rapid Drop (Storm Alert)') {
        trendClass = 'RAPIDLY FALLING (Severe Storm / Frontal Gale Warning)';
        learnedRain = 85;
        stormRisk = 'HIGH';
      } else if (dp3h <= -0.8 || telemetry.pressureTrend === 'Falling') {
        trendClass = 'FALLING (Precipitation / Cold Front Incoming)';
        learnedRain = 65;
        stormRisk = 'MODERATE';
      } else if (dp3h >= 1.2 || telemetry.pressureTrend === 'Rising') {
        trendClass = 'RISING (High Pressure Ridge / Clearing Conditions)';
        learnedRain = 10;
        stormRisk = 'MINIMAL';
      }

      if (dewSpread <= 2.0 && telemetry.dhtHum >= 80) {
        learnedRain = Math.min(95, learnedRain + 25);
        trendClass += ' [High Condensation / Fog Ceiling]';
      }

      const learnedSignature = {
        last_learned_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        training_samples: updatedHistory.length,
        observation_span_hours: spanHours,
        current_pressure_hpa: telemetry.bmpPressure,
        current_temp_c: activeTemp,
        current_humidity: telemetry.dhtHum,
        dp_1h: dp1h,
        dp_3h: dp3h,
        dp_6h: dp6h,
        min_temp_c: minTemp,
        max_temp_c: maxTemp,
        min_press_hpa: minPress,
        max_press_hpa: maxPress,
        dew_spread_c: dewSpread,
        trend_classification: trendClass,
        learned_rain_probability: learnedRain,
        storm_risk: stormRisk,
      };

      try {
        localStorage.setItem('bushnet_rain_signatures', JSON.stringify(learnedSignature));
      } catch (e) {}

      onLcdUpdate({
        line1: 'PATTRN LEARN OK',
        line2: `SIG:${learnedRain}% RN P3`,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🧠 [ASPEN WEATHER PATTERN LEARNING & RECORDING ENGINE]
✅ SENSOR SNAPSHOT RECORDED TO DATA LOG
• File: ~/bushnet/data/weather_history.json
• Sample #${updatedHistory.length} at ${nowStr}:
  - Barometric Pressure: ${telemetry.bmpPressure.toFixed(1)} hPa
  - Ambient Temperature: ${activeTemp.toFixed(1)}°C
  - Relative Humidity:   ${telemetry.dhtHum}% RH
  - Calculated Dew Point:${dewPt.toFixed(1)}°C (Dew Spread: ${dewSpread.toFixed(1)}°C)
  - Pressure Altitude:   ${Math.round(telemetry.bmpAlt)}m

📈 LEARNED ATMOSPHERIC PATTERNS & STATISTICAL TRENDS:
• Historical Window:     ${updatedHistory.length} samples recorded over ${spanHours}h
• 1-Hour Baro Rate (ΔP): ${dp1h >= 0 ? '+' : ''}${dp1h.toFixed(2)} hPa/hr
• 3-Hour Baro Rate (ΔP): ${dp3h >= 0 ? '+' : ''}${dp3h.toFixed(2)} hPa/3h
• 6-Hour Baro Rate (ΔP): ${dp6h >= 0 ? '+' : ''}${dp6h.toFixed(2)} hPa/6h
• Thermal Diurnal Range: Min ${minTemp.toFixed(1)}°C / Max ${maxTemp.toFixed(1)}°C (Δ: ${(maxTemp - minTemp).toFixed(1)}°C)
• Pressure Bounds:       Min ${minPress.toFixed(1)} hPa / Max ${maxPress.toFixed(1)} hPa (Δ: ${(maxPress - minPress).toFixed(1)} hPa)
• Barometric Tendency:   ${trendClass}
• Learned Rain Signature:${learnedRain}% Probability (Storm Risk: ${stormRisk})

💾 MODEL PARAMETERS UPDATED:
• Exported To:           ~/bushnet/data/rain_signatures.json
• Hardware Synchronization: 16x2 Keypad LCD updated. Background daemon records every 60s.`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/history' || cmd === '/data' || cmd === '/log') {
      if (weatherHistory.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `[HISTORY] No recorded weather samples found yet.\nType '/learn' or click the '🧠 /learn' button to record the first sensor snapshot!`,
            timestamp: nowTime,
          },
        ]);
        return true;
      }

      const allTemps = weatherHistory.map((h) => h.temp_c);
      const allPress = weatherHistory.map((h) => h.pressure_hpa);
      const minTemp = Math.min(...allTemps);
      const maxTemp = Math.max(...allTemps);
      const minPress = Math.min(...allPress);
      const maxPress = Math.max(...allPress);

      const recentLines = weatherHistory.slice(-8).map((r) => {
        const t = `${r.temp_c.toFixed(1)}°C`.padEnd(7);
        const p = `${r.pressure_hpa.toFixed(1)}`.padEnd(10);
        const h = `${r.humidity}%`.padEnd(6);
        const d = `${r.dew_point.toFixed(1)}°C`.padEnd(6);
        return ` ${r.timestamp.substring(11, 19)} | ${t} | ${p} | ${h} | ${d}`;
      }).join('\n');

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `📊 BUSHNET ASPEN - RECORDED WEATHER TIME-SERIES HISTORY:
• Total Stored Samples:  ${weatherHistory.length}
• Earliest Logged:       ${weatherHistory[0]?.timestamp}
• Most Recent Logged:    ${weatherHistory[weatherHistory.length - 1]?.timestamp}
• Temperature Range:     Min ${minTemp.toFixed(1)}°C | Max ${maxTemp.toFixed(1)}°C
• Pressure Range:        Min ${minPress.toFixed(1)} hPa | Max ${maxPress.toFixed(1)} hPa
-------------------------------------------------------------
 TIME     | TEMP    | BARO (hPa) | RH (%) | DEW
-------------------------------------------------------------
${recentLines}
=============================================================
💡 Tip: Type '/graph' to render ASCII visual trend graphs!`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/graph' || cmd === '/plot' || cmd === '/chart' || cmd === '/sparkline') {
      if (weatherHistory.length < 2) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `📈 [GRAPH ENGINE] Need at least 2 recorded sensor points to plot trend curves.\nType '/learn' to record sensor snapshots!`,
            timestamp: nowTime,
          },
        ]);
        return true;
      }

      const points = weatherHistory.slice(-16);
      const pressVals = points.map((p) => p.pressure_hpa);
      const tempVals = points.map((p) => p.temp_c);
      const humVals = points.map((p) => p.humidity);

      const minP = Math.min(...pressVals);
      const maxP = Math.max(...pressVals);
      const minT = Math.min(...tempVals);
      const maxT = Math.max(...tempVals);

      const sparkChars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      const makeSparkline = (vals: number[], min: number, max: number) => {
        const range = max - min || 1;
        return vals.map((v) => {
          const idx = Math.min(sparkChars.length - 1, Math.max(0, Math.floor(((v - min) / range) * (sparkChars.length - 1))));
          return sparkChars[idx];
        }).join('');
      };

      const pSpark = makeSparkline(pressVals, minP, maxP);
      const tSpark = makeSparkline(tempVals, minT, maxT);
      const hSpark = makeSparkline(humVals, Math.min(...humVals), Math.max(...humVals));

      // Build 5-line ASCII Barometer Chart
      const rows: string[] = [];
      const pRange = maxP - minP || 1;
      for (let level = 4; level >= 0; level--) {
        const threshold = minP + (level / 4) * pRange;
        const lineVal = threshold.toFixed(1).padStart(7, ' ');
        const cols = pressVals.map((v) => {
          const norm = Math.round(((v - minP) / pRange) * 4);
          if (norm === level) return '●';
          if (norm > level) return '│';
          return ' ';
        }).join('─');
        rows.push(`${lineVal} hPa ┤ ${cols}`);
      }

      const timeLabels = points.map((p) => p.timeLabel.slice(-2)).join(' ');

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `📈 BUSHNET ASPEN - TACTICAL ATMOSPHERIC TELEMETRY GRAPH
=============================================================
🧭 BAROMETRIC PRESSURE TREND (${points.length} samples, Min: ${minP.toFixed(1)} | Max: ${maxP.toFixed(1)} hPa):
${rows.join('\n')}
         └─${'─'.repeat(pressVals.length * 2)}
    Time (min):  ${timeLabels}

⚡ SPARKLINE DYNAMICS:
• Barometer Trend:   [ ${pSpark} ] ${pressVals[pressVals.length - 1].toFixed(1)} hPa (Δ: ${(pressVals[pressVals.length - 1] - pressVals[0]).toFixed(2)} hPa)
• Temperature Trend: [ ${tSpark} ] ${tempVals[tempVals.length - 1].toFixed(1)}°C (Δ: ${(tempVals[tempVals.length - 1] - tempVals[0]).toFixed(1)}°C)
• Humidity Trend:    [ ${hSpark} ] ${humVals[humVals.length - 1]}% RH
=============================================================`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/status') {
      const activeTemp = telemetry.kyTemp ?? telemetry.dhtTemp;
      const dewPt = Math.round((activeTemp - ((100 - telemetry.dhtHum) / 5)) * 10) / 10;
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `📊 BUSHNET ASPEN HARDWARE & DAEMON STATUS:
• Ambient Temp (DHT11): ${telemetry.dhtTemp}°C | Humidity: ${telemetry.dhtHum}% (LCD P3)
• 1-Wire Probe (KY-001): ${telemetry.kyTemp ?? telemetry.dhtTemp}°C (LCD P4)
• Barometer (BMP180): ${telemetry.bmpPressure.toFixed(1)} hPa | Calibrated Alt: ${Math.round(telemetry.bmpAlt)}m (LCD P5)
• GPS Receiver (VK-162): ${telemetry.gpsSats} Sats Locked (${telemetry.gpsLat.toFixed(4)}N, ${Math.abs(telemetry.gpsLng).toFixed(4)}W) (LCD P6)
• Arduino Keypad Shield: /dev/ttyACM0 9600 Baud Link Active (10 Pages synchronized)
• Weather History: ${weatherHistory.length} recorded samples logged (~/bushnet/data/weather_history.json)
• Pattern Learner: Active (Calculated Dew Point ${dewPt.toFixed(1)}°C, Trend: ${telemetry.pressureTrend})
• Panic Button (Chassis GPIO): ${telemetry.emergencyActive ? '⚠️ ACTIVE' : 'NOMINAL'}`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/fish' || cmd === '/fishing') {
      const press = telemetry.bmpPressure;
      const temp = telemetry.kyTemp ?? telemetry.dhtTemp;
      let activityScore = 65;
      let baroSummary = 'Steady High (Moderate Feeding)';
      let tacticalAdvice = 'Finesse baits in cover; highest feeding at dawn and dusk.';
      let strikeWindow = 'Moderate';

      if (telemetry.pressureTrend.toLowerCase().includes('rapidly falling') || telemetry.pressureTrend.toLowerCase().includes('storm')) {
        activityScore = 95;
        baroSummary = '⚡ RAPIDLY FALLING (Pre-Frontal Binge Window)';
        tacticalAdvice = 'PEAK FEEDING! Fish swim bladders expand comfortably; predatory gorge before storm front arrives. Use fast spinners, spoons, and topwater!';
        strikeWindow = '🔥 MAXIMUM (Gorge Phase)';
      } else if (telemetry.pressureTrend.toLowerCase().includes('falling')) {
        activityScore = 85;
        baroSummary = '📉 FALLING BAROMETER (Active Strike Window)';
        tacticalAdvice = 'High strike rate. Fish moving into shallows and weed lines. Great for trout, salmon, bass, and pike.';
        strikeWindow = 'HIGH (Active Hunters)';
      } else if (telemetry.pressureTrend.toLowerCase().includes('rising')) {
        activityScore = 40;
        baroSummary = '📈 RISING BAROMETER (Post-Front High Pressure)';
        tacticalAdvice = 'Bluebird skies. Fish have swim-bladder pressure and hold tight to bottom structure/deep holes. Slow down retrieval; use deep jigs or scent bait.';
        strikeWindow = 'LOW (Slow Finesse)';
      } else if (press < 1006) {
        activityScore = 30;
        baroSummary = '🌧️ LOW PRESSURE TROUGH (<1006 hPa)';
        tacticalAdvice = 'Storm ceiling active. Fish holding deep. Focus on bottom trotlines or bait resting on substrate.';
        strikeWindow = 'MINIMAL';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🎣 BUSHNET ASPEN - TACTICAL FISHING & HYDRO-METEOROLOGICAL INDEX
=============================================================
🧭 LIVE BAROMETRIC CONDITIONS:
• Current Barometer:     ${press.toFixed(1)} hPa (${telemetry.pressureTrend})
• Air / Surface Temp:    ${temp.toFixed(1)}°C
• Feeding Activity:      ${activityScore}% [${strikeWindow}]
• Hydro Condition:       ${baroSummary}

🎯 TACTICAL FEEDING GUIDANCE:
• ${tacticalAdvice}

🐟 SPECIES OPTIMAL TEMPERATURE & DEPTH TARGETS:
1. 🌈 Rainbow / Cutthroat Trout (10-16°C):
   - Current Temp Rating: ${temp >= 10 && temp <= 18 ? '⭐ OPTIMAL' : 'Marginal (Seek shaded pools/springs)'}
   - Best Times: Dawn (05:30-08:30) & Dusk (18:30-21:30) or overcast ripple
   - Depth: 1-3m in river riffle tail-outs and shaded bank cutaways.
2. 🐟 Chinook / Coho Salmon (8-14°C):
   - Moving upstream during light rain/overcast; strike spinners/spoons aggressively on flood tides.
3. 🌿 Smallmouth / Largemouth Bass (18-24°C):
   - Warm surface hunters; strike topwater at sunrise/sunset, weed edges in afternoon.
4. 🐊 Northern Pike & Walleye (12-18°C):
   - Walleye hunt low-light/night shallows (tapetum lucidum eyes); Pike hunt drop-offs.
5. 🛡️ White Sturgeon (8-16°C):
   - Deep river bottom holes; passive scavengers (salmon roe, worms, rotting bait on substrate).

🪤 EMERGENCY / SURVIVAL PROCUREMENT:
• Passive Trotline: 50ft paracord core line across river eddy with weighted drop hooks every 2ft baited with grubs/insects for overnight passive calorie harvesting.
• Primitive Hooks: 1.5-inch carved bone gorge, safety pins, or bent wire thorns.
• Willow Funnel Weir: V-shaped stone/stick wall pointing downstream with trap basket.
=============================================================`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    if (cmd === '/wildlife' || cmd === '/animals' || cmd === '/species' || cmd === '/fauna') {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🐾 BUSHNET ASPEN - REGIONAL WILDLIFE & FAUNA ENCYCLOPEDIA (PNW / BOREAL)
=============================================================
⚠️ LARGE PREDATOR DEFENSE PROTOCOLS:
• 🐻 Grizzly Bear (Ursus arctos) [DANGER: CRITICAL]:
  - ID: Shoulder hump, dished face, 3-4" curved claws.
  - Action: DO NOT RUN. Avoid eye contact, back away slowly.
  - Charge: Deploy bear spray at 10m. If contact: drop face down, interlock fingers behind neck, spread legs wide.
• 🐻 Black Bear (Ursus americanus) [DANGER: HIGH]:
  - ID: Straight facial profile, no shoulder hump, agile tree climbers.
  - Action: Stand tall, wave arms, shout loudly, throw rocks. FIGHT BACK aggressively if attacked.
• 🦁 Cougar / Mountain Lion (Puma concolor) [DANGER: CRITICAL]:
  - ID: 60-100kg feline, long tail with black tip. Stalks silently from behind.
  - Action: NEVER RUN or crouch (triggers prey drive). Maintain direct eye contact, open jacket wide to appear giant, throw rocks, shout in deep voice.
• 🐺 Gray Wolf (Canis lupus) [DANGER: MODERATE/HIGH]:
  - ID: 35-60kg pack canines. Do not isolate. Maintain fire perimeter, stand tall in group.
• 🦌 Moose (Alces alces) [DANGER: EXTREME DURING RUT/CALVING]:
  - ID: 400-700kg giant ungulate. Highly aggressive if cornered.
  - Action: Unlike bears, RUN and put large trees, boulders, or vehicles between you!

🍗 HIGH-CALORIE EMERGENCY SURVIVAL GAME:
• 🐇 Snowshoe Hare (800 kcal): 20-gauge brass wire snares on active beaten trails (fist loop 4 fingers up).
• 🦔 Porcupine (3,000+ kcal): Slow-moving; strike snout with stout staff. Roast whole to burn quills.
• 🌲 Spruce / Ruffed Grouse (450 kcal): Tree-perched; snare pole with paracord noose or throwing stick.
• 🦫 Beaver (6,000+ kcal): Found at ponds/dams; tail is concentrated survival fat.

🐍 VENOMOUS & NUISANCE FAUNA:
• 🐍 Western Rattlesnake (arid rocky slopes): Freeze if buzzing, back away 3m. Keep limb elevated if bitten.
• 🕷️ Wood & Deer Ticks: Check groin/armpits daily (Lyme / Tick Paralysis). Remove with steady tweezers.
=============================================================`,
          timestamp: nowTime,
        },
      ]);
      return true;
    }

    return false;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Check if it's a slash command or direct utility keyword
    const trimmedLow = promptText.trim().toLowerCase();
    const isDirectUtility = promptText.startsWith('/') ||
      ['weather', 'forecast', 'barometer', 'learn', 'record', 'history', 'graph', 'plot', 'chart', 'sparkline', 'fish', 'fishing', 'wildlife', 'animals', 'species', 'fauna', 'status', 'help', 'recalibrate', 'compass'].includes(trimmedLow);

    if (isDirectUtility) {
      const cmdFormatted = promptText.startsWith('/') ? promptText : `/${promptText}`;
      const handled = handleSlashCommand(cmdFormatted);
      if (handled) return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/aspen/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          modelPreference,
          profile: userProfile,
          sensors: telemetry,
          shelters,
          food,
          gear,
          medical,
          activeEmergency: telemetry.emergencyActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ASPEN inference error');
      }

      const aspenMsg: ChatMessage = {
        id: `aspen-${Date.now()}`,
        sender: 'aspen',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelName,
        ramUsage: data.ramUsage,
        inferenceSpeed: data.inferenceSpeed,
        autoReasoning: data.autoReasoning,
        lcdLine1: data.lcdDisplay?.line1,
        lcdLine2: data.lcdDisplay?.line2,
        contextInjected: data.contextInjected,
        ragMatches: data.ragMatches,
      };

      setMessages((prev) => [...prev, aspenMsg]);

      if (data.lcdDisplay) {
        onLcdUpdate(data.lcdDisplay);
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          text: `[ASPEN FAULT] Inference engine error: ${err.message || 'Offline processing timeout'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isColdFront = (telemetry.bmpPressure >= 1018 || telemetry.pressureTrend === 'Rising') && telemetry.dhtTemp < 12;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl text-slate-100 space-y-3 flex flex-col h-[640px]">
      
      {/* Header & Model Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold font-mono text-sm uppercase text-slate-200 flex items-center gap-2">
              <span>Raspberry Pi 5 CLI Terminal (ask.py)</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                lachlan@BushNet:~ $
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Offline Qwen 2.5 survival engine with 10-page Arduino LCD synchronization.
            </p>
          </div>
        </div>

        {/* Model Mode Switcher & Envelope Inspector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContextEnvelope(!showContextEnvelope)}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border transition ${
              showContextEnvelope
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Inspect the automated pre-flight context envelope injected before every AI prompt"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pre-Flight</span>
            <span>Envelope</span>
          </button>

          <div className="flex items-center gap-1 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onSelectModel('auto')}
              className={`px-2.5 py-1 rounded transition ${
                modelPreference === 'auto'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Automatically routes between 0.5B and 1.5B based on request intent"
            >
              AUTO
            </button>
            <button
              onClick={() => onSelectModel('qwen-0.5b')}
              className={`px-2.5 py-1 rounded transition ${
                modelPreference === 'qwen-0.5b'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Force Qwen 2.5 0.5B (380MB RAM)"
            >
              0.5B
            </button>
            <button
              onClick={() => onSelectModel('qwen-1.5b')}
              className={`px-2.5 py-1 rounded transition ${
                modelPreference === 'qwen-1.5b'
                  ? 'bg-amber-600 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Force Qwen 2.5 1.5B (1.1GB RAM)"
            >
              1.5B
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Flight Context Envelope Inspector Drawer */}
      {showContextEnvelope && (
        <div className="bg-slate-950 border border-cyan-700/80 p-3 rounded-lg font-mono text-xs text-slate-300 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-cyan-800/40 pb-1.5 text-cyan-400 font-bold text-[11px]">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>AUTOMATIC PRE-FLIGHT CONTEXT ENVELOPE (AUTO-INJECTED BEFORE EVERY QUERY)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-normal">Active on CLI & Web</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Attached Physical Sensors (Online):</span>
              <ul className="text-slate-300 space-y-0.5 list-disc list-inside">
                <li>BMP180: <strong className="text-slate-100">{telemetry.bmpPressure.toFixed(1)} hPa</strong> ({telemetry.pressureTrend}), Alt {telemetry.bmpAlt.toFixed(0)}m</li>
                <li>DHT11: <strong className="text-slate-100">{telemetry.dhtTemp.toFixed(1)}°C</strong>, <strong className="text-slate-100">{telemetry.dhtHum.toFixed(0)}% RH</strong></li>
                <li>KY-001 / DS18B20: <strong className="text-slate-100">{telemetry.kyTemp.toFixed(1)}°C</strong> (1-Wire Waterproof)</li>
                <li>u-blox 7 GPS: <strong className="text-slate-100">{telemetry.gpsSats} Sats locked</strong> ({telemetry.gpsLat.toFixed(4)}°, {telemetry.gpsLng.toFixed(4)}°)</li>
              </ul>
            </div>
            <div className="space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-amber-400 font-bold uppercase tracking-wider">Hardware Constraints (Enforced):</span>
              <ul className="text-slate-300 space-y-0.5 list-disc list-inside">
                <li>NO Microphone / Audio Input (Physically incapable of hearing)</li>
                <li>NO Camera / Optical Sensor (Physically incapable of seeing)</li>
                <li>NO Motion Radar (Cannot detect physical movement)</li>
                <li>Camp State: {food.length} food item(s), {shelters.length} shelter(s) logged</li>
              </ul>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <strong className="text-cyan-300">Operational Directives:</strong> Physical assessments grounded strictly in attached sensors. Night anxiety protocol active (calm reassurance &quot;Don't panic&quot;, nocturnal forest noise explanation, camp perimeter checks).
            </div>
            <button
              onClick={() => setShowContextEnvelope(false)}
              className="text-cyan-400 hover:text-cyan-300 underline shrink-0 text-[10px]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Weather Alert Bar in Terminal if Anomaly Detected */}
      {isColdFront && (
        <div className="bg-cyan-950/80 border border-cyan-500/80 rounded-lg p-2.5 text-xs font-mono text-cyan-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span><strong>COLD FRONT DETECTED:</strong> Pressure rising ({telemetry.bmpPressure.toFixed(1)} hPa), Temp plunging ({telemetry.dhtTemp}°C)</span>
          </div>
          <button
            onClick={() => handleSendMessage("Analyze current weather anomaly: Barometric pressure is rising rapidly while temperature drops. What is the meteorological threat and immediate survival actions?")}
            className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition text-[11px] shrink-0"
          >
            Analyze Threat
          </button>
        </div>
      )}

      {/* Quick Slash Commands and Suggested Chips */}
      <div className="flex flex-col gap-1.5 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-300 no-scrollbar">
          <span className="text-slate-500 shrink-0">Commands:</span>
          <button
            onClick={() => handleSendMessage("/weather")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 shrink-0 transition font-medium"
            title="Display live tactical weather telemetry, barometer & rain probability"
          >
            🌤️ /weather
          </button>
          <button
            onClick={() => handleSendMessage("/learn")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 shrink-0 transition font-medium"
            title="Record live sensor snapshot & run empirical weather pattern learning engine"
          >
            🧠 /learn
          </button>
          <button
            onClick={() => handleSendMessage("/history")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 shrink-0 transition"
            title="View recorded historical time-series weather log"
          >
            📊 /history
          </button>
          <button
            onClick={() => handleSendMessage("/graph")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-pink-300 shrink-0 transition font-medium"
            title="Render ASCII visual barometric & temperature trend graph"
          >
            📈 /graph
          </button>
          <button
            onClick={() => handleSendMessage("/fish")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 shrink-0 transition font-medium"
            title="Tactical barometric fishing index, water temperatures, and species activity"
          >
            🎣 /fish
          </button>
          <button
            onClick={() => handleSendMessage("/wildlife")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 shrink-0 transition font-medium"
            title="Regional fauna, dangerous predators & emergency calorie game index"
          >
            🐾 /wildlife
          </button>
          <button
            onClick={() => handleSendMessage("/shelter Ridge Tipi")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 shrink-0 transition"
            title="Log new shelter at current GPS"
          >
            🏕️ /shelter
          </button>
          <button
            onClick={() => handleSendMessage("/food Cattails 1.5kg 1200")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 shrink-0 transition"
            title="Log food rations"
          >
            🍱 /food
          </button>
          <button
            onClick={() => handleSendMessage("/recalibrate")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 shrink-0 transition"
            title="Recalibrate sensors and origin"
          >
            ⚖️ /recalibrate
          </button>
          <button
            onClick={() => handleSendMessage("/compass")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 shrink-0 transition"
            title="Read homing bearing & distance"
          >
            🧭 /compass
          </button>
          <button
            onClick={() => handleSendMessage("/status")}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 shrink-0 transition"
          >
            📊 /status
          </button>
        </div>

        {/* Outdoors + Weather-Aware Quick Questions */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-300 no-scrollbar">
          <span className="text-emerald-500 shrink-0 font-semibold">Field AI:</span>
          <button
            onClick={() => handleSendMessage("Is it safe to hike in this weather?")}
            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 shrink-0 transition"
          >
            🥾 Safe to hike right now?
          </button>
          <button
            onClick={() => handleSendMessage("How should I pitch my tarp given current weather conditions?")}
            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 shrink-0 transition"
          >
            ⛺ Shelter setup for current conditions
          </button>
          <button
            onClick={() => handleSendMessage("What is the best way to start a fire in current humidity?")}
            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 shrink-0 transition"
          >
            🔥 Fire starting in current humidity
          </button>
          <button
            onClick={() => handleSendMessage("What clothing layers should I wear outside right now?")}
            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 shrink-0 transition"
          >
            🧥 Layering advice for current temp
          </button>
          <button
            onClick={() => handleSendMessage("I hear strange noises in the woods, what should I do?")}
            className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-300 shrink-0 transition"
          >
            🌲 Strange noises outside?
          </button>
          <button
            onClick={() => handleSendMessage("How do I make a proper bear hang for my food in the woods?")}
            className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 shrink-0 transition"
          >
            🐻 Bear Hang (PCT Method)
          </button>
          <button
            onClick={() => handleSendMessage("How long do I need to boil water to kill all pathogens?")}
            className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 shrink-0 transition"
          >
            💧 Water Boiling Standards
          </button>
        </div>
      </div>

      {/* Terminal Conversation Output Box */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            {msg.sender === 'system' ? (
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-slate-400 font-mono text-[11px] whitespace-pre-wrap">
                {msg.text}
              </div>
            ) : msg.sender === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-slate-800 border border-slate-700 text-slate-100 p-3 rounded-lg rounded-tr-none font-mono">
                  <div className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center justify-between gap-2">
                    <span>lachlan@bushnet:~ $</span>
                    <span className="text-slate-400 font-normal">{msg.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[90%] bg-emerald-950/40 border border-emerald-500/30 text-slate-200 p-3.5 rounded-lg rounded-tl-none font-mono space-y-2">
                  
                  {/* ASPEN Message Header */}
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-black tracking-wider uppercase">
                        ASPEN AI
                      </span>
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-bold">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      {msg.ramUsage && <span>RAM: {msg.ramUsage}</span>}
                      {msg.inferenceSpeed && <span>• {msg.inferenceSpeed}</span>}
                      <span>• {msg.timestamp}</span>
                    </div>
                  </div>

                  {/* Pre-Flight Context Injection Badge */}
                  {msg.contextInjected && (
                    <div className="text-[10px] bg-slate-900/90 p-1.5 rounded border border-emerald-500/20 text-emerald-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Pre-Flight Context Injected:</span>
                        <span className="truncate text-slate-300 font-mono">{msg.contextInjected}</span>
                      </div>
                    </div>
                  )}

                  {/* Offline Field Manual RAG Ground Truth Badge */}
                  {msg.ragMatches && msg.ragMatches.length > 0 && (
                    <div className="text-[10px] bg-slate-900/90 p-2 rounded border border-cyan-500/30 text-cyan-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider text-cyan-400">
                        <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Offline Field Manual Reference (Ground Truth Injected):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.ragMatches.map((rag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-700/60 text-cyan-200 text-[10px] font-mono flex items-center gap-1">
                            <span>📖</span>
                            <span className="text-slate-400">{rag.source}:</span>
                            <strong className="text-cyan-300">{rag.title}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Routing Reasoning tag */}
                  {msg.autoReasoning && (
                    <div className="text-[10px] bg-slate-900/80 p-1.5 rounded border border-slate-800 text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{msg.autoReasoning}</span>
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-100 text-xs">
                    {msg.text.replace(/```lcd[\s\S]*?```/gi, '').trim()}
                  </div>

                  {/* Keypad LCD Summary snippet if generated */}
                  {msg.lcdLine1 && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 bg-sky-950/80 p-2 rounded border border-sky-800 font-mono text-[11px] text-sky-300 flex items-center justify-between">
                      <span className="text-sky-400 font-bold text-[10px]">ARDUINO LCD SYNC:</span>
                      <div className="bg-sky-900 px-2 py-0.5 rounded text-sky-100 font-bold tracking-wider">
                        &quot;{msg.lcdLine1}&quot; / &quot;{msg.lcdLine2}&quot;
                      </div>
                    </div>
                  )}

                  {/* Unlogged Gear Detection Quick-Add Cards */}
                  {extractUnloggedGearItems(msg.text, gear).map((unloggedItem) => (
                    <div key={unloggedItem} className="mt-2.5 pt-2 border-t border-amber-500/30 bg-amber-950/80 p-2.5 rounded-lg border border-amber-600/80 font-mono text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                        <span>
                          <strong>UNLOGGED GEAR DETECTED:</strong> &quot;{unloggedItem}&quot; is mentioned but not in your gear inventory.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onAddGearItem?.({
                            id: `gear-${Date.now()}`,
                            name: unloggedItem,
                            category: 'Cutting & Fire',
                            quantity: 1,
                            condition: 'Good',
                            weightKg: 0.2,
                          });
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `sys-gear-${Date.now()}`,
                              sender: 'system',
                              text: `[EQUIPMENT MEMORY UPDATED] Logged "${unloggedItem}" into ASPEN Gear Inventory.`,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            },
                          ]);
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shrink-0 transition shadow flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>➕ Add "{unloggedItem}" to Gear</span>
                      </button>
                    </div>
                  ))}

                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>
                ASPEN processing on Raspberry Pi 5 ({activeModel === 'qwen-1.5b' ? 'Qwen 2.5 1.5B 1.1GB RAM' : 'Qwen 2.5 0.5B 380MB RAM'})...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* AI Daemon Standby Banner when AI is Powered OFF */}
      {!isAiPowered && (
        <div className="bg-amber-950/80 border border-amber-800/80 rounded-lg p-3 text-xs font-mono text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>AI DAEMON IN STANDBY (0 MB RAM):</strong> AI power is off. Sending a query will automatically boot the local Qwen engine.
            </span>
          </div>
          <button
            onClick={onToggleAiPower}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shrink-0 transition"
          >
            BOOT AI DAEMON NOW
          </button>
        </div>
      )}

      {/* Terminal Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isAiPowered) {
            onToggleAiPower();
          }
          handleSendMessage();
        }}
        className="flex gap-2 pt-1"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type terminal command (/shelter, /food, /recalibrate, /compass) or question for ASPEN..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Execute</span>
        </button>
      </form>

    </div>
  );
};
