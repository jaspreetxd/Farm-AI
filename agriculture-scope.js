const AGRICULTURE_TERMS = /\b(?:agricultur\w*|agronom\w*|farm(?:ing|er|ers)?|crop\w*|plant\w*|seed\w*|seedling\w*|leaf|leaves|stem\w*|root\w*|flower\w*|fruit\w*|vegetable\w*|orchard\w*|greenhouse\w*|nurser\w*|field\w*|soil\w*|compost\w*|fertili[sz]\w*|manure\w*|nutrient\w*|irrigat\w*|drip\s+irrigation|hydropon\w*|sow\w*|sowing|germin\w*|cultivat\w*|grow\w*|harvest\w*|post[- ]harvest|yield\w*|pest\w*|insect\w*|fung\w*|disease\w*|weed\w*|pesticide\w*|herbicide\w*|fungicide\w*|insecticide\w*|spray\w*|tractor\w*|plou?gh\w*|tiller\w*|harvester\w*|farm\s+machin\w*|farm\s+equipment|farm\s+tool\w*|sprayer\w*|prun\w*|mulch\w*|livestock\w*|cattle\w*|dairy\w*|poultry\w*|goat\w*|sheep\w*|beekeep\w*|apiar\w*|maize|corn|wheat|rice|paddy|barley|oat\w*|sorghum|millet|soybean\w*|cotton|tomato\w*|potato\w*|onion\w*|pepper\w*|chilli\w*|chili\w*|cabbage|cauliflower|okra|brinjal|eggplant|cucumber\w*|pumpkin\w*|mango\w*|banana\w*|citrus|orange\w*|apple\w*|grape\w*|guava\w*|papaya\w*|pineapple\w*|avocado\w*|strawberr\w*|coffee|cocoa|tea\s+plant\w*|sugarcane|groundnut\w*|peanut\w*|mustard|sunflower\w*|lentil\w*|chickpea\w*|bean\w*|pea\w*)\b/i;
const CONTEXTUAL_FARMING_TERMS = /\b(?:chemical\w*|machiner\w*|equipment|tools?|implements?)\b/i;
const CLEARLY_UNRELATED_TERMS = /\b(?:python|javascript|typescript|java|c\+\+|programming|software|web\s+app|website|movie|film|song|celebrity|politic\w*|football|basketball|video\s+game)\b/i;
const FARM_TECH_CONTEXT = /(?:\b(?:python|javascript|typescript|java|c\+\+|code|program|script|software)\b.{0,100}\b(?:farm|agricultur\w*|crop\w*|plant\w*|soil|irrigat\w*|fertili[sz]\w*|harvest\w*|pest\w*|livestock|tractor)\b|\b(?:farm|agricultur\w*|crop\w*|plant\w*|soil|irrigat\w*|fertili[sz]\w*|harvest\w*|pest\w*|livestock|tractor)\b.{0,100}\b(?:python|javascript|typescript|java|c\+\+|code|program|script|software)\b)/i;

export function isAgricultureQuery(text) {
  if (typeof text !== 'string') return false;
  if (CLEARLY_UNRELATED_TERMS.test(text) && !FARM_TECH_CONTEXT.test(text)) return false;
  if (AGRICULTURE_TERMS.test(text)) return true;
  return CONTEXTUAL_FARMING_TERMS.test(text) && !CLEARLY_UNRELATED_TERMS.test(text);
}

export function isAgricultureAnswer(text) {
  return typeof text === 'string' && AGRICULTURE_TERMS.test(text);
}

export const AGRICULTURE_SCOPE_MESSAGE = 'I can only help with farming and agriculture, including crops, plants, soil, irrigation, farm inputs, machinery, tools, and livestock. Please ask a farming-related question.';
