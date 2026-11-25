import z from "zod";

// quantitative metrics
export const quantitativeSchema = z.object({
  avgSentenceLength: z.number(),
  avgSyllablesPerWord: z.number(),
  fleschKincaidGrade: z.number(),
  punctuationComplexity: z.number(),
  textStandard: z.number(),
});

// qualitative metrics
export const qualitativeSchema = z.object({
  tone: z.object({
    formality: z.enum(["formal", "casual", "professional", "conversational"]),
    confidence: z.enum(["tentative", "assertive", "persuasive"]),
    sentiment: z.enum(["positive", "neutral", "negative"]),
  }),
  sentencePatterns: z.object({
    structure: z.enum(["simple", "compound", "complex", "mixed"]),
    variedPacing: z.enum(["low", "medium", "high"]),
  }),
  cohesion: z.object({
    paragraphLength: z.enum(["short", "medium", "long"]),
    connectors: z.array(z.string()),
  }),
});

// combined qualitative and quantitative
export const writingAnalysisSchema = z.intersection(
  quantitativeSchema,
  qualitativeSchema,
);
