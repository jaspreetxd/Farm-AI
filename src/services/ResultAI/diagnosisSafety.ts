import type { AnalysisResult, ActionStep } from './resultai';
import { isAgricultureAnswer, isAgricultureQuery } from '../../../agriculture-scope.js';

// Until the app has a verified, location-specific product label source, never
// show an AI-suggested pesticide/fungicide/herbicide or application rate.
const CHEMICAL_ADVICE = /\b(?:pesticide|fungicide|herbicide|insecticide|miticide|bactericide|spray|spraying|chemical|active ingredient|copper oxychloride|copper[- ]based|mancozeb|azoxystrobin|difenoconazole|carbendazim|streptocycline|imidacloprid|abamectin|dicofol|sulfur|sulphur|bordeaux|neem oil|neem[- ]based|\d+(?:\.\d+)?\s*(?:g|kg|ml|l|ppm)\s*(?:\/|per)\s*\w+)/i;
const SPECIFIC_CHEMICAL_OR_RATE = /\b(?:copper oxychloride|copper[- ]based|mancozeb|azoxystrobin|difenoconazole|carbendazim|streptocycline|imidacloprid|abamectin|dicofol|hexaconazole|propiconazole|wettable sulfur|wettable sulphur|bordeaux|neem oil|\d+(?:\.\d+)?\s*(?:g|kg|ml|l|ppm)\s*(?:\/|per)\s*\w+)/i;
const GENERIC_CHEMICAL_TERMS = /\b(?:pesticide|fungicide|herbicide|insecticide|miticide|bactericide|chemical treatment|spray(?:ing)?)\b/i;
const CHEMICAL_ACTION = /\b(?:apply|use|spray|treat with|mix|drench|recommend|choose|purchase)\b/i;
const SAFE_CHEMICAL_CONTEXT = /\b(?:do not|don't|never|avoid|without|consult|ask|check with|confirm with|local guidance|follow the label)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasChemicalAction(value: unknown): boolean {
  if (typeof value === 'string') {
    if (SPECIFIC_CHEMICAL_OR_RATE.test(value)) return true;
    return value.split(/[.!?\n]+/).some((sentence) =>
      GENERIC_CHEMICAL_TERMS.test(sentence) &&
      CHEMICAL_ACTION.test(sentence) &&
      !SAFE_CHEMICAL_CONTEXT.test(sentence)
    );
  }
  if (Array.isArray(value)) return value.some(hasChemicalAction);
  if (!isRecord(value)) return false;
  return Object.values(value).some(hasChemicalAction);
}

function normalizeActionSteps(value: unknown): unknown {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : null;
  if (!source) return value;

  const normalized: unknown[] = [];
  for (const item of source) {
    if (typeof item !== 'string') {
      normalized.push(item);
      continue;
    }
    // Some models serialize the requested steps as numbered text rather than
    // objects. Split that text into bounded, reviewable step objects.
    const chunks = item
      .replace(/\r/g, '')
      .split(/\n(?=\s*\d+[.)]\s*)/)
      .map((chunk) => chunk.trim().replace(/^\d+[.)]\s*/, ''))
      .filter(Boolean);
    for (const chunk of chunks) {
      const words = chunk.split(/\s+/);
      normalized.push({
        step: normalized.length + 1,
        title: words.slice(0, Math.min(4, words.length)).join(' ').replace(/[,:;.]+$/, '').slice(0, 80) || 'Next Step',
        instruction: chunk.slice(0, 500),
      });
    }
  }
  return normalized.map((step, index) => isRecord(step) ? { ...step, step: index + 1 } : step);
}

function normalizeAIShape(value: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...value };
  if (Array.isArray(normalized.causes)) {
    normalized.causes = normalized.causes.filter((cause): cause is string => typeof cause === 'string').join(' ');
  }
  if (typeof normalized.causes === 'string' && normalized.causes.length > 1800) {
    normalized.causes = normalized.causes.slice(0, 1800);
  }
  if (typeof normalized.severity === 'string') {
    const severity = normalized.severity.trim().toLowerCase();
    normalized.severity = severity === 'moderate' ? 'medium' : severity === 'critical' ? 'high' : severity === 'minimal' ? 'low' : severity;
  }
  normalized.actionPlan = normalizeActionSteps(normalized.actionPlan);
  return normalized;
}

/** Validates untrusted model JSON at runtime before it can reach the UI. */
export function validateAIAnalysis(value: unknown, context?: string): AnalysisResult | null {
  if (!isRecord(value)) return null;
  const normalized = normalizeAIShape(value);
  const { problem, severity, causes, tools, actionPlan, plantName, status, confidence } = normalized;
  if (
    typeof problem !== 'string' || !problem.trim() || problem.length > 240 ||
    !['low', 'medium', 'high'].includes(String(severity)) ||
    typeof causes !== 'string' || !causes.trim() || causes.length > 1800 ||
    !Array.isArray(tools) || tools.length > 8 ||
    !Array.isArray(actionPlan) || actionPlan.length < 1 || actionPlan.length > 10
  ) return null;

  const validTools = tools.every((tool) => typeof tool === 'string' && tool.trim() && tool.length <= 120);
  const validSteps = actionPlan.every((step, index) => {
    if (!isRecord(step)) return false;
    return step.step === index + 1 &&
      typeof step.title === 'string' && !!step.title.trim() && step.title.length <= 80 &&
      typeof step.instruction === 'string' && !!step.instruction.trim() && step.instruction.length <= 500 &&
      (step.points === undefined || (Array.isArray(step.points) && step.points.length <= 6 && step.points.every((point) => typeof point === 'string' && point.length <= 300)));
  });
  if (!validTools || !validSteps || hasChemicalAction(normalized)) return null;

  const answerText = [problem, causes, ...tools, ...actionPlan.flatMap((step: ActionStep) => [step.title, step.instruction, ...(step.points || [])])].join(' ');
  if (!isAgricultureAnswer(answerText) && !(context && isAgricultureQuery(context))) return null;
  if (plantName !== undefined && (typeof plantName !== 'string' || !plantName.trim() || plantName.length > 100)) return null;
  if (status !== undefined && !['Healthy', 'Diseased', 'Unknown'].includes(String(status))) return null;
  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) return null;

  const uncertain = /outside farming scope|unable to diagnose|cannot identify|uncertain|not enough information|needs local inspection|needs more information/i.test(problem);
  if (uncertain && severity !== 'low') return null;
  return { ...normalized, severity: uncertain ? 'low' : severity } as unknown as AnalysisResult;
}

/** Sanitizes curated fallback results too, because no local label source is wired in yet. */
export function makeDiagnosisSafe(result: AnalysisResult): AnalysisResult {
  const tools = result.tools.filter((tool) => !CHEMICAL_ADVICE.test(tool));
  const safeSteps = result.actionPlan
    .filter((step) => !hasChemicalAction(step))
    .map((step, index) => ({ ...step, step: index + 1 }));
  const actionPlan = safeSteps.length > 0 ? safeSteps : [{
    step: 1,
    title: 'Get Local Guidance',
    instruction: 'Have a local agricultural extension worker confirm the cause before applying any treatment.',
  }];
  const unverifiedCauses = CHEMICAL_ADVICE.test(result.causes)
    ? 'The visible symptoms may have several causes; inspect the crop and confirm the diagnosis locally before choosing a treatment.'
    : result.causes;
  const causes = result.confidence !== undefined && !/preliminary possibility|not a confirmed diagnosis/i.test(unverifiedCauses)
    ? `This image-based result is preliminary, not a confirmed diagnosis. Possible cause: ${unverifiedCauses}`
    : unverifiedCauses;
  const rawProblem = CHEMICAL_ADVICE.test(result.problem)
    ? 'Treatment advice needs local verification'
    : result.problem;
  const problem = result.confidence !== undefined
    ? rawProblem.replace(/\b(?:identified|confirmed|diagnosed)\b/gi, 'possible match')
    : rawProblem;
  const stepsBeforeVerification = actionPlan.length >= 10 ? actionPlan.slice(0, 9) : actionPlan;
  const verificationStep = {
    step: stepsBeforeVerification.length + 1,
    title: 'Confirm Before Treatment',
    instruction: 'This is guidance, not a confirmed diagnosis. Check the symptoms with a local agricultural extension worker before taking high-impact action.',
  };
  const cautiousSteps = stepsBeforeVerification.map((step) => ({
    ...step,
    instruction: step.instruction.replace(/\b(?:confirmed|confirms|proves|diagnosed)\b/gi, 'may suggest'),
    points: step.points?.map((point) => point.replace(/\b(?:confirmed|confirms|proves|diagnosed)\b/gi, 'may suggest')),
  }));
  const withVerification = [...cautiousSteps, verificationStep];
  return { ...result, problem, causes, tools, actionPlan: withVerification };
}

export function isSafePlantModelMatch(plantName: string, confidence: number, margin: number): boolean {
  return !!plantName.trim() && Number.isFinite(confidence) && confidence <= 1 && confidence >= 0.8 && Number.isFinite(margin) && margin >= 0.2;
}
