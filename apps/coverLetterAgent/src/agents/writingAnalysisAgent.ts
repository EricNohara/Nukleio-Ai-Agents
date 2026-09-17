import {
  writingAnalysisSchema,
  qualitativeSchema,
} from "../schemas/writingSchema";
import {
  WritingAnalysis,
  QuantitativeMetrics,
  QualitativeMetrics,
} from "../types/writingAnalysis";
import "dotenv/config";
import cleanLLMOutput from "../utils/ai/cleanLLMResponse";
import OpenAI from "openai";
import { analyzeWritingQualitative } from "../utils/writing/textMetrics";

export default async function writingAnalysisAgent(
  clientOpenAI: OpenAI,
  sample: string,
  isDraft: boolean = false,
): Promise<WritingAnalysis> {
  if (!sample.trim()) {
    throw new Error("Writing sample is empty");
  }

  const writingTarget = isDraft
    ? "the LATEST_DRAFT stored in the conversation"
    : "the provided writing sample below";

  const prompt = `
  Analyze ${writingTarget} and return ONLY valid JSON matching EXACTLY this schema:

  {
    "tone": {
      "formality": "formal | casual | professional | conversational",
      "confidence": "tentative | assertive | persuasive",
      "sentiment": "positive | neutral | negative"
    },
    "sentencePatterns": {
      "structure": "simple | compound | complex | mixed",
      "variedPacing": "low | medium | high"
    },
    "cohesion": {
      "paragraphLength": "short | medium | long",
      "connectors": []
    }
  }

  Rules:
  - Output ONLY the JSON.
  - No commentary, no explanation.

  ${!isDraft ? `Writing Sample:\n"""${sample}"""` : ""}
  `.trim();

  // quantitative analysis
  const quantMetrics: QuantitativeMetrics =
    await analyzeWritingQualitative(sample);

  // qualitative analysis
  const response = await clientOpenAI.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const rawOutput = response.choices?.[0]?.message?.content?.trim();
  if (!rawOutput) {
    throw new Error("No response from LLM during writing style analysis");
  }

  let qualMetrics: QualitativeMetrics;
  try {
    const cleaned = cleanLLMOutput(rawOutput);
    qualMetrics = qualitativeSchema.parse(JSON.parse(cleaned));
  } catch (err) {
    throw new Error(`Failed to parse LLM output as JSON: ${err}`);
  }

  // build and return final output
  const combinedMetrics: WritingAnalysis = writingAnalysisSchema.parse({
    ...quantMetrics,
    ...qualMetrics,
  });

  return combinedMetrics;
}
