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
}

import type { WeatherData } from '../WeatherAI/weatherai';

export interface AnalyzeRequest {
  type: string;
  content?: string;
  imageElement?: HTMLImageElement;
  location?: { lat: number; lon: number };
  weather?: WeatherData;
}

const mockResults: Record<string, AnalysisResult> = {
  default: {
    problem: 'Early Blight (Fungal Infection)',
    severity: 'high',
    causes: 'High humidity, prolonged leaf wetness, and poor air circulation in the lower canopy.',
    tools: ['Copper-based Fungicide', 'Pruning Shears', 'Drip Irrigation System'],
    actionPlan: [
      { step: 1, title: 'Stop Overhead Watering', instruction: 'Stop overhead watering immediately.', points: ['Stop overhead watering immediately to reduce leaf wetness.', 'Wet foliage accelerates the spread of fungal spores.', 'Check all sprinkler heads and disable those aimed at the canopy.'] },
      { step: 2, title: 'Switch to Drip Irrigation', instruction: 'Switch to drip irrigation to keep foliage dry.', points: ['Install or switch to a drip irrigation system at the root zone.', 'Water in the early morning so any surface moisture dries quickly.', 'Maintain consistent soil moisture to reduce plant stress.'] },
      { step: 3, title: 'Sanitize Tools', instruction: 'Sanitize pruning shears with 70% alcohol.', points: ['Wipe all cutting blades with 70% isopropyl alcohol before use.', 'Re-sanitize between each cut to prevent cross-contamination.', 'Never use rusty or blunt tools on infected plants.'] },
      { step: 4, title: 'Prune Infected Leaves', instruction: 'Carefully prune heavily infected lower leaves.', points: ['Remove all leaves showing brown spots, yellowing, or lesions.', 'Cut at the base of the stem cleanly without tearing.', 'Start from the bottom of the plant and work upward.'] },
      { step: 5, title: 'Dispose of Material', instruction: 'Dispose of infected leaves away from the field.', points: ['Collect all pruned and fallen leaves in sealed plastic bags.', 'Do not compost infected material — disease spores can survive.', 'Bag and remove them completely from your property.'] },
      { step: 6, title: 'Improve Air Circulation', instruction: 'Improve spacing between plants to enhance air flow.', points: ['Increase spacing between plants to at least 45–60 cm if possible.', 'Prune lower branches to allow airflow under the canopy.', 'Avoid dense planting in future seasons.'] },
      { step: 7, title: 'Apply Fungicide', instruction: 'Apply a copper-based fungicide to remaining healthy foliage.', points: ['Spray a copper-based fungicide thoroughly on all leaf surfaces.', 'Apply in the early morning or late evening to avoid leaf burn.', 'Ensure complete coverage, especially on the undersides of leaves.'] },
      { step: 8, title: 'Daily Monitoring', instruction: 'Monitor plants daily for new spots.', points: ['Inspect each plant daily for new lesions or discoloration.', 'Keep a log to track the progression or regression of the disease.', 'Flag severely affected plants for priority treatment.'] },
      { step: 9, title: 'Reapply Treatment', instruction: 'Reapply fungicide after heavy rains or every 7-10 days.', points: ['Reapply fungicide every 7–10 days during humid conditions.', 'Always reapply after heavy rainfall that washes off the coating.', 'Alternate fungicide types to prevent resistance build-up.'] },
      { step: 10, title: 'Plan Crop Rotation', instruction: 'Practice crop rotation for the next growing season.', points: ['Do not plant the same crop family in the same bed next season.', 'Rotate with legumes or root vegetables to break disease cycles.', 'Amend soil with compost before replanting to restore health.'] }
    ]
  }
};

import { tfjsService } from './tfjsService';

export const analyzeCropIssue = async (data: AnalyzeRequest): Promise<AnalysisResult> => {
  console.log('Analyzing:', data);
  
  try {
    if (data.type === 'text' && data.content) {
      return await tfjsService.analyzeText(data.content, data);
    } 
    else if (data.type === 'photo' && data.imageElement) {
      return await tfjsService.analyzeImage(data.imageElement, data);
    }
    else if (data.type === 'audio') {
      // Mock progress callback
      return await tfjsService.analyzeAudio((word) => console.log('Heard:', word));
    }
  } catch (error) {
    console.error('TFJS Analysis Error:', error);
    // Fallback to mock data if models fail to load or error occurs
  }

  // Simulate network delay for mock fallback
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return mockResults.default;
};
