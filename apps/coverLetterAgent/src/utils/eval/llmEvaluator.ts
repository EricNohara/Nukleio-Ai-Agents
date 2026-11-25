import OpenAI from "openai";
import { ILlmEvaluationResult } from "../../interfaces/IEvaluator";
import { WritingAnalysis } from "../../types/writingAnalysis";
import { UserInfo } from "../../types/userInfo";
import { JobInfo } from "../../types/jobInfo";

type CompactEval = {
  s: number;
  st: string[];
  w: string[];
  r: string[];
};

const evalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    s: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Overall score from 0 to 100.",
    },
    st: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", maxLength: 75 },
      description: "3 strengths, each <=75 chars.",
    },
    w: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", maxLength: 75 },
      description: "3 weaknesses, each <=75 chars.",
    },
    r: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string", maxLength: 75 },
      description: "3 revision instructions, each <=75 chars.",
    },
  },
  required: ["s", "st", "w", "r"],
} as const;

function buildPrompt(includeWritingStyle: boolean): string {
  return includeWritingStyle
    ? [
        "Evaluate the provided DRAFT.",
        "Use USER_DATA, JOB_DATA, WRITING_ANALYSIS, WRITING_SAMPLE, and the DRAFT only.",
        "Judge clarity, impact, readability, professionalism, job relevance, technical alignment, and style match.",
        "Be strict.",
        "st,w,r: exactly 3 items each, each <=75 chars.",
      ].join(" ")
    : [
        "Evaluate the provided DRAFT.",
        "Use USER_DATA, JOB_DATA, and the DRAFT only.",
        "Judge clarity, impact, readability, professionalism, job relevance, and technical alignment.",
        "Be strict.",
        "st,w,r: exactly 3 items each, each <=75 chars.",
      ].join(" ");
}

function mapCompactEval(result: CompactEval): ILlmEvaluationResult {
  return {
    score: result.s,
    strengths: result.st,
    weaknesses: result.w,
    recommendations: result.r,
  };
}

export default async function llmEvaluator(
  clientOpenAI: OpenAI,
  draft: string,
  userInfo: UserInfo,
  jobData: JobInfo,
  writingAnalysis: WritingAnalysis | null,
  writingSample?: string,
): Promise<ILlmEvaluationResult> {
  const dataMessage = [
    "DRAFT:",
    draft,
    "",
    "USER_DATA:",
    JSON.stringify(userInfo, null, 2),
    "",
    "JOB_DATA:",
    JSON.stringify(jobData, null, 2),
    ...(writingAnalysis
      ? ["", "WRITING_ANALYSIS:", JSON.stringify(writingAnalysis, null, 2)]
      : []),
    ...(writingAnalysis && writingSample
      ? ["", "WRITING_SAMPLE:", writingSample]
      : []),
  ].join("\n");

  const response = await clientOpenAI.responses.create({
    model: "gpt-5.4-mini",
    temperature: 0.2,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: buildPrompt(writingAnalysis !== null),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: dataMessage,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "eval",
        strict: true,
        schema: evalSchema,
      },
    },
  });

  const raw = response.output_text?.trim();
  if (!raw) throw new Error("LLM evaluator returned no output.");

  let parsed: CompactEval;
  try {
    parsed = JSON.parse(raw) as CompactEval;
  } catch (err) {
    throw new Error(`Failed to parse LLM evaluator output: ${String(err)}`);
  }

  return mapCompactEval(parsed);
}
