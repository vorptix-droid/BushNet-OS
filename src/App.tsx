import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FirstBootModal } from './components/FirstBootModal';
import { KeypadShieldSimulator } from './components/KeypadShieldSimulator';
import { HardwareTelemetryStudio } from './components/HardwareTelemetryStudio';
import { PiTerminalChat } from './components/PiTerminalChat';
import { SurvivalManager } from './components/SurvivalManager';
import { Pi5SystemMonitor } from './components/Pi5SystemMonitor';
import { RagKnowledgeBase } from './components/RagKnowledgeBase';
import { ExportCodeModal } from './components/ExportCodeModal';
import { DeploymentDownloadsPage } from './components/DeploymentDownloadsPage';
import { WeatherAnalyticsDashboard } from './components/WeatherAnalyticsDashboard';
import { BushNetHandheldOS } from './components/BushNetHandheldOS';

import {
  INITIAL_USER_PROFILE,
  INITIAL_MEDICAL_CONDITIONS,
  INITIAL_SHELTERS,
  INITIAL_FOOD_STORAGE,
  INITIAL_GEAR,
  INITIAL_SENSOR_TELEMETRY,
} from './data/initialState';

import { UserProfile, MedicalCondition, ShelterItem, FoodItem, GearItem, SensorTelemetry, ModelSelection } from './types';

export default function App() {
  // Main Application State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('aspen_user_profile');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>(() => {
    const saved = localStorage.getItem('aspen_medical_conditions');
    return saved ? JSON.parse(saved) : INITIAL_MEDICAL_CONDITIONS;
  });

  const [shelters, setShelters] = useState<ShelterItem[]>(() => {
    const saved = localStorage.getItem('aspen_shelters');
    return saved ? JSON.parse(saved) : INITIAL_SHELTERS;
  });

  const [food, setFood] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('aspen_food');
    return saved ? JSON.parse(saved) : INITIAL_FOOD_STORAGE;
  });

  const [gear, setGear] = useState<GearItem[]>(() => {
    const saved = localStorage.getItem('aspen_gear');
    return saved ? JSON.parse(saved) : INITIAL_GEAR;
  });

  const [telemetry, setTelemetry] = useState<SensorTelemetry>(INITIAL_SENSOR_TELEMETRY);

  const [modelPreference, setModelPreference] = useState<ModelSelection>('auto');
  const [activeModel, setActiveModel] = useState<'qwen-0.5b' | 'qwen-1.5b'>('qwen-0.5b');
  const [isAiPowered, setIsAiPowered] = useState<boolean>(true);

  const [activePage, setActivePage] = useState<'handheld' | 'simulator' | 'weather' | 'downloads'>('handheld');

  const [lcdOverride, setLcdOverride] = useState<{ line1: string; line2: string } | null>(null);

  // Modals state
  const [isFirstBootOpen, setIsFirstBootOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('aspen_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('aspen_medical_conditions', JSON.stringify(medicalConditions));
  }, [medicalConditions]);

  useEffect(() => {
    localStorage.setItem('aspen_shelters', JSON.stringify(shelters));
  }, [shelters]);

  useEffect(() => {
    localStorage.setItem('aspen_food', JSON.stringify(food));
  }, [food]);

  useEffect(() => {
    localStorage.setItem('aspen_gear', JSON.stringify(gear));
  }, [gear]);

  // Model resolution effect
  useEffect(() => {
    if (modelPreference === 'qwen-0.5b') setActiveModel('qwen-0.5b');
    else if (modelPreference === 'qwen-1.5b') setActiveModel('qwen-1.5b');
    else {
      // Auto mode: Emergency or high telemetry triggers 1.5B
      if (telemetry.emergencyActive || telemetry.pressureTrend.includes('Storm')) {
        setActiveModel('qwen-1.5b');
      } else {
        setActiveModel('qwen-0.5b');
      }
    }
  }, [modelPreference, telemetry.emergencyActive, telemetry.pressureTrend]);

  // Handle telemetry updates
  const handleUpdateTelemetry = (updated: Partial<SensorTelemetry>) => {
    setTelemetry((prev) => ({ ...prev, ...updated }));
  };

  const handleToggleEmergency = () => {
    setTelemetry((prev) => {
      const nextEmergency = !prev.emergencyActive;
      if (nextEmergency) {
        setLcdOverride({ line1: '⚠️ EMERGENCY SOS', line2: 'PIN 9 TRIGGERED' });
      } else {
        setLcdOverride(null);
      }
      return { ...prev, emergencyActive: nextEmergency };
    });
  };

  const handleToggleAiPower = () => {
    setIsAiPowered((prev) => !prev);
  };

  const handleUpdateFood = (updatedFood: FoodItem[]) => {
    setFood(updatedFood);
  };

  const handleUpdateGear = (updatedGear: GearItem[]) => {
    setGear(updatedGear);
  };

  const handleAddGearItem = (newItem: GearItem) => {
    setGear((prev) => {
      if (prev.some((g) => g.name.toLowerCase() === newItem.name.toLowerCase())) {
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const handleSaveProfile = (updatedProfile: UserProfile, updatedMedical: MedicalCondition[]) => {
    setUserProfile(updatedProfile);
    setMedicalConditions(updatedMedical);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-900 selection:text-emerald-200 pb-16">
      
      {/* Top Header */}
      <Header
        userProfile={userProfile}
        telemetry={telemetry}
        modelPreference={modelPreference}
        activeModel={activeModel}
        isAiPowered={isAiPowered}
        activePage={activePage}
        onSelectPage={setActivePage}
        onOpenFirstBoot={() => setIsFirstBootOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onToggleEmergency={handleToggleEmergency}
        onToggleAiPower={handleToggleAiPower}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {activePage === 'handheld' ? (
          <div className="space-y-6">
            <BushNetHandheldOS
              userProfile={userProfile}
              telemetry={telemetry}
              shelters={shelters}
              food={food}
              gear={gear}
              medical={medicalConditions}
              modelPreference={modelPreference}
              activeModel={activeModel}
              isAiPowered={isAiPowered}
              onUpdateTelemetry={handleUpdateTelemetry}
              onToggleEmergency={handleToggleEmergency}
              onToggleAiPower={handleToggleAiPower}
              onUpdateFood={handleUpdateFood}
              onUpdateGear={handleUpdateGear}
            />

            {/* Quick Live Telemetry Controls below the handheld device for easy testing */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-300">
                <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <span>🎛️</span> QUICK SENSOR INJECTION FOR HANDHELD OS:
                </span>
                <span className="text-slate-500">Updates the 3.5" screen in real-time</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* BMP180 Pressure Slider */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>BMP180 Pressure</span>
                    <span className="text-cyan-400 font-bold">{telemetry.bmpPressure} hPa</span>
                  </div>
                  <input
                    type="range"
                    min="980"
                    max="1035"
                    step="0.5"
                    value={telemetry.bmpPressure}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value);
                      const trend = p < 1005 ? 'Rapid Drop (Storm Alert)' : p > 1018 ? 'Rising' : 'Stable';
                      handleUpdateTelemetry({ bmpPressure: p, pressureTrend: trend });
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Ambient Temp Slider */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Air Temp (DHT11)</span>
                    <span className="text-amber-400 font-bold">{telemetry.dhtTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="45"
                    step="0.5"
                    value={telemetry.dhtTemp}
                    onChange={(e) => handleUpdateTelemetry({ dhtTemp: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* GPS Heading Angle */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Compass Heading</span>
                    <span className="text-emerald-400 font-bold">{telemetry.headingDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="5"
                    value={telemetry.headingDeg}
                    onChange={(e) => handleUpdateTelemetry({ headingDeg: parseInt(e.target.value) })}
                    className="w-full accent-emerald-400"
                  />
                </div>

                {/* Water Probe Temp */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Probe Temp (KY-001)</span>
                    <span className="text-blue-400 font-bold">{telemetry.kyTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={telemetry.kyTemp}
                    onChange={(e) => handleUpdateTelemetry({ kyTemp: parseFloat(e.target.value) })}
                    className="w-full accent-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activePage === 'downloads' ? (
          <DeploymentDownloadsPage />
        ) : activePage === 'weather' ? (
          <div className="space-y-6">
            <WeatherAnalyticsDashboard telemetry={telemetry} />
            <HardwareTelemetryStudio
              telemetry={telemetry}
              isAiPowered={isAiPowered}
              onUpdateTelemetry={handleUpdateTelemetry}
              onToggleEmergency={handleToggleEmergency}
              onToggleAiPower={handleToggleAiPower}
            />
          </div>
        ) : (
          <>
            {/* Top Grid: Raspberry Pi Connect CLI Terminal + Arduino Keypad Shield Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (7 cols): Terminal CLI Chat with ASPEN */}
              <div className="lg:col-span-7">
                <PiTerminalChat
                  userProfile={userProfile}
                  telemetry={telemetry}
                  shelters={shelters}
                  food={food}
                  gear={gear}
                  medical={medicalConditions}
                  modelPreference={modelPreference}
                  activeModel={activeModel}
                  isAiPowered={isAiPowered}
                  onSelectModel={setModelPreference}
                  onLcdUpdate={(lcd) => setLcdOverride(lcd)}
                  onToggleAiPower={handleToggleAiPower}
                  onAddGearItem={handleAddGearItem}
                  onUpdateShelters={setShelters}
                  onUpdateFood={setFood}
                  onUpdateTelemetry={handleUpdateTelemetry}
                />
              </div>

              {/* Right Column (5 cols): Arduino 16x2 Keypad Shield Simulator & Hardware Controls */}
              <div className="lg:col-span-5 space-y-6">
                <KeypadShieldSimulator
                  telemetry={telemetry}
                  userProfile={userProfile}
                  shelters={shelters}
                  food={food}
                  modelPreference={modelPreference}
                  activeModel={activeModel}
                  lcdOverride={lcdOverride}
                  onSelectModel={setModelPreference}
                  onToggleEmergency={handleToggleEmergency}
                />

                <Pi5SystemMonitor
                  modelPreference={modelPreference}
                  activeModel={activeModel}
                  isAiPowered={isAiPowered}
                  cpuTemp={telemetry.emergencyActive ? 64.2 : 48.5}
                  onSelectModel={setModelPreference}
                  onToggleAiPower={handleToggleAiPower}
                />
              </div>

            </div>

            {/* Middle Section: Full Hardware & Sensor Telemetry Studio */}
            <HardwareTelemetryStudio
              telemetry={telemetry}
              isAiPowered={isAiPowered}
              onUpdateTelemetry={handleUpdateTelemetry}
              onToggleEmergency={handleToggleEmergency}
              onToggleAiPower={handleToggleAiPower}
            />

            {/* Offline Vector RAG Knowledge Base Engine */}
            <RagKnowledgeBase />

            {/* Bottom Section: Survival Resource Manager (Shelters, Food, Gear, Medical Profile) */}
            <SurvivalManager
              userProfile={userProfile}
              shelters={shelters}
              food={food}
              gear={gear}
              medical={medicalConditions}
              waterSupplyLiters={telemetry.waterSupplyLiters}
              onUpdateShelters={setShelters}
              onUpdateFood={setFood}
              onUpdateGear={setGear}
              onUpdateMedical={setMedicalConditions}
            />
          </>
        )}

      </main>

      {/* First Boot & Profile Setup Modal */}
      <FirstBootModal
        isOpen={isFirstBootOpen}
        userProfile={userProfile}
        medicalConditions={medicalConditions}
        onSave={handleSaveProfile}
        onClose={() => setIsFirstBootOpen(false)}
      />

      {/* Export Deployment Code Modal */}
      <ExportCodeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

    </div>
  );
}
