import React, { useMemo } from 'react';
import {
  Sun,
  Moon,
  Compass,
  Sunrise,
  Sunset,
  Eye,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { SensorTelemetry } from '../types';

interface AstroEphemerisAppProps {
  telemetry: SensorTelemetry;
  currentTime?: string;
  isNightMode?: boolean;
}

export const AstroEphemerisApp: React.FC<AstroEphemerisAppProps> = ({
  telemetry,
  currentTime,
  isNightMode = false,
}) => {
  const now = new Date();

  // Celestial Ephemeris Calculation grounded in GPS Coordinates
  const ephemeris = useMemo(() => {
    const lat = telemetry.gpsLat || 44.5;
    const lng = telemetry.gpsLng || -110.5;

    // Approximate Day of Year
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Approximate Solar Declination (degrees)
    const declination = -23.45 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
    const radLat = (lat * Math.PI) / 180;
    const radDec = (declination * Math.PI) / 180;

    // Hour angle calculation for sunrise/sunset
    const cosHourAngle = -Math.tan(radLat) * Math.tan(radDec);
    const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
    const hourAngleDeg = (Math.acos(clampedCos) * 180) / Math.PI;
    const daylightHours = (hourAngleDeg / 15) * 2;

    // Solar noon approximate (Standard Time based on longitude)
    const solarNoonHour = 12 + ((-105 - lng) * 4) / 60; // rough timezone baseline
    const sunriseHourDec = solarNoonHour - daylightHours / 2;
    const sunsetHourDec = solarNoonHour + daylightHours / 2;

    const formatDecTime = (dec: number) => {
      let h = Math.floor(dec);
      const m = Math.floor((dec - h) * 60);
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
    };

    const sunriseStr = formatDecTime(sunriseHourDec);
    const sunsetStr = formatDecTime(sunsetHourDec);
    const civilDawnStr = formatDecTime(sunriseHourDec - 0.5); // ~30m before sunrise
    const civilDuskStr = formatDecTime(sunsetHourDec + 0.5); // ~30m after sunset
    const solarNoonStr = formatDecTime(solarNoonHour);

    // Lunar calculations
    // Known new moon reference: Jan 11 2024
    const refNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
    const synodicMonth = 29.53058867 * 24 * 60 * 60 * 1000;
    const ageMs = (now.getTime() - refNewMoon) % synodicMonth;
    const lunarAgeDays = ageMs / (24 * 60 * 60 * 1000);
    const illuminationFrac = 0.5 * (1 - Math.cos((2 * Math.PI * lunarAgeDays) / 29.53));
    const illuminationPct = Math.round(illuminationFrac * 100);

    let phaseName = 'New Moon';
    let phaseIcon = '🌑';
    if (lunarAgeDays < 1.84) {
      phaseName = 'New Moon';
      phaseIcon = '🌑';
    } else if (lunarAgeDays < 7.38) {
      phaseName = 'Waxing Crescent';
      phaseIcon = '🌒';
    } else if (lunarAgeDays < 9.22) {
      phaseName = 'First Quarter';
      phaseIcon = '🌓';
    } else if (lunarAgeDays < 14.76) {
      phaseName = 'Waxing Gibbous';
      phaseIcon = '🌔';
    } else if (lunarAgeDays < 16.61) {
      phaseName = 'Full Moon';
      phaseIcon = '🌕';
    } else if (lunarAgeDays < 22.15) {
      phaseName = 'Waning Gibbous';
      phaseIcon = '🌖';
    } else if (lunarAgeDays < 23.99) {
      phaseName = 'Last Quarter';
      phaseIcon = '🌗';
    } else {
      phaseName = 'Waning Crescent';
      phaseIcon = '🌘';
    }

    // Night hiking viability assessment
    let nightViability = 'LOW (FLASHLIGHT REQUIRED)';
    let nightColor = 'text-amber-400';
    if (illuminationPct >= 75) {
      nightViability = 'EXCELLENT (OPEN TRAIL NIGHT HIKING POSSIBLE)';
      nightColor = 'text-emerald-400';
    } else if (illuminationPct >= 40) {
      nightViability = 'MODERATE (USABLE IN OPEN MEADOWS, DIM IN TIMBER)';
      nightColor = 'text-cyan-400';
    }

    return {
      sunriseStr,
      sunsetStr,
      civilDawnStr,
      civilDuskStr,
      solarNoonStr,
      daylightHours: daylightHours.toFixed(1),
      lunarAgeDays: lunarAgeDays.toFixed(1),
      illuminationPct,
      phaseName,
      phaseIcon,
      nightViability,
      nightColor,
    };
  }, [telemetry.gpsLat, telemetry.gpsLng, now]);

  return (
    <div className="space-y-2.5 font-mono text-xs select-none">
      {/* Top Banner: GPS Astronomical Lock */}
      <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-stone-100 flex items-center gap-1.5">
              <span>SOLAR & LUNAR EPHEMERIS</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-300 border border-stone-700">
                100% OFFLINE GEOMETRY
              </span>
            </div>
            <div className="text-[10px] text-stone-400">
              Grounded to GPS: {telemetry.gpsLat.toFixed(4)}°N, {Math.abs(telemetry.gpsLng).toFixed(4)}°W
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-stone-400">LOCAL CLOCK</div>
          <div className="font-bold text-emerald-400 text-xs">{currentTime || '10:28 AM'}</div>
        </div>
      </div>

      {/* Main Grid: Solar Cycle & Lunar Cycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        
        {/* Left: Solar Schedule & Daylight Window */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sunrise className="w-4 h-4" />
              SOLAR DAYLIGHT CYCLE
            </span>
            <span className="text-[10px] text-stone-400">{ephemeris.daylightHours}h Daylight</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                CIVIL DAWN (FIRST LIGHT):
              </span>
              <span className="font-bold text-cyan-300">{ephemeris.civilDawnStr}</span>
            </div>

            <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                SUNRISE (SUN CLEARS HORIZON):
              </span>
              <span className="font-bold text-amber-400">{ephemeris.sunriseStr}</span>
            </div>

            <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                SOLAR NOON (ZENITH):
              </span>
              <span className="font-bold text-yellow-300">{ephemeris.solarNoonStr}</span>
            </div>

            <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Sunset className="w-3.5 h-3.5 text-rose-400" />
                SUNSET (MAKING CAMP DEADLINE):
              </span>
              <span className="font-bold text-rose-400">{ephemeris.sunsetStr}</span>
            </div>

            <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                CIVIL DUSK (TRUE DARKNESS):
              </span>
              <span className="font-bold text-purple-300">{ephemeris.civilDuskStr}</span>
            </div>
          </div>
        </div>

        {/* Right: Moon Phase & Ambient Night Illumination */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <Moon className="w-4 h-4" />
                LUNAR ILLUMINATION & PHASE
              </span>
              <span className="text-base">{ephemeris.phaseIcon}</span>
            </div>

            <div className="mt-2 text-center bg-stone-950 p-2.5 rounded-lg border border-stone-800">
              <div className="text-xl font-black text-stone-100 flex items-center justify-center gap-2">
                <span>{ephemeris.phaseIcon}</span>
                <span>{ephemeris.phaseName}</span>
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">
                Lunar Age: {ephemeris.lunarAgeDays} days • Illumination: <strong className="text-amber-300">{ephemeris.illuminationPct}%</strong>
              </div>

              {/* Visual Illumination Progress Bar */}
              <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden mt-2 border border-stone-800">
                <div
                  className="bg-gradient-to-r from-stone-600 via-amber-400 to-white h-full transition-all"
                  style={{ width: `${ephemeris.illuminationPct}%` }}
                />
              </div>
            </div>

            {/* Night Travel Viability Rating */}
            <div className="mt-2 bg-stone-950 p-2 rounded-lg border border-stone-800 text-[10px] space-y-1">
              <div className="text-stone-400 font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-cyan-400" />
                NIGHT HIKING WITHOUT WHITE FLASHLIGHT:
              </div>
              <div className={`font-bold ${ephemeris.nightColor}`}>
                {ephemeris.nightViability}
              </div>
            </div>
          </div>

          <div className="p-2 rounded bg-stone-950 border border-stone-800 text-[9px] text-stone-400">
            💡 <em>Rule of Thumb:</em> In mountainous terrain, plan to be in your bivouac at least 45 minutes before Civil Dusk ({ephemeris.civilDuskStr}) to avoid pitching camp in pitch black.
          </div>
        </div>

      </div>
    </div>
  );
};
