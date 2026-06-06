// Simple rule-based NLP classifier (no external API needed)
const KEYWORDS = {
  traffic: ['traffic', 'jam', 'road', 'signal', 'congestion', 'car', 'vehicle', 'route'],
  pollution: ['pollution', 'smoke', 'air', 'dust', 'smog', 'toxic', 'fumes', 'smell'],
  waste: ['garbage', 'waste', 'trash', 'litter', 'dump', 'dirty', 'clean', 'rubbish'],
  safety: ['accident', 'crime', 'unsafe', 'danger', 'theft', 'fight', 'street light', 'dark'],
  convenience: ['park', 'bench', 'footpath', 'wifi', 'water', 'facility', 'broken', 'repair']
};

const URGENT_WORDS = ['urgent', 'emergency', 'critical', 'immediately', 'dangerous', 'serious', 'bad'];

export const classifyIssue = (text) => {
  const lower = text.toLowerCase();
  let bestCategory = 'convenience';
  let bestScore = 0;

  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestCategory = cat; }
  }

  const isUrgent = URGENT_WORDS.some(w => lower.includes(w));
  const urgency = isUrgent ? 'critical' : bestScore > 1 ? 'high' : 'medium';

  return { category: bestCategory, urgency, confidence: Math.min(bestScore * 25, 95) || 40 };
};

export const getSentiment = (text) => {
  const negative = ['not', 'bad', 'worst', 'terrible', 'horrible', 'dirty', 'broken', 'unsafe'];
  const positive = ['good', 'nice', 'clean', 'fixed', 'improved', 'safe'];
  const lower = text.toLowerCase();
  const negCount = negative.filter(w => lower.includes(w)).length;
  const posCount = positive.filter(w => lower.includes(w)).length;
  if (negCount > posCount) return 'negative';
  if (posCount > negCount) return 'positive';
  return 'neutral';
};
