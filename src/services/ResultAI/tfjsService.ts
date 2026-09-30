import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import * as qna from '@tensorflow-models/qna';
import * as speechCommands from '@tensorflow-models/speech-commands';
import { GoogleGenerativeAI } from '@google/generative-ai';
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



export const tfjsService = {
  analyzeImage: async (imageElement: HTMLImageElement, requestData?: AnalyzeRequest): Promise<AnalysisResult> => {
    try {
      console.log('Loading Custom TM model...');
      const modelURL = '/tm-model/model.json';
      const metadataURL = '/tm-model/metadata.json';
      
      const model = await tmImage.load(modelURL, metadataURL);
      console.log('Model loaded. Classifying image...');
      
      const predictions = await model.predict(imageElement);
      console.log('Predictions:', predictions);
      
      predictions.sort((a, b) => b.probability - a.probability);
      const topPrediction = predictions[0];
      
      const className = topPrediction.className;
      const isHealthy = className.toLowerCase().includes('healthy');
      let aiResult: Partial<AnalysisResult> | null = null;
      
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!geminiApiKey && !isHealthy) {
        return {
          problem: `Identified: ${className} (${(topPrediction.probability * 100).toFixed(1)}% confidence)`,
          severity: 'high',
          causes: '⚠️ Gemini API Key is missing! You need to add your API key to the .env file for the AI to generate a diagnosis.',
          tools: ['Add VITE_GEMINI_API_KEY to .env', 'Restart Server'],
          actionPlan: [
            { step: 1, title: 'Model Result', instruction: `Model identified: ${className}` },
            { step: 2, title: 'Create .env File', instruction: 'Create a .env file in the root of your project.' },
            { step: 3, title: 'Add API Key', instruction: 'Add your Gemini API key: VITE_GEMINI_API_KEY=your_key' },
            { step: 4, title: 'Restart Server', instruction: 'Restart your dev server to see the magic!' }
          ]
        };
      }
      if (!isHealthy && geminiApiKey) {
        try {
          console.log('Fetching dynamic diagnosis from Gemini for:', className);
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const genModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const prompt = `A vision model classified a crop image as "${className}" with ${(topPrediction.probability * 100).toFixed(1)}% confidence. 
Provide a JSON response representing an agricultural analysis result.
Do not use markdown blocks, just return the raw JSON object.
Format:
{
  "severity": "low", "medium", or "high",
  "causes": "Detailed 1-2 sentence explanation of what causes this disease and how it happens.",
  "tools": ["Tool 1", "Tool 2", "Tool 3"],
  "actionPlan": [
    { "step": 1, "title": "Short Step Name", "instruction": "One sentence summary", "points": ["Detailed bullet 1", "Detailed bullet 2", "Detailed bullet 3"] },
    { "step": 2, "title": "Short Step Name", "instruction": "One sentence summary", "points": ["Detailed bullet 1", "Detailed bullet 2", "Detailed bullet 3"] }
  ]
}
Each step MUST have:
- "title": 2-4 words (e.g. "Inspect Leaves", "Apply Fungicide")
- "instruction": one short summary sentence
- "points": an array of 3-4 specific, actionable bullet points expanding on the step
If the disease is generic (like 'Mango diseased'), infer common diseases for that plant and give a practical, highly detailed action plan with a minimum of 10 steps.`;

          let contextPrompt = prompt;
          if (requestData?.location && requestData?.weather) {
            contextPrompt += `\n\nCONTEXT: The user is currently at latitude ${requestData.location.lat}, longitude ${requestData.location.lon}. The current weather temperature is ${requestData.weather.temperature}°C, wind speed is ${requestData.weather.windspeed} km/h, and WMO weather code is ${requestData.weather.weathercode}. Please tailor your steps and tool recommendations considering these exact current weather conditions (e.g. mention delaying spraying if windy, or watering if hot).`;
          }

          const result = await genModel.generateContent(contextPrompt);
          const text = result.response.text();
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          aiResult = JSON.parse(cleanJson);
        } catch (error) {
          console.error("Gemini AI fallback failed:", error);
        }
      }
      
      const entryToUse = aiResult || {};
      return {
        problem: `Identified: ${className} (${(topPrediction.probability * 100).toFixed(1)}% confidence)`,
        severity: entryToUse.severity || (isHealthy ? 'low' : (topPrediction.probability > 0.6 ? 'high' : 'medium')),
        causes: entryToUse.causes || (isHealthy ? 'The plant appears healthy based on our visual analysis.' : 'This specific disease signature was detected by our trained AI model.'),
        tools: entryToUse.tools || (isHealthy ? ['Observation'] : ['Targeted Treatment', 'Pruning shears', 'Appropriate fungicide/pesticide']),
        actionPlan: entryToUse.actionPlan || (isHealthy ? [
          { step: 1, title: 'Model Result', instruction: `Model identified: ${className}` },
          { step: 2, title: 'Maintain Routine', instruction: 'Continue regular watering and nutrient schedules.' },
          { step: 3, title: 'Periodic Monitoring', instruction: 'Monitor periodically for any changes.' }
        ] : [
          { step: 1, title: 'Model Result', instruction: `Model identified: ${className}` },
          { step: 2, title: 'Isolate Plant', instruction: 'Isolate the affected plant if possible to prevent spread.' },
          { step: 3, title: 'Seek Expert Advice', instruction: 'Research specific treatments for the identified issue or consult a local agronomist.' }
        ])
      };
    } catch (error) {
      console.error('Error in image analysis:', error);
      throw new Error('Failed to analyze image.');
    }
  },
  analyzeText: async (question: string, requestData?: AnalyzeRequest): Promise<AnalysisResult> => {
    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (geminiApiKey) {
        console.log('Using Gemini for text analysis...');
        try {
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const genModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const prompt = `A farmer has described the following issue with their crop: "${question}".
Provide a JSON response representing an agricultural analysis result.
Do not use markdown blocks, just return the raw JSON object.
Format:
{
  "problem": "Brief name of the most likely disease or pest",
  "severity": "low", "medium", or "high",
  "causes": "Detailed 1-2 sentence explanation of what causes this issue based on the description.",
  "tools": ["Tool 1", "Tool 2", "Tool 3"],
  "actionPlan": [
    { "step": 1, "title": "Short Step Name", "instruction": "One sentence summary", "points": ["Detailed bullet 1", "Detailed bullet 2", "Detailed bullet 3"] },
    { "step": 2, "title": "Short Step Name", "instruction": "One sentence summary", "points": ["Detailed bullet 1", "Detailed bullet 2", "Detailed bullet 3"] }
  ]
}
Each step MUST have:
- "title": 2-4 words (e.g. "Inspect Leaves", "Apply Fungicide")
- "instruction": one short summary sentence
- "points": an array of 3-4 specific, actionable bullet points expanding on the step
Give a practical, highly detailed, actionable action plan with a minimum of 10 steps to treat or manage the issue.`;
          
          let contextPrompt = prompt;
          if (requestData?.location && requestData?.weather) {
            contextPrompt += `\n\nCONTEXT: The user is currently at latitude ${requestData.location.lat}, longitude ${requestData.location.lon}. The current weather temperature is ${requestData.weather.temperature}°C, wind speed is ${requestData.weather.windspeed} km/h, and WMO weather code is ${requestData.weather.weathercode}. Please tailor your steps and tool recommendations considering these exact current weather conditions.`;
          }
          
          const result = await genModel.generateContent(contextPrompt);
          const text = result.response.text();
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const aiResult = JSON.parse(cleanJson);
          return aiResult as AnalysisResult;
        } catch (error) {
          console.error("Gemini text analysis failed, falling back to QnA model:", error);
        }
      }

      console.log('Loading QnA model...');
      const model = await qna.load();
      console.log('Model loaded. Finding answers...');
      
      const answers = await model.findAnswers(question, CROP_KNOWLEDGE_BASE);
      console.log('Answers:', answers);
      
      if (answers && answers.length > 0) {
        const bestAnswer = answers[0];
        return {
          problem: `Based on description: ${bestAnswer.text}`,
          severity: 'medium',
          causes: 'Extracted from crop knowledge base using QnA model.',
          tools: ['Observation', 'Knowledge Base'],
          actionPlan: [
            { step: 1, title: 'Review Findings', instruction: 'Review the extracted information.' },
            { step: 2, title: 'Confidence Score', instruction: `QnA confidence score: ${(bestAnswer.score).toFixed(2)}` }
          ]
        };
      } else {
        return {
          problem: 'No specific disease identified from the description.',
          severity: 'low',
          causes: 'The text did not match any known patterns in our database.',
          tools: ['Visual Inspection'],
          actionPlan: [
            { step: 1, title: 'Add More Detail', instruction: 'Provide more detailed symptoms.' },
            { step: 2, title: 'Try Photo Upload', instruction: 'Try uploading a photo instead.' }
          ]
        };
      }
    } catch (error) {
      console.error('Error in text analysis:', error);
      throw new Error('Failed to analyze text.');
    }
  },
  analyzeAudio: async (onProgress: (word: string) => void): Promise<AnalysisResult> => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Loading Speech Commands model...');
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        console.log('Model loaded. Listening...');

        const words = recognizer.wordLabels();
        console.log('Recognizable words:', words);

        recognizer.listen(async (result) => {
          const scores = result.scores as Float32Array;
          const maxScore = Math.max(...Array.from(scores));
          const maxScoreIndex = scores.indexOf(maxScore);
          const recognizedWord = words[maxScoreIndex];
          
          console.log(`Recognized: ${recognizedWord} (${maxScore.toFixed(2)})`);
          onProgress(recognizedWord);

          if (maxScore > 0.8 && recognizedWord !== 'background_noise') {
            recognizer.stopListening();
            
            resolve({
              problem: `Speech Command Detected: "${recognizedWord.toUpperCase()}"`,
              severity: 'low',
              causes: 'Recognized via Audio Microphone input using Speech Commands model.',
              tools: ['Microphone'],
              actionPlan: [
                { step: 1, title: 'Command Detected', instruction: `You said: ${recognizedWord}` },
                { step: 2, title: 'About This Feature', instruction: 'This is a demonstration of Speech Command recognition.' }
              ]
            });
          }
        }, {
          probabilityThreshold: 0.75,
          invokeCallbackOnNoiseAndUnknown: false,
          overlapFactor: 0.5
        });
        setTimeout(() => {
          if (recognizer.isListening()) {
            recognizer.stopListening();
            resolve({
              problem: 'No clear speech command detected.',
              severity: 'low',
              causes: 'Timeout reached while listening.',
              tools: ['Microphone'],
              actionPlan: [
                { step: 1, title: 'Try Again', instruction: 'Please try again and speak clearly.' },
                { step: 2, title: 'Supported Commands', instruction: 'Use words like "up", "down", "yes", "no".' }
              ]
            });
          }
        }, 10000);

      } catch (error) {
        console.error('Error in audio analysis:', error);
        reject(new Error('Failed to analyze audio.'));
      }
    });
  }
};
