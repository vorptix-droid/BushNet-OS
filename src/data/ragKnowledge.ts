export interface RagDocument {
  id: string;
  source: string;
  category: 'Military Survival' | 'First Aid & Medical' | 'Weather & Meteorology' | 'Flora & Plants' | 'Fauna & Tracking' | 'Navigation & Topo' | 'Campcraft & Wood';
  title: string;
  snippet: string;
  sizeMb: number;
  tokensIndexed: number;
}

export const OFFLINE_RAG_SOURCES = [
  {
    name: "US Army FM 3-05.70 Survival Manual",
    category: "Military Survival",
    sizeMb: 20,
    snippetsCount: 1420,
    description: "Definitive survival guide covering shelters, fire craft, water procurement, land navigation, and extreme climate adaptation."
  },
  {
    name: "Canadian Wilderness & Boreal Survival Guides",
    category: "Military Survival",
    sizeMb: 85,
    snippetsCount: 3100,
    description: "Boreal forest, sub-arctic, deep snow, and seasonal marshland survival protocols tailored for North American wilderness."
  },
  {
    name: "NOAA Severe Weather & Storm Safety Manuals",
    category: "Weather & Meteorology",
    sizeMb: 120,
    snippetsCount: 2800,
    description: "Barometric trend analysis, flash floods, blizzard dynamics, atmospheric fronts, and cold surge meteorological models."
  },
  {
    name: "Wilderness Red Cross First Aid & Trauma Guide",
    category: "First Aid & Medical",
    sizeMb: 75,
    snippetsCount: 2100,
    description: "Field triage, wound debridement, fracture splinting, hypothermia treatment, anaphylaxis, and tourniquet protocols."
  },
  {
    name: "North American Flora & Plant Identification Guide",
    category: "Flora & Plants",
    sizeMb: 450,
    snippetsCount: 12500,
    description: "Edible plants, poisonous lookalikes, universal edibility tests, medicinal roots, and natural astringents."
  },
  {
    name: "Animal Tracking, Behavior & Wildlife Guides",
    category: "Fauna & Tracking",
    sizeMb: 220,
    snippetsCount: 6400,
    description: "Mammal tracks, gait patterns, scat analysis, predator avoidance (cougar, bear, wolf), and trapping mechanics."
  },
  {
    name: "USGS Topographic Map & Compass Navigation",
    category: "Navigation & Topo",
    sizeMb: 35,
    snippetsCount: 1100,
    description: "Contour line interpretation, magnetic declination adjustment, dead reckoning, and resection navigation."
  },
  {
    name: "Tree & Wood Use Field Guide",
    category: "Campcraft & Wood",
    sizeMb: 310,
    snippetsCount: 8900,
    description: "Hardwood vs softwood combustion BTU, bark cordage, bow-drill hearth selection, and pine pitch waterproofing."
  },
  {
    name: "Offline Kiwix Wilderness Wikipedia Subset",
    category: "Military Survival",
    sizeMb: 1250,
    snippetsCount: 42000,
    description: "Comprehensive 1.25 GB compressed ZIM archive of survival, chemistry, botany, and emergency medicine Wikipedia articles."
  },
  {
    name: "TruePrepper Survival PDF Library & Field Guides",
    category: "Campcraft & Wood",
    sizeMb: 180,
    snippetsCount: 4500,
    description: "Curated open survival PDF collection (https://trueprepper.com/survival-pdfs-downloads/) indexed locally on Pi 5 via pdftotext."
  }
];

export const SAMPLE_RAG_DOCUMENTS: RagDocument[] = [
  {
    id: "rag-bear-hang",
    source: "US Army FM 21-76 (Chapter 15: Food Procurement)",
    category: "Military Survival",
    title: "PCT Bear Hang & Food Bag Suspension (12-4-4 Rule)",
    snippet: "The PCT method is the backcountry standard for protecting food from bears and rodents. Suspend food at least 12 feet (4m) off the ground, 6 feet (2m) out from the trunk, and 6 feet (2m) below the branch. Thread 50ft paracord through a carabiner, hoist the food bag to the branch, tie a clove hitch around a 6-inch wooden toggle stick, and let the carabiner jam against the toggle in mid-air. Store all food, cookware, and toiletries 100 meters downwind from your shelter. Never approach or handle a live bear.",
    sizeMb: 0.18,
    tokensIndexed: 480
  },
  {
    id: "rag-trueprepper-water",
    source: "TruePrepper Survival PDF Library (Water Purification)",
    category: "Campcraft & Wood",
    title: "Pathogen Disinfection & 1-Minute Rolling Boil Standard",
    snippet: "Bring clear water to a vigorous rolling boil for 1 full minute (3 minutes at elevations above 2,000m / 6,500ft) to eliminate Cryptosporidium, Giardia, enteric bacteria, and viruses. If water is murky, pre-filter through charcoal, sand, and cloth before thermal or chemical treatment.",
    sizeMb: 0.12,
    tokensIndexed: 320
  },
  {
    id: "rag-1",
    source: "US Army FM 3-05.70 (Chapter 12: Firecraft)",
    category: "Campcraft & Wood",
    title: "Friction Fire & Ferro Rod Tinder Preparation",
    snippet: "Punk wood, birch bark shavings, and dry cedar inner fibers yield the lowest ignition energy threshold. Scrape ferro rod at a 45-degree angle directly onto tinder bundle. In wet conditions, harvest dead standing wood and carve feather sticks to expose dry heartwood.",
    sizeMb: 0.2,
    tokensIndexed: 450
  },
  {
    id: "rag-2",
    source: "Wilderness Red Cross First Aid (Section 4)",
    category: "First Aid & Medical",
    title: "Hypothermia Triage & Rewarming Protocols",
    snippet: "Do NOT rub cold extremities. Handle hypothermic patients gently to prevent cardiac arrhythmia. Apply indirect dry heat to core (axillae, groin, chest). Watch for the 'umbles' (stumbling, mumbling, fumbling). Provide warm sweet liquids only if conscious.",
    sizeMb: 0.15,
    tokensIndexed: 380
  },
  {
    id: "rag-shelter",
    source: "US Army FM 21-76 (Chapter 5: Shelters)",
    category: "Military Survival",
    title: "Debris A-Frame & Ground Conduction Barrier",
    snippet: "Ground heat loss via conduction is the fastest cause of hypothermia. Construct a sturdy ridgepole with bipod shear legs at a 45-60 degree pitch. Essential: build a raised sleeping platform or lay 1 foot (30cm) of dry pine boughs under your bed. Dig a 10cm runoff trench on the uphill side to divert ground water.",
    sizeMb: 0.22,
    tokensIndexed: 510
  },
  {
    id: "rag-fire-dakota",
    source: "US Army TC 3-21.76 Ranger Handbook (Ch 8)",
    category: "Military Survival",
    title: "Dakota Fire Hole & Concealed Smokeless Fire",
    snippet: "Dig a 1ft deep x 1ft wide fire chamber, and an angled ventilation tunnel 1ft upwind leading into the base. The chimney effect draws fresh oxygen directly into the coal bed, creating high heat combustion with virtually zero visible smoke and wind resistance.",
    sizeMb: 0.12,
    tokensIndexed: 320
  },
  {
    id: "rag-water",
    source: "TruePrepper & US Army Field Sanitation Guide",
    category: "Military Survival",
    title: "Water Disinfection & Rolling Boil Protocol",
    snippet: "Bring water to a vigorous rolling boil for 1 full minute (3 minutes above 2,000m / 6,500ft) to eliminate bacteria (E. coli), viruses, and protozoan cysts (Giardia/Cryptosporidium). Pre-filter murky water through bandana/sand/charcoal before boiling.",
    sizeMb: 0.16,
    tokensIndexed: 410
  },
  {
    id: "rag-3",
    source: "NOAA Storm & Baro Pressure Guide (Ch 3)",
    category: "Weather & Meteorology",
    title: "Barometric Surge & Arctic Cold Fronts",
    snippet: "A rapid barometric pressure rise (>3 hPa in 3 hours) accompanied by falling ambient temperature indicates an incoming cold air mass (arctic high). Flash freezing risk.",
    sizeMb: 0.3,
    tokensIndexed: 620
  },
  {
    id: "rag-4",
    source: "North American Flora Guide (Sub-Arctic)",
    category: "Flora & Plants",
    title: "Pine Needle Vitamin C Tea Extraction",
    snippet: "Eastern White Pine (Pinus strobus) needles contain 3 to 5 times more Vitamin C than oranges. Steep green needles in hot water; do NOT boil to preserve ascorbic acid.",
    sizeMb: 0.25,
    tokensIndexed: 510
  },
  {
    id: "rag-fish-baro",
    source: "Field & Stream / NOAA Freshwater Meteorology Index",
    category: "Fauna & Tracking",
    title: "Barometric Pressure Dynamics & Fish Swim-Bladder Biology",
    snippet: "Fish have gas-filled swim bladders highly sensitive to hydrostatic and barometric pressure. FALLING PRESSURE (1008-1014 hPa before cold front): Best feeding window! Invertebrates stir, swim bladders expand comfortably, fish aggressively gorge before storm. LOW PRESSURE / STORM CRASH (<1006 hPa): Fish dive deep into heavy structure, feeding drops 80%. STEADY HIGH PRESSURE (1016-1022 hPa): Clear bluebird skies, fish hold tight to cover, best at dawn/dusk with finesse baits. RAPID RISING AFTER FRONT (>1024 hPa): Fish are lethargic with swim bladder compression.",
    sizeMb: 0.35,
    tokensIndexed: 750
  },
  {
    id: "rag-fish-species-temp",
    source: "Pacific Northwest & Boreal Fisheries Emergency Guide",
    category: "Fauna & Tracking",
    title: "Key Fish Species: Ideal Water Temps & Feeding Windows",
    snippet: "• Rainbow / Cutthroat / Brook Trout: Ideal water 10-16°C (50-60°F). Lethargic >20°C. Best during morning hatch (06:00-09:00) and evening dusk (18:00-21:00). Baro 1010-1016 hPa falling.\n• Chinook / Coho / Pink Salmon: Ideal water 8-14°C (46-58°F). Moving upstream during overcast / light rain. High strike rate on overcast days, tide changes (flood tide).\n• Smallmouth / Largemouth Bass: Ideal water 18-24°C (65-75°F). Strike topwater at dawn/dusk, jigs during warm midday drop-offs.\n• Walleye & Northern Pike: Ideal water 12-18°C (55-65°F). Walleye feed aggressively in low light (tapetum lucidum eyes); Pike hunt weed lines during overcast rising/falling baro.\n• White Sturgeon: Bottom feeders, active in deep holes (8-16°C), feed on rotting salmon, roe, worms in slow currents.",
    sizeMb: 0.42,
    tokensIndexed: 880
  },
  {
    id: "rag-fish-survival-gear",
    source: "US Army FM 21-76 (Chapter 15: Primitive Fishing)",
    category: "Military Survival",
    title: "Emergency Fishing Gear, Trotlines & Fish Weirs",
    snippet: "1. Improvised Hooks: Carve bone gorge hooks (1.5 inch sharpened at both ends, tied in center with line), safety pins, or bent wire thorns.\n2. Trotline: String main cord across river eddy or bay with weighted drop lines every 2ft, baited with grubs, worms, or entrails for passive overnight calorie harvesting.\n3. Fish Weir / Tidal Trap: Construct V-shaped willow barrier pointing downstream or into tidal receding flats with a circular basket trap at apex.\n4. Night Spearing: Fish near shallows with pine-pitch or flashlight torch; spear behind gill plates.",
    sizeMb: 0.28,
    tokensIndexed: 620
  },
  {
    id: "rag-wildlife-pnw",
    source: "North American Regional Wildlife & Predator Field Manual",
    category: "Fauna & Tracking",
    title: "Regional Fauna & Dangerous Animal Protocols",
    snippet: "• Grizzly Bear (Ursus arctos): Distinct shoulder hump, dish-shaped face, long curved claws. DO NOT RUN. Avoid eye contact, back away slowly. If charged: deploy bear spray at 10m. If contact made: play dead, lie face down, interlock fingers behind neck, spread legs wide to prevent rolling.\n• Black Bear (Ursus americanus): Straight profile, no shoulder hump. Stand tall, yell loudly, wave arms, throw rocks. If attacked: FIGHT BACK with sticks/stones aimed at nose and eyes.\n• Cougar / Mountain Lion (Puma concolor): Stalks from behind. NEVER turn back or run (triggers chase reflex). Maintain direct eye contact, raise jacket over head to appear larger, speak with loud commanding voice, throw rocks.\n• Gray Wolf (Canis lupus): Pack hunters. Look big, group together, maintain eye contact, back toward shelter, build bright fire perimeter.\n• Moose (Alces alces): Extremely dangerous during autumn rut or spring calves. Can charge without warning. If charged: RUN and get behind large trees or boulders immediately (unlike bears).",
    sizeMb: 0.48,
    tokensIndexed: 940
  },
  {
    id: "rag-smallgame-traps",
    source: "US Army TC 3-21.76 Ranger Trapping Guide",
    category: "Fauna & Tracking",
    title: "Small Game Procurement (Hare, Beaver, Porcupine, Grouse)",
    snippet: "• Snowshoe Hare: Set 20-gauge brass wire snares on active runs (fist-sized loop 4 fingers above ground). Best at dusk/dawn.\n• Porcupine: Non-aggressive, slow-moving high-calorie survival food. Strike head/snout with heavy staff; roast whole over fire to burn quills before skinning.\n• Ruffed / Spruce Grouse: Perched on lower branches; easily taken with 2m snare pole (noose looped over head) or throwing stick without spooking flock.\n• Beaver: Found near dams/lodges. Rich in essential survival fat (tail is pure fat calories). High-yield meat source in emergency.",
    sizeMb: 0.3,
    tokensIndexed: 650
  },
  {
    id: "rag-aquatic-habitats",
    source: "Estuarine & Freshwater Ichthyology / Emergency Foraging Manual",
    category: "Fauna & Tracking",
    title: "Aquatic Habitat Analysis & Fish Distribution Rules",
    snippet: "• Tidal Rivers & Estuaries (Low Cover / Mud-Sand Bottom): High salinity fluctuation and open water. High probability: Striped Bass / Sea Bass (patrolling channel edges on tide swings), White/Yellow Perch, Sunfish, Smallmouth Bass (transitioning current seams). Low-to-Moderate: Chain Pickerel (if sporadic grass patches exist), Migrating Salmonids (transiting deep main channels during spawning runs/flood tides). Very Low: Brook/Rainbow Trout & Sea Trout (prefer cold upper tributaries; Sea Trout only present during brief freshwater spawning runs or cold brackish bays), Atlantic/Shortnose Sturgeon (rare/endangered bottom cruisers in deep silt channels).\n• Cold Mountain Freestone Streams (High Gradient / Boulders / Deep Pools): Very High: Rainbow, Cutthroat, Brook Trout. Low: Bass, Perch, Pike.\n• Warm Lowland Lakes & Weed Flats: High: Largemouth Bass, Northern Pike, Chain Pickerel, Bluegill/Sunfish, Carp, Bullhead Catfish.\n• Deep Boreal Glacial Lakes: High: Lake Trout, Burbot, Walleye, Cisco / Whitefish.\n• River Eddies & Current Seams: Best ambush points where slow and fast water meet; predator fish face upstream behind boulders or undercut banks waiting for drifted forage.",
    sizeMb: 0.52,
    tokensIndexed: 1100
  }
];
