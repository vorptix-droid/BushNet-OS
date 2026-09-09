export interface WildlifeSpecies {
  id: string;
  name: string;
  scientificName: string;
  category: 'bear' | 'feline' | 'canine' | 'ungulate' | 'mustelid' | 'reptile';
  dangerLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'CAUTION' | 'LOW';
  toeCount: number | 'cloven' | 'scaled';
  clawsVisible: boolean | 'sometimes';
  trackLengthInches: [number, number]; // [min, max]
  trackWidthInches: [number, number];
  strideInches: [number, number];
  scatDescription: string;
  signDescription: string;
  encounterProtocol: {
    standGround: boolean;
    makeNoise: boolean;
    fightBack: string;
    playDead: boolean;
    neverRun: boolean;
    summary: string;
    steps: string[];
  };
  identifyingFeatures: string[];
  trackSvgType: 'bear_front' | 'bear_rear' | 'feline_large' | 'feline_small' | 'canine_large' | 'canine_small' | 'cloven_large' | 'cloven_small' | 'snake' | 'mustelid';
  activeHours: 'Nocturnal' | 'Crepuscular' | 'Diurnal' | 'Cathemeral';
}

export const WILDLIFE_DATABASE: WildlifeSpecies[] = [
  {
    id: 'grizzly_bear',
    name: 'Grizzly / Brown Bear',
    scientificName: 'Ursus arctos horribilis',
    category: 'bear',
    dangerLevel: 'EXTREME',
    toeCount: 5,
    clawsVisible: true,
    trackLengthInches: [7.0, 12.0],
    trackWidthInches: [6.0, 9.5],
    strideInches: [40, 70],
    scatDescription: 'Large cylindrical piles, filled with berries, plant fibers, hair, and bone fragments.',
    signDescription: 'Claw gouges on trees up to 8+ feet high, overturned boulders, torn rotten logs.',
    encounterProtocol: {
      standGround: true,
      makeNoise: false,
      fightBack: 'Fight back ONLY if attack persists after 2 minutes or is predatory (stalking you).',
      playDead: true,
      neverRun: true,
      summary: 'DO NOT RUN. If attacked by a defensive grizzly, drop face down, interlace fingers behind neck, spread legs to prevent flipping.',
      steps: [
        'Do NOT run (they run 35+ mph; running triggers predatory chase response).',
        'Ready your bear spray: remove safety clip, hold with both hands.',
        'Speak in a calm, firm, low voice to identify yourself as human.',
        'If bear charges: deploy bear spray at 30-40 feet aimed slightly downward.',
        'If contact occurs: Drop flat on stomach, lace fingers over neck, elbow down. Use backpack as shield.',
        'Remain motionless until bear completely leaves the area.'
      ]
    },
    identifyingFeatures: [
      'Prominent shoulder hump behind neck',
      'Dished / concave facial profile',
      'Claws are long (2-4 inches), straight, and distinct in print far in front of toes',
      'Toes form a nearly straight horizontal line across top of front pad'
    ],
    trackSvgType: 'bear_front',
    activeHours: 'Cathemeral'
  },
  {
    id: 'black_bear',
    name: 'American Black Bear',
    scientificName: 'Ursus americanus',
    category: 'bear',
    dangerLevel: 'HIGH',
    toeCount: 5,
    clawsVisible: true,
    trackLengthInches: [5.0, 8.5],
    trackWidthInches: [4.0, 6.5],
    strideInches: [30, 55],
    scatDescription: 'Piles with fruit seeds, insect chitin, tubers, and grasses; typically darker than grizzly.',
    signDescription: 'Claw marks on smooth-bark trees, broken branches in berry bushes, chewed trail markers.',
    encounterProtocol: {
      standGround: true,
      makeNoise: true,
      fightBack: 'FIGHT BACK AGGRESSIVELY with rocks, sticks, trekking poles, or bare fists. Aim for eyes and snout.',
      playDead: false,
      neverRun: true,
      summary: 'NEVER PLAY DEAD WITH A BLACK BEAR. Make yourself look massive, yell loudly, and fight back vigorously if contacted.',
      steps: [
        'Stand tall: raise arms, spread jacket, group together if with others.',
        'Make aggressive, loud noises: bang metal pots, yell in a deep authoritative voice.',
        'Do NOT climb trees (black bears are expert tree climbers).',
        'Deploy bear spray if the bear closes inside 35 feet.',
        'If contacted: FIGHT BACK with everything you have. Black bear attacks are often predatory.'
      ]
    },
    identifyingFeatures: [
      'Straight facial profile from forehead to snout tip (no dished brow)',
      'No prominent shoulder hump (rump is higher than shoulders)',
      'Front claws are shorter (1-1.5 in), curved, close to toe tips in mud',
      'Front toes form a pronounced curve/arc over the palm pad'
    ],
    trackSvgType: 'bear_front',
    activeHours: 'Crepuscular'
  },
  {
    id: 'cougar',
    name: 'Cougar / Mountain Lion',
    scientificName: 'Puma concolor',
    category: 'feline',
    dangerLevel: 'EXTREME',
    toeCount: 4,
    clawsVisible: false,
    trackLengthInches: [3.0, 4.5],
    trackWidthInches: [3.2, 5.0],
    strideInches: [20, 36],
    scatDescription: 'Segmented, blunt-ended, containing deer hair, bone shards, often scraped over with dirt or pine needles.',
    signDescription: 'Caches: dead deer covered with leaves and debris; tree trunks with deep vertical claw marks.',
    encounterProtocol: {
      standGround: true,
      makeNoise: true,
      fightBack: 'FIGHT BACK IMMEDIATELY. Cougars prey on weakness; aggressive resistance drives them off.',
      playDead: false,
      neverRun: true,
      summary: 'MAINTAIN DIRECT EYE CONTACT. Never turn your back or crouch down. Speak loudly and firmly.',
      steps: [
        'NEVER turn your back, never crouch, never bend over to pick up rocks.',
        'Lock direct eye contact with the cat; show teeth and yell loudly.',
        'Raise arms and jacket above head to appear 7+ feet tall.',
        'If cat stalks or twitches tail: deploy bear spray or throw rocks at its chest.',
        'If attacked: fight aggressively. Target eyes, throat, and nose.'
      ]
    },
    identifyingFeatures: [
      'Round track profile (width usually equals or exceeds length)',
      '4 asymmetrical tear-drop shaped toes with leading toe (like human hands)',
      'Tri-lobed bottom edge of main heel pad (three distinct lobes at base, two at top)',
      'NO claw marks visible (retractable claws kept sharp)'
    ],
    trackSvgType: 'feline_large',
    activeHours: 'Nocturnal'
  },
  {
    id: 'gray_wolf',
    name: 'Gray Wolf',
    scientificName: 'Canis lupus',
    category: 'canine',
    dangerLevel: 'HIGH',
    toeCount: 4,
    clawsVisible: true,
    trackLengthInches: [4.2, 5.8],
    trackWidthInches: [3.5, 4.8],
    strideInches: [26, 42],
    scatDescription: 'Large cord-like droppings packed with ungulate hair, bone fragments, and pungent odor.',
    signDescription: 'Direct-register trotting tracks in single file; howl vocalizations at dusk and pre-dawn.',
    encounterProtocol: {
      standGround: true,
      makeNoise: true,
      fightBack: 'FIGHT BACK with sticks, bear spray, or stones. Wolves are cautious of injured prey.',
      playDead: false,
      neverRun: true,
      summary: 'Stand your ground, make aggressive noise, maintain eye contact, and back away slowly.',
      steps: [
        'Do not run; running provokes pack pursuit instinct.',
        'Stand tall, face the wolf, and maintain eye contact.',
        'Shout aggressively and throw rocks or branches.',
        'Keep children and dogs tight between adults.',
        'Back away slowly toward camp, vehicle, or open ground.'
      ]
    },
    identifyingFeatures: [
      'Much larger than coyote or domestic dog (print often exceeds 4.5 inches)',
      'Two front middle toes are tight together and project forward',
      'Blunt, thick claw punctures at the tip of all 4 toes',
      'Track line is purposeful, direct, and straight line (direct-register trotting)'
    ],
    trackSvgType: 'canine_large',
    activeHours: 'Crepuscular'
  },
  {
    id: 'coyote',
    name: 'Coyote',
    scientificName: 'Canis latrans',
    category: 'canine',
    dangerLevel: 'CAUTION',
    toeCount: 4,
    clawsVisible: true,
    trackLengthInches: [2.2, 3.2],
    trackWidthInches: [1.6, 2.4],
    strideInches: [14, 22],
    scatDescription: 'Twisted, tapered cords with rodent hair, berries, and grass.',
    signDescription: 'Yipping and howling chorus after sunset; scent-marking on elevated rocks.',
    encounterProtocol: {
      standGround: true,
      makeNoise: true,
      fightBack: 'Easily intimidated by aggressive humans. Kick or hit if an unusually bold animal approaches.',
      playDead: false,
      neverRun: true,
      summary: 'Haze the coyote: wave arms, shout, throw objects, never let them habituate to camp food.',
      steps: [
        'Haze the animal by making loud clattering noises or waving trekking poles.',
        'Secure all camp food and small pets inside tent or vehicle.',
        'Never feed or approach coyotes.'
      ]
    },
    identifyingFeatures: [
      'Compact, narrow oval print compared to round dog prints',
      'Middle two claws point inward slightly',
      'Negative space between pads forms a clear "X" pattern',
      'Tracks follow a straight line with little meandering'
    ],
    trackSvgType: 'canine_small',
    activeHours: 'Nocturnal'
  },
  {
    id: 'moose',
    name: 'Bull & Cow Moose',
    scientificName: 'Alces alces',
    category: 'ungulate',
    dangerLevel: 'EXTREME',
    toeCount: 'cloven',
    clawsVisible: 'sometimes',
    trackLengthInches: [5.0, 7.5],
    trackWidthInches: [4.0, 6.0],
    strideInches: [45, 75],
    scatDescription: 'Distinct oval woody pellets in winter; soft loose cow-pie mounds in summer aquatic feeding.',
    signDescription: 'Bark stripping on willows and aspens 6-8 feet high; deep mud wallows near bog waters.',
    encounterProtocol: {
      standGround: false,
      makeNoise: false,
      fightBack: 'If knocked down, curl into a ball, cover head and neck, do not move until moose departs.',
      playDead: true,
      neverRun: false,
      summary: 'RUN AND PUT LARGE TREES BETWEEN YOU. Moose charge to trample; they do not stalk.',
      steps: [
        'Unlike bears and cats, IT IS OKAY TO RUN from a moose.',
        'Put large trees, boulders, or vehicles between you and the animal.',
        'Watch for warning signs: ears pinned back, raised hackles, head lowered, tongue licking lips.',
        'Never get between a cow and her calf under any circumstance.',
        'If trampled: curl into a fetal ball protecting spine and skull.'
      ]
    },
    identifyingFeatures: [
      'Huge heart-shaped cloven hooves with pointed tips',
      'Dewclaws (two small rear nodules) frequently leave impressions in deep mud/snow',
      'Noticeably larger than elk or cattle tracks',
      'Deep post-hole depression due to 1,000+ lb body weight'
    ],
    trackSvgType: 'cloven_large',
    activeHours: 'Crepuscular'
  },
  {
    id: 'elk',
    name: 'Rocky Mountain Elk',
    scientificName: 'Cervus canadensis',
    category: 'ungulate',
    dangerLevel: 'CAUTION',
    toeCount: 'cloven',
    clawsVisible: false,
    trackLengthInches: [3.5, 4.8],
    trackWidthInches: [3.0, 4.2],
    strideInches: [30, 48],
    scatDescription: 'Smooth, dark, dimpled oval pellets, slightly larger than deer droppings.',
    signDescription: 'Antler rubs on saplings in autumn; bugling calls echoing in mountain meadows.',
    encounterProtocol: {
      standGround: false,
      makeNoise: false,
      fightBack: 'Protect head and neck if charged during autumn rutting season.',
      playDead: false,
      neverRun: false,
      summary: 'Keep 100+ yards distance, especially during the autumn rut or spring calving season.',
      steps: [
        'Maintain a minimum 100-yard buffer zone from bull elk with harems.',
        'Back away quietly if an elk stops grazing to stare at you.',
        'Avoid meadows during peak dawn and dusk feeding.'
      ]
    },
    identifyingFeatures: [
      'Rounded tips on cloven hooves (rounder than deer, smaller than moose)',
      'Outer hoof wall curves gently inward toward tip',
      'Hoof halves usually rest parallel to each other'
    ],
    trackSvgType: 'cloven_large',
    activeHours: 'Crepuscular'
  },
  {
    id: 'white_tailed_deer',
    name: 'White-Tailed / Mule Deer',
    scientificName: 'Odocoileus virginianus',
    category: 'ungulate',
    dangerLevel: 'LOW',
    toeCount: 'cloven',
    clawsVisible: false,
    trackLengthInches: [2.0, 3.2],
    trackWidthInches: [1.5, 2.5],
    strideInches: [16, 28],
    scatDescription: 'Small cylindrical or oval pellets in clustered piles.',
    signDescription: 'Nipped terminal buds on browse plants; scraping marks on forest floor.',
    encounterProtocol: {
      standGround: false,
      makeNoise: true,
      fightBack: 'Not dangerous unless cornered or protecting a newborn fawn.',
      playDead: false,
      neverRun: false,
      summary: 'Non-aggressive. Observe from distance; do not touch fawns left hidden in brush.',
      steps: [
        'Watch for sudden bounding across trails.',
        'Never touch solitary fawns (the mother is nearby foraging).'
      ]
    },
    identifyingFeatures: [
      'Sharp, pointed heart-shaped hoof print',
      'Narrower and more slender than elk track',
      'Prints often show split hooves when bounding or running downhill'
    ],
    trackSvgType: 'cloven_small',
    activeHours: 'Crepuscular'
  },
  {
    id: 'bobcat',
    name: 'Bobcat',
    scientificName: 'Lynx rufus',
    category: 'feline',
    dangerLevel: 'CAUTION',
    toeCount: 4,
    clawsVisible: false,
    trackLengthInches: [1.8, 2.5],
    trackWidthInches: [1.5, 2.2],
    strideInches: [10, 18],
    scatDescription: 'Dense segmented cords with rodent fur, often deposited on trail center.',
    signDescription: 'Scratch marks on fallen logs; territorial scent marking.',
    encounterProtocol: {
      standGround: true,
      makeNoise: true,
      fightBack: 'Vigorously fight back if rabid or cornered. Very rarely initiates human contact.',
      playDead: false,
      neverRun: true,
      summary: 'Shy and elusive. Make noise to encourage the cat to retreat into cover.',
      steps: [
        'Give the animal an escape route.',
        'Make noise and stand tall.',
        'Keep small children nearby.'
      ]
    },
    identifyingFeatures: [
      'Round track with 4 teardrop toes',
      'No claws visible in standard print',
      'Heel pad has two lobes on top and three lobes on bottom',
      'Noticeably smaller than cougar track (under 2.5 inches)'
    ],
    trackSvgType: 'feline_small',
    activeHours: 'Nocturnal'
  },
  {
    id: 'timber_rattlesnake',
    name: 'Timber / Western Rattlesnake',
    scientificName: 'Crotalus horridus',
    category: 'reptile',
    dangerLevel: 'EXTREME',
    toeCount: 'scaled',
    clawsVisible: false,
    trackLengthInches: [30, 60],
    trackWidthInches: [1.5, 3.0],
    strideInches: [0, 0],
    scatDescription: 'Chalky white uric acid cap with dark digested residue.',
    signDescription: 'Undulating S-curve tracks in sand or fine dirt; warning buzz rattle sound.',
    encounterProtocol: {
      standGround: true,
      makeNoise: false,
      fightBack: 'Do NOT attempt to kill or capture the snake. Retreat 10+ feet away.',
      playDead: false,
      neverRun: false,
      summary: 'FREEZE IMMEDIATELY if you hear a rattle. Locate snake with eyes, then step backward slowly.',
      steps: [
        'Freeze in place when rattle sounds to identify the snake location.',
        'Take three large steps backward out of the 6-foot strike zone.',
        'Never step over logs or into rocky crevices without inspecting first.',
        'If bitten: REMOVE rings/watches immediately, keep bite below heart, call SOS.',
        'DO NOT cut wound, do NOT suck venom, do NOT apply tourniquet or ice.'
      ]
    },
    identifyingFeatures: [
      'Broad, triangular spade-shaped head with heat-sensing pits',
      'Segmented keratin rattle on tail tip',
      'Heavy-bodied with dark chevron bands across back',
      'Elliptical vertical slit pupils'
    ],
    trackSvgType: 'snake',
    activeHours: 'Diurnal'
  }
];
