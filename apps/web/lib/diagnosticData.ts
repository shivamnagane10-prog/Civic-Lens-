export interface DefectGeometry {
  title: string;
  stat1: { label: string; value: string };
  stat2: { label: string; value: string; isAlert?: boolean };
  stat3: { label: string; value: string };
  stat4: { label: string; value: string };
  warningText: string;
}

export interface RecommendedFix {
  sopStandard: string;
  signatures: string[];
}

export interface BomItem {
  description: string;
  category: 'Material' | 'Equipment' | 'Labor';
  quantityDuration: string;
  unitRate: string;
  subtotal: string;
}

export interface DiagnosticDetail {
  category: string;
  geometry: DefectGeometry;
  engineeringFix: RecommendedFix;
  estimate: {
    inr: string;
    usd: string;
    workWindow: string;
    sla: string;
    sorYear: string;
  };
  bom: {
    rateStandard: string;
    items: BomItem[];
    contingencyRate: string;
    contingencyAmount: string;
    totalBudget: string;
  };
}

export const DIAGNOSTIC_PRESETS: Record<string, DiagnosticDetail> = {
  pothole: {
    category: 'pothole',
    geometry: {
      title: 'Severe Asphalt Pothole & Sub-base Subsidence',
      stat1: { label: 'Surface Area', value: '1.54 m²' },
      stat2: { label: 'Cavity Depth', value: '13.2 cm', isAlert: true },
      stat3: { label: 'Length × Width', value: '1.4m × 1.1m' },
      stat4: { label: 'Bitumen Volume', value: '0.203 m³' },
      warningText: 'High Risk - Potential tire blowout, axle breakage, and two-wheeler fatal skid risk.'
    },
    engineeringFix: {
      sopStandard: 'Cold-milling, aggregate base compaction, tack-coat primer, and Type-II Bituminous Hot-Mix Asphalt laying.',
      signatures: [
        'Surface Area: 1.54 m² (1.4m × 1.1m)',
        'Cavity Depth: 13.2 cm (Exceeds safety thresholds)',
        'Edge Degradation: Active structural propagation along perimeter',
        'Safety Hazard Rating: High priority for pedestrian and vehicular safety'
      ]
    },
    estimate: {
      inr: '15,107',
      usd: '174.65',
      workWindow: '4 - 6 Hours (Rapid dispatch)',
      sla: 'Immediate action recommended (Within 36 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'IRC:SP:100 Rates',
      items: [
        {
          description: 'Type-II Bituminous Hot-Mix Asphalt',
          category: 'Material',
          quantityDuration: '0.48 tonnes',
          unitRate: '₹ 6,200',
          subtotal: '₹ 2,976'
        },
        {
          description: 'Bitumen Emulsion Tack-Coat (RS-1)',
          category: 'Material',
          quantityDuration: '3.2 Liters',
          unitRate: '₹ 85',
          subtotal: '₹ 272'
        },
        {
          description: 'Graded Granular Sub-base (GSB) Aggregate',
          category: 'Material',
          quantityDuration: '0.6 tonnes',
          unitRate: '₹ 1,150',
          subtotal: '₹ 690'
        },
        {
          description: 'Walk-behind Vibratory Plate Compactor (1.5T)',
          category: 'Equipment',
          quantityDuration: '4 Hours',
          unitRate: '₹ 2,800',
          subtotal: '₹ 2,800'
        },
        {
          description: 'Concrete & Asphalt Road Saw Cutter',
          category: 'Equipment',
          quantityDuration: '2 Hours',
          unitRate: '₹ 1,600',
          subtotal: '₹ 1,600'
        },
        {
          description: 'Lead Paving Mason & Machine Operator (1 Staff)',
          category: 'Labor',
          quantityDuration: '5 Hours',
          unitRate: '-',
          subtotal: '₹ 1,500'
        },
        {
          description: 'Road Maintenance Crew (3 Staff)',
          category: 'Labor',
          quantityDuration: '5 Hours',
          unitRate: '-',
          subtotal: '₹ 2,700'
        },
        {
          description: 'Traffic Marshall & Safety Zone Setup (1 Staff)',
          category: 'Labor',
          quantityDuration: '5 Hours',
          unitRate: '-',
          subtotal: '₹ 950'
        }
      ],
      contingencyRate: 'Municipal Contingency & Supervision (12%):',
      contingencyAmount: '₹ 1,619',
      totalBudget: '₹ 15,107'
    }
  },

  streetlight: {
    category: 'streetlight',
    geometry: {
      title: 'Damaged LED Luminaire & Exposed Wiring Mast',
      stat1: { label: 'Luminaire Height', value: '8.5 m' },
      stat2: { label: 'Fault Signature', value: 'Driver Burnout', isAlert: true },
      stat3: { label: 'Arm Length', value: '1.8 m' },
      stat4: { label: 'Lux Deficit', value: '-85 Lux' },
      warningText: 'High Public Risk - Dark corridor crime vulnerability and live wire grounding risk.'
    },
    engineeringFix: {
      sopStandard: 'Boom-truck elevation, IP66 luminaire replacement, MCB fuse overhaul, and surge arrester installation.',
      signatures: [
        'Mast Type: 8.5m Octagonal Galvanized Pole',
        'Circuit Status: MCB Trip with internal short circuit',
        'Physical Anchor: Intact foundation bolts, luminaire casing fractured',
        'Safety Hazard Rating: High priority for night vehicular and pedestrian visibility'
      ]
    },
    estimate: {
      inr: '6,450',
      usd: '74.50',
      workWindow: '2 - 3 Hours (Rapid dispatch)',
      sla: 'Immediate action recommended (Within 24 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'CPWD Electrical DSR 2026',
      items: [
        {
          description: '45W IP66 LED Luminaire Fixture with Surge Protection',
          category: 'Material',
          quantityDuration: '1 Unit',
          unitRate: '₹ 2,850',
          subtotal: '₹ 2,850'
        },
        {
          description: '3-Core Copper Armored Cable (2.5mm²)',
          category: 'Material',
          quantityDuration: '12 Meters',
          unitRate: '₹ 75',
          subtotal: '₹ 900'
        },
        {
          description: '16A Miniature Circuit Breaker (MCB) & Enclosure',
          category: 'Material',
          quantityDuration: '1 Unit',
          unitRate: '₹ 350',
          subtotal: '₹ 350'
        },
        {
          description: 'Hydraulic Boom Truck with Aerial Platform (12m reach)',
          category: 'Equipment',
          quantityDuration: '2 Hours',
          unitRate: '₹ 450',
          subtotal: '₹ 900'
        },
        {
          description: 'Certified Municipal Line Electrician',
          category: 'Labor',
          quantityDuration: '3 Hours',
          unitRate: '-',
          subtotal: '₹ 750'
        },
        {
          description: 'Traffic Safety Marshall & Zone Barricading',
          category: 'Labor',
          quantityDuration: '2 Hours',
          unitRate: '-',
          subtotal: '₹ 350'
        }
      ],
      contingencyRate: 'Municipal Contingency & Supervision (5%):',
      contingencyAmount: '₹ 350',
      totalBudget: '₹ 6,450'
    }
  },

  water_leak: {
    category: 'water_leak',
    geometry: {
      title: 'High-Pressure Underground Main Rupture & Surface Pooling',
      stat1: { label: 'Discharge Rate', value: '34 L/min' },
      stat2: { label: 'Pressure Drop', value: '-1.8 Bar', isAlert: true },
      stat3: { label: 'Flooded Area', value: '28.0 m²' },
      stat4: { label: 'Pipeline Depth', value: '1.2 m' },
      warningText: 'Critical Infrastructure Risk - Rapid road sub-base soil erosion and drinking water loss.'
    },
    engineeringFix: {
      sopStandard: 'Sluice valve isolation, pneumatic backhoe excavation, electro-fusion pipe sleeve coupling, and gravel backfill.',
      signatures: [
        'Pipe Material: 110mm HDPE Class 4 Distribution Main',
        'Erosion Severity: Active sub-surface cavity formation under carriageway',
        'Water Quality Risk: Negative suction contamination risk on pipe depressurization',
        'Safety Hazard Rating: Critical priority - 6hr maximum dispatch response'
      ]
    },
    estimate: {
      inr: '21,300',
      usd: '246.50',
      workWindow: '6 - 8 Hours (Emergency repair)',
      sla: 'Emergency action required (Within 12 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'PHED Water Works SoR 2026',
      items: [
        {
          description: '110mm HDPE Electro-Fusion Repair Clamp & Coupler',
          category: 'Material',
          quantityDuration: '2 Units',
          unitRate: '₹ 3,200',
          subtotal: '₹ 6,400'
        },
        {
          description: 'Granular Crushed Stone Backfill & Filter Bed',
          category: 'Material',
          quantityDuration: '2.5 tonnes',
          unitRate: '₹ 1,200',
          subtotal: '₹ 3,000'
        },
        {
          description: 'Submersible Dewatering Trash Pump (5 HP)',
          category: 'Equipment',
          quantityDuration: '4 Hours',
          unitRate: '₹ 600',
          subtotal: '₹ 2,400'
        },
        {
          description: 'Mini Hydraulic Backhoe Excavator (Pneumatic)',
          category: 'Equipment',
          quantityDuration: '3 Hours',
          unitRate: '₹ 1,400',
          subtotal: '₹ 4,200'
        },
        {
          description: 'Lead Pipeline Fitter & Electro-Fusion Technician',
          category: 'Labor',
          quantityDuration: '6 Hours',
          unitRate: '-',
          subtotal: '₹ 1,800'
        },
        {
          description: 'Excavation & Shoring Crew (2 Staff)',
          category: 'Labor',
          quantityDuration: '6 Hours',
          unitRate: '-',
          subtotal: '₹ 1,600'
        }
      ],
      contingencyRate: 'Emergency Contingency & Inspection (9%):',
      contingencyAmount: '₹ 1,900',
      totalBudget: '₹ 21,300'
    }
  },

  drainage: {
    category: 'drainage',
    geometry: {
      title: 'Fractured RCC Stormwater Drain & Silt Choke',
      stat1: { label: 'Choked Length', value: '8.2 m' },
      stat2: { label: 'Silt Depth', value: '45 cm', isAlert: true },
      stat3: { label: 'Slab Defect', value: '2.4 m' },
      stat4: { label: 'Overflow Rate', value: '180 L/hr' },
      warningText: 'Monsoon Hazard - High risk of urban waterlogging, basement flooding, and pedestrian footway collapse.'
    },
    engineeringFix: {
      sopStandard: 'High-pressure vacuum super-sucker desilting, damaged RCC cover removal, and M30 grade precast grate installation.',
      signatures: [
        'Drain Channel: 600mm × 900mm Open RCC Stormwater Corridor',
        'Structural State: 2 collapsed precast slabs, exposed reinforcing rebar',
        'Obstruction Type: Compacted municipal solid silt and construction debris',
        'Safety Hazard Rating: Severe pedestrian trip hazard & vector pest breeding'
      ]
    },
    estimate: {
      inr: '18,450',
      usd: '213.30',
      workWindow: '5 - 7 Hours',
      sla: 'Urgent action recommended (Within 24 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'Municipal Drain Works SoR 2026',
      items: [
        {
          description: 'Heavy-Duty M30 Precast RCC Perforated Drain Grates',
          category: 'Material',
          quantityDuration: '3 Units',
          unitRate: '₹ 2,400',
          subtotal: '₹ 7,200'
        },
        {
          description: 'Rapid Setting Epoxy Mortar & Bonding Agent',
          category: 'Material',
          quantityDuration: '10 kg',
          unitRate: '₹ 160',
          subtotal: '₹ 1,600'
        },
        {
          description: 'High-Capacity Super Sucker Jetting Tanker',
          category: 'Equipment',
          quantityDuration: '3 Hours',
          unitRate: '₹ 1,500',
          subtotal: '₹ 4,500'
        },
        {
          description: 'Hydraulic Mobile Crane Hoist for Slab Placement',
          category: 'Equipment',
          quantityDuration: '2 Hours',
          unitRate: '₹ 950',
          subtotal: '₹ 1,900'
        },
        {
          description: 'Specialist Stormwater Drainage Crew (3 Staff)',
          category: 'Labor',
          quantityDuration: '5 Hours',
          unitRate: '-',
          subtotal: '₹ 1,800'
        }
      ],
      contingencyRate: 'Municipal Contingency & Environmental Fee (8%):',
      contingencyAmount: '₹ 1,450',
      totalBudget: '₹ 18,450'
    }
  },

  garbage: {
    category: 'garbage',
    geometry: {
      title: 'Uncontrolled Municipal Solid Waste Accumulation',
      stat1: { label: 'Accumulated Volume', value: '4.8 m³' },
      stat2: { label: 'Estimated Mass', value: '2.1 tonnes', isAlert: true },
      stat3: { label: 'Surface Footprint', value: '12.5 m²' },
      stat4: { label: 'Leachate Runoff', value: 'Active' },
      warningText: 'Public Health Threat - Airborne odor, rodent vector breeding, and public right-of-way obstruction.'
    },
    engineeringFix: {
      sopStandard: 'Mechanical front-loader clearing, hydraulic compactor transport to waste processing plant, and sodium hypochlorite disinfection.',
      signatures: [
        'Waste Classification: Mixed organic, plastic, and domestic municipal solid waste',
        'Contamination Vector: Leachate seeping into roadside curb and gutter',
        'Location: Open street corner with high pedestrian footfall',
        'Safety Hazard Rating: High biological and fire safety hazard'
      ]
    },
    estimate: {
      inr: '7,850',
      usd: '90.80',
      workWindow: '2 - 3 Hours (Rapid clean)',
      sla: 'Standard sanitation SLA (Within 18 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'SWM Solid Waste Rules 2026',
      items: [
        {
          description: 'Sodium Hypochlorite 10% Disinfectant Solution & Lime Powder',
          category: 'Material',
          quantityDuration: '20 Liters + 50kg',
          unitRate: '₹ 45',
          subtotal: '₹ 1,450'
        },
        {
          description: 'Hydraulic Compactor Waste Transport Tipper (6m³)',
          category: 'Equipment',
          quantityDuration: '2 Trips',
          unitRate: '₹ 1,600',
          subtotal: '₹ 3,200'
        },
        {
          description: 'Mechanical Skid-Steer Front Loader',
          category: 'Equipment',
          quantityDuration: '2 Hours',
          unitRate: '₹ 650',
          subtotal: '₹ 1,300'
        },
        {
          description: 'Sanitation Rapid Response Crew (4 Staff)',
          category: 'Labor',
          quantityDuration: '3 Hours',
          unitRate: '-',
          subtotal: '₹ 1,400'
        }
      ],
      contingencyRate: 'Landfill Handling & Processing Fee (7%):',
      contingencyAmount: '₹ 500',
      totalBudget: '₹ 7,850'
    }
  },

  road_damage: {
    category: 'road_damage',
    geometry: {
      title: 'Longitudinal Asphalt Fatigue Cracking & Base Rutting',
      stat1: { label: 'Crack Linear Extent', value: '18.5 m' },
      stat2: { label: 'Max Rut Depth', value: '5.8 cm', isAlert: true },
      stat3: { label: 'Surface Affected', value: '14.2 m²' },
      stat4: { label: 'Structural Wear', value: 'Severe' },
      warningText: 'Progressive Failure - Water ingress will cause severe alligator cracking and complete base subsidence.'
    },
    engineeringFix: {
      sopStandard: 'Compressed air cleaning, hot-applied elastomeric crack sealant filling, and micro-surfacing wearing course.',
      signatures: [
        'Failure Mechanism: Repeated axle load fatigue on aged binder matrix',
        'Moisture Sensitivity: High percolation into underlying granular sub-base',
        'Corridor Profile: Heavy transit bus lane with high turning shear forces',
        'Safety Hazard Rating: High friction loss & two-wheeler skid hazard'
      ]
    },
    estimate: {
      inr: '12,800',
      usd: '147.95',
      workWindow: '3 - 5 Hours',
      sla: 'Target action recommended (Within 48 Hours)',
      sorYear: 'SoR 2026'
    },
    bom: {
      rateStandard: 'MoRTH Section 500 Standards',
      items: [
        {
          description: 'Hot-Pour Polymer Modified Elastomeric Sealant (ASTM D6690)',
          category: 'Material',
          quantityDuration: '45 kg',
          unitRate: '₹ 95',
          subtotal: '₹ 4,275'
        },
        {
          description: 'Fine Bituminous Slurry Seal Aggregate Course',
          category: 'Material',
          quantityDuration: '0.3 tonnes',
          unitRate: '₹ 4,500',
          subtotal: '₹ 1,350'
        },
        {
          description: 'Hot Compressed Air Lance with Towable Compressor',
          category: 'Equipment',
          quantityDuration: '3 Hours',
          unitRate: '₹ 950',
          subtotal: '₹ 2,850'
        },
        {
          description: 'Pavement Maintenance Crew (3 Staff)',
          category: 'Labor',
          quantityDuration: '4 Hours',
          unitRate: '-',
          subtotal: '₹ 2,200'
        },
        {
          description: 'Traffic Safety Marshall & Signage Setup',
          category: 'Labor',
          quantityDuration: '4 Hours',
          unitRate: '-',
          subtotal: '₹ 800'
        }
      ],
      contingencyRate: 'Municipal Supervision & Quality Assurance (11%):',
      contingencyAmount: '₹ 1,325',
      totalBudget: '₹ 12,800'
    }
  }
};

export function getDiagnosticPreset(category: string): DiagnosticDetail {
  return DIAGNOSTIC_PRESETS[category] || DIAGNOSTIC_PRESETS.pothole;
}
