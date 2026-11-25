import OpenAI from "openai";
import { WritingAnalysis } from "../types/writingAnalysis";
import { UserInfo } from "../types/userInfo";
import { JobInfo } from "../types/jobInfo";

function generatePrompt(writingAnalysis: WritingAnalysis | null) {
  return `
You are a cover letter writer.

Write a 250 - 400 word cover letter using USER_DATA, JOB_DATA${writingAnalysis ? ", WRITING_ANALYSIS" : ""}${writingAnalysis ? ", WRITING_SAMPLE" : ""}.

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
- Slight imperfections allowed
- Vary sentence length
- Keep sentences shorter than 25 words
- Avoid buzzwords
${writingAnalysis ? "- Match the writing style to the WRITING_SAMPLE and WRITING_ANALYSIS." : ""}
- OUTPUT FORMAT: ONLY the plain text cover letter
- WORD COUNT: 250 - 400 words
- PARAGRAPH COUNT: 3 - 5 paragraphs
`.trim();
}

function buildDataMessage(
  userInfo: UserInfo,
  jobData: JobInfo,
  writingAnalysis: WritingAnalysis | null,
  writingSample?: string,
) {
  return [
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

export default async function firstDraftAgent(
  clientOpenAI: OpenAI,
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
            text: generatePrompt(writingAnalysis),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildDataMessage(
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

  const draft = response.output_text?.trim();

  if (!draft) {
    throw new Error("No response from LLM during cover letter generation");
  }

  return draft;
}
