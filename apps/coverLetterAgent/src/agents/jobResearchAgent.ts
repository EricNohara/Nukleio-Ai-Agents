import OpenAI from "openai";
import { JobInfo, JobInfoLlmResponse } from "../types/jobInfo";

function removeEmptyFields<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => removeEmptyFields(item))
      .filter((item) => {
        if (item === undefined || item === null || item === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          Object.keys(item).length === 0
        ) {
          return false;
        }
        return true;
      });

    return cleaned as T;
  }

  if (value && typeof value === "object") {
    const cleanedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, removeEmptyFields(val)] as const)
      .filter(([, val]) => {
        if (val === undefined || val === null || val === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (
          typeof val === "object" &&
          val !== null &&
          !Array.isArray(val) &&
          Object.keys(val).length === 0
        ) {
          return false;
        }
        return true;
      });

    return Object.fromEntries(cleanedEntries) as T;
  }

  return value;
}

const jobInfoSchema = {
  name: "job_info_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      work_mode: {
        type: ["string", "null"],
        enum: ["remote", "hybrid", "onsite", null],
      },
      locations: {
        type: ["array", "null"],
        items: { type: "string" },
        maxItems: 4,
      },
      qualifications: {
        type: ["array", "null"],
        items: { type: "string" },
        maxItems: 4,
      },
      responsibilities: {
        type: ["array", "null"],
        items: { type: "string" },
        maxItems: 4,
      },
      technologies: {
        type: ["array", "null"],
        items: { type: "string" },
        maxItems: 8,
      },
      company: {
        type: ["object", "null"],
        additionalProperties: false,
        properties: {
          industry: { type: ["string", "null"] },
          company_summary: {
            type: ["string", "null"],
            maxLength: 200,
            description:
              "Short company summary. Max 2 sentences, 200 characters.",
          },
        },
        required: ["industry", "company_summary"],
      },
      hiring_team: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: ["string", "null"] },
          },
          required: ["name"],
        },
      },
    },
    required: [
      "work_mode",
      "locations",
      "qualifications",
      "responsibilities",
      "technologies",
      "company",
      "hiring_team",
    ],
  },
} as const;

function buildPrompt() {
  return `
Extract structured job info for a cover-letter drafting agent.

RULES:
- Return only supported fields.
- Be concise and keep only the most important information.
- Include fields only if clearly supported by the text.
- Ignore perks, testimonials, compensation, and marketing unless useful for understanding the role.
- Do not copy large blocks from the posting.

CONSTRAINTS:
- company.company_summary <= 2 sentences, 200 characters.
- qualifications <= 4 items.
- responsibilities <= 4 items.
- technologies <= 8 items.
- locations <= 4 items.
  `.trim();
}

export default async function jobResearchAgent(
  clientOpenAI: OpenAI,
  jobDescriptionDump: string,
  jobTitle: string,
  companyName: string,
): Promise<JobInfo> {
  const completion = await clientOpenAI.chat.completions.create({
    model: "gpt-5.4-nano",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: jobInfoSchema,
    },
    messages: [
      {
        role: "developer",
        content: buildPrompt(),
      },
      {
        role: "user",
        content: jobDescriptionDump,
      },
    ],
  });

  const rawOutput = completion.choices?.[0]?.message?.content?.trim();
  if (!rawOutput) {
    throw new Error("No response from LLM during job info extraction");
  }

  let extracted: JobInfoLlmResponse;
  try {
    extracted = JSON.parse(rawOutput) as JobInfoLlmResponse;
  } catch (err) {
    throw new Error(`Failed to parse structured job info JSON: ${String(err)}`);
  }

  const cleaned = removeEmptyFields<JobInfoLlmResponse>(extracted);

  return removeEmptyFields<JobInfo>({
    ...cleaned,
    job_title: jobTitle,
    company: removeEmptyFields({
      name: companyName,
      ...(cleaned.company ?? {}),
    }),
  });
}
