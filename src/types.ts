export interface UserProfile {
  name: string;
  height: number; // in cm
  weight: number; // in kg
  gender: 'Male' | 'Female' | 'Other';
  baselineCalories: number;
  isFirstBootCompleted: boolean;
  notes?: string;
}

export interface MedicalCondition {
  id: string;
  condition: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  notes: string;
  treatmentNotes?: string;
}

export interface ShelterItem {
  id: string;
  name: string;
  type: 'Lean-To' | 'Debris Hut' | 'Tarp Pitch' | 'Snow Cave' | 'Log Shelter' | 'Natural Cave' | 'Canvas Tent';
  capacity: number;
  rating: number; // 1 to 5 stars
  locationLat?: number;
  locationLng?: number;
  locationName: string;
  notes: string;
  buildDate: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: 'MRE / Ration' | 'Canned Goods' | 'Dehydrated' | 'Grains / Flour' | 'Foraged / Wild' | 'Purified Water';
  quantity: number;
  unit: string;
  totalCalories: number;
  expirationDate: string;
  notes?: string;
}

export interface GearItem {
  id: string;
  name: string;
  category: 'Navigation & Comms' | 'First Aid & Med' | 'Cutting & Fire' | 'Illumination & Power' | 'Cookware & Water' | 'Apparel & Bedding';
  condition: 'Good' | 'Fair' | 'Worn' | 'Needs Repair';
  weightKg: number;
  notes?: string;
}

export interface SensorTelemetry {
  dhtTemp: number;       // DHT11 GPIO 4 - °C
  dhtHum: number;        // DHT11 GPIO 4 - %
  bmpPressure: number;   // BMP180 GPIO 3 I2C - hPa
  bmpAlt: number;        // BMP180 GPIO 3 I2C - meters
  pressureTrend: 'Rising' | 'Stable' | 'Falling' | 'Rapid Drop (Storm Alert)';
  kyTemp: number;        // KY-001 DS18B20 GPIO 14 - °C
  gpsLat: number;        // VK-162 USB
  gpsLng: number;        // VK-162 USB
  gpsAlt: number;        // VK-162 USB
  gpsSpeed: number;      // VK-162 USB km/h
  gpsSats: number;       // Satellites locked
  headingDeg: number;    // Digital compass / GPS track heading (0-359°)
  emergencyActive: boolean; // Pin 9 Power to Ground Button
  waterSupplyLiters: number;
  baroQnhHpa?: number;    // QNH sea-level reference pressure in hPa (standard 1013.25)
  gpsAltOffset?: number;  // Calibrated GPS elevation offset in meters
}

export type ModelSelection = 'auto' | 'qwen-0.5b' | 'qwen-1.5b';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'aspen' | 'system';
  text: string;
  timestamp: string;
  modelUsed?: string;
  ramUsage?: string;
  inferenceSpeed?: string;
  autoReasoning?: string;
  lcdLine1?: string;
  lcdLine2?: string;
  contextInjected?: string;
  ragMatches?: Array<{ source: string; title: string; category?: string }>;
}

export interface SystemMetrics {
  cpuUsagePct: number;
  cpuTempC: number;
  ramTotalMB: number;
  ramUsedMB: number;
  qwen05bRamMB: number;
  qwen15bRamMB: number;
  swapUsedMB: number;
  activeModel: 'qwen-0.5b' | 'qwen-1.5b';
  isThrottled: boolean;
}
