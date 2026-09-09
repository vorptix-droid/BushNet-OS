import { UserProfile, MedicalCondition, ShelterItem, FoodItem, GearItem, SensorTelemetry } from '../types';

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Lachlan",
  height: 182,
  weight: 78,
  gender: "Male",
  baselineCalories: 2350,
  isFirstBootCompleted: true, // User can toggle first boot wizard or reset anytime
  notes: "Bushcraft survivalist preparing for Cascade Ridge winter trek."
};

export const INITIAL_MEDICAL_CONDITIONS: MedicalCondition[] = [
  {
    id: "med-1",
    condition: "Asthma (Mild Exercise-Induced)",
    severity: "Mild",
    notes: "Requires Albuterol HFA inhaler (in front pocket of bugout bag). Smoke, damp air, high altitude exertional distress can trigger wheezing.",
    treatmentNotes: "Inhaled Albuterol 2 puffs every 4-6 hours as needed. Sit upright, perform pursed-lip breathing."
  },
  {
    id: "med-2",
    condition: "Severe Penicillin Allergy",
    severity: "Severe",
    notes: "Anaphylaxis risk if administered Beta-lactam antibiotics. Safe alternatives: Doxycycline, Azithromycin, Ciprofloxacin.",
    treatmentNotes: "Avoid ALL Penicillins/Amoxicillin. Use EpiPen (0.3mg IM) if exposed and exhibiting hives/swelling."
  }
];

export const INITIAL_SHELTERS: ShelterItem[] = [
  {
    id: "sh-1",
    name: "Ridge Pine Lean-To",
    type: "Lean-To",
    capacity: 2,
    rating: 4,
    locationLat: 44.3812,
    locationLng: -121.5540,
    locationName: "East Ridge Pine Grove",
    notes: "Oriented southeast away from prevailing NW wind. Raised pole bed with pine bough insulation.",
    buildDate: "2026-07-28"
  },
  {
    id: "sh-2",
    name: "Creek Bed Debris Hut",
    type: "Debris Hut",
    capacity: 1,
    rating: 5,
    locationLat: 44.3850,
    locationLng: -121.5510,
    locationName: "Cascade Creek Hollow",
    notes: "3-foot thick leaf & duff thermal layer. Extremely warm; internal temp remains ~12°C above ambient night temp.",
    buildDate: "2026-07-30"
  }
];

export const INITIAL_FOOD_STORAGE: FoodItem[] = [
  {
    id: "fd-1",
    name: "Mountain House Beef Stroganoff MRE",
    category: "MRE / Ration",
    quantity: 6,
    unit: "pouches",
    totalCalories: 3600,
    expirationDate: "2036-05-15",
    notes: "Requires 500ml boiling water per pouch."
  },
  {
    id: "fd-2",
    name: "Rolled Oats & Dried Cranberries",
    category: "Grains / Flour",
    quantity: 1.5,
    unit: "kg",
    totalCalories: 5700,
    expirationDate: "2027-11-01",
    notes: "High carbohydrate energy base. Cook with boiling purified water."
  },
  {
    id: "fd-3",
    name: "High-Calorie Peanut Butter & Honey",
    category: "Canned Goods",
    quantity: 2,
    unit: "tubs (1kg)",
    totalCalories: 6200,
    expirationDate: "2027-04-20",
    notes: "Dense caloric ratio (590 kcal / 100g). Immediate energy source."
  },
  {
    id: "fd-4",
    name: "Aquatabs Water Purification Tablets",
    category: "Purified Water",
    quantity: 50,
    unit: "tablets",
    totalCalories: 0,
    expirationDate: "2031-01-10",
    notes: "1 tablet treats 1 Liter of clear water in 30 minutes."
  }
];

export const INITIAL_GEAR: GearItem[] = [
  {
    id: "gr-1",
    name: "BushNet ASPEN Pi 5 Core Node (VK-162 / Sensors)",
    category: "Navigation & Comms",
    condition: "Good",
    weightKg: 0.45,
    notes: "Raspberry Pi 5 2GB, VK-162 GPS, BMP180, DHT11, KY-001, Arduino Uno + Keypad Shield."
  },
  {
    id: "gr-2",
    name: "Mora Companion HD Carbon Knife",
    category: "Cutting & Fire",
    condition: "Good",
    weightKg: 0.15,
    notes: "90-degree spine for ferro rod striking. Kept razor sharp."
  },
  {
    id: "gr-3",
    name: "Sawyer Squeeze Micro Water Filter",
    category: "Cookware & Water",
    condition: "Good",
    weightKg: 0.09,
    notes: "0.1 micron absolute filtration. Backflushed after last use."
  },
  {
    id: "gr-4",
    name: "Wilderness Trauma First Aid Kit + Albuterol",
    category: "First Aid & Med",
    condition: "Good",
    weightKg: 0.65,
    notes: "Contains CAT Gen 7 Tourniquet, Israeli bandage, QuikClot, Albuterol Inhaler, Sterile Gauze."
  },
  {
    id: "gr-5",
    name: "SOL Emergency Bivy & Wool Blanket",
    category: "Apparel & Bedding",
    condition: "Fair",
    weightKg: 1.10,
    notes: "90% radiant heat reflection. Small tear patched with duct tape."
  }
];

export const INITIAL_SENSOR_TELEMETRY: SensorTelemetry = {
  dhtTemp: 18.5,
  dhtHum: 62,
  bmpPressure: 1014.2,
  bmpAlt: 42,
  pressureTrend: 'Stable',
  kyTemp: 16.2,
  gpsLat: 44.3824,
  gpsLng: -121.5532,
  gpsAlt: 1425,
  gpsSpeed: 0,
  gpsSats: 9,
  headingDeg: 42.0,
  emergencyActive: false,
  waterSupplyLiters: 6.5,
  baroQnhHpa: 1019.3,
  gpsAltOffset: 0
};
