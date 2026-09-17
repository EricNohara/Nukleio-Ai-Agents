import { z } from "zod";

export const userInfoSchema = z.object({
  email: z.email(),

  name: z.string().optional(),
  bio: z.string().optional(),
  phone_number: z.string().optional(),
  current_address: z.string().optional(),
  current_position: z.string().optional(),
  current_company: z.string().optional(),

  skills: z.array(z.string()).optional(),

  experiences: z
    .array(
      z.object({
        company: z.string(),
        job_title: z.string(),
        job_description: z.string(),
      }),
    )
    .optional(),

  projects: z
    .array(
      z.object({
        name: z.string(),
        tech: z.array(z.string()).optional(),
        description: z.string(),
      }),
    )
    .optional(),

  education: z
    .array(
      z.object({
        degree: z.string(),
        fields_of_study: z.array(z.string()).optional(),
        institution: z.string(),
        courses: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});
