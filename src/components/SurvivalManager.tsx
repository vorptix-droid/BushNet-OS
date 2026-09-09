import React, { useState } from 'react';
import { Home, Utensils, Briefcase, HeartPulse, Plus, Trash2, Star, AlertCircle, CheckCircle, Flame, ShieldAlert, Edit2, Check, X } from 'lucide-react';
import { ShelterItem, FoodItem, GearItem, MedicalCondition, UserProfile } from '../types';

interface SurvivalManagerProps {
  userProfile: UserProfile;
  shelters: ShelterItem[];
  food: FoodItem[];
  gear: GearItem[];
  medical: MedicalCondition[];
  waterSupplyLiters: number;
  onUpdateShelters: (updated: ShelterItem[]) => void;
  onUpdateFood: (updated: FoodItem[]) => void;
  onUpdateGear: (updated: GearItem[]) => void;
  onUpdateMedical: (updated: MedicalCondition[]) => void;
}

export const SurvivalManager: React.FC<SurvivalManagerProps> = ({
  userProfile,
  shelters,
  food,
  gear,
  medical,
  waterSupplyLiters,
  onUpdateShelters,
  onUpdateFood,
  onUpdateGear,
  onUpdateMedical,
}) => {
  const [activeTab, setActiveTab] = useState<'SHELTERS' | 'FOOD' | 'GEAR' | 'MEDICAL'>('SHELTERS');

  // Editing state for shelter
  const [editingShelterId, setEditingShelterId] = useState<string | null>(null);
  const [editShName, setEditShName] = useState('');
  const [editShType, setEditShType] = useState<ShelterItem['type']>('Lean-To');
  const [editShLoc, setEditShLoc] = useState('');
  const [editShCap, setEditShCap] = useState(2);
  const [editShRating, setEditShRating] = useState(4);
  const [editShNotes, setEditShNotes] = useState('');

  // New shelter form state
  const [shName, setShName] = useState('');
  const [shType, setShType] = useState<ShelterItem['type']>('Lean-To');
  const [shCap, setShCap] = useState(2);
  const [shRating, setShRating] = useState(4);
  const [shLoc, setShLoc] = useState('East Ridge Woods');
  const [shNotes, setShNotes] = useState('');

  // New food form state
  const [fdName, setFdName] = useState('');
  const [fdCat, setFdCat] = useState<FoodItem['category']>('MRE / Ration');
  const [fdQty, setFdQty] = useState(4);
  const [fdUnit, setFdUnit] = useState('pouches');
  const [fdCal, setFdCal] = useState(2400);

  // New gear form state
  const [grName, setGrName] = useState('');
  const [grCat, setGrCat] = useState<GearItem['category']>('Cutting & Fire');
  const [grCond, setGrCond] = useState<GearItem['condition']>('Good');
  const [grWeight, setGrWeight] = useState(0.2);

  // Handlers
  const handleAddShelter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shName.trim()) return;
    const item: ShelterItem = {
      id: `sh-${Date.now()}`,
      name: shName.trim(),
      type: shType,
      capacity: Number(shCap) || 1,
      rating: Number(shRating) || 3,
      locationName: shLoc.trim() || 'Wilderness Sector',
      notes: shNotes.trim() || 'Built using surrounding natural materials.',
      buildDate: new Date().toISOString().split('T')[0],
    };
    onUpdateShelters([item, ...shelters]);
    setShName('');
    setShNotes('');
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdName.trim()) return;
    const item: FoodItem = {
      id: `fd-${Date.now()}`,
      name: fdName.trim(),
      category: fdCat,
      quantity: Number(fdQty) || 1,
      unit: fdUnit,
      totalCalories: Number(fdCal) || 1000,
      expirationDate: '2028-12-31',
    };
    onUpdateFood([item, ...food]);
    setFdName('');
  };

  const handleAddGear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grName.trim()) return;
    const item: GearItem = {
      id: `gr-${Date.now()}`,
      name: grName.trim(),
      category: grCat,
      condition: grCond,
      weightKg: Number(grWeight) || 0.1,
    };
    onUpdateGear([item, ...gear]);
    setGrName('');
  };

  // Calculations
  const totalFoodCalories = food.reduce((acc, f) => acc + (Number(f.totalCalories) || 0), 0);
  const daysOfFood = userProfile.baselineCalories ? (totalFoodCalories / userProfile.baselineCalories).toFixed(1) : '0';
  const totalGearWeight = gear.reduce((acc, g) => acc + (Number(g.weightKg) || 0), 0).toFixed(2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-5">
      
      {/* Module Title & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div>
          <h3 className="font-bold font-mono text-sm uppercase text-slate-200">
            Survival Resource & Medical Inventory Manager
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            Tracks physical shelters built, food calories, gear loadout, and medical conditions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 font-mono text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('SHELTERS')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'SHELTERS' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Shelters ({shelters.length})
          </button>
          <button
            onClick={() => setActiveTab('FOOD')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'FOOD' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" /> Food & Water
          </button>
          <button
            onClick={() => setActiveTab('GEAR')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'GEAR' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Gear ({gear.length})
          </button>
          <button
            onClick={() => setActiveTab('MEDICAL')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              activeTab === 'MEDICAL' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" /> Medical ({medical.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SHELTERS */}
      {activeTab === 'SHELTERS' && (
        <div className="space-y-4 font-mono text-xs">
          
          {/* Add Shelter Form */}
          <form onSubmit={handleAddShelter} className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-lg space-y-3">
            <div className="font-bold text-amber-400">Log New Built Shelter</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Shelter Name (e.g. Cedar Ridge Lean-To)"
                value={shName}
                onChange={(e) => setShName(e.target.value)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <select
                value={shType}
                onChange={(e) => setShType(e.target.value as any)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Lean-To">Lean-To</option>
                <option value="Debris Hut">Debris Hut</option>
                <option value="Tarp Pitch">Tarp Pitch</option>
                <option value="Snow Cave">Snow Cave</option>
                <option value="Log Shelter">Log Shelter</option>
                <option value="Natural Cave">Natural Cave</option>
                <option value="Canvas Tent">Canvas Tent</option>
              </select>
              <input
                type="text"
                placeholder="Location Description"
                value={shLoc}
                onChange={(e) => setShLoc(e.target.value)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Capacity:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={shCap}
                  onChange={(e) => setShCap(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Weather Rating (1-5):</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={shRating}
                  onChange={(e) => setShRating(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Shelter</span>
              </button>
            </div>
          </form>

          {/* Shelters Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shelters.map((item) => {
              const isEditing = editingShelterId === item.id;

              if (isEditing) {
                return (
                  <div key={item.id} className="bg-slate-800 border-2 border-amber-500/80 p-3.5 rounded-lg space-y-3 relative shadow-lg">
                    <div className="flex items-center justify-between text-amber-400 font-bold text-xs">
                      <span>Rename / Edit Shelter</span>
                      <span className="text-[10px] text-slate-400">ID: {item.id}</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Shelter Name:</label>
                        <input
                          type="text"
                          value={editShName}
                          onChange={(e) => setEditShName(e.target.value)}
                          placeholder="e.g. Eagle Peak Outpost"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Type:</label>
                          <select
                            value={editShType}
                            onChange={(e) => setEditShType(e.target.value as any)}
                            className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                          >
                            <option value="Lean-To">Lean-To</option>
                            <option value="Debris Hut">Debris Hut</option>
                            <option value="Tarp Pitch">Tarp Pitch</option>
                            <option value="Snow Cave">Snow Cave</option>
                            <option value="Log Shelter">Log Shelter</option>
                            <option value="Natural Cave">Natural Cave</option>
                            <option value="Canvas Tent">Canvas Tent</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Location:</label>
                          <input
                            type="text"
                            value={editShLoc}
                            onChange={(e) => setEditShLoc(e.target.value)}
                            className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Capacity:</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editShCap}
                            onChange={(e) => setEditShCap(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Weather Rating (1-5):</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={editShRating}
                            onChange={(e) => setEditShRating(Number(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Notes:</label>
                        <input
                          type="text"
                          value={editShNotes}
                          onChange={(e) => setEditShNotes(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                      <button
                        onClick={() => setEditingShelterId(null)}
                        className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!editShName.trim()) return;
                          const updated = shelters.map((s) =>
                            s.id === item.id
                              ? {
                                  ...s,
                                  name: editShName.trim(),
                                  type: editShType,
                                  locationName: editShLoc.trim() || s.locationName,
                                  capacity: editShCap,
                                  rating: editShRating,
                                  notes: editShNotes.trim() || s.notes,
                                }
                              : s
                          );
                          onUpdateShelters(updated);
                          setEditingShelterId(null);
                        }}
                        className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="bg-slate-800 border border-slate-700 p-3.5 rounded-lg space-y-2 relative hover:border-slate-600 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-amber-400" />
                      {item.name}
                    </span>
                    <div className="flex items-center text-amber-400 gap-0.5">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <div className="text-slate-300 space-y-1 text-xs">
                    <div>Type: <span className="text-slate-100 font-bold">{item.type}</span></div>
                    <div>Capacity: <span className="text-slate-100">{item.capacity} Person(s)</span></div>
                    <div>Location: <span className="text-slate-100">{item.locationName || `${item.locationLat?.toFixed(2)}N, ${Math.abs(item.locationLng || 0).toFixed(2)}W`}</span></div>
                    {item.locationLat && item.locationLng && (
                      <div className="text-[10px] text-cyan-400 font-mono">
                        GPS: {item.locationLat.toFixed(4)}°N, {Math.abs(item.locationLng).toFixed(4)}°W (Homing Vector Target)
                      </div>
                    )}
                    <div className="text-slate-400 italic text-[11px] mt-1">{item.notes}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-[10px] text-slate-400">
                    <span>Built: {item.buildDate}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingShelterId(item.id);
                          setEditShName(item.name);
                          setEditShType(item.type);
                          setEditShLoc(item.locationName || '');
                          setEditShCap(item.capacity);
                          setEditShRating(item.rating);
                          setEditShNotes(item.notes || '');
                        }}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition font-bold"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Rename / Edit</span>
                      </button>
                      <button
                        onClick={() => onUpdateShelters(shelters.filter((s) => s.id !== item.id))}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: FOOD & WATER */}
      {activeTab === 'FOOD' && (
        <div className="space-y-4 font-mono text-xs">
          
          {/* Summary Metric Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[10px]">TOTAL CALORIC RESERVES:</span>
              <span className="text-lg font-bold text-emerald-400">{totalFoodCalories.toLocaleString()} kcal</span>
            </div>

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[10px]">ESTIMATED RATION DAYS:</span>
              <span className="text-lg font-bold text-cyan-400">{daysOfFood} Days</span>
              <span className="text-[10px] text-slate-500 ml-1">(@{userProfile.baselineCalories || 2200} kcal/day)</span>
            </div>

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[10px]">WATER RESERVOIR:</span>
              <span className="text-lg font-bold text-sky-400">{waterSupplyLiters} Liters</span>
              <span className="text-[10px] text-slate-500 ml-1">(~{(waterSupplyLiters / 2.5).toFixed(1)} days hydration)</span>
            </div>
          </div>

          {/* Add Food Form */}
          <form onSubmit={handleAddFood} className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-lg space-y-3">
            <div className="font-bold text-emerald-400">Add Food or Water Item</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                placeholder="Item Name (e.g. MRE Pouch)"
                value={fdName}
                onChange={(e) => setFdName(e.target.value)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <select
                value={fdCat}
                onChange={(e) => setFdCat(e.target.value as any)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="MRE / Ration">MRE / Ration</option>
                <option value="Canned Goods">Canned Goods</option>
                <option value="Dehydrated">Dehydrated</option>
                <option value="Grains / Flour">Grains / Flour</option>
                <option value="Foraged / Wild">Foraged / Wild</option>
                <option value="Purified Water">Purified Water</option>
              </select>
              <input
                type="number"
                placeholder="Total Calories"
                value={fdCal}
                onChange={(e) => setFdCal(Number(e.target.value))}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </form>

          {/* Food List Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800">
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Quantity</th>
                  <th className="p-2.5">Total Kcal</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {food.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-2.5 font-bold text-slate-200">{item.name}</td>
                    <td className="p-2.5 text-slate-400">{item.category}</td>
                    <td className="p-2.5 text-slate-300">{item.quantity} {item.unit}</td>
                    <td className="p-2.5 text-emerald-400 font-bold">{item.totalCalories} kcal</td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => onUpdateFood(food.filter((f) => f.id !== item.id))}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: GEAR */}
      {activeTab === 'GEAR' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
            <div>
              <span className="text-slate-400 text-[10px]">TOTAL PACK WEIGHT:</span>
              <span className="text-lg font-bold text-cyan-400 ml-2">{totalGearWeight} kg</span>
              <span className="text-slate-400 text-[10px] ml-1">(~{(Number(totalGearWeight) * 2.20462).toFixed(1)} lbs)</span>
            </div>
            <span className="text-slate-400 text-[10px]">Items Logged: {gear.length}</span>
          </div>

          {/* Add Gear Form */}
          <form onSubmit={handleAddGear} className="bg-slate-800/50 border border-slate-700/60 p-3.5 rounded-lg space-y-3">
            <div className="font-bold text-cyan-400">Log Gear Item</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                placeholder="Gear Name (e.g. Mora Knife)"
                value={grName}
                onChange={(e) => setGrName(e.target.value)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={grCat}
                onChange={(e) => setGrCat(e.target.value as any)}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Cutting & Fire">Cutting & Fire</option>
                <option value="First Aid & Med">First Aid & Med</option>
                <option value="Navigation & Comms">Navigation & Comms</option>
                <option value="Illumination & Power">Illumination & Power</option>
                <option value="Cookware & Water">Cookware & Water</option>
                <option value="Apparel & Bedding">Apparel & Bedding</option>
              </select>
              <input
                type="number"
                step="0.05"
                placeholder="Weight (kg)"
                value={grWeight}
                onChange={(e) => setGrWeight(Number(e.target.value))}
                className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Gear</span>
              </button>
            </div>
          </form>

          {/* Gear Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {gear.map((item) => (
              <div key={item.id} className="bg-slate-800 border border-slate-700 p-3 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{item.name}</span>
                  <span className="text-cyan-400 font-bold">{item.weightKg} kg</span>
                </div>
                <div className="text-slate-400 text-[11px]">{item.category}</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[10px]">
                  <span className="text-emerald-400">Cond: {item.condition}</span>
                  <button
                    onClick={() => onUpdateGear(gear.filter((g) => g.id !== item.id))}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 4: MEDICAL CONDITIONS */}
      {activeTab === 'MEDICAL' && (
        <div className="space-y-4 font-mono text-xs">
          
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>ASPEN Medical Profile & Allergy Context</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When queries are processed, ASPEN scans these medical conditions to evaluate risks, drug interactions (e.g. Penicillin allergies), and physical exertional limits.
            </p>
          </div>

          <div className="space-y-3">
            {medical.length === 0 ? (
              <div className="p-4 bg-slate-800/40 border border-slate-800 rounded text-center text-slate-400">
                No recorded medical conditions. Use the initial boot setup or add one in profile settings.
              </div>
            ) : (
              medical.map((item) => (
                <div key={item.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 text-sm">{item.condition}</span>
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">
                      Severity: {item.severity}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">{item.notes}</p>

                  {item.treatmentNotes && (
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 text-[11px]">
                      <span className="font-bold text-emerald-400 block mb-0.5">Recommended Protocol:</span>
                      {item.treatmentNotes}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onUpdateMedical(medical.filter((m) => m.id !== item.id))}
                      className="text-red-400 hover:text-red-300 text-[10px] transition"
                    >
                      Delete Condition
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
