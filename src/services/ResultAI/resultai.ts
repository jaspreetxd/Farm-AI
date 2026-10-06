import { tfjsService } from './tfjsService';
import type { WeatherData } from '../WeatherAI/weatherai';
import { AGRICULTURE_SCOPE_MESSAGE, isAgricultureQuery } from '../../../agriculture-scope.js';

export interface ActionStep {
  step: number;
  title: string;
  instruction: string;
  points?: string[];
}

export interface AnalysisResult {
  problem: string;
  severity: 'low' | 'medium' | 'high';
  causes: string;
  tools: string[];
  actionPlan: ActionStep[];
  plantName?: string;
  status?: 'Healthy' | 'Diseased' | 'Unknown';
  confidence?: number;
}

export interface AnalyzeRequest {
  type: 'text' | 'photo';
  content?: string;
  imageElement?: HTMLImageElement;
  location?: { lat: number; lon: number };
  weather?: WeatherData;
}

export interface ParsedPlantLabel {
  rawLabel: string;
  plantName: string;
  status: 'Healthy' | 'Diseased' | 'Unknown';
  isHealthy: boolean;
  displayName: string;
}

/**
 * Normalizes labels from the Teachable Machine image model.
 * Handles variations like:
 * - "Gauva (Healthy)" -> "Guava (Healthy)"
 * - "Mango (Diseased)" -> "Mango (Diseased)"
 * - "Pongamia Pinnata healthy" -> "Pongamia Pinnata (Healthy)"
 */
export function parsePlantLabel(rawLabel: string): ParsedPlantLabel {
  let cleaned = (rawLabel || '').trim();
  // Fix known model typo for Guava
  cleaned = cleaned.replace(/Gauva/gi, 'Guava');

  const isHealthy = /healthy/i.test(cleaned);
  const isDiseased = /diseased/i.test(cleaned);
  const status: ParsedPlantLabel['status'] = isHealthy ? 'Healthy' : isDiseased ? 'Diseased' : 'Unknown';

  let plantName = cleaned
    .replace(/\s*\((Healthy|Diseased)\)/i, '')
    .replace(/\s*(healthy|diseased)/i, '')
    .trim();

  // Capitalize plant name words properly
  plantName = plantName
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    rawLabel,
    plantName: plantName || 'Crop',
    status,
    isHealthy,
    displayName: `${plantName} (${status})`,
  };
}

/**
 * Curated offline agricultural database for the 10 crops supported
 * by the Teachable Machine vision model. Used when LLM is offline or as fallback.
 */
export const PLANT_KNOWLEDGE_BASE: Record<string, {
  diseased: {
    diseaseName: string;
    causes: string;
    tools: string[];
    steps: ActionStep[];
  };
  healthy: {
    causes: string;
    tools: string[];
    steps: ActionStep[];
  };
}> = {
  'Guava': {
    diseased: {
      diseaseName: 'Guava Wilt & Fruit Anthracnose Complex',
      causes: 'Caused by soil-borne Fusarium oxysporum and Colletotrichum gloeosporioides spores, aggravated by waterlogging and root injury.',
      tools: ['Trichoderma viride bio-formulation', 'Copper Oxychloride (0.3%)', 'Pruning shears', 'Neem cake fertilizer'],
      steps: [
        { step: 1, title: 'Isolate & Inspect', instruction: 'Examine leaf wilting patterns and discolored bark near the trunk base.', points: ['Check if wilting is unilateral (one branch) or whole tree.', 'Inspect root collar for dark streaks or fungal growth.'] },
        { step: 2, title: 'Prune Infected Twigs', instruction: 'Remove blighted twigs and dried fruits 2 inches below the infected zone.', points: ['Use clean, alcohol-sterilized pruning shears.', 'Never leave pruned debris in the orchard basin.'] },
        { step: 3, title: 'Dispose Prunings', instruction: 'Burn or deeply bury all pruned branches and fallen fruits away from the farm.', points: ['Do not add infected guava foliage to compost heaps.', 'Keeps fungal inoculum from blowing back onto healthy trees.'] },
        { step: 4, title: 'Improve Soil Drainage', instruction: 'Ensure water does not stagnate around the tree collar.', points: ['Create a raised mound around the tree trunk.', 'Dig drainage channels between tree rows to divert surplus water.'] },
        { step: 5, title: 'Apply Bio-Agent', instruction: 'Drench root zone with Trichoderma viride mixed in farmyard manure.', points: ['Mix 50g Trichoderma with 5kg decomposed FYM per tree.', 'Apply around drip-line and water lightly.'] },
        { step: 6, title: 'Foliar Fungicide Spray', instruction: 'Spray Copper Oxychloride (3g/liter) over the entire foliage.', points: ['Ensure undersides of leaves and developing fruitlets are covered.', 'Avoid spraying during intense midday heat.'] },
        { step: 7, title: 'Soil Solarization / Liming', instruction: 'Amend acidic soil around the tree basin with agricultural lime.', points: ['Brings soil pH closer to neutral (6.5 - 7.5), suppressing Fusarium.', 'Apply 1-2 kg lime per mature tree once a year.'] },
        { step: 8, title: 'Stem Painting', instruction: 'Paint the bottom 2 feet of the trunk with Bordeaux paste.', points: ['Prevents collar rot and insect borers from creating entry wounds.', 'Reapply after heavy monsoon rains.'] },
        { step: 9, title: 'Balanced Nutrition', instruction: 'Apply potassium and micronutrient zinc/boron foliar spray.', points: ['Strengthens plant cellular walls against fungal penetration.', 'Avoid excessive nitrogen fertilization which produces soft, susceptible tissue.'] },
        { step: 10, title: 'Monitor & Respray', instruction: 'Re-inspect after 10-14 days and repeat foliar spray if symptoms persist.', points: ['Rotate fungicide classes to prevent chemical resistance.', 'Log recovery progress in your Farm AI history.'] }
      ]
    },
    healthy: {
      causes: 'The guava plant foliage exhibits healthy green pigment, uniform leaf structure, and no fungal lesions.',
      tools: ['Organic compost', 'Drip irrigation timer', 'Scouting hand lens'],
      steps: [
        { step: 1, title: 'Maintain Irrigation', instruction: 'Water deeply once every 7-10 days depending on soil type.', points: ['Guava prefers consistent moisture during flowering and fruit setting.', 'Avoid waterlogging at the root collar.'] },
        { step: 2, title: 'Seasonal Pruning', instruction: 'Perform light tip-pruning after harvest to encourage fruitful lateral shoots.', points: ['Fruit develops on fresh current-season growth.', 'Sterilize pruners between trees.'] },
        { step: 3, title: 'Nutrient Management', instruction: 'Apply balanced organic manure and micronutrient spray twice a year.', points: ['Feed with vermicompost and neem cake before flowering.', 'Spray zinc sulphate (0.5%) for optimal fruit retention.'] }
      ]
    }
  },
  'Mango': {
    diseased: {
      diseaseName: 'Mango Anthracnose & Powdery Mildew',
      causes: 'Triggered by Colletotrichum gloeosporioides and Oidium mangiferae following unseasonal rain, high humidity, and overcast skies.',
      tools: ['Azoxystrobin or Mancozeb', 'Sulfur 80% WP', 'High-pressure sprayer', 'Tree pruning loppers'],
      steps: [
        { step: 1, title: 'Assess Canopy', instruction: 'Identify blackened leaf tips, blossom blight, or tear-stain markings on fruits.', points: ['Anthracnose shows dark necrotic spots on leaves and shoots.', 'Mildew appears as white powdery coating on young panicles.'] },
        { step: 2, title: 'Center Canopy Pruning', instruction: 'Prune overlapping criss-cross branches to allow sunlight into the canopy.', points: ['Sunlight penetration significantly reduces fungal spore viability.', 'Open up the center of dense trees.'] },
        { step: 3, title: 'Sanitize Orchard Floor', instruction: 'Rake up and burn all fallen leaves, blighted panicles, and mummified fruits.', points: ['Primary spores overwinter on dried fallen debris.', 'Keeps pathogen count low prior to new flushing.'] },
        { step: 4, title: 'First Protective Spray', instruction: 'Spray Mancozeb (2.5g/L) or Copper Oxychloride (3g/L) during flush emergence.', points: ['Coat both upper and lower leaf surfaces thoroughly.', 'Spray during calm morning hours with low wind.'] },
        { step: 5, title: 'Blossom Protection', instruction: 'Apply Wettable Sulfur (2g/L) or Carbendazim (1g/L) at flower panicle stage.', points: ['Protects delicate flowers against powdery mildew.', 'Avoid spraying during peak pollinator foraging hours (10 AM - 2 PM).'] },
        { step: 6, title: 'Post-Rain Reapplication', instruction: 'Reapply systemic fungicide if unseasonal rains occur within 48 hours.', points: ['Rain washes off contact protectants and activates spore dispersal.', 'Use systemic products like Azoxystrobin + Difenoconazole.'] },
        { step: 7, title: 'Avoid Excess Nitrogen', instruction: 'Halt high-nitrogen fertilizer applications until symptoms subside.', points: ['Excess nitrogen creates succulent shoots that are vulnerable to blight.', 'Supplement with potassium sulfate instead.'] },
        { step: 8, title: 'Control Fruit Flies & Hoppers', instruction: 'Deploy methyl eugenol pheromone traps in the orchard.', points: ['Insect feeding creates entry wounds for secondary pathogens.', 'Hang 6-8 traps per acre.'] },
        { step: 9, title: 'Bordeaux Paste Trunk Coat', instruction: 'Apply 10% Bordeaux paste to the main trunk crotch.', points: ['Prevents gummosis and stem-end rot from entering trunk fissures.', 'Apply before and after the monsoon season.'] },
        { step: 10, title: 'Post-Harvest Fruit Dip', instruction: 'Treat harvested fruits in hot water (52°C for 5 minutes) before storage.', points: ['Drastically eliminates latent anthracnose infections on fruit skins.', 'Dramatically extends shelf life.'] }
      ]
    },
    healthy: {
      causes: 'The mango foliage exhibits vibrant dark green color, healthy leaf cuticle wax, and vigorous terminal buds.',
      tools: ['Orchard irrigation line', 'Pheromone traps', 'Balanced organic manure'],
      steps: [
        { step: 1, title: 'Regulate Watering', instruction: 'Withhold watering 2 months before flowering to induce profuse bloom.', points: ['Mild water stress encourages vegetative buds to turn into floral buds.', 'Resume watering once fruit sets to pea size.'] },
        { step: 2, title: 'Maintain Clean Orchard', instruction: 'Keep tree basins weed-free and apply organic mulch.', points: ['Conserves soil moisture and regulates root temperature.', 'Suppresses weed hosts of mango hoppers.'] },
        { step: 3, title: 'Scout Regularly', instruction: 'Inspect young leaf flushes weekly for early signs of hoppers or spot.', points: ['Early intervention prevents large-scale chemical applications.', 'Check leaf undersides for tiny nymphs.'] }
      ]
    }
  },
  'Lemon': {
    diseased: {
      diseaseName: 'Citrus Canker & Gummosis (Dieback)',
      causes: 'Caused by Xanthomonas citri bacteria and Phytophthora fungi, spread by rain splash, wind, and leaf miner punctures.',
      tools: ['Streptocycline (100 ppm)', 'Copper Oxychloride (3g/L)', 'Pruning loppers', 'Neem oil formulation'],
      steps: [
        { step: 1, title: 'Identify Lesions', instruction: 'Check for raised corky lesions with yellow oily halos on leaves and twigs.', points: ['Canker lesions are rough and raised on both leaf surfaces.', 'Dieback shows twigs drying from tip downwards.'] },
        { step: 2, title: 'Prune Cankered Twigs', instruction: 'Prune affected twigs 3 inches below the visible lesion during dry weather.', points: ['Never prune citrus during rain or high humidity.', 'Disinfect shear blades in 1% sodium hypochlorite between cuts.'] },
        { step: 3, title: 'Burn Pruned Parts', instruction: 'Immediately collect and destroy all pruned stems and diseased fallen leaves.', points: ['Bacteria remain viable in dried twigs for many months.', 'Prevent re-inoculation of new flushes.'] },
        { step: 4, title: 'Bactericide Spray', instruction: 'Spray Streptocycline (1g in 10 liters water) + Copper Oxychloride (25g).', points: ['Provides dual bactericidal and fungicidal contact protection.', 'Spray immediately after new vegetative flushes emerge.'] },
        { step: 5, title: 'Leaf Miner Control', instruction: 'Spray Neem oil (5ml/L) or Imidacloprid (0.5ml/L) on tender new shoots.', points: ['Leaf miner serpentine mines serve as primary infection gates for canker.', 'Protect every fresh flush of growth.'] },
        { step: 6, title: 'Treat Trunk Gummosis', instruction: 'Scrape gummosis lesions on the trunk and apply Bordeaux paste.', points: ['Remove brown rotting bark until clean green tissue appears.', 'Paint liberally with fresh Bordeaux paste.'] },
        { step: 7, title: 'Avoid Overhead Sprinklers', instruction: 'Shift to drip or basin irrigation to keep foliage completely dry.', points: ['Water drops hitting lesions aerosolize millions of bacterial cells.', 'Keep sprinkler streams below canopy level.'] },
        { step: 8, title: 'Windbreak Planting', instruction: 'Maintain windbreak trees (like Casuarina or Sesbania) around the orchard.', points: ['Reduces wind speed and wind-driven rain droplet impact.', 'Minimizes thorny twig punctures that cause infection.'] },
        { step: 9, title: 'Micronutrient Foliar Feed', instruction: 'Spray Zinc, Iron, and Manganese foliar mixture.', points: ['Citrus canker is aggravated by chlorosis and micronutrient deficiencies.', 'Apply when leaves are expanding.'] },
        { step: 10, title: 'Repeat Protective Schedule', instruction: 'Reapply copper bactericide every 14 days during monsoon months.', points: ['Maintain continuous protective chemical barrier on developing lemons.', 'Stop spraying 15 days before harvest.'] }
      ]
    },
    healthy: {
      causes: 'The lemon tree foliage has deep glossy green coloration, robust thorny branches, and clean fruit skin.',
      tools: ['Drip irrigation', 'Balanced citrus fertilizer', 'Pruning shears'],
      steps: [
        { step: 1, title: 'Keep Trunk Collar Dry', instruction: 'Keep irrigation water at least 1 foot away from the trunk collar.', points: ['Citrus roots are sensitive to root rot and Phytophthora collar rot.', 'Maintain raised mound planting.'] },
        { step: 2, title: 'Seasonal Pruning', instruction: 'Remove water sprouts, dead wood, and internal crossing branches.', points: ['Keeps tree airy and allows sunlight to color fruits evenly.', 'Improves spraying efficiency.'] },
        { step: 3, title: 'Nutrient Feeding', instruction: 'Feed mature lemon trees with balanced NPK (13-0-45) and well-rotted manure.', points: ['Heavy feeders require 3 split applications per year.', 'Add Epsom salts (magnesium sulfate) for leaf vigor.'] }
      ]
    }
  },
  'Pomegranate': {
    diseased: {
      diseaseName: 'Pomegranate Bacterial Blight (Telya / Black Spot)',
      causes: 'Caused by Xanthomonas axonopodis pv. punicae, spreading through rain splash, contaminated tools, and infected seedlings.',
      tools: ['Bordeaux mixture (1%)', 'Streptocycline', 'Bactericide sprayer', 'Sodium hypochlorite disinfectant'],
      steps: [
        { step: 1, title: 'Look for Oily Spots', instruction: 'Inspect for water-soaked dark spots on leaves, stems, and star-shaped cracked fruit lesions.', points: ['Telya lesions turn brownish-black with yellow halos.', 'Stems develop dark nodal cankers that break easily.'] },
        { step: 2, title: 'Rigorous Sanitation Pruning', instruction: 'Cut all cankered branches 2-4 inches below the infected nodule.', points: ['Sterilize secateurs after each single cut with 10% bleach solution.', 'Do not allow infected drops of sap to touch other shoots.'] },
        { step: 3, title: 'Destroy Infected Debris', instruction: 'Incinerate all pruned twigs, diseased leaves, and split fruits immediately.', points: ['Blight bacteria can survive for months on dried debris.', 'Keep orchard perimeter completely sanitized.'] },
        { step: 4, title: 'Spray Streptocycline & Copper', instruction: 'Spray Streptocycline (0.5g/L) mixed with Copper Oxychloride (2.5g/L).', points: ['Apply at early morning when bacterial stomatal entry is highest.', 'Ensure thorough drenching of all foliage and branches.'] },
        { step: 5, title: 'Apply Bordeaux Paste', instruction: 'Coat the entire main stem and primary crotches with Bordeaux paste (10%).', points: ['Prevents nodal cankers from girdling the central stem.', 'Reapply after heavy showers.'] },
        { step: 6, title: 'Discontinue Overhead Watering', instruction: 'Strictly avoid any sprinkler or overhead water that hits the canopy.', points: ['Splash dispersal is the single biggest driver of epidemic outbreaks.', 'Use drip irrigation only.'] },
        { step: 7, title: 'Foliar Bio-Immunizers', instruction: 'Spray potassium phosphonate (2ml/L) or salicylic acid.', points: ['Induces systemic acquired resistance (SAR) in pomegranate tissue.', 'Strengthens cellular defense mechanisms against Xanthomonas.'] },
        { step: 8, title: 'Inter-Row Weed Eradication', instruction: 'Remove all weeds and alternate host plants in and around the orchard.', points: ['Weeds raise microclimate humidity and can harbor bacterial populations.', 'Keep inter-spaces clean and aerated.'] },
        { step: 9, title: 'Optimize Plant Spacing & Sunlight', instruction: 'Prune interior suckers to maximize airflow and direct sun penetration.', points: ['Sunlight and UV rays naturally deactivate bacterial slime on surfaces.', 'Reduces leaf wetness duration below critical threshold.'] },
        { step: 10, title: 'Systematic Re-spraying', instruction: 'Continue protective sprays at 7-10 day intervals during monsoon period.', points: ['Rotate antibiotics with copper hydroxide and kasugamycin.', 'Monitor new flushes daily for early spot detection.'] }
      ]
    },
    healthy: {
      causes: 'Pomegranate canopy shows dense, glossy oblong leaves, robust flowering calyxes, and clean bark.',
      tools: ['Secateurs', 'Organic vermicompost', 'Drip drippers'],
      steps: [
        { step: 1, title: 'Thinning & Fruit Spacing', instruction: 'Retain 40-50 high-quality fruits per mature tree and thin the rest.', points: ['Prevents branch breakage and ensures uniform large fruit size.', 'Improves rind thickness and color.'] },
        { step: 2, title: 'Bagging Fruits', instruction: 'Bag developing fruits in parchment paper bags when they reach lemon size.', points: ['Protects fruits against butterfly larvae (Deudorix isocrates) and sunscald.', 'Reduces need for synthetic pesticide sprays.'] },
        { step: 3, title: 'Calcium & Boron Supplementation', instruction: 'Apply soluble calcium nitrate and solubor boron foliar spray during fruit growth.', points: ['Dramatically prevents fruit cracking during ripening.', 'Enhances sugar content and aril redness.'] }
      ]
    }
  },
  'Alstonia Scholaris': {
    diseased: {
      diseaseName: 'Alstonia Leaf Gall Midge & Anthracnose Complex',
      causes: 'Caused by Pauropsylla tuberculata gall midge combined with secondary fungal leaf blight, causing severe nodular swellings.',
      tools: ['Systemic Insecticide (Imidacloprid)', 'Copper Fungicide', 'Pole Pruner', 'Neem formulation'],
      steps: [
        { step: 1, title: 'Identify Gall Formations', instruction: 'Inspect leaves for rough, raised woody galls and leaf-curling deformities.', points: ['Leaf underside will show conical projections where insect nymphs feed.', 'Severely infected leaves become brittle and drop early.'] },
        { step: 2, title: 'Prune Heavily Galled Foliage', instruction: 'Cut off branches containing heavy gall clusters before nymphs emerge.', points: ['Collect cuttings in thick trash bags and dispose away from trees.', 'Helps break the reproductive cycle of the gall insect.'] },
        { step: 3, title: 'Apply Systemic Insecticide', instruction: 'Spray Imidacloprid 17.8 SL (0.5ml/L) or Thiamethoxam on new flushes.', points: ['Systemic action reaches developing nymphs hidden inside leaf tissue.', 'Apply early in the morning when sap flow is high.'] },
        { step: 4, title: 'Fungicidal Protection', instruction: 'Follow up with Copper Oxychloride (2.5g/L) to prevent secondary leaf rot.', points: ['Insect puncture wounds readily invite opportunistic fungal spores.', 'Protects fresh undamaged leaves.'] },
        { step: 5, title: 'Soil Application of Neem Cake', instruction: 'Incorporate 1-2 kg of neem seed cake into the root zone.', points: ['Deters pupating soil stages of insect pests and enhances soil biology.', 'Provides slow-release organic nitrogen.'] },
        { step: 6, title: 'Tree Trunk Washing', instruction: 'Wash tree trunks with mild horticultural soap solution.', points: ['Removes overwintering egg clusters and resting insects.', 'Keep trunk clear of climbing pests.'] },
        { step: 7, title: 'Deep Basin Aeration', instruction: 'Gently aerate top 4 inches of soil within the tree canopy perimeter.', points: ['Exposes soil-dwelling pupae to birds and sunlight.', 'Avoid damaging large anchor roots.'] },
        { step: 8, title: 'Sticky Traps Installation', instruction: 'Install yellow sticky traps around lower branches to monitor adult midge flight.', points: ['Provides early warning of new pest generations.', 'Helps time pesticide sprays accurately.'] },
        { step: 9, title: 'Water Management', instruction: 'Avoid sprinkling canopy with borewell water.', points: ['Dry foliage prevents fungal spread.', 'Deep water the root zone instead.'] },
        { step: 10, title: 'Evaluate Regeneration', instruction: 'Inspect fresh leaf flushes after 15 days for clean, gall-free development.', points: ['Repeat bio-spray if new conical bumps are observed.', 'Maintain tree vigor with compost.'] }
      ]
    },
    healthy: {
      causes: 'The Devil Tree (Alstonia scholaris) shows characteristic whorled, leathery leaves with smooth surfaces and vigorous growth.',
      tools: ['Hosepipe', 'Organic mulch', 'Pruning saw'],
      steps: [
        { step: 1, title: 'Scout Whorls', instruction: 'Regularly inspect new leaf whorls for the first signs of tiny bumps or insects.', points: ['Early identification makes biological control easy.', 'Scout every fortnight.'] },
        { step: 2, title: 'Maintain Canopy Balance', instruction: 'Prune dead or weak lower limbs to promote strong apical stem growth.', points: ['Keeps tree structurally sound and attractive.', 'Clean wounds with tree sealant if limbs are large.'] },
        { step: 3, title: 'Adequate Root Space', instruction: 'Ensure the tree root basin is kept unpaved and mulched with organic matter.', points: ['Allows oxygen and moisture to reach feeder roots.', 'Prevents root compaction in urban gardens.'] }
      ]
    }
  },
  'Arjun': {
    diseased: {
      diseaseName: 'Arjun Foliar Blight & Rust Disease',
      causes: 'Caused by Cercospora terminaliae and Phakopsora tecta spores that proliferate in humid, damp weather.',
      tools: ['Hexaconazole (1ml/L) or Mancozeb', 'Pruning shears', 'Organic bio-stimulant', 'Backpack sprayer'],
      steps: [
        { step: 1, title: 'Examine Spot Patterns', instruction: 'Look for reddish-brown angular spots and rust-colored pustules on leaf undersides.', points: ['Spots often coalesce, causing entire leaves to turn chlorotic and shed.', 'Young seedlings are particularly vulnerable.'] },
        { step: 2, title: 'Remove Defoliated Leaves', instruction: 'Collect and burn all fallen infected leaves around the tree base.', points: ['Rust spores survive comfortably in dry leaf litter.', 'Prevents wind from re-suspending spores into canopy.'] },
        { step: 3, title: 'Apply Triazole Fungicide', instruction: 'Spray Hexaconazole 5% EC (1.5ml/L) or Propiconazole over infected canopies.', points: ['Provides strong curative and systemic protective action against rust.', 'Ensure both leaf surfaces receive full coverage.'] },
        { step: 4, title: 'Improve Tree Spacing', instruction: 'Prune adjoining shrubs to maximize wind circulation through the tree.', points: ['Reduces hours of continuous leaf wetness after rain.', 'Helps foliage dry quickly in morning sun.'] },
        { step: 5, title: 'Strengthen Bark Health', instruction: 'Check the valuable medicinal bark for fungal cankers or wood-boring holes.', points: ['Protect bark wounds with copper paste.', 'Do not harvest bark from trees showing active foliar blight.'] },
        { step: 6, title: 'Soil Enrichment', instruction: 'Feed tree basin with compost enriched with Pseudomonas fluorescens.', points: ['Encourages beneficial bacterial antagonists in the rhizosphere.', 'Boosts natural phytoalexin defense in foliage.'] },
        { step: 7, title: 'Drip Line Watering', instruction: 'Irrigate only at the drip perimeter, avoiding the tree trunk base.', points: ['Keeps root collar dry and prevents basal rot.', 'Water during early morning.'] },
        { step: 8, title: 'Monitor Resurgence', instruction: 'Check new flushes in 10-12 days for fresh orange-brown pustules.', points: ['Reapply fungicide if weather remains cloudy and wet.', 'Alternate with contact fungicide (Mancozeb).'] },
        { step: 9, title: 'Avoid Physical Injuries', instruction: 'Prevent lawnmower or harvesting damage to lower trunk and roots.', points: ['Open wounds attract secondary wood-decay fungi.', 'Seal any accidental cuts immediately.'] },
        { step: 10, title: 'Long-term Tree Care', instruction: 'Maintain regular mulch layer to support mycorrhizal root associations.', points: ['Enhances tree tolerance to drought and foliar stress.', 'Keeps soil fertile.'] }
      ]
    },
    healthy: {
      causes: 'The Arjun tree (Terminalia arjuna) foliage is lush, showing large oblong pale-green leaves and smooth grey bark.',
      tools: ['Rake', 'Garden hose', 'Organic compost'],
      steps: [
        { step: 1, title: 'Monitor Bark Condition', instruction: 'Ensure bark shedding is natural and free from gummy exudates.', points: ['Arjun naturally sheds bark in large thin sheets.', 'Keep trunk base free from weed buildup.'] },
        { step: 2, title: 'Seasonal Leaf Care', instruction: 'Observe seasonal flushes in spring and autumn for uniform green coloring.', points: ['Healthy trees resist fungal spores naturally.', 'Water during extreme dry spells.'] },
        { step: 3, title: 'Mulch Root Basin', instruction: 'Apply 3-4 inches of wood chips or leaf compost around the drip zone.', points: ['Retains soil moisture and regulates root temperature.', 'Enriches microbial biodiversity.'] }
      ]
    }
  },
  'Chinar': {
    diseased: {
      diseaseName: 'Chinar Anthracnose & Powdery Mildew (Apiognomonia veneta)',
      causes: 'Fungal infection flourishing during cool, moist spring weather, attacking young buds, shoots, and leaf veins.',
      tools: ['Propiconazole (1ml/L) or Copper Fungicide', 'Long-handled pruner', 'Leaf rake', 'Protective gear'],
      steps: [
        { step: 1, title: 'Inspect Leaf Veins', instruction: 'Identify large irregular brown necrotic blotches along the main leaf veins.', points: ['Leaves curl, turn brown, and drop prematurely in spring.', 'Twigs may show small cankers and dieback.'] },
        { step: 2, title: 'Prune Dieback Twigs', instruction: 'Prune blighted twigs and small branches during dormant winter or early spring.', points: ['Cut back to healthy wood behind visible cankers.', 'Disinfect cutting tools between cuts.'] },
        { step: 3, title: 'Rake and Destroy Fallen Leaves', instruction: 'Collect and destroy all fallen Chinar leaves in autumn and spring.', points: ['Overwintering fruiting bodies release spores during spring rains.', 'Essential sanitation step for large ornamental trees.'] },
        { step: 4, title: 'Bud-Break Fungicide Spray', instruction: 'Apply systemic fungicide (Propiconazole) just as new buds begin to swell.', points: ['Early preventive application stops spore germination before leaves expand.', 'Spray again 10-14 days later if cool, wet conditions persist.'] },
        { step: 5, title: 'Summer Mildew Protection', instruction: 'Spray Wettable Sulfur (2g/L) if white powdery film appears during summer.', points: ['Controls powdery mildew on fresh summer foliage.', 'Avoid spraying sulfur when temperatures exceed 32°C.'] },
        { step: 6, title: 'Aerate Tree Surrounds', instruction: 'Decompact soil around the extensive root system of heritage Chinar trees.', points: ['Promotes root respiration and nutrient uptake.', 'Avoid cutting primary structural roots.'] },
        { step: 7, title: 'Water Deeply During Drought', instruction: 'Provide deep, slow watering around the root zone during hot, dry periods.', points: ['Trees stressed by drought become susceptible to severe anthracnose damage.', 'Water slowly over several hours.'] },
        { step: 8, title: 'Avoid Excess Nitrogen', instruction: 'Do not over-fertilize with synthetic high-nitrogen lawn fertilizers.', points: ['Rapid succulent shoot growth is especially prone to blight.', 'Use balanced slow-release organic fertilizers.'] },
        { step: 9, title: 'Apply Trunk Micro-Injections', instruction: 'For high-value heritage trees, consult an arborist for trunk fungicide injection.', points: ['Distributes fungicide throughout the massive canopy without drift.', 'Recommended for large specimens near public areas.'] },
        { step: 10, title: 'Track Annual Recovery', instruction: 'Record canopy density and leaf retention in Farm AI each season.', points: ['Chinar trees typically recover vigorously once warm, dry summer weather arrives.', 'Maintain good cultural care year-round.'] }
      ]
    },
    healthy: {
      causes: 'The Chinar tree (Platanus orientalis) displays magnificent broad palmately-lobed leaves with crisp edges and healthy bark.',
      tools: ['Leaf rake', 'Garden hose', 'Mulch'],
      steps: [
        { step: 1, title: 'Monitor Seasonal Leafing', instruction: 'Watch for even bud break in early spring across all major scaffolds.', points: ['Healthy Chinars leaf out vigorously as temperatures rise.', 'Inspect young leaves for vein discoloration.'] },
        { step: 2, title: 'Protect Root Protection Zone', instruction: 'Prevent soil paving, vehicle parking, or excavation near the tree root zone.', points: ['Heritage Chinars have wide, sensitive root plates.', 'Keep root zone porous and mulched.'] },
        { step: 3, title: 'Dormant Season Inspection', instruction: 'Inspect branches in winter when leaves are off to identify weak or crossing limbs.', points: ['Structure pruning is best done in dormancy.', 'Remove dead wood safely.'] }
      ]
    }
  },
  'Jamun': {
    diseased: {
      diseaseName: 'Jamun Leaf Spot & Anthracnose (Cercospora / Glomerella)',
      causes: 'Spurred by warm, humid monsoon conditions and dense unpruned canopies trapping moisture on leaf surfaces.',
      tools: ['Mancozeb 75% WP (2g/L)', 'Carbendazim (1g/L)', 'Pole pruner', 'Spraying machine'],
      steps: [
        { step: 1, title: 'Detect Leaf Spots', instruction: 'Look for circular or irregular grayish-brown spots with dark purple-brown margins.', points: ['Infected leaves turn yellow and drop prematurely.', 'Fruit development can be stunted with sunken black lesions.'] },
        { step: 2, title: 'Canopy Thinning', instruction: 'Prune dense interior branches to open up airflow and allow sunlight into the center.', points: ['Improves drying speed of leaves after monsoon showers.', 'Reduces favorable conditions for fungal germination.'] },
        { step: 3, title: 'Sanitize Leaf Litter', instruction: 'Rake up all fallen leaves and dropped rotting fruits from under the tree.', points: ['Destroys the spore reservoir in the orchard.', 'Do not allow decaying jamun fruit to attract flies and fungi.'] },
        { step: 4, title: 'Protective Fungicide Spray', instruction: 'Spray Mancozeb (2.5g/L) or Copper Oxychloride (3g/L) as first protective round.', points: ['Coat both upper and lower leaf surfaces thoroughly.', 'Spray in early morning on a clear day.'] },
        { step: 5, title: 'Systemic Follow-up Spray', instruction: 'If spots continue spreading, apply Carbendazim (1g/L) after 12-14 days.', points: ['Systemic action stops mycelial progression inside leaf tissue.', 'Protect expanding new flushes.'] },
        { step: 6, title: 'Treat Stem & Branch Bark', instruction: 'Scrape any bark lesions and paint with Bordeaux paste.', points: ['Prevents canker formation on mature branches.', 'Maintains tree health.'] },
        { step: 7, title: 'Soil Bio-Inoculation', instruction: 'Apply Trichoderma-enriched compost in the tree basin during early monsoon.', points: ['Suppresses soil-borne pathogens and improves root uptake.', 'Apply 5-10 kg per mature tree.'] },
        { step: 8, title: 'Manage Fruit Fly & Caterpillar', instruction: 'Hang methyl eugenol traps and spray neem oil to prevent pest punctures.', points: ['Insect feeding points are open doorways for fungal anthracnose.', 'Deploy 4-6 traps per tree.'] },
        { step: 9, title: 'Balance Irrigation', instruction: 'Provide consistent moisture during fruit set and avoid waterlogging during ripening.', points: ['Fluctuating moisture can cause fruit splitting and secondary rots.', 'Ensure good field drainage.'] },
        { step: 10, title: 'Post-Harvest Care', instruction: 'Carry out light post-harvest pruning and a prophylactic copper spray.', points: ['Prepares the tree for healthy vegetative flushes in the next cycle.', 'Maintains high fruit yield.'] }
      ]
    },
    healthy: {
      causes: 'The Jamun tree (Syzygium cumini) possesses glossy, oblong leathery leaves with smooth pinkish-white bark.',
      tools: ['Basin spade', 'Drip tubing', 'Organic manure'],
      steps: [
        { step: 1, title: 'Basin Maintenance', instruction: 'Keep tree basin weed-free and aerate the topsoil twice a year.', points: ['Enables rapid nutrient and water infiltration.', 'Avoid damaging roots near the trunk.'] },
        { step: 2, title: 'Flower & Fruit Care', instruction: 'Ensure good pollinator activity by minimizing chemical sprays during bloom.', points: ['Jamun relies heavily on honeybees for pollination.', 'Scout for fruit set in early summer.'] },
        { step: 3, title: 'Seasonal Nutrition', instruction: 'Feed with farmyard manure and wood ash (potassium source) before monsoon.', points: ['Potassium enhances fruit sweetness and disease resilience.', 'Water well after fertilizing.'] }
      ]
    }
  },
  'Jatropha': {
    diseased: {
      diseaseName: 'Jatropha Collar Rot & Powdery Mildew Complex',
      causes: 'Caused by Macrophomina phaseolina in poorly drained heavy soils and Oidium fungal spores during dry, humid weather.',
      tools: ['Trichoderma harzianum', 'Wettable Sulfur (2g/L)', 'Drainage spade', 'Hand sprayer'],
      steps: [
        { step: 1, title: 'Inspect Collar & Leaves', instruction: 'Check tree collar at soil level for dark water-soaked rot and leaves for white powder.', points: ['Collar rot causes sudden yellowing, wilting, and root collapse.', 'Powdery mildew coats leaves with a whitish fungal layer.'] },
        { step: 2, title: 'Immediate Drainage Correction', instruction: 'Dig drainage furrows to immediately divert standing water away from plants.', points: ['Jatropha is highly sensitive to waterlogging.', 'Keep root collar well above standing water.'] },
        { step: 3, title: 'Soil Drenching with Bio-Fungicide', instruction: 'Drench affected root zones with Trichoderma harzianum (10g/L water).', points: ['Bio-agent parasitizes Macrophomina and Fusarium in the root system.', 'Repeat drenching after 10 days.'] },
        { step: 4, title: 'Foliar Spray for Mildew', instruction: 'Spray Wettable Sulfur (2.5g/L) or Dinocap across mildew-covered leaves.', points: ['Dissolves fungal mycelium and stops spore production.', 'Apply on dry, sunny mornings.'] },
        { step: 5, title: 'Prune Heavily Infected Stems', instruction: 'Cut back severely rotted stems down to healthy greenish-white wood.', points: ['Sterilize cutting tools with methylated spirit.', 'Dispose of infected stem pieces safely.'] },
        { step: 6, title: 'Apply Copper Fungicide to Soil', instruction: 'If collar rot is severe, drench the collar with Copper Oxychloride (3g/L).', points: ['Arrests fungal advance at the soil-stem junction.', 'Treat surrounding healthy plants as a precaution.'] },
        { step: 7, title: 'Avoid Excessive Watering', instruction: 'Allow top 2-3 inches of soil to dry out between waterings.', points: ['Jatropha thrives in well-drained, semi-arid conditions.', 'Overwatering is the number one cause of rot.'] },
        { step: 8, title: 'Mulch with Dry Straw', instruction: 'Apply a light dry organic mulch, keeping it 4 inches away from stems.', points: ['Suppresses soil splash onto lower foliage.', 'Do not mound mulch against the green stem.'] },
        { step: 9, title: 'Monitor Pest Vectors', instruction: 'Check for scutellerid bug (Chrysocoris) and leaf miners.', points: ['Insect wounds accelerate fungal entry.', 'Spray neem-based repellent if present.'] },
        { step: 10, title: 'Replant Gap Filling', instruction: 'If individual plants succumb, solarize soil with lime before replanting.', points: ['Prevents disease transmission to newly planted seedlings.', 'Use healthy certified cuttings.'] }
      ]
    },
    healthy: {
      causes: 'The Jatropha plant shows thick succulent stems, smooth bright green 5-lobed leaves, and vigorous terminal clusters.',
      tools: ['Garden hoe', 'Pruning shears', 'Moisture meter'],
      steps: [
        { step: 1, title: 'Control Water Intake', instruction: 'Water moderately; ensure soil dries between irrigation rounds.', points: ['Drought-tolerant plant vulnerable to excess moisture.', 'Keep soil loose and well-aerated.'] },
        { step: 2, title: 'Annual Rejuvenation Pruning', instruction: 'Prune branches back to 30-45 cm in spring to stimulate productive branching.', points: ['Encourages high flower and seed capsule production.', 'Seal cuts with fungicide paste.'] },
        { step: 3, title: 'Weed Control', instruction: 'Keep 1-meter radius around each plant free from competitive weeds.', points: ['Maximizes light and nutrient availability.', 'Reduces microclimate humidity.'] }
      ]
    }
  },
  'Pongamia Pinnata': {
    diseased: {
      diseaseName: 'Pongamia Leaf Gall & Rust Disease Complex',
      causes: 'Caused by Eriophyid mite infestation (creating characteristic horn galls) and Ravenelia hobsonii fungal rust.',
      tools: ['Wettable Sulfur (3g/L)', 'Abamectin or Dicofol', 'Pole pruner', 'High-pressure sprayer'],
      steps: [
        { step: 1, title: 'Examine Galls & Rust', instruction: 'Inspect leaves for horn-shaped cylindrical galls and brownish-yellow rust pustules.', points: ['Horn galls are green/reddish outgrowths induced by microscopic mites.', 'Heavy infestation leads to premature defoliation and seed reduction.'] },
        { step: 2, title: 'Prune Gall-Infested Shoots', instruction: 'Prune shoots displaying dense gall clusters before the adult mites disperse.', points: ['Bag and burn pruned shoots immediately.', 'Greatly suppresses the next generation of mites.'] },
        { step: 3, title: 'Miticidal & Fungicidal Spray', instruction: 'Spray Wettable Sulfur (3g/L) combined with Abamectin (0.5ml/L).', points: ['Sulfur acts as both a protective rust fungicide and an effective miticide.', 'Apply thoroughly to both upper and lower leaf surfaces.'] },
        { step: 4, title: 'Neem Seed Kernel Extract (NSKE)', instruction: 'Spray 5% NSKE or cold-pressed Neem Oil (5ml/L) as a natural bio-deterrent.', points: ['Inhibits mite feeding, oviposition, and nymphal development.', 'Safe for beneficial predatory mites.'] },
        { step: 5, title: 'Rake Fallen Leaves', instruction: 'Collect fallen rust-infected foliage from the ground around the tree basin.', points: ['Eliminates resting teliospores that re-infect next spring.', 'Keep ground clean.'] },
        { step: 6, title: 'Canopy Thinning', instruction: 'Lightly thin crossing interior branches to enhance air velocity through the tree.', points: ['Improves spray penetration and reduces localized humid pockets.', 'Allows sunlight into shaded branches.'] },
        { step: 7, title: 'Soil Fertilization', instruction: 'Apply organic compost enriched with beneficial bio-agents around the root zone.', points: ['Strengthens systemic plant vigor and leaf cuticle thickness.', 'Helps tree outgrow gall damage.'] },
        { step: 8, title: 'Early Morning Spraying', instruction: 'Perform chemical applications during cool morning hours.', points: ['Mites are more active on surface and sulfur will not cause leaf burn.', 'Spray when wind speeds are below 8 km/h.'] },
        { step: 9, title: 'Monitor Leaf Flushes', instruction: 'Check emerging tender leaves after 14 days for tiny developing bumps.', points: ['Repeat miticide application if new horn buds appear.', 'Rotate miticide active ingredients.'] },
        { step: 10, title: 'Maintain Long-Term Health', instruction: 'Water young trees during summer drought to maintain sap pressure.', points: ['High-vigor trees show significantly greater resistance to gall formation.', 'Log progress in Farm AI.'] }
      ]
    },
    healthy: {
      causes: 'The Pongamia Pinnata (Karanja) tree has lustrous, bright green pinnate foliage with smooth bark and strong canopy structure.',
      tools: ['Water hose', 'Pruners', 'Compost'],
      steps: [
        { step: 1, title: 'Preserve Natural Predators', instruction: 'Avoid unnecessary broad-spectrum chemical sprays to protect predatory mites.', points: ['Nature provides effective biological control against gall pests.', 'Encourage ladybugs and predatory insects.'] },
        { step: 2, title: 'Occasional Deep Watering', instruction: 'Provide deep irrigation once a month during prolonged dry summer months.', points: ['Supports extensive taproot and lush foliage development.', 'Pongamia is nitrogen-fixing and highly resilient.'] },
        { step: 3, title: 'Monitor Pod Development', instruction: 'Track seed pod maturation in winter for harvesting valuable bio-diesel/neem oil seeds.', points: ['Healthy trees yield high-oil seed crops.', 'Harvest when pods turn dark brown.'] }
      ]
    }
  }
};

/**
 * Generates an accurate, actionable diagnosis and recovery plan
 * for any of the 10 crops supported by the new vision model.
 */
export function getPlantOfflineDiagnosis(
  plantName: string,
  isHealthy: boolean,
  confidence: number,
  weather?: WeatherData
): AnalysisResult {
  const profile = PLANT_KNOWLEDGE_BASE[plantName];
  const confStr = (confidence * 100).toFixed(1);

  if (!profile) {
    // Generic fallback for any other crop
    return {
      problem: `Identified: ${plantName} (${isHealthy ? 'Healthy' : 'Diseased'}) - ${confStr}% confidence`,
      severity: isHealthy ? 'low' : 'medium',
      causes: isHealthy
        ? 'Visual analysis indicates normal leaf tissue with no conspicuous pathogen marks.'
        : 'Symptom pattern suggests foliar stress or disease infection matching model indicators.',
      tools: isHealthy ? ['Observation', 'Clean Pruners'] : ['Targeted Treatment', 'Pruning shears', 'Protective Fungicide'],
      actionPlan: isHealthy ? [
        { step: 1, title: 'Model Result', instruction: `Model identified: ${plantName} as Healthy (${confStr}%)` },
        { step: 2, title: 'Routine Watering', instruction: 'Maintain regular watering and nutrient cycles.' },
        { step: 3, title: 'Periodic Scouting', instruction: 'Scout foliage weekly for any changes.' }
      ] : [
        { step: 1, title: 'Model Result', instruction: `Model identified: ${plantName} as Diseased (${confStr}%)` },
        { step: 2, title: 'Isolate & Prune', instruction: 'Prune affected leaves to prevent spread to adjacent plants.' },
        { step: 3, title: 'Apply Fungicide', instruction: 'Apply a broad-spectrum copper or bio-fungicide.' },
        { step: 4, title: 'Improve Airflow', instruction: 'Space plants appropriately to reduce humidity in the canopy.' }
      ],
      plantName,
      status: isHealthy ? 'Healthy' : 'Diseased',
      confidence
    };
  }

  if (isHealthy) {
    const healthyData = profile.healthy;
    return {
      problem: `${plantName} (Healthy) - ${confStr}% confidence`,
      severity: 'low',
      causes: healthyData.causes,
      tools: healthyData.tools,
      actionPlan: [
        { step: 1, title: 'Vision Identification', instruction: `Vision model confirmed healthy ${plantName} foliage with ${confStr}% confidence.` },
        ...healthyData.steps
      ].map((s, idx) => ({ ...s, step: idx + 1 })),
      plantName,
      status: 'Healthy',
      confidence
    };
  }

  const diseasedData = profile.diseased;
  let steps = [
    { step: 1, title: 'Vision Identification', instruction: `Detected ${diseasedData.diseaseName} on ${plantName} with ${confStr}% confidence.` },
    ...diseasedData.steps
  ];

  // Adjust steps based on real-time weather if available
  if (weather) {
    if (weather.windspeed > 20) {
      steps.splice(1, 0, {
        step: 2,
        title: 'Delay Foliar Spraying (High Wind)',
        instruction: `Current wind speed is ${weather.windspeed} km/h. Postpone foliar spraying until wind drops below 15 km/h to prevent spray drift.`,
        points: ['Chemical drift can harm non-target plants and reduce effectiveness.', 'Apply soil drenches instead while waiting for calm conditions.']
      });
    } else if (weather.temperature > 35) {
      steps.splice(1, 0, {
        step: 2,
        title: 'Midday Heat Warning',
        instruction: `Current temperature is ${weather.temperature}°C. Avoid spraying fungicides in direct sun to avoid chemical leaf burn (phytotoxicity).`,
        points: ['Spray only before 8:00 AM or after 5:30 PM.', 'Hydrate plants well before applying protective sprays.']
      });
    }
  }

  // Renumber steps sequentially
  steps = steps.map((s, idx) => ({ ...s, step: idx + 1 }));

  return {
    problem: `${plantName}: ${diseasedData.diseaseName} (${confStr}% confidence)`,
    severity: confidence > 0.65 ? 'high' : 'medium',
    causes: diseasedData.causes,
    tools: diseasedData.tools,
    actionPlan: steps,
    plantName,
    status: 'Diseased',
    confidence
  };
}

/**
 * Main Agricultural Issue Analysis Function
 * Handles photo and text inputs.
 */
export const analyzeCropIssue = async (data: AnalyzeRequest): Promise<AnalysisResult> => {

  try {
    // 1. Text Query Analysis
    if (data.type === 'text' && data.content) {
      if (!isAgricultureQuery(data.content)) {
        throw new Error(AGRICULTURE_SCOPE_MESSAGE);
      }
      return await tfjsService.analyzeText(data.content, data);
    }

    // 2. Photo Analysis via Teachable Machine model
    if (data.type === 'photo' && data.imageElement) {
      return await tfjsService.analyzeImage(data.imageElement, data);
    }

  } catch (error) {
    throw error instanceof Error ? error : new Error('Analysis could not be completed. Please try again.');
  }
  throw new Error('Choose a supported text or photo input and try again.');
};

export const resultAIService = {
  analyze: analyzeCropIssue,
  parsePlantLabel,
  getPlantOfflineDiagnosis,
  getSupportedPlants: () => Object.keys(PLANT_KNOWLEDGE_BASE),
};

export default resultAIService;
