import OpenAI from "openai";
import { UserInfo } from "../types/userInfo";
import { JobInfo } from "../types/jobInfo";

type MatchBreakdownLLM = {
  education: number;
  experience: number;
  skills: number;
  projects: number;
  location: number;
  explanations: {
    education: string;
    experience: string;
    skills: string;
    projects: string;
    location: string;
  };
};

export type MatchBreakdown = {
  education: number;
  experience: number;
  skills: number;
  projects: number;
  location: number;
  explanations: {
    education: string;
    experience: string;
    skills: string;
    projects: string;
    location: string;
  };
  overall: number;
};

const matchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    education: { type: "integer", minimum: 0, maximum: 100 },
    experience: { type: "integer", minimum: 0, maximum: 100 },
    skills: { type: "integer", minimum: 0, maximum: 100 },
    projects: { type: "integer", minimum: 0, maximum: 100 },
    location: { type: "integer", minimum: 0, maximum: 100 },
    explanations: {
      type: "object",
      additionalProperties: false,
      properties: {
        education: { type: "string", maxLength: 120 },
        experience: { type: "string", maxLength: 120 },
        skills: { type: "string", maxLength: 120 },
        projects: { type: "string", maxLength: 120 },
        location: { type: "string", maxLength: 120 },
      },
      required: ["education", "experience", "skills", "projects", "location"],
    },
  },
  required: [
    "education",
    "experience",
    "skills",
    "projects",
    "location",
    "explanations",
  ],
} as const;

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function buildPrompt(): string {
  return `
    Score how well the applicant matches the job in each category from 0 to 100.
    Use ONLY: USER_DATA and JOB_DATA.

    TASK:
    Score each category from 0 to 100:
    - skills: overlap between user's listed skills/projects tech and job requirements
    - experience: relevance of prior roles and responsibilities to the job
    - education: degree/major/coursework alignment to requirements; if no education is required, education should be 100
    - projects: relevance of projects to the job domain or stack
    - location: match to job location, remote, hybrid, or in-person constraints; if fully remote, location should be 100

    For EACH category, also provide a ONE-SENTENCE explanation (<=120 chars) explaining the score.

    Be strict and realistic.
    Return only the JSON object matching the required schema.
  `.trim();
}

function buildDataMessage(userInfo: UserInfo, jobData: JobInfo): string {
  return [
    "USER_DATA:",
    JSON.stringify(userInfo, null, 2),
    "",
    "JOB_DATA:",
    JSON.stringify(jobData, null, 2),
  ].join("\n");
}

export default async function skillsMatchEvaluatorAgent(
  clientOpenAI: OpenAI,
  userInfo: UserInfo,
  jobData: JobInfo,
): Promise<MatchBreakdown> {
  const response = await clientOpenAI.responses.create({
    model: "gpt-5.4-mini",
    temperature: 0,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: buildPrompt(),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildDataMessage(userInfo, jobData),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "match_breakdown",
        strict: true,
        schema: matchSchema,
      },
    },
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    throw new Error("No response from LLM during skill matching evaluation");
  }

  let parsed: MatchBreakdownLLM;
  try {
    parsed = JSON.parse(raw) as MatchBreakdownLLM;
  } catch (err) {
    throw new Error(`Failed to parse match breakdown output: ${String(err)}`);
  }

  const education = clampScore(parsed.education);
  const experience = clampScore(parsed.experience);
  const skills = clampScore(parsed.skills);
  const projects = clampScore(parsed.projects);
  const location = clampScore(parsed.location);

  const overall = clampScore(
    0.3 * skills +
      0.3 * experience +
      0.2 * projects +
      0.1 * education +
      0.1 * location,
  );

  return {
    education,
    experience,
    skills,
    projects,
    location,
    explanations: parsed.explanations,
    overall,
  };
}
