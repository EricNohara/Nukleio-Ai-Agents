import { z } from "zod";

export const jobInfoLlmResponseSchema = z.object({
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  locations: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  company: z
    .object({
      industry: z.string().optional(),
      company_summary: z.string().optional(),
    })
    .optional(),
  hiring_team: z
    .array(
      z.object({
        name: z.string().optional(),
      }),
    )
    .optional(),
});

export const jobInfoSchema = jobInfoLlmResponseSchema.extend({
  job_title: z.string(),
  company: z.object({
    name: z.string(),
    industry: z.string().optional(),
    company_summary: z.string().optional(),
  }),
});
