import React, { useState } from 'react';
import { User, Activity, AlertCircle, Plus, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { UserProfile, MedicalCondition } from '../types';

interface FirstBootModalProps {
  isOpen: boolean;
  userProfile: UserProfile;
  medicalConditions: MedicalCondition[];
  onSave: (profile: UserProfile, medical: MedicalCondition[]) => void;
  onClose: () => void;
}

export const FirstBootModal: React.FC<FirstBootModalProps> = ({
  isOpen,
  userProfile,
  medicalConditions,
  onSave,
  onClose,
}) => {
  const [profile, setProfile] = useState<UserProfile>({ ...userProfile });
  const [conditions, setConditions] = useState<MedicalCondition[]>([...medicalConditions]);

  const [newCondition, setNewCondition] = useState('');
  const [newSeverity, setNewSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical'>('Mild');
  const [newNotes, setNewNotes] = useState('');

  if (!isOpen) return null;

  const handleAddCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondition.trim()) return;

    const item: MedicalCondition = {
      id: `med-${Date.now()}`,
      condition: newCondition.trim(),
      severity: newSeverity,
      notes: newNotes.trim() || 'No specific notes recorded.',
      treatmentNotes: 'ASPEN will monitor telemetry and evaluate survival risks.'
    };

    setConditions([...conditions, item]);
    setNewCondition('');
    setNewNotes('');
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const handleQuickAddPreset = (presetName: string, severity: 'Mild' | 'Moderate' | 'Severe', notes: string) => {
    if (conditions.some((c) => c.condition.toLowerCase().includes(presetName.toLowerCase()))) return;
    setConditions([
      ...conditions,
      {
        id: `med-${Date.now()}`,
        condition: presetName,
        severity,
        notes,
      }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const height = Number(profile.height) || 175;
    const weight = Number(profile.weight) || 70;
    // Calculate estimated baseline calories
    const calculatedCalories = Math.round(weight * 24 + 400);

    onSave(
      {
        ...profile,
        height,
        weight,
        baselineCalories: calculatedCalories,
        isFirstBootCompleted: true,
      },
      conditions
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-emerald-400 uppercase tracking-wide">
                BushNet ASPEN — Initial Setup Profile
              </h2>
              <p className="text-xs text-slate-400">
                Configure local survivor parameters & medical telemetry context for Raspberry Pi 5.
              </p>
            </div>
          </div>
          {userProfile.isFirstBootCompleted && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Survivor Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. Alex Thorne"
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Gender <span className="text-emerald-400">*</span>
              </label>
              <select
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Unspecified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Height (cm) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                required
                min="100"
                max="230"
                value={profile.height}
                onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                ~{Math.floor(profile.height / 30.48)}&apos;{Math.round((profile.height % 30.48) / 2.54)}&quot;
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                Weight (kg) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                required
                min="30"
                max="250"
                value={profile.weight}
                onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                ~{Math.round(profile.weight * 2.20462)} lbs
              </span>
            </div>
          </div>

          {/* Medical Conditions & Allergies Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Medical Conditions & Allergies
              </label>
              <span className="text-xs text-slate-400 font-mono">
                ASPEN tailors medical diagnosis & treatments based on these items!
              </span>
            </div>

            {/* Existing Conditions List */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {conditions.length === 0 ? (
                <div className="p-3 bg-slate-800/40 border border-slate-800 rounded text-xs text-slate-400 text-center font-mono">
                  No medical conditions or allergies logged. Add one below if applicable.
                </div>
              ) : (
                conditions.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded bg-slate-800 border border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-200">{item.condition}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold ${
                            item.severity === 'Severe' || item.severity === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : item.severity === 'Moderate'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">{item.notes}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 font-mono self-center">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('Asthma (Exercise/Cold Induced)', 'Mild', 'Carries Albuterol inhaler. Cold damp air triggers wheezing.')}
                className="px-2 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
              >
                + Asthma
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('Penicillin Allergy', 'Severe', 'Anaphylaxis risk with Penicillin/Amoxicillin. Use Doxycycline instead.')}
                className="px-2 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
              >
                + Penicillin Allergy
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('Type 1 Diabetes', 'Moderate', 'Requires insulin regulation and stable carbohydrate intake.')}
                className="px-2 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
              >
                + Diabetes
              </button>
            </div>

            {/* Form to add custom condition */}
            <div className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-lg space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Condition / Allergy Name"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="sm:col-span-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Treatment notes, triggers, required medication..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            {userProfile.isFirstBootCompleted && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm font-mono flex items-center gap-2 shadow-lg transition"
            >
              <Check className="w-4 h-4" />
              <span>Save & Initialize ASPEN Engine</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
