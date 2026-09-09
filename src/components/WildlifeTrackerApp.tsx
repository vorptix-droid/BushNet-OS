import React, { useState, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  Compass,
  Footprints,
  ShieldAlert,
  Info,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { WILDLIFE_DATABASE, WildlifeSpecies } from '../data/wildlifeData';

interface WildlifeTrackerAppProps {
  onSelectSpeciesForPrompt?: (speciesName: string) => void;
  isNightMode?: boolean;
}

export const WildlifeTrackerApp: React.FC<WildlifeTrackerAppProps> = ({
  onSelectSpeciesForPrompt,
  isNightMode = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [clawFilter, setClawFilter] = useState<string>('all'); // all, yes, no, cloven
  const [toeFilter, setToeFilter] = useState<string>('all'); // all, 4, 5, cloven
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSpeciesId, setActiveSpeciesId] = useState<string>(WILDLIFE_DATABASE[0].id);
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'details' | 'encounter'>('details');

  const filteredSpecies = useMemo(() => {
    return WILDLIFE_DATABASE.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Claw filter
      if (clawFilter === 'yes' && item.clawsVisible !== true) return false;
      if (clawFilter === 'no' && item.clawsVisible !== false) return false;
      if (clawFilter === 'cloven' && item.toeCount !== 'cloven') return false;

      // Toe filter
      if (toeFilter === '4' && item.toeCount !== 4) return false;
      if (toeFilter === '5' && item.toeCount !== 5) return false;
      if (toeFilter === 'cloven' && item.toeCount !== 'cloven') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSci = item.scientificName.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchFeatures = item.identifyingFeatures.some((f) => f.toLowerCase().includes(q));
        if (!matchName && !matchSci && !matchCat && !matchFeatures) return false;
      }

      return true;
    });
  }, [selectedCategory, clawFilter, toeFilter, searchQuery]);

  const activeSpecies = WILDLIFE_DATABASE.find((s) => s.id === activeSpeciesId) || filteredSpecies[0] || WILDLIFE_DATABASE[0];

  // Render SVG Track Illustration
  const renderTrackSvg = (type: WildlifeSpecies['trackSvgType']) => {
    switch (type) {
      case 'bear_front':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-amber-400 fill-amber-500/20 stroke-[2.5]">
            {/* Palm Pad */}
            <path d="M 20 60 C 20 40, 80 40, 80 60 C 80 75, 60 85, 50 85 C 40 85, 20 75, 20 60 Z" />
            {/* 5 Toes */}
            <circle cx="20" cy="30" r="6" />
            <circle cx="35" cy="25" r="6.5" />
            <circle cx="50" cy="24" r="7" />
            <circle cx="65" cy="26" r="6.5" />
            <circle cx="80" cy="32" r="6" />
            {/* Long Claws */}
            <line x1="20" y1="24" x2="20" y2="12" strokeWidth="2.5" />
            <line x1="35" y1="18.5" x2="35" y2="8" strokeWidth="2.5" />
            <line x1="50" y1="17" x2="50" y2="6" strokeWidth="2.5" />
            <line x1="65" y1="19.5" x2="65" y2="9" strokeWidth="2.5" />
            <line x1="80" y1="26" x2="80" y2="14" strokeWidth="2.5" />
          </svg>
        );
      case 'feline_large':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-rose-400 fill-rose-500/20 stroke-[2.5]">
            {/* Tri-lobed Heel Pad */}
            <path d="M 28 65 C 25 50, 40 45, 50 48 C 60 45, 75 50, 72 65 C 70 78, 62 82, 50 80 C 38 82, 30 78, 28 65 Z" />
            {/* 4 Asymmetrical Teardrop Toes (Leading Toe at 42) */}
            <ellipse cx="25" cy="40" rx="6" ry="8" transform="rotate(-15 25 40)" />
            <ellipse cx="42" cy="28" rx="6.5" ry="9" transform="rotate(-5 42 28)" />
            <ellipse cx="58" cy="31" rx="6.5" ry="9" transform="rotate(8 58 31)" />
            <ellipse cx="75" cy="44" rx="6" ry="8" transform="rotate(20 75 44)" />
            {/* No Claws (Retractable) */}
          </svg>
        );
      case 'feline_small':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-rose-300 fill-rose-500/20 stroke-[2]">
            <path d="M 32 66 C 30 52, 42 48, 50 50 C 58 48, 70 52, 68 66 C 66 76, 60 80, 50 78 C 40 80, 34 76, 32 66 Z" />
            <ellipse cx="30" cy="42" rx="5" ry="7" transform="rotate(-15 30 42)" />
            <ellipse cx="44" cy="32" rx="5.5" ry="7.5" transform="rotate(-5 44 32)" />
            <ellipse cx="58" cy="34" rx="5.5" ry="7.5" transform="rotate(8 58 34)" />
            <ellipse cx="71" cy="45" rx="5" ry="7" transform="rotate(20 71 45)" />
          </svg>
        );
      case 'canine_large':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-cyan-400 fill-cyan-500/20 stroke-[2.5]">
            {/* Triangular Heel Pad */}
            <path d="M 30 65 C 30 55, 40 50, 50 52 C 60 50, 70 55, 70 65 C 70 78, 62 80, 50 78 C 38 80, 30 78, 30 65 Z" />
            {/* 4 Symmetrical Toes with X-Negative Space */}
            <ellipse cx="25" cy="48" rx="6" ry="9" transform="rotate(-20 25 48)" />
            <ellipse cx="42" cy="32" rx="6.5" ry="10" transform="rotate(-6 42 32)" />
            <ellipse cx="58" cy="32" rx="6.5" ry="10" transform="rotate(6 58 32)" />
            <ellipse cx="75" cy="48" rx="6" ry="9" transform="rotate(20 75 48)" />
            {/* Prominent Blunt Claws */}
            <line x1="22" y1="39" x2="20" y2="30" strokeWidth="2.5" />
            <line x1="41" y1="22" x2="41" y2="12" strokeWidth="2.5" />
            <line x1="59" y1="22" x2="59" y2="12" strokeWidth="2.5" />
            <line x1="78" y1="39" x2="80" y2="30" strokeWidth="2.5" />
          </svg>
        );
      case 'canine_small':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-cyan-300 fill-cyan-500/20 stroke-[2]">
            <path d="M 34 65 C 34 56, 42 52, 50 54 C 58 52, 66 56, 66 65 C 66 75, 60 78, 50 76 C 40 78, 34 75, 34 65 Z" />
            <ellipse cx="30" cy="50" rx="5" ry="7.5" transform="rotate(-18 30 50)" />
            <ellipse cx="43" cy="36" rx="5" ry="8" transform="rotate(-5 43 36)" />
            <ellipse cx="57" cy="36" rx="5" ry="8" transform="rotate(5 57 36)" />
            <ellipse cx="70" cy="50" rx="5" ry="7.5" transform="rotate(18 70 50)" />
            <line x1="28" y1="42" x2="26" y2="34" strokeWidth="2" />
            <line x1="43" y1="28" x2="43" y2="19" strokeWidth="2" />
            <line x1="57" y1="28" x2="57" y2="19" strokeWidth="2" />
            <line x1="72" y1="42" x2="74" y2="34" strokeWidth="2" />
          </svg>
        );
      case 'cloven_large':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-emerald-400 fill-emerald-500/20 stroke-[3]">
            {/* Left Cleat */}
            <path d="M 45 20 C 35 25, 20 45, 22 75 C 24 82, 38 82, 45 78 C 47 60, 47 40, 45 20 Z" />
            {/* Right Cleat */}
            <path d="M 55 20 C 65 25, 80 45, 78 75 C 76 82, 62 82, 55 78 C 53 60, 53 40, 55 20 Z" />
            {/* Dewclaw Impressions */}
            <circle cx="28" cy="92" r="3" />
            <circle cx="72" cy="92" r="3" />
          </svg>
        );
      case 'cloven_small':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-emerald-300 fill-emerald-500/20 stroke-[2.5]">
            <path d="M 46 25 C 38 32, 28 50, 30 75 C 32 80, 42 80, 46 76 C 48 60, 48 40, 46 25 Z" />
            <path d="M 54 25 C 62 32, 72 50, 70 75 C 68 80, 58 80, 54 76 C 52 60, 52 40, 54 25 Z" />
          </svg>
        );
      case 'snake':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-amber-400 fill-none stroke-[3]">
            <path d="M 15 20 Q 35 5, 50 25 T 85 30 T 45 65 T 85 85" strokeLinecap="round" />
            <circle cx="15" cy="20" r="4" className="fill-amber-400" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-stone-400 fill-stone-500/20 stroke-[2]">
            <circle cx="50" cy="50" r="30" />
          </svg>
        );
    }
  };

  const dangerBadgeColor = (level: WildlifeSpecies['dangerLevel']) => {
    switch (level) {
      case 'EXTREME':
        return 'bg-red-950 text-red-400 border-red-700 shadow-[0_0_8px_#ef4444] animate-pulse';
      case 'HIGH':
        return 'bg-amber-950 text-amber-400 border-amber-700';
      case 'MODERATE':
        return 'bg-yellow-950 text-yellow-300 border-yellow-700';
      case 'CAUTION':
        return 'bg-cyan-950 text-cyan-300 border-cyan-700';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="space-y-2.5 font-mono text-xs select-none">
      {/* Top Controls: Search Bar & On-Screen Ruler Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900/90 p-2 rounded-xl border border-stone-800">
        <div className="flex-1 min-w-[180px] relative flex items-center">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5" />
          <input
            id="wildlife-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, bears, cougar, toes..."
            className="w-full pl-8 pr-3 py-1 bg-stone-950 rounded-lg text-[11px] text-emerald-300 placeholder-stone-600 border border-stone-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Digital Screen Caliper / Ruler Button */}
        <button
          id="toggle-screen-ruler-btn"
          onClick={() => setShowRuler(!showRuler)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition border ${
            showRuler
              ? 'bg-amber-500 text-stone-950 border-amber-400'
              : 'bg-stone-850 hover:bg-stone-800 text-stone-300 border-stone-700'
          }`}
          title="Toggle 5.0 inch calibrated screen ruler for field measurement"
        >
          <Footprints className="w-3.5 h-3.5 text-amber-400" />
          <span>{showRuler ? 'HIDE RULER' : 'SCREEN RULER'}</span>
        </button>
      </div>

      {/* On-Screen Calibrated Ruler (Calibrated for standard 5.0" 800x480 screen DPI) */}
      {showRuler && (
        <div className="bg-amber-950/40 border-2 border-amber-500/70 p-2 rounded-xl text-amber-300 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span>📏 FIELD PRINT CALIPER (PLACE LEAF / TRACK AGAINST SCREEN)</span>
            <span>5.0" DSI CALIBRATED</span>
          </div>
          {/* Inches Ruler Bar */}
          <div className="relative h-6 bg-stone-950 border border-amber-500/50 rounded flex items-end px-2">
            {[0, 1, 2, 3, 4, 5, 6].map((inVal) => (
              <div
                key={inVal}
                className="absolute flex flex-col items-center"
                style={{ left: `${(inVal / 6) * 94 + 3}%` }}
              >
                <div className="h-3 w-0.5 bg-amber-400" />
                <span className="text-[8px] font-mono text-amber-300 font-bold">{inVal}"</span>
              </div>
            ))}
          </div>
          {/* Centimeters Bar */}
          <div className="relative h-5 bg-stone-900 border border-stone-700 rounded flex items-end px-2">
            {[0, 2, 4, 6, 8, 10, 12, 14, 15].map((cmVal) => (
              <div
                key={cmVal}
                className="absolute flex flex-col items-center"
                style={{ left: `${(cmVal / 15) * 94 + 3}%` }}
              >
                <div className="h-2 w-0.5 bg-stone-400" />
                <span className="text-[7px] font-mono text-stone-400">{cmVal}cm</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dichotomous Key Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-stone-500 text-[9px] font-bold uppercase">FAMILY:</span>
        {[
          { id: 'all', label: 'ALL' },
          { id: 'bear', label: 'BEARS' },
          { id: 'feline', label: 'FELINE' },
          { id: 'canine', label: 'CANINE' },
          { id: 'ungulate', label: 'HOOFED' },
          { id: 'reptile', label: 'REPTILE' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-2 py-0.5 rounded border transition ${
              selectedCategory === tab.id
                ? 'bg-emerald-600 text-stone-950 font-bold border-emerald-400'
                : 'bg-stone-900 hover:bg-stone-850 text-stone-400 border-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="h-3 w-px bg-stone-800 mx-0.5 hidden sm:block" />

        <span className="text-stone-500 text-[9px] font-bold uppercase">CLAWS:</span>
        <button
          onClick={() => setClawFilter(clawFilter === 'yes' ? 'all' : 'yes')}
          className={`px-1.5 py-0.5 rounded border text-[9px] ${
            clawFilter === 'yes' ? 'bg-amber-600 text-black font-bold border-amber-400' : 'bg-stone-900 text-stone-400 border-stone-800'
          }`}
        >
          VISIBLE
        </button>
        <button
          onClick={() => setClawFilter(clawFilter === 'no' ? 'all' : 'no')}
          className={`px-1.5 py-0.5 rounded border text-[9px] ${
            clawFilter === 'no' ? 'bg-rose-600 text-white font-bold border-rose-400' : 'bg-stone-900 text-stone-400 border-stone-800'
          }`}
        >
          RETRACTED
        </button>
      </div>

      {/* Main Split Layout: Left Species List, Right Track & Encounter Blueprint */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        
        {/* Left Column: Filtered Species List (4 cols) */}
        <div className="md:col-span-5 bg-stone-900/80 border border-stone-800 rounded-xl p-2 max-h-[260px] overflow-y-auto space-y-1.5">
          <div className="text-[9px] text-stone-500 font-bold uppercase px-1 pb-1 border-b border-stone-800 flex justify-between">
            <span>MATCHING WILDLIFE ({filteredSpecies.length})</span>
            <span>SELECT TO INSPECT</span>
          </div>

          {filteredSpecies.map((species) => {
            const isSelected = species.id === activeSpecies.id;
            return (
              <button
                key={species.id}
                onClick={() => setActiveSpeciesId(species.id)}
                className={`w-full p-2 rounded-lg text-left transition flex items-center justify-between border ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-400/50'
                    : 'bg-stone-950 hover:bg-stone-850 text-stone-300 border-stone-800/80'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[11px] truncate flex items-center gap-1.5">
                    <span>{species.name}</span>
                  </div>
                  <div className="text-[9px] text-stone-400 italic truncate font-sans">
                    {species.scientificName}
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5">
                    Print: {species.trackLengthInches[0]}-{species.trackLengthInches[1]}" L × {species.trackWidthInches[0]}-{species.trackWidthInches[1]}" W
                  </div>
                </div>

                <div className="ml-2 flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${dangerBadgeColor(species.dangerLevel)}`}>
                    {species.dangerLevel}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-stone-600'}`} />
                </div>
              </button>
            );
          })}

          {filteredSpecies.length === 0 && (
            <div className="p-4 text-center text-stone-500 text-[10px]">
              No wildlife matching current track filters. Reset filters to view all.
            </div>
          )}
        </div>

        {/* Right Column: Active Species Blueprint & Emergency Encounter Action Sheet (7 cols) */}
        <div className="md:col-span-7 bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-col justify-between space-y-2">
          
          {/* Header & Mode Switcher */}
          <div>
            <div className="flex items-start justify-between pb-2 border-b border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-stone-100">{activeSpecies.name}</h3>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${dangerBadgeColor(activeSpecies.dangerLevel)}`}>
                    {activeSpecies.dangerLevel}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 italic font-sans">{activeSpecies.scientificName}</div>
              </div>

              {/* Toggle Details vs Encounter Protocol */}
              <div className="flex items-center space-x-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800 text-[10px]">
                <button
                  onClick={() => setViewMode('details')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    viewMode === 'details' ? 'bg-emerald-600 text-stone-950' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  TRACK DIAGRAM
                </button>
                <button
                  onClick={() => setViewMode('encounter')}
                  className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                    viewMode === 'encounter' ? 'bg-red-600 text-white animate-pulse' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  ENCOUNTER PROTOCOL
                </button>
              </div>
            </div>

            {/* VIEW 1: Track Diagram & Morphological Measurements */}
            {viewMode === 'details' && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-12 gap-2">
                  {/* Track Paw Silhouette Box */}
                  <div className="col-span-4 bg-stone-950 border border-stone-800 rounded-lg p-2 flex flex-col items-center justify-center">
                    <div className="w-20 h-20">
                      {renderTrackSvg(activeSpecies.trackSvgType)}
                    </div>
                    <span className="text-[8px] text-stone-500 font-mono mt-1 text-center">
                      PRINT MORPHOLOGY
                    </span>
                  </div>

                  {/* Field Specs */}
                  <div className="col-span-8 space-y-1 text-[10px]">
                    <div className="bg-stone-950/80 p-1.5 rounded border border-stone-800 flex justify-between">
                      <span className="text-stone-400">TRACK DIMENSIONS:</span>
                      <span className="font-bold text-emerald-400">
                        {activeSpecies.trackLengthInches[0]}-{activeSpecies.trackLengthInches[1]}" L × {activeSpecies.trackWidthInches[0]}-{activeSpecies.trackWidthInches[1]}" W
                      </span>
                    </div>

                    <div className="bg-stone-950/80 p-1.5 rounded border border-stone-800 flex justify-between">
                      <span className="text-stone-400">TOES & CLAW MARKS:</span>
                      <span className="font-bold text-cyan-300">
                        {typeof activeSpecies.toeCount === 'number' ? `${activeSpecies.toeCount} Toes` : activeSpecies.toeCount.toUpperCase()} • {activeSpecies.clawsVisible === true ? 'CLAWS VISIBLE' : activeSpecies.clawsVisible === false ? 'NO CLAWS (RETRACTED)' : 'SOMETIMES'}
                      </span>
                    </div>

                    <div className="bg-stone-950/80 p-1.5 rounded border border-stone-800 flex justify-between">
                      <span className="text-stone-400">STRIDE LENGTH:</span>
                      <span className="font-bold text-amber-300">
                        {activeSpecies.strideInches[0]}-{activeSpecies.strideInches[1]} inches
                      </span>
                    </div>

                    <div className="bg-stone-950/80 p-1.5 rounded border border-stone-800 flex justify-between">
                      <span className="text-stone-400">ACTIVITY WINDOW:</span>
                      <span className="font-bold text-purple-300">{activeSpecies.activeHours}</span>
                    </div>
                  </div>
                </div>

                {/* Scat & Sign Indicators */}
                <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-[10px] space-y-1">
                  <div>
                    <span className="text-amber-400 font-bold">SCAT INDICATORS: </span>
                    <span className="text-stone-300">{activeSpecies.scatDescription}</span>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold">TERRITORY SIGNS: </span>
                    <span className="text-stone-300">{activeSpecies.signDescription}</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: Emergency Encounter Action Sheet (Crucial Survival Rules) */}
            {viewMode === 'encounter' && (
              <div className="space-y-2 mt-2">
                {/* Rule Badges: Never Run, Stand Ground, Fight Back */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-bold">
                  <div className={`p-1.5 rounded border ${activeSpecies.encounterProtocol.neverRun ? 'bg-red-950 text-red-300 border-red-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>
                    {activeSpecies.encounterProtocol.neverRun ? '❌ DO NOT RUN' : '🏃 RUNNING OK'}
                  </div>
                  <div className={`p-1.5 rounded border ${activeSpecies.encounterProtocol.playDead ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-stone-900 text-stone-400 border-stone-800'}`}>
                    {activeSpecies.encounterProtocol.playDead ? '⚠️ PLAY DEAD IF ATTACKED' : '❌ NEVER PLAY DEAD'}
                  </div>
                  <div className="p-1.5 rounded border bg-rose-950 text-rose-300 border-rose-800">
                    🛡️ {activeSpecies.encounterProtocol.fightBack.slice(0, 22)}...
                  </div>
                </div>

                {/* Summary Banner */}
                <div className="p-2 rounded bg-red-950/60 border border-red-800 text-red-200 text-[10px] font-bold">
                  ⚠️ {activeSpecies.encounterProtocol.summary}
                </div>

                {/* Step-by-Step Encounter Protocol List */}
                <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 space-y-1 text-[10px]">
                  {activeSpecies.encounterProtocol.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-stone-200">
                      <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick AI Advice Grounding Link */}
          {onSelectSpeciesForPrompt && (
            <div className="pt-2 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => onSelectSpeciesForPrompt(activeSpecies.name)}
                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition"
              >
                <span>CONSULT ASPEN AI ON {activeSpecies.name.toUpperCase()}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
