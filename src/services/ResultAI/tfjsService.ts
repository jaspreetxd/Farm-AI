import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import * as qna from '@tensorflow-models/qna';
import { llmService } from '../LLMService/llmService';
import { AGRICULTURE_SCOPE_MESSAGE, isAgricultureQuery } from '../../../agriculture-scope.js';
import { isSafePlantModelMatch, makeDiagnosisSafe } from './diagnosisSafety';
import type { AnalysisResult, AnalyzeRequest } from './mockData';

await tf.ready();

const CROP_KNOWLEDGE_BASE = `
Early Blight is a fungal infection that causes yellow spots and upward curling on tomato leaves. To treat it, use a copper-based fungicide and improve air circulation.
Powdery Mildew appears as white powdery spots on leaves and stems. It is caused by high humidity. Treat it with neem oil or sulfur fungicides.
Aphids are small insects that suck sap from plants, causing them to wilt and leaves to curl. Treat aphids by spraying plants with insecticidal soap or introducing ladybugs.
Nitrogen deficiency causes older leaves to turn pale green or yellow. Treat it by applying a nitrogen-rich fertilizer.
Blossom End Rot causes dark, sunken spots on the bottom of tomatoes or peppers. It is caused by calcium deficiency and uneven watering. Treat it by adding calcium to the soil and maintaining consistent watering.
Root Rot causes wilting, yellowing leaves, and mushy, brown roots. It is caused by overwatering and poor drainage. Treat it by reducing watering, improving soil drainage, and applying a fungicide if severe.
`;



import { parsePlantLabel, getPlantOfflineDiagnosis, PLANT_KNOWLEDGE_BASE } from './resultai';

let cachedTMModel: tmImage.CustomMobileNet | null = null;
let activeModelPath: string | null = null;

async function loadCustomTMModel(): Promise<tmImage.CustomMobileNet> {
  if (cachedTMModel) {
    return cachedTMModel;
  }

  try {
    const model = await tmImage.load('/tm-my-image-model/model.json', '/tm-my-image-model/metadata.json');
    cachedTMModel = model;
    activeModelPath = '/tm-my-image-model';
    return model;
  } catch {
    const fallbackModel = await tmImage.load('/tm-model/model.json', '/tm-model/metadata.json');
    cachedTMModel = fallbackModel;
    activeModelPath = '/tm-model';
    return fallbackModel;
  }
}

export const tfjsService = {
  getModelPath: () => activeModelPath,
  analyzeImage: async (imageElement: HTMLImageElement, requestData?: AnalyzeRequest): Promise<AnalysisResult> => {
    try {
      const model = await loadCustomTMModel();
      
      const predictions = await model.predict(imageElement);
      
      predictions.sort((a, b) => b.probability - a.probability);
      const topPrediction = predictions[0];
      const runnerUp = predictions[1];
      if (!topPrediction) {
        throw new Error('The image model returned no predictions.');
      }
      
      const parsed = parsePlantLabel(topPrediction.className);
      const { plantName, status, isHealthy, displayName } = parsed;
      const confidence = topPrediction.probability;
      const margin = runnerUp ? confidence - runnerUp.probability : 1;
      const confPercent = (confidence * 100).toFixed(1);

      // Avoid giving crop-specific advice when the model is unsure or two
      // classes are too close to distinguish reliably.
      if (
        status === 'Unknown' ||
        !PLANT_KNOWLEDGE_BASE[plantName] ||
        !isSafePlantModelMatch(plantName, confidence, margin)
      ) {
        return {
          problem: 'Could not identify the crop condition confidently',
          severity: 'low',
          causes: `The closest model match was ${displayName} at ${confPercent}% confidence. This is not enough to recommend a treatment.`,
          tools: [],
          actionPlan: [
            { step: 1, title: 'Retake Photo', instruction: 'Take a sharp, well-lit close-up of the affected leaves, avoiding shadows and busy backgrounds.' },
            { step: 2, title: 'Describe Symptoms', instruction: 'Add the crop name and describe where symptoms appear, their color, and when they began.' },
            { step: 3, title: 'Check Locally', instruction: 'If the crop is worsening, ask a local agricultural extension worker to inspect it before applying treatment.' }
          ],
          plantName,
          status: 'Unknown',
          confidence
        };
      }

      // Base offline diagnosis curated for the model crops
      const offlineResult = getPlantOfflineDiagnosis(
        plantName,
        isHealthy,
        confidence,
        requestData?.weather
      );

      // If plant is healthy, return the verified healthy diagnosis immediately
      if (isHealthy) {
        return makeDiagnosisSafe(offlineResult);
      }

      // Query Groq or Ollama LLM for deep agricultural diagnosis
      let aiResult: Partial<AnalysisResult> | null = null;
      try {
        aiResult = await llmService.generateCropDiagnosis({
          plantName,
          status,
          confidence,
          requestData
        });
      } catch { /* LLM unavailable, using offline diagnosis */ }
      
      const entryToUse = aiResult || {};
      return makeDiagnosisSafe({
        problem: entryToUse.causes
          ? `Identified: ${displayName} (${confPercent}% confidence)`
          : offlineResult.problem,
        severity: entryToUse.severity || offlineResult.severity,
        causes: entryToUse.causes || offlineResult.causes,
        tools: entryToUse.tools && entryToUse.tools.length > 0 ? entryToUse.tools : offlineResult.tools,
        actionPlan: entryToUse.actionPlan && entryToUse.actionPlan.length > 0 ? entryToUse.actionPlan : offlineResult.actionPlan,
        plantName,
        status,
        confidence
      });
    } catch (error) {
      console.error('Error in image analysis:', error);
      throw new Error('Failed to analyze image.', { cause: error });
    }
  },
  analyzeText: async (question: string, requestData?: AnalyzeRequest): Promise<AnalysisResult> => {
    if (!isAgricultureQuery(question)) {
      throw new Error(AGRICULTURE_SCOPE_MESSAGE);
    }
    try {
      // 1. Try Groq or Ollama LLM first
      try {
        const llmResult = await llmService.generateTextAnalysis(question, requestData);
        if (llmResult) {
          return makeDiagnosisSafe(llmResult);
        }
      } catch (error) {
        if (error instanceof Error && error.message === AGRICULTURE_SCOPE_MESSAGE) throw error;
        /* LLM unavailable, falling back to local QnA */
      }

      // 2. Fall back to local TensorFlow QnA model
      const model = await qna.load();
      
      const answers = await model.findAnswers(question, CROP_KNOWLEDGE_BASE);
      
      if (answers && answers.length > 0) {
        const bestAnswer = answers[0];
        return makeDiagnosisSafe({
          problem: `Based on description: ${bestAnswer.text}`,
          severity: 'medium',
          causes: 'Extracted from crop knowledge base using QnA model.',
          tools: ['Observation', 'Knowledge Base'],
          actionPlan: [
            { step: 1, title: 'Review Findings', instruction: 'Review the extracted information.' },
            { step: 2, title: 'Confidence Score', instruction: `QnA confidence score: ${(bestAnswer.score).toFixed(2)}` }
          ]
        });
      } else {
        const symptomQuestion = /\b(?:yellow|yellowing|spot|spots|wilt|wilting|rot|rotting|curl|curling|hole|holes|mold|mould|blight|lesion|stunted|dying|disease|pest|insect|fruit drop|leaf drop)\w*\b/i.test(question);
        return makeDiagnosisSafe({
          problem: symptomQuestion
            ? 'More details are needed to assess this crop problem.'
            : 'I need a little more context to give crop-specific guidance.',
          severity: 'low',
          causes: symptomQuestion
            ? 'A symptom such as yellowing can have several causes, including watering, soil, weather, pests, or disease. This description alone is not enough to identify which one.'
            : 'I could not produce a specific answer from the information provided. Fruit and vegetable questions are welcome; include the crop and what you want to know or solve.',
          tools: ['Crop and symptom notes', 'Visual inspection'],
          actionPlan: [
            { step: 1, title: 'Name the Crop', instruction: 'Share the fruit or vegetable name, variety if known, and its growth stage.' },
            { step: 2, title: 'Describe the Issue', instruction: symptomQuestion
              ? 'Say which leaves or fruit are affected, what the symptoms look like, and when they began.'
              : 'Describe your goal or question, and include your region and growing conditions if relevant.' },
            { step: 3, title: 'Add a Photo', instruction: 'For a plant health problem, upload a clear close-up and one photo of the whole plant.' }
          ]
        });
      }
    } catch (error) {
      console.error('Error in text analysis:', error);
      throw new Error('Failed to analyze text.', { cause: error });
    }
  },
};
