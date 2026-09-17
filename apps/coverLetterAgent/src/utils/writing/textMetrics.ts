import { quantitativeSchema } from "../../schemas/writingSchema";
import { QuantitativeMetrics } from "../../types/writingAnalysis";

// --- basic utils ---
function countWords(text: string): number {
  return (text.trim().match(/\b\w+\b/g) || []).length;
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) || []).length || 1;
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;

  const syllables = word
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);

  return syllables ? syllables.length : 1;
}

function totalSyllables(text: string): number {
  return (
    text
      .toLowerCase()
      .match(/\b[a-z]+\b/g)
      ?.reduce((sum, w) => sum + countSyllables(w), 0) ?? 0
  );
}

// --- readability formulas ---
function fleschKincaidGrade(
  words: number,
  sentences: number,
  syllables: number,
) {
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

function textStandardFromGrade(grade: number): number {
  return Math.max(0, Math.round(grade));
}

// --- MAIN EXPORT ---
export function analyzeWritingQualitative(text: string): QuantitativeMetrics {
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const syllables = totalSyllables(text);

  const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);
  const avgSyllablesPerWord = syllables / Math.max(wordCount, 1);
  const grade = fleschKincaidGrade(wordCount, sentenceCount, syllables);
  const standard = textStandardFromGrade(grade);

  const punctuationComplexity =
    (text.match(/[;,:\-—]/g)?.length || 0) / Math.max(sentenceCount, 1);

  return quantitativeSchema.parse({
    avgSentenceLength,
    avgSyllablesPerWord,
    fleschKincaidGrade: grade,
    punctuationComplexity,
    textStandard: standard,
  });
}
