const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'piss',
  'bastard', 'slut', 'whore', 'cock', 'cunt',
];

const SLUR_LIST = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'tranny', 'chink',
  'spic', 'kike', 'wetback', 'gook',
];

const SPAM_PATTERNS = [
  /\b(buy now|click here|free money|act now|limited time)\b/i,
  /https?:\/\/\S+\.(ru|cn|xyz|top|buzz)\b/i,
  /(make \$|earn \$|\$\d{3,}.*per (day|week|hour))/i,
];

function buildWordRegex(words: string[]): RegExp {
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

const profanityRegex = buildWordRegex(PROFANITY_LIST);
const slurRegex = buildWordRegex(SLUR_LIST);

export interface ContentCheckResult {
  flagged: boolean;
  reasons: string[];
}

export function checkContent(text: string): ContentCheckResult {
  const reasons: string[] = [];

  if (slurRegex.test(text)) {
    reasons.push('profanity');
  } else if (profanityRegex.test(text)) {
    reasons.push('profanity');
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push('spam');
      break;
    }
  }

  return { flagged: reasons.length > 0, reasons };
}
