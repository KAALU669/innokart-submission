// Sample data for demo
const inventions = [
  {
    id: "sunslate-v2",
    name: "SunSlate v2",
    category: "Solar Tech",
    price: 2499,
    stock: 4,
    maker: "Arjun Verma",
    makerAge: 20,
    tags: ["solar", "portable", "clean-energy", "bamboo", "outdoor"],
    problem: "Commercial portable solar panels are fragile, non-repairable, and degrade rapidly under hot weather.",
    solution: "A foldable dual-panel solar harvester enclosed in a copper heat-sink chassis with an open-source charge controller.",
    howItWorks: [
      "Monocrystalline cells capture ambient sunlight and convert it to raw direct current.",
      "An integrated MPPT circuit steps down voltage and balances power delivery to dual USB-C ports.",
      "An internal buffer cell stabilizes transient cloud shading to maintain continuous fast charging."
    ],
    components: [
      "Monocrystalline Solar Cells",
      "Pure Copper Frame",
      "18650 Buffer Cells",
      "Custom MPPT PCB",
      "Carbonized Bamboo Backing"
    ],
    buildDays: 18,
    recycledPercent: 45,
    specs: [
      { label: "Solar Output", value: "15 W Peak" },
      { label: "Buffer Battery", value: "3,400 mAh" },
      { label: "Output Ports", value: "Dual USB-C 5V/3A" },
      { label: "Folded Size", value: "180 × 110 × 24 mm" }
    ],
    parts: [
      {
        name: "front glass with solar cells",
        role: "Captures ambient sunlight and protects fragile silicon wafers from moisture and mechanical impact.",
        source: "Cut from discarded industrial glass samples and A-grade solar wafer offcuts.",
        costInr: 620,
        layer: 0
      },
      {
        name: "copper frame",
        role: "Provides structural rigidity while acting as a passive heat spreader for the solar cells.",
        source: "Bent from recycled plumbing copper pipes, hand-buffed with beeswax.",
        costInr: 340,
        layer: 1
      },
      {
        name: "battery pack",
        role: "Stores buffer energy to ensure stable current during intermittent cloud cover.",
        source: "Tested and capacity-matched 18650 cells recovered from decommissioned EV battery modules.",
        costInr: 280,
        layer: 2
      },
      {
        name: "controller board",
        role: "Regulates charge voltages using an open-source buck converter circuit.",
        source: "Hand-soldered on custom etched FR-4 PCB with recycled SMD inductors.",
        costInr: 310,
        layer: 3
      },
      {
        name: "bamboo back panel",
        role: "Insulates internal electronics and offers lightweight shock resistance.",
        source: "Reclaimed offcuts from a local bamboo furniture workshop in Bhopal.",
        costInr: 150,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-SS2-0031",
      builtOn: "2026-09-14",
      tests: [
        { label: "Output under full sun", value: "5.1 W / 1.02 A", pass: true },
        { label: "Thermal dissipation at 45°C", value: "Delta T < 8.4°C", pass: true },
        { label: "Drop test from 1.2 m", value: "Zero delamination", pass: true }
      ]
    }
  },
  {
    id: "root-buddy",
    name: "Root Buddy",
    category: "Agritech",
    price: 899,
    stock: 8,
    maker: "Pooja Hegde",
    makerAge: 19,
    tags: ["agritech", "sms", "sensors", "agriculture", "gsm"],
    problem: "Small pot gardeners and rural nurseries often over-water plants or miss drought stress because WiFi sensors fail outdoors.",
    solution: "An offline capacitive soil probe linked to a 2G SIM module that sends direct SMS telemetry when moisture drops.",
    howItWorks: [
      "Capacitive prongs measure dielectric permittivity without corroding in wet soil.",
      "An ultra-low-power microcontroller wakes every 3 hours to take soil temperature and hydration readings.",
      "A compact cellular modem transmits a 16-character plain SMS alert directly to the caretaker's mobile phone."
    ],
    components: [
      "Capacitive Soil Sensor PCB",
      "ATtiny1616 Microcontroller",
      "SIM800L 2G Module",
      "14500 LiFePO4 Cell",
      "3D Printed PLA Enclosure"
    ],
    buildDays: 9,
    recycledPercent: 55,
    specs: [
      { label: "Battery Life", value: "8 Months on 1 Charge" },
      { label: "Alert Channel", value: "Direct GSM SMS (No WiFi)" },
      { label: "Probe Depth", value: "120 mm Capacitive" },
      { label: "Standby Current", value: "18 uA" }
    ],
    parts: [
      {
        name: "Capacitive probe tip",
        role: "Reads dielectric permittivity of soil without exposed metal oxidation.",
        source: "Gold-plated PCB scrap from a telecommunication equipment fabricator.",
        costInr: 120,
        layer: 0
      },
      {
        name: "Microcontroller core",
        role: "Runs sleep timing logic and converts analog moisture voltage to percentages.",
        source: "Sourced from surplus factory reel leftovers.",
        costInr: 95,
        layer: 1
      },
      {
        name: "GSM cellular module",
        role: "Transmits SMS alerts across cellular base stations without internet or apps.",
        source: "Salvaged from decommissioned vehicle GPS trackers.",
        costInr: 180,
        layer: 2
      },
      {
        name: "LiFePO4 battery cell",
        role: "Provides high-cycle electrochemical stability across harsh summer temperatures.",
        source: "Certified B-grade surplus from solar lantern manufacturing.",
        costInr: 110,
        layer: 3
      },
      {
        name: "Recycled PLA housing",
        role: "Weatherproofs the electronic head against rain and sprinkler splash.",
        source: "3D printed using recycled filament made from discarded plastic bottle caps.",
        costInr: 65,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-RB1-0104",
      builtOn: "2026-09-22",
      tests: [
        { label: "Capacitive drift over 30 days", value: "< 1.2% variation", pass: true },
        { label: "SMS dispatch latency", value: "4.2 seconds on 2G", pass: true },
        { label: "IP65 seal pressure check", value: "No ingress at 0.5 bar", pass: true }
      ]
    }
  },
  {
    id: "breeze-mini",
    name: "Breeze Mini",
    category: "Clean Air",
    price: 1799,
    stock: 5,
    maker: "Devansh Nair",
    makerAge: 21,
    tags: ["clean-air", "hepa", "upcycled", "desktop", "silent"],
    problem: "Commercial room air purifiers are bulky, expensive, and use proprietary cylindrical filters that create recurring landfill waste.",
    solution: "A desktop laminar air purifier built from twin brushless PC chassis fans and a standard universal H13 flat HEPA filter sheet.",
    howItWorks: [
      "Dual low-noise ball-bearing fans pull particulate air through a washable mesh pre-filter.",
      "The pressurized air stream is forced through a replaceable medical-grade H13 HEPA core.",
      "A custom aerodynamic diffuser ejects clean, laminar air straight toward the user's breathing zone."
    ],
    components: [
      "Twin 120mm PWM Brushless Fans",
      "H13 True HEPA Filter Core",
      "PWM Speed Control Potentiometer",
      "Upcycled Acrylic Chassis",
      "USB-C 12V PD Trigger Module"
    ],
    buildDays: 12,
    recycledPercent: 68,
    specs: [
      { label: "CADR Rating", value: "85 m3/h" },
      { label: "Noise Level", value: "24 dB at Low / 38 dB at Max" },
      { label: "Power Input", value: "USB-C 12V (PD / QC)" },
      { label: "Filter Type", value: "Standard H13 Flat Pack" }
    ],
    parts: [
      {
        name: "Laminar flow grill",
        role: "Collimates the exhaust airstream into a coherent low-turbulence column.",
        source: "Laser-cut scrap acrylic from architectural signage offcuts.",
        costInr: 160,
        layer: 0
      },
      {
        name: "H13 HEPA filter matrix",
        role: "Traps 99.97% of airborne particulate matter down to 0.3 microns.",
        source: "Bulk medical cleanroom replacement rolls trimmed to desktop dimensions.",
        costInr: 320,
        layer: 1
      },
      {
        name: "Dual brushless fan assembly",
        role: "Generates high static pressure across dense filter pleats with minimal noise.",
        source: "Refurbished high-end server cooling fans tested for zero bearing wobble.",
        costInr: 290,
        layer: 2
      },
      {
        name: "PWM speed regulator",
        role: "Allows tactile dial adjustment from whisper-quiet sleep mode to rapid clearance.",
        source: "Hand-soldered potentiometer circuit using salvaged audio knobs.",
        costInr: 140,
        layer: 3
      },
      {
        name: "MDF acoustic enclosure",
        role: "Dampens mechanical vibration and securely seals air bypass gaps.",
        source: "Upcycled medium density fiberboard offcuts from a carpenter studio.",
        costInr: 110,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-BM3-0082",
      builtOn: "2026-10-02",
      tests: [
        { label: "PM2.5 reduction in 2m3 chamber", value: "99.1% in 11 minutes", pass: true },
        { label: "Noise floor at 1 meter", value: "23.8 dBA at 800 RPM", pass: true },
        { label: "Current draw at 12V", value: "0.38 A steady", pass: true }
      ]
    }
  },
  {
    id: "recell-10k",
    name: "ReCell 10K",
    category: "Energy Recovery",
    price: 1299,
    stock: 7,
    maker: "Farhan Siddiqui",
    makerAge: 22,
    tags: ["recycled", "battery", "lithium", "powerbank", "repairable"],
    problem: "Discarded laptop battery packs end up in e-waste yards even when 80% of their individual lithium cells retain pristine health.",
    solution: "A repairable 10,000 mAh power bank with transparent polycarbonate snap-shell and individually swappable battery slots.",
    howItWorks: [
      "Four tested Grade-A salvaged 18650 cells sit in compression gold-plated spring cradles without permanent spot welding.",
      "An intelligent battery management IC tracks each cell's internal impedance and balances charging individually.",
      "A two-way 22.5W fast-charge module powers modern phones via USB-C Power Delivery and QuickCharge 3.0."
    ],
    components: [
      "Four Grade-A Salvaged 18650 Cells",
      "SW6208 Fast Charge Controller IC",
      "OLED Battery Health Display",
      "Modular Spring Contacts",
      "Laser-Etched Polycarbonate Shell"
    ],
    buildDays: 14,
    recycledPercent: 78,
    specs: [
      { label: "Capacity", value: "10,000 mAh (37 Wh)" },
      { label: "Output Power", value: "22.5 W Max USB-PD" },
      { label: "Cell Health", value: "92% Average SOH" },
      { label: "Chassis Screws", value: "Standard M2.5 Hex" }
    ],
    parts: [
      {
        name: "Transparent front casing",
        role: "Protects internal components while keeping the cell health status clearly visible.",
        source: "Milled from discarded safety shield polycarbonate sheets.",
        costInr: 190,
        layer: 0
      },
      {
        name: "OLED display and control PCB",
        role: "Shows real-time cell voltage, discharge wattage, and state-of-charge.",
        source: "Custom open-hardware printed circuit board with automated SMT assembly.",
        costInr: 260,
        layer: 1
      },
      {
        name: "Gold-plated phosphor bronze springs",
        role: "Enables tool-free replacement of individual cells without spot welding.",
        source: "Fabricated from recycled copper-beryllium electrical scrap.",
        costInr: 90,
        layer: 2
      },
      {
        name: "Selected 18650 lithium cells",
        role: "Stores energy with individual cell capacity matched within 2% variance.",
        source: "Harvested from uncycled corporate laptop battery warranty returns.",
        costInr: 320,
        layer: 3
      },
      {
        name: "Recycled aluminum rear plate",
        role: "Acts as a passive heatsink for the DC-DC buck boost converter.",
        source: "Sheared from scrap offset printing plates and anodized black.",
        costInr: 80,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-RC4-0219",
      builtOn: "2026-09-28",
      tests: [
        { label: "Discharge capacity test", value: "9,840 mAh at 1A", pass: true },
        { label: "Internal resistance check", value: "< 32 mOhm per cell", pass: true },
        { label: "Thermal cutoff trigger", value: "Verified at 54°C", pass: true }
      ]
    }
  },
  {
    id: "hum-box",
    name: "Hum Box",
    category: "Acoustic Audio",
    price: 2199,
    stock: 3,
    maker: "Ananya Sen",
    makerAge: 20,
    tags: ["audio", "bluetooth", "woodworking", "acoustic", "amplifier"],
    problem: "Plastic Bluetooth speakers sound tinny, create harmonic distortion at high volumes, and end up as unrecyclable composite trash.",
    solution: "An acoustic resonance Bluetooth speaker hand-carved from seasoned mango wood scrap with a class-D analog warm amplifier.",
    howItWorks: [
      "A Bluetooth 5.1 receiver chip captures uncompressed AAC wireless audio from any phone or computer.",
      "A low-noise Class-D amplifier module drives a 2.5-inch neodymium full-range speaker driver.",
      "A tuned Helmholtz bass reflex chamber carved inside the solid mango wood naturally amplifies low frequencies."
    ],
    components: [
      "Seasoned Mango Wood Shell",
      "2.5-inch Neodymium Full-Range Driver",
      "TPA3116 Class-D Amplifier",
      "Bluetooth 5.1 Lossless Receiver",
      "2000 mAh Li-ion Battery"
    ],
    buildDays: 21,
    recycledPercent: 62,
    specs: [
      { label: "Audio Output", value: "12 W RMS Mono" },
      { label: "Frequency Response", value: "65 Hz – 18 kHz" },
      { label: "Battery Playtime", value: "14 Hours at 65% Vol" },
      { label: "Finish", value: "Natural Linseed Oil & Beeswax" }
    ],
    parts: [
      {
        name: "Woven brass speaker grill",
        role: "Shields driver cone while preserving high-frequency acoustic transparency.",
        source: "Woven from scrap brass wire retrieved from heritage instrument repairs.",
        costInr: 180,
        layer: 0
      },
      {
        name: "Neodymium full-range transducer",
        role: "Produces clean mids and articulate vocal ranges.",
        source: "Salvaged from defective high-end conference audio bars.",
        costInr: 340,
        layer: 1
      },
      {
        name: "Class-D amplifier PCB",
        role: "Delivers clean 12W output with 90% thermal efficiency.",
        source: "Assembled with low-ESR audio-grade electrolytic capacitors.",
        costInr: 280,
        layer: 2
      },
      {
        name: "Rechargeable battery module",
        role: "Powers amplifier with isolated ground to eliminate wireless hiss.",
        source: "Repurposed high-drain cordless drill battery pack cells.",
        costInr: 210,
        layer: 3
      },
      {
        name: "Carved mango wood chamber",
        role: "Functions as a natural resonance chamber eliminating cabinet vibration.",
        source: "Carved from fallen orchard mango timber discarded by fruit farmers.",
        costInr: 160,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-HB1-0047",
      builtOn: "2026-10-08",
      tests: [
        { label: "Total harmonic distortion", value: "0.14% at 1 kHz / 5W", pass: true },
        { label: "Bluetooth connection range", value: "14.5 m without dropout", pass: true },
        { label: "Continuous runtime at 70 dB", value: "15 hours 12 minutes", pass: true }
      ]
    }
  },
  {
    id: "orbit-lamp",
    name: "Orbit Lamp",
    category: "Mechanical Kinetic",
    price: 3499,
    stock: 4,
    maker: "Kavya & Rohan Patel",
    makerAge: 23,
    tags: ["kinetic", "hand-crank", "lamp", "mechanical", "emergency"],
    problem: "Emergency and field lamps rely on disposable alkaline batteries or quickly dying internal rechargeables with zero manual backup.",
    solution: "A hand-crank kinetic task lamp utilizing planetary brass gear reduction, supercapacitor storage, and warm CRI-95 LEDs.",
    howItWorks: [
      "A smooth manual fold-out crank turns a 1:48 planetary brass gearbox to spin an ultra-efficient brushless dynamo.",
      "The generated electricity charges dual 100F supercapacitors capable of over 500,000 charge cycles without degradation.",
      "A constant-current driver feeds high-CRI warm white LEDs with step-less touch dimming."
    ],
    components: [
      "Planetary Brass Gear Train",
      "3-Phase Brushless Dynamo",
      "Twin 100F 2.7V Supercapacitors",
      "High-CRI 2700K Nichia LEDs",
      "Machined Aluminum & Walnut Base"
    ],
    buildDays: 24,
    recycledPercent: 52,
    specs: [
      { label: "Cranking Ratio", value: "1 min crank = 25 min light" },
      { label: "Storage Element", value: "200 F Supercapacitor Bank" },
      { label: "Color Temperature", value: "2700 K Warm (CRI 96)" },
      { label: "Cycle Life", value: "> 500,000 Cycles" }
    ],
    parts: [
      {
        name: "Diffused borosilicate glass lens",
        role: "Softens directional LED glare into an even 120-degree reading pool.",
        source: "Re-blown from broken laboratory condenser glassware.",
        costInr: 280,
        layer: 0
      },
      {
        name: "Nichia CRI-95 LED array",
        role: "Emits color-accurate warm light without eye-fatiguing blue spikes.",
        source: "Surplus studio grade LED strips re-soldered onto copper heatsink tape.",
        costInr: 320,
        layer: 1
      },
      {
        name: "Planetary gear reduction train",
        role: "Multiplies human hand rotations 48x to spin the micro-generator at optimal speed.",
        source: "Salvaged brass clockwork gears refitted with miniature ball bearings.",
        costInr: 540,
        layer: 2
      },
      {
        name: "High-density supercapacitor bank",
        role: "Stores electrostatic charge without chemical breakdown or cold degradation.",
        source: "Recovered from discarded hybrid vehicle telemetry backup packs.",
        costInr: 410,
        layer: 3
      },
      {
        name: "Turned walnut base",
        role: "Provides stable ballast and anti-slip desktop positioning during cranking.",
        source: "Salvaged scrap from a traditional guitar luthier workshop.",
        costInr: 220,
        layer: 4
      }
    ],
    passport: {
      serial: "INK-OL2-0019",
      builtOn: "2026-10-11",
      tests: [
        { label: "Generator output at 90 RPM", value: "7.8 W continuous", pass: true },
        { label: "Supercapacitor retention", value: "91% after 72 hours", pass: true },
        { label: "Luminous output at high mode", value: "320 lumens steady", pass: true }
      ]
    }
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { inventions };
}
