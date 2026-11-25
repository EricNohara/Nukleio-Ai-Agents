import OpenAI from "openai";
import { IDraftEvaluationResult } from "../interfaces/IEvaluator";
import { WritingAnalysis } from "../types/writingAnalysis";
import { UserInfo } from "../types/userInfo";
import { JobInfo } from "../types/jobInfo";

function buildPrompt(writingAnalysis: WritingAnalysis | null) {
  return `
Revise the LATEST_DRAFT by implementing the FEEDBACK.

Use ONLY: USER_DATA, JOB_DATA, LATEST_DRAFT, FEEDBACK${writingAnalysis ? ", WRITING_ANALYSIS" : ""}${writingAnalysis ? ", WRITING_SAMPLE" : ""}

STRICT LETTER STRUCTURE:
1. Applicant name + contact info + date
2. Personalized greeting with hiring manager name if known
3. Strong intro paragraph
4. 1 - 2 technical body paragraphs linking user's skills to job requirements
5. Professional closing paragraph
6. "Sincerely," + 2 - 4 blank lines + applicant's full name

HARD REQUIREMENTS:
- Use the user's real information only
- Map technical skills directly to job requirements
- Preserve what already works unless FEEDBACK requires changing it
- Slight imperfections allowed
- Vary sentence length
- Keep sentences shorter than 25 words
- Avoid clichés / buzzwords
${
  writingAnalysis
    ? "- Match the writing style to the WRITING_SAMPLE and WRITING_ANALYSIS."
    : ""
}
- OUTPUT FORMAT: ONLY plain text cover letter
- WORD COUNT: 250 - 400 words
- PARAGRAPH COUNT: 3 - 5 paragraphs`.trim();
}

function buildDataMessage(
  feedback: IDraftEvaluationResult,
  draft: string,
  userInfo: UserInfo,
  jobData: JobInfo,
  writingAnalysis: WritingAnalysis | null,
  writingSample?: string,
) {
  return [
    "LATEST_DRAFT:",
    draft,
    "",
    "FEEDBACK:",
    JSON.stringify(feedback, null, 2),
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
}

export default async function revisionAgent(
  clientOpenAI: OpenAI,
  feedback: IDraftEvaluationResult,
  draft: string,
  userInfo: UserInfo,
  jobData: JobInfo,
  writingAnalysis: WritingAnalysis | null,
  writingSample?: string,
): Promise<string> {
  const response = await clientOpenAI.responses.create({
    model: "gpt-5.4-mini",
    temperature: 0.85,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: buildPrompt(writingAnalysis),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildDataMessage(
              feedback,
              draft,
              userInfo,
              jobData,
              writingAnalysis,
              writingSample,
            ),
          },
        ],
      },
    ],
  });

  const revisedDraft = response.output_text?.trim();

  if (!revisedDraft) {
    throw new Error("No response from LLM during cover letter revision");
  }

  return revisedDraft;
}
