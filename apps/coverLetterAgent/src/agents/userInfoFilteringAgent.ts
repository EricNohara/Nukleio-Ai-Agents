import OpenAI from "openai";
import { z } from "zod";
import {
  UserEducation,
  UserExperience,
  UserInfo,
  UserProject,
} from "../types/userInfo";
import { JobInfo } from "../types/jobInfo";

type FilterLimits = {
  maxSkills?: number;
  maxExperiences?: number;
  maxProjects?: number;
  maxEducations?: number;
  maxCoursesPerEducation?: number;
};

const DEFAULT_LIMITS: Required<FilterLimits> = {
  maxSkills: 12,
  maxExperiences: 3,
  maxProjects: 3,
  maxEducations: 2,
  maxCoursesPerEducation: 8,
};

type LLMInput = {
  skills: string[];
  experiences: Array<{
    company: string;
    job_title: string;
    job_description: string;
  }>;
  projects: Array<{
    name: string;
    tech?: string[];
    description: string;
  }>;
  education: Array<{
    degree: string;
    fields_of_study?: string[];
    institution: string;
    courses?: string[];
  }>;
};

const filteredUserContentSchema = z
  .object({
    skills: z.array(z.string()).max(DEFAULT_LIMITS.maxSkills),
    experiences: z
      .array(
        z
          .object({
            company: z.string(),
            job_title: z.string(),
            job_description: z.string().max(75),
          })
          .strict(),
      )
      .max(DEFAULT_LIMITS.maxExperiences),
    projects: z
      .array(
        z
          .object({
            name: z.string(),
            tech: z.array(z.string()).nullable(),
            description: z.string().max(75),
          })
          .strict(),
      )
      .max(DEFAULT_LIMITS.maxProjects),
    education: z
      .array(
        z
          .object({
            degree: z.string(),
            fields_of_study: z.array(z.string()).nullable(),
            institution: z.string(),
            courses: z
              .array(z.string())
              .max(DEFAULT_LIMITS.maxCoursesPerEducation)
              .nullable(),
          })
          .strict(),
      )
      .max(DEFAULT_LIMITS.maxEducations),
  })
  .strict();

type FilteredUserContent = z.infer<typeof filteredUserContentSchema>;

function toLLMInput(userInfo: UserInfo): LLMInput {
  return {
    skills: userInfo.skills ?? [],
    experiences: (userInfo.experiences ?? []).map((experience) => ({
      company: experience.company,
      job_title: experience.job_title,
      job_description: experience.job_description,
    })),
    projects: (userInfo.projects ?? []).map((project) => ({
      name: project.name,
      ...(project.tech?.length ? { tech: project.tech } : {}),
      description: project.description,
    })),
    education: (userInfo.education ?? []).map((education) => ({
      degree: education.degree,
      ...(education.fields_of_study?.length
        ? { fields_of_study: education.fields_of_study }
        : {}),
      institution: education.institution,
      ...(education.courses?.length ? { courses: education.courses } : {}),
    })),
  };
}

function buildPrompt(): string {
  return `
Filter USER_DATA for content relevant to JOB_DATA.

Return these USER_DATA sections:
- skills
- experiences
- projects
- education

Rules:
1. Remove data irrelevant to JOB_DATA.
2. Keep the strongest and most relevant items.
3. Shorten every experiences[].job_description to <= 75 characters.
4. Shorten every projects[].description to <= 75 characters.
5. Keep descriptions factual and specific.
6. Do not invent anything not present in USER_DATA.
7. Return JSON only.

Selection limits:
- skills <= ${DEFAULT_LIMITS.maxSkills}
- experiences <= ${DEFAULT_LIMITS.maxExperiences}
- projects <= ${DEFAULT_LIMITS.maxProjects}
- education <= ${DEFAULT_LIMITS.maxEducations}
- courses per education <= ${DEFAULT_LIMITS.maxCoursesPerEducation}
`.trim();
}

function buildDataMessage(userInfo: LLMInput, jobData: JobInfo): string {
  return [
    "USER_DATA:",
    JSON.stringify(userInfo, null, 2),
    "",
    "JOB_DATA:",
    JSON.stringify(jobData, null, 2),
  ].join("\n");
}

function enforceHardLimits(data: FilteredUserContent): FilteredUserContent {
  return {
    skills: data.skills.slice(0, DEFAULT_LIMITS.maxSkills),
    experiences: data.experiences.slice(0, DEFAULT_LIMITS.maxExperiences),
    projects: data.projects
      .slice(0, DEFAULT_LIMITS.maxProjects)
      .map((project) => ({
        ...project,
        tech: project.tech ?? null,
      })),
    education: data.education
      .slice(0, DEFAULT_LIMITS.maxEducations)
      .map((edu) => ({
        ...edu,
        fields_of_study: edu.fields_of_study ?? null,
        courses: edu.courses
          ? edu.courses.slice(0, DEFAULT_LIMITS.maxCoursesPerEducation)
          : null,
      })),
  };
}

function mergeFilteredContent(
  original: UserInfo,
  filtered: FilteredUserContent,
): UserInfo {
  return {
    name: original.name,
    email: original.email,
    ...(original.phone_number ? { phone_number: original.phone_number } : {}),
    ...(original.current_address
      ? { current_address: original.current_address }
      : {}),
    ...(original.current_position
      ? { current_position: original.current_position }
      : {}),
    ...(original.current_company
      ? { current_company: original.current_company }
      : {}),

    skills: filtered.skills,
    experiences: filtered.experiences as UserExperience[],
    projects: filtered.projects.map((project) => ({
      name: project.name,
      ...(project.tech ? { tech: project.tech } : {}),
      description: project.description,
    })) as UserProject[],
    education: filtered.education.map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      ...(edu.fields_of_study ? { fields_of_study: edu.fields_of_study } : {}),
      ...(edu.courses ? { courses: edu.courses } : {}),
    })) as UserEducation[],
  };
}

export async function userInfoFilteringAgent(
  openAiClient: OpenAI,
  userInfo: UserInfo,
  jobData: JobInfo,
): Promise<UserInfo> {
  const llmInput = toLLMInput(userInfo);

  const response = await openAiClient.responses.create({
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
            text: buildDataMessage(llmInput, jobData),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "filtered_user_content",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            skills: {
              type: "array",
              items: { type: "string" },
              maxItems: DEFAULT_LIMITS.maxSkills,
            },
            experiences: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  company: { type: "string" },
                  job_title: { type: "string" },
                  job_description: { type: "string", maxLength: 75 },
                },
                required: ["company", "job_title", "job_description"],
              },
              maxItems: DEFAULT_LIMITS.maxExperiences,
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  tech: {
                    type: ["array", "null"],
                    items: { type: "string" },
                  },
                  description: { type: "string", maxLength: 75 },
                },
                required: ["name", "tech", "description"],
              },
              maxItems: DEFAULT_LIMITS.maxProjects,
            },
            education: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  degree: { type: "string" },
                  fields_of_study: {
                    type: ["array", "null"],
                    items: { type: "string" },
                  },
                  institution: { type: "string" },
                  courses: {
                    type: ["array", "null"],
                    items: { type: "string" },
                    maxItems: DEFAULT_LIMITS.maxCoursesPerEducation,
                  },
                },
                required: [
                  "degree",
                  "fields_of_study",
                  "institution",
                  "courses",
                ],
              },
              maxItems: DEFAULT_LIMITS.maxEducations,
            },
          },
          required: ["skills", "experiences", "projects", "education"],
        },
      },
    },
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    throw new Error("No response from LLM during user data filtering");
  }

  const parsed = filteredUserContentSchema.parse(JSON.parse(raw));
  const constrained = enforceHardLimits(parsed);

  return mergeFilteredContent(userInfo, constrained);
}
