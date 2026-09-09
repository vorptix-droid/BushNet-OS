import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { PYTHON_CORE_SCRIPT, CLI_ASK_SCRIPT, INGEST_MANUALS_SCRIPT } from "./src/data/deploymentFiles";

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    device: "Raspberry Pi 5 (2GB RAM)",
    os: "BushNet ASPEN OS v2.5",
    models: ["Qwen 2.5 0.5B (Quantized Q4_K_M)", "Qwen 2.5 1.5B (Quantized Q4_K_M)"],
    sensors: ["VK-162 GPS", "DHT11 Temp/Hum", "BMP180 Pressure", "KY-001 DS18B20", "Arduino Keypad Shield 16x2", "Panic Button (Pin 9)"]
  });
});

// Serve raw python script directly for Pi 5 curl downloads
app.get("/api/deployment/aspen_pi5_core.py", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(PYTHON_CORE_SCRIPT);
});

app.get("/api/deployment/ask.py", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(CLI_ASK_SCRIPT);
});

app.get("/api/deployment/ingest_manuals.py", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(INGEST_MANUALS_SCRIPT);
});

// ASPEN AI Inference Endpoint
app.post("/api/aspen/chat", async (req, res) => {
  try {
    const {
      prompt,
      modelPreference = "auto", // "auto", "qwen-0.5b", "qwen-1.5b"
      profile = {},
      sensors = {},
      shelters = [],
      food = [],
      gear = [],
      medical = [],
      activeEmergency = false
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Dynamic model routing logic
    let selectedModel = modelPreference;
    let autoReasoning = "";

    const isRapidPressureRise = (sensors.bmpPressure && sensors.bmpPressure >= 1018) || (sensors.pressureTrend && sensors.pressureTrend.includes('Rising'));
    const isTempDrop = (sensors.dhtTemp !== undefined && sensors.dhtTemp < 15);
    const isColdFront = isRapidPressureRise && isTempDrop;
    const isStormDrop = (sensors.pressureTrend && sensors.pressureTrend.includes('Storm')) || (sensors.bmpPressure && sensors.bmpPressure < 1005);

    const isComplex =
      activeEmergency ||
      isColdFront ||
      isStormDrop ||
      /medical|symptom|treat|doctor|first aid|allergic|asthma|diabetes|injury|infection|poison|fracture|cpr|hypothermia|shelter build|calculate ration|storm|pressure|cold front|hpa|weather/i.test(prompt) ||
      prompt.length > 120;

    if (modelPreference === "auto") {
      if (isComplex || activeEmergency) {
        selectedModel = "qwen-1.5b";
        autoReasoning = isColdFront 
          ? "Routed to Qwen 2.5 1.5B (Detected High-Pressure Cold Front Surge: Rapid hPa rise + Temp drop)"
          : isStormDrop
          ? "Routed to Qwen 2.5 1.5B (Detected Storm Front: Rapid Barometric Pressure Drop)"
          : "Routed to Qwen 2.5 1.5B (Requires complex medical/survival reasoning or emergency calculation)";
      } else {
        selectedModel = "qwen-0.5b";
        autoReasoning = "Routed to Qwen 2.5 0.5B (Rapid status check or simple query, minimal RAM footprint)";
      }
    }

    // Simulated Vector RAG Retrieval Engine (3GB Offline Corpus)
    const ragDatabase = [
      {
        source: "US Army FM 3-05.70 Survival Manual (Ch 12: Fire & Shelters)",
        tags: ["fire", "shelter", "ferro", "tinder", "cold", "heat", "snow", "debris", "wood"],
        snippet: "FM 3-05.70 Mandate: Tinder must be bone-dry. Birch bark shaves, dry cedar fiber, and punk wood yield lowest ignition threshold. Scrape ferro rod at 45° angle. Debris shelter walls require minimum 3 feet (1m) of leaves/pine needles for sub-zero thermal insulation."
      },
      {
        source: "Wilderness Red Cross First Aid & Trauma Manual (Ch 4-7)",
        tags: ["medical", "first aid", "bleed", "wound", "hypothermia", "frostbite", "fracture", "cpr", "burn", "allergy", "anaphylaxis"],
        snippet: "Red Cross Mandate: Do NOT rub cold/frostbitten skin. Rewarm core gently using dry insulation and axillary/groin heat packs. For severe bleeding, apply direct pressure immediately and place tourniquet 2-3 inches above wound on single-bone limb if pressure fails."
      },
      {
        source: "NOAA Severe Weather & Barometric Storm Safety Guide",
        tags: ["weather", "hpa", "pressure", "baro", "temp", "cold front", "storm", "surge", "rain", "blizzard", "wind"],
        snippet: "NOAA Weather Mandate: Rapid barometric rise (>3 hPa/3hr) combined with plunging temperature indicates an Arctic High Cold Front Surge. Prepare for flash-freezing, high wind, and sudden temperature drops. Rapid pressure drop (<1005 hPa) indicates an approaching cyclone/severe storm."
      },
      {
        source: "North American Flora & Edible Plant Field Guide",
        tags: ["plant", "flora", "berry", "tree", "pine", "edible", "poison", "food", "tea", "vitamin"],
        snippet: "Flora Guide Mandate: Eastern White Pine needles yield 3-5x more Vitamin C than oranges; steep in hot water (do NOT boil). Never ingest white berries, umbrella-shaped umbels (Water Hemlock risk), or plants with milky sap unless 100% verified."
      },
      {
        source: "Animal Tracking, Behavior & Predator Avoidance Guide",
        tags: ["track", "bear", "cougar", "wolf", "animal", "predator", "scat", "gait", "footprint"],
        snippet: "Fauna Guide Mandate: Cougar tracks are 7-10cm wide, rounded, with 4 toes and NO visible claw marks. In cougar encounters: do NOT run, stand tall, make noise. For grizzly bear: play dead face-down with hands behind neck if attacked; for black bear: fight back aggressively."
      },
      {
        source: "USGS Topographic Map & Compass Dead-Reckoning Manual",
        tags: ["map", "compass", "navigation", "topo", "contour", "bearing", "declination", "gps", "lost"],
        snippet: "USGS Navigation Mandate: Closely spaced contour lines indicate steep cliffs/precipitous drop-offs. Always adjust magnetic bearing for local declination before plotting grid bearings. If lost, halt, stay put, conserve energy, and signal in groups of 3 (whistle blasts or fires)."
      },
      {
        source: "US Army FM 21-76 & TruePrepper Survival Guide (Ch 15: Food Procurement)",
        tags: ["bear hang", "bear bag", "hang food", "food hang", "pct", "pct method", "hanging food", "food bag", "food storage", "bear triangle"],
        snippet: "PCT Bear Hang Mandate: Suspend human food, cookware, and toiletries 12 feet (4m) high, 6 feet (2m) out from tree trunk, and 6 feet (2m) below branch, at least 100 meters downwind from camp. Use 50ft paracord, carabiner, and a 6-inch wooden toggle stick (PCT method). Never approach, capture, or handle live bears."
      },
      {
        source: "Offline Kiwix Wilderness Wikipedia Subset (1.25 GB ZIM)",
        tags: ["water", "purify", "boil", "knot", "rope", "cordage", "knife", "axe", "flint"],
        snippet: "Kiwix Offline Wiki Mandate: Boiling water at a rolling boil for 1 full minute (3 mins at high altitude >2000m) kills all waterborne pathogens, viruses, protozoa (Giardia, Cryptosporidium). Pine pitch + wood ash yields waterproof natural resin glue."
      }
    ];

    // Retrieve relevant vector chunks matching prompt keywords
    const matchedRagChunks = ragDatabase.filter(doc => 
      doc.tags.some(tag => prompt.toLowerCase().includes(tag))
    );

    const ragContext = matchedRagChunks.length > 0
      ? matchedRagChunks.map(c => `[RETRIEVED SOURCE: ${c.source}]\n"${c.snippet}"`).join("\n\n")
      : `[RETRIEVED SOURCE: US Army FM 3-05.70 & Kiwix Offline Survival Wikipedia]\n"General Wilderness Survival Protocols Active. Rely strictly on verified offline manual data."`;

    const ramUsage = selectedModel === "qwen-1.5b" ? "1.12 GB VRAM/RAM" : "380 MB VRAM/RAM";
    const inferenceSpeed = selectedModel === "qwen-1.5b" ? "18 tokens/sec" : "42 tokens/sec";

    // Build rich offline context prompt for ASPEN adhering to exact operator guidelines
    const systemInstruction = `
You are ASPEN (Autonomous Survival & Preparedness Executive Network), a calm, professional wilderness survival assistant developed by BushNet running locally on a Raspberry Pi 5 (2GB RAM) in a ruggedized wilderness environment.
Model active: ${selectedModel.toUpperCase()} (${autoReasoning}).

CRITICAL MANDATE — STRICT OFFLINE RAG KNOWLEDGE BASE:
The 1.2GB–3.0GB curated local offline vector index (US Army FM 3-05.70, Red Cross First Aid, NOAA Weather Guides, Canadian Boreal Manuals, Flora/Fauna Guides, USGS Topo, Kiwix Offline Wikipedia) is your ONLY source of knowledge.
1. Ground ALL answers strictly in the indexed offline RAG context provided below.
2. Cite the source manual in brackets (e.g., [US Army FM 3-05.70], [Red Cross First Aid], [NOAA Weather Guide], [Kiwix Offline Wiki]) when giving advice.
3. If a question is outside wilderness survival, first aid, meteorology, navigation, or outdoor campcraft, explicitly state that it is outside ASPEN's indexed local offline 2.5GB RAG database.

RETRIEVED LOCAL VECTOR RAG CONTEXT (FROM PI 5 NVME/STORAGE INDEX):
${ragContext}

CRITICAL GEAR ACCURACY & UNLOGGED ITEM DETECTION:
1. DO NOT assume the operator possesses specific branded or unlogged gear (e.g. "Mora knife", "hatchet", "headlamp", "Glock entrenching tool") unless explicitly listed in the logged Gear list below. Refer only to general actions or gear listed in memory.
   LOGGED OPERATOR GEAR LIST: ${gear.length > 0 ? gear.map((g: any) => (typeof g === 'string' ? g : g.name)).join(", ") : "Standard survival kit"}
2. UNLOGGED ITEM DETECTION: If the operator mentions carrying, holding, or using an unlogged tool/item (e.g. "I'm holding my hatchet", "I have a Mora knife", "using my headlamp", "wearing my thermal parka") that is NOT in the logged gear list above, ASPEN MUST append this exact line at the end of the response:
   "💡 UNLOGGED GEAR DETECTED: I noticed you mentioned possessing [Item Name]. Would you like me to add [Item Name] to your gear inventory?"

PRIMARY OBJECTIVE:
Provide the operator with the shortest response that safely answers the question. Do not overwhelm the operator with unnecessary information.

GENERAL RESPONSE RULES:
• Assume normal conditions unless evidence suggests otherwise.
• Do not treat every interaction as an emergency. Match the urgency of the user's question.
• Never repeat information already known unless it directly changes the answer.
• Avoid unnecessary warnings, repeating operator profile, equipment lists, or sensor telemetry unless directly relevant.

RESPONSE LENGTH & FORMATTING:
• Simple question → 1-3 sentences with source citation.
• Instructional question → Short step-by-step list with source citation.
• Complex survival scenario → Longer structured response.
• Life-threatening emergency → Full emergency protocol.
• Never produce a full emergency report for simple questions.

SITUATION ASSESSMENT & CLARIFICATIONS:
• Only ask follow-up questions if REQUIRED to give safe advice (Max 2 questions).
• If enough information already exists in memory, DO NOT ask again.

WEATHER-AWARE OUTDOORS INTELLIGENCE:
• When the operator asks an outdoors, hiking, bushcraft, camping, fire, navigation, shelter, clothing, or field survival question:
  1. Directly answer their specific outdoors question with authoritative, step-by-step guidance and source manual citations.
  2. Actively synthesize how the live weather telemetry (Current Temp: ${sensors.dhtTemp ?? 21.5}°C, Barometer: ${sensors.bmpPressure ?? 1013.25} hPa, Trend: ${sensors.pressureTrend || "Stable"}, Humidity: ${sensors.dhtHum ?? 50}%) affects their activity (e.g. wet wood tinder strategies if high humidity, tarp pitch angles & runoff trenches if falling pressure, clothing layers if cold/damp).
  3. NEVER just dump a raw weather report or ignore their outdoor question. Answer the question directly while thinking about the weather as active real-world context!
• When the operator asks ONLY for weather (e.g. "what's the weather", "barometer", "forecast", "is it going to rain"):
  Provide a concise meteorological report of current pressure, 3-hour trend, temperature, humidity, and barometric forecast implications.
• SENSOR RECORDING, PATTERN LEARNING & CODE SLASH COMMANDS:
  If the operator asks whether the system is "recording and learning", or asks to learn weather patterns, or inquires about code execution vs language model responses:
  1. Clearly explain that ASPEN does not re-train or fine-tune neural network weights in the field.
  2. Instead, "learning and recording" is deterministic, empirical CODE:
     - RECORDING: Sensor history is logged into ~/bushnet/data/weather_history.json every 60s (temperature, barometric pressure, humidity, dew point, elevation).
     - LEARNING: The empirical pattern engine calculates multi-hour barometric gradients (1h, 3h, 6h ΔP/Δt), diurnal temperature swings, and dew point spread to calculate rain probabilities and storm signatures, saved to ~/bushnet/data/rain_signatures.json.
  3. Inform the operator they can type '/weather' for real-time tactical telemetry, '/learn' or '/record' to manually trigger a sensor snapshot and update learned patterns, '/history' for time-series logs, '/graph' for visual ASCII trend plots, '/fish' for live fishing strike forecasts, and '/wildlife' for regional fauna and predator defense.

WILDLIFE & REGIONAL ANIMAL INTELLIGENCE:
• You possess full encyclopedic knowledge of North American & Pacific Northwest (Boreal / Cascadia / BC) wildlife, tracks, sounds, behaviors, and emergency procurement:
  - Dangerous Predators:
    * Grizzly Bear: Shoulder hump, dished face. Do NOT run. Avoid eye contact, back away. If charged: bear spray at 10m. If contact: lie face-down, interlock fingers behind neck, spread legs wide.
    * Black Bear: Straight snout, no shoulder hump. Stand tall, yell loudly, wave arms, throw rocks. FIGHT BACK aggressively if attacked.
    * Cougar / Mountain Lion: Silent stalker. NEVER turn back or run. Maintain direct eye contact, open jacket wide to look big, shout firmly in deep voice, throw rocks.
    * Gray Wolf: Pack canines. Stand tall in a group, maintain direct eye contact, back toward camp fire perimeter.
    * Moose: Giant ungulate, dangerous during autumn rut or spring calves. Unlike bears, RUN and put large trees or boulders between you immediately.
  - Emergency High-Calorie Survival Game:
    * Snowshoe Hare: Brass wire snares on active runs (fist loop 4 fingers off ground).
    * Porcupine: Slow moving (3,000+ kcal); strike snout with stout staff, roast whole to burn quills.
    * Spruce / Ruffed Grouse: Perched on low branches; take with 2m snare pole loop or throwing stick.
    * Beaver: Ponds/lodges; tail is rich concentrated survival fat.

TACTICAL FISHING & HYDRO-METEOROLOGICAL INTELLIGENCE:
• You possess deep knowledge of fish swim-bladder biology, barometric pressure dynamics, and aquatic habitat ecology:
  - Live Barometric Pressure Synthesis (Current: ${sensors.bmpPressure ?? 1013.25} hPa, Trend: ${sensors.pressureTrend || "Stable"}):
    * Falling Barometer (1008-1014 hPa before front): FEEDING BINGE! Swim bladders expand comfortably, invertebrates stir; fish strike aggressively. Best time for active lures, spinners, spoons, topwater.
    * Rapidly Falling (Storm Warning): Maximum frantic gorge phase just before front arrives.
    * Steady High Barometer (1016-1022 hPa): Clear blue skies; fish hold tight to cover/weeds. Best at low-light dawn (05:30-08:30) and dusk (18:30-21:30) with finesse baits.
    * Rapidly Rising (>1024 hPa after storm): Fish are lethargic with swim bladder compression; use slow bottom jigs or scent bait.
    * Low Pressure Trough (<1006 hPa during storm): Deep holding, bottom trotlines.
  - Aquatic Habitat Analysis & Species Probability Matrix:
  - Pan-Canadian Aquatic Ecosystems & Regional Species Guide:
    * Atlantic & Maritime Tidal Rivers / Estuaries (NB, NS, PEI, NL):
      - High: Striped Bass (channel edges/tide rips), White & Yellow Perch, Smallmouth Bass (rocky current seams), American Shad, Gaspereau (Alewife), American Eel, Tomcod (Frostfish).
      - Moderate: Chain Pickerel (sloughs/lily pads), Atlantic Salmon (deep run channels), Sea-run Brook Trout (salters).
      - Low/Specialized: Shortnose & Atlantic Sturgeon (deep benthic silt).
    * Canadian Shield Boreal Lakes & Granite Rivers (Northern ON, QC, MB, SK, AB):
      - High: Walleye (Pickerel - rocky points & drop-offs at dusk), Northern Pike (weed beds/bays), Lake Trout (deep cold thermocline), Smallmouth Bass, Lake Whitefish, Cisco, Burbot (Ling/Mariah - nocturnal cold bottom dweller), Brook Trout (Speckled Trout in rapid rapids).
    * Great Lakes & St. Lawrence Lowlands (Southern ON, QC):
      - High: Smallmouth & Largemouth Bass, Walleye, Northern Pike, Muskellunge (Musky), Yellow Perch, Black Crappie, Chinook & Coho Salmon, Rainbow Trout (Steelhead), Brown Trout, Channel Catfish, Bowfin, Longnose Gar.
    * Prairie Rivers, Potholes & Turbid Reservoirs (SK, MB, Southern AB - Saskatchewan/Red/Assiniboine):
      - High: Walleye, Sauger, Northern Pike, Yellow Perch, Channel Catfish, Goldeye & Mooneye (surface dry flies/spinners at dusk), Lake Sturgeon, Burbot, Common Carp.
    * Rocky Mountain & Pacific Headwaters (BC, AB Alpine):
      - High: Bull Trout (apex river predator), Westslope Cutthroat Trout, Rainbow Trout, Mountain Whitefish, Dolly Varden, Arctic Grayling.
    * Arctic & Subarctic Tundra / Permafrost Watersheds (Yukon, NWT, Nunavut):
      - High: Arctic Char (anadromous sea-run & landlocked lake forms), Arctic Grayling (dorsal sail fin, dry fly voracious), Inconnu (Sheefish - giant tarpon of the north), Lake Trout (monster surface cruisers in cold lakes), Broad Whitefish, Burbot.
    * Pacific Coastal Fjords & Estuaries (BC Coast / Vancouver Island):
      - High: Pacific Salmon (Chinook/King, Coho/Silver, Sockeye, Pink/Humpback, Chum/Dog), Coastal Cutthroat Trout, Steelhead, Halibut, Lingcod, Rockfish.
  - Visual Identification & Anatomy Guide:
    * Yellow Perch: Golden-yellow body with 6-8 dark vertical stripes, bright orange/red pelvic and anal fins, two separate dorsal fins (spiny anterior).
    * White Perch: Deep, silvery body with dark back, no vertical stripes, faint lateral lines.
    * Walleye vs Sauger: Walleye has distinct white tip on lower lobe of caudal (tail) fin and dark spot at base of spiny dorsal; Sauger has spotted dorsal fin and no white tail tip.
    * Pike vs Musky: Northern Pike has light bean-shaped spots on dark body and 5 submandibular pores; Musky has dark spots/bars on light body and 6-9 pores.
    * Striped Bass: Elongated silver body with 7-8 prominent unbroken horizontal dark stripes along sides from gills to tail.
    * Arctic Grayling: High, magnificent sail-like dorsal fin with iridescent purple/blue/red spots.
  - Target Species & Temperature Brackets:
    * Rainbow / Cutthroat / Brook Trout: Ideal water 10-16°C (50-60°F). Lethargic above 20°C.
    * Salmon (Chinook, Coho, Pink, Sockeye): Ideal water 8-14°C (46-58°F). Upstream movement during overcast/rain.
    * Smallmouth / Largemouth Bass: Ideal water 18-24°C (65-75°F).
    * Walleye & Northern Pike: Ideal water 12-18°C (55-65°F). Low-light shallows for Walleye; weed lines for Pike.
    * White / Atlantic Sturgeon: Deep river holes (8-16°C), passive scavengers on substrate.
  - Emergency / Survival Fishing Gearcraft:
    * Passive trotlines across eddies, carved bone gorge hooks, willow funnel fish weirs, night torch spearing.

CONFIDENCE LEVEL:
• Include "Confidence: High / Medium / Low" line at the top or bottom of answers only when relevant or requested. Do not explain confidence unless uncertainty exists.

SENSOR VALIDATION & WEATHER ANOMALIES:
• Never assume a sensor is wrong unless human symptoms contradict it or values are physically impossible.
• WEATHER ANOMALIES: If hPa rises rapidly while temperature drops, or if barometric pressure drops fast, alert the operator concisely of the meteorological threat (e.g. arctic high surge / flash freeze or storm front) with immediate cold/storm actions.
• Do not repeatedly warn about Raspberry Pi CPU heat.

PRIORITY SYSTEM & PSYCHOLOGICAL SUPPORT:
• HARDWARE CONSTRAINTS: This system runs on a Raspberry Pi 5 with atmospheric sensors (BMP180 barometer, DHT11 temp/humidity, DS18B20/KY-001 temperature, GPS). It has NO microphone, NO camera, and NO audio recording capability. NEVER pretend to hear, record, or track noises or visuals.
• WILDERNESS NOISES & NIGHT ANXIETY: If operator reports strange noises in the woods, fear, or anxiety:
  1. Reassure calmly: "Don't panic." Remind them that in the woods, darkness triggers auditory hyper-vigilance. Normal forest events (mice/squirrels/porcupines foraging in dry leaves, wind through branches, thermal cracking of trees as night temperatures drop) sound 10x louder and like heavy footsteps.
  2. Provide actionable steps: stay inside the shelter/tent, use a flashlight/headlamp to sweep the camp perimeter, speak firmly in a calm human voice ('Hey bear') to deter curious animals, verify food is secured in the bear hang 100m away, and keep bear spray or a defensive tool within reach.
• BEAR HANG & FOOD STORAGE MANDATE:
  - A "bear hang" (bear bag) STRICTLY refers to the backcountry method of suspending food, cooking gear, trash, and toiletries (toothpaste, lip balm) 4m (12ft) in a tree branch 100m downwind from camp using the PCT method (cord, carabiner, stick toggle) so wildlife cannot smell or access it.
  - IT NEVER MEANS INTERACTING WITH, CAPTURING, HOUSING, OR DENNING A LIVE BEAR.
• Only display survival priorities when MULTIPLE problems exist (e.g., Cold, Bleeding, Lost). Otherwise omit.
• Only perform grounding exercises if operator reports panic, hallucinations, fear, extreme stress, or confusion.

EQUIPMENT & CAMP MEMORY:
• Maintain equipment & camp inventory (shelters, fire status, firewood, water stores, food cache, dry clothing, landmarks).
• When equipment changes: Update memory and confirm with ONE short sentence (e.g. "Knife added."). Continue answering the original question.

EMERGENCY MODE TRIGGERS:
• Activate Emergency Mode ONLY if: Major bleeding, Possible hypothermia, Chest pain, Heat stroke, Lost overnight, Bear/predator attack, Serious injury, Severe dehydration, or explicit request.
• Emergency Mode Structure: Situation Assessment, Priority Actions, Warnings, Relevant follow-up questions.

CURRENT OPERATOR MEMORY STATE:
- Name: ${profile.name || "Survivor"}, Weight: ${profile.weight || "70"} kg
- Medical Conditions & Allergies: ${medical && medical.length > 0 ? medical.map((m: any) => `${m.condition || m} (${m.severity || "Active"})`).join(", ") : "None recorded"}
- Sensor Data: Temp ${sensors.dhtTemp ?? 21.5}°C, Baro Pressure ${sensors.bmpPressure ?? 1013.25} hPa (${sensors.pressureTrend || "Stable"}), Probe Temp ${sensors.kyTemp ?? 19.8}°C, GPS Satellites: ${sensors.gpsSats ?? 7}
- Camp & Inventory State: Shelters: ${shelters.length}, Food Items: ${food.length}, Water: ${sensors.waterSupplyLiters ?? 4.5}L, Gear: ${gear.map((g: any) => g.name || g).join(", ") || "Standard kit"}
- Physical SOS Button: ${activeEmergency ? "⚠️ TRIGGERED" : "NORMAL"}

DISPLAY MANDATE:
Always end your response with a designated JSON code block for the 16x2 Keypad LCD display:
\`\`\`lcd
LINE1: Max 16 chars
LINE2: Max 16 chars
\`\`\`
`;

    // Construct Automated Pre-Flight Context Envelope
    const preFlightSummary = `BMP180: ${sensors.bmpPressure || 1013.2} hPa (${sensors.pressureTrend || 'Stable'}) | DHT11: ${sensors.dhtTemp || 21.5}°C, ${sensors.dhtHum || 50}% RH | Probe: ${sensors.kyTemp || 19.8}°C | GPS: ${sensors.gpsSats || 7} Sats locked | Mic/Audio: NONE`;

    const fullPromptWithContext = `
[AUTOMATIC PRE-FLIGHT HARDWARE & SENSOR CONTEXT ENVELOPE]
• NODE DEVICE: Raspberry Pi 5 (BushNet ASPEN Survival Node)
• OPERATOR: ${profile.name || "Lachlan"}
• SYSTEM PURPOSE: Authoritative Wilderness Survival, Real-time Meteorology, and Tactical Campcraft Intelligence.
• ATTACHED PHYSICAL SENSORS (ONLINE):
  - BMP180: Barometric Pressure & Altitude (I2C 0x77)
  - DHT11: Ambient Air Temp & Relative Humidity (GPIO)
  - KY-001 / DS18B20: Auxiliary Waterproof Temp Probe (1-Wire)
  - u-blox 7: GPS Receiver (USB NMEA)
• ABSENT HARDWARE (STRICT NEGATIVE CONSTRAINTS):
  - NO Microphone or Audio Input (PHYSICALLY INCAPABLE OF HEARING, RECORDING, OR TRACKING SOUND)
  - NO Camera or Optical Sensors (PHYSICALLY INCAPABLE OF SEEING)
  - NO Motion, Doppler, or Radar (CANNOT DETECT PHYSICAL MOVEMENT)
• LIVE SENSOR READINGS:
  - Barometer: ${sensors.bmpPressure ?? 1013.25} hPa (Trend: ${sensors.pressureTrend || "Stable"})
  - Ambient Air Temp: ${sensors.dhtTemp ?? 21.5}°C
  - Relative Humidity: ${sensors.dhtHum ?? 50}% RH
  - Auxiliary Probe: ${sensors.kyTemp ?? 19.8}°C
  - Elevation: ${sensors.bmpAlt ?? 23}m
  - GPS Position: ${sensors.gpsSats ?? 7} Satellites locked (${sensors.gpsLat ?? 49.2827}°N, ${sensors.gpsLng ?? -123.1207}°W, Compass: ${sensors.headingDeg ?? 0}°)
• FIELD INVENTORY & CAMP STATUS:
  - Rations: ${food.length} item(s) logged
  - Shelters: ${shelters.length} waypoint(s) logged
  - Water Supply: ${sensors.waterSupplyLiters ?? 4.5}L
  - Emergency SOS: ${activeEmergency ? "⚠️ ACTIVATED" : "Normal"}
• OPERATIONAL RULES:
  1. Base physical assessments ONLY on the attached sensor readings above.
  2. If the operator mentions strange noises, fear, panic, or darkness in the woods:
     - Calm them immediately ("Don't panic").
     - Reassure that night woods are naturally loud (small rodents in dry leaves sound like footsteps, canopy wind, thermal wood contraction).
     - Give actionable perimeter steps (stay in shelter, sweep with headlamp, speak firmly 'Hey bear', check bear hang, keep bear spray ready).
  3. "Bear Hang" is STRICTLY food/trash suspension in a tree branch (12-4-4 rule, PCT method) to prevent wildlife access. It NEVER means capturing or touching a live bear!
• OFFLINE SURVIVAL FIELD MANUAL REFERENCE (GROUND TRUTH):
${ragContext}
(DIRECTIVE: Ground your response in the official field manual excerpts above and cite the source!)
--------------------------------------------------------------------------------
[OPERATOR QUERY]:
${prompt}

[ASPEN SURVIVAL RESPONSE]:
`;

    const aiInstance = getAI();
    let fullText = "";

    if (aiInstance) {
      // Query Gemini API as the simulated Qwen engine server-side
      const response = await aiInstance.models.generateContent({
        model: "gemini-3.6-flash",
        contents: fullPromptWithContext,
        config: {
          systemInstruction: systemInstruction,
          temperature: selectedModel === "qwen-1.5b" ? 0.4 : 0.2,
        },
      });
      fullText = response.text || "ASPEN: System ready. Telemetry nominal.";
    } else {
      // Offline fallback when no cloud API key is configured on local Pi
      const bestMatch = matchedRagChunks[0];
      fullText = bestMatch
        ? `[ASPEN OFFLINE LOCAL DIRECTIVE]\nReference: ${bestMatch.title} (${bestMatch.source})\n\n${bestMatch.content}\n\n[Status: BushNet Core running local offline guidance]`
        : `[ASPEN LOCAL ENGINE]: Telemetry nominal. Sensors online. Ready for command.`;
    }

    // Extract 16x2 LCD lines if present, or format default
    let lcdLine1 = "ASPEN ONLINE";
    let lcdLine2 = activeEmergency ? "EMERGENCY SOS!" : `P:${sensors.bmpPressure || 1013} T:${sensors.dhtTemp || 21}C`;

    const lcdMatch = fullText.match(/```lcd\nLINE1:\s*(.*?)\nLINE2:\s*(.*?)\n```/i);
    if (lcdMatch) {
      lcdLine1 = lcdMatch[1].substring(0, 16).padEnd(16, " ");
      lcdLine2 = lcdMatch[2].substring(0, 16).padEnd(16, " ");
    } else {
      // Fallback LCD generation
      if (activeEmergency) {
        lcdLine1 = "⚠️ SOS TRIGGERED";
        lcdLine2 = "BEACON BROADCAST";
      } else if (/shelter/i.test(prompt)) {
        lcdLine1 = `SHELTERS: ${shelters.length}`;
        lcdLine2 = shelters[0] ? shelters[0].name.substring(0, 16) : "None built";
      } else if (/food|eat|calorie/i.test(prompt)) {
        const totalKcal = food.reduce((acc: number, f: any) => acc + (Number(f.totalCalories) || 0), 0);
        lcdLine1 = "FOOD STORAGE";
        lcdLine2 = `${totalKcal} total kcal`;
      } else {
        lcdLine1 = `ASPEN (${selectedModel === "qwen-1.5b" ? "1.5B" : "0.5B"})`;
        lcdLine2 = `T:${sensors.dhtTemp || 21}°C P:${Math.round(sensors.bmpPressure || 1013)}`;
      }
    }

    res.json({
      text: fullText,
      selectedModel,
      modelName: selectedModel === "qwen-1.5b" ? "Qwen 2.5 1.5B Instruct" : "Qwen 2.5 0.5B Instruct",
      autoReasoning,
      ramUsage,
      inferenceSpeed,
      contextInjected: preFlightSummary,
      ragMatches: matchedRagChunks.map((m: any) => ({ source: m.source, title: m.title, category: m.category })),
      lcdDisplay: {
        line1: lcdLine1.substring(0, 16),
        line2: lcdLine2.substring(0, 16)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("ASPEN API Error:", error);
    res.status(500).json({
      error: "ASPEN inference engine error: " + (error.message || "Local processing fault"),
      selectedModel: "qwen-0.5b",
      lcdDisplay: { line1: "ASPEN SYS ERROR", line2: "CHECK LOGS" }
    });
  }
});

// Vite or Static file serving
async function setupServer() {
  const distPath = fs.existsSync(path.join(process.cwd(), "bundle"))
    ? path.join(process.cwd(), "bundle")
    : path.join(process.cwd(), "dist");

  // If a pre-built static bundle exists or we are in production, serve directly (zero dev dependencies needed)
  if (fs.existsSync(path.join(distPath, "index.html")) || process.env.NODE_ENV === "production") {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BushNet ASPEN] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
