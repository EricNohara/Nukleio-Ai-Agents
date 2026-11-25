import { z } from "zod";

export const userInfoSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
  bio: z.string().optional(),
  phone_number: z.string().optional(),
  current_address: z.string().optional(),
  current_position: z.string().optional(),
  current_company: z.string().optional(),
  github_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  portrait_url: z.string().optional(),
  resume_url: z.string().optional(),
  transcript_url: z.string().optional(),
  facebook_url: z.string().optional(),
  instagram_url: z.string().optional(),
  x_url: z.string().optional(),

  skills: z.array(
    z.object({
      name: z.string(),
      proficiency: z.number().optional(),
      years_of_experience: z.number().optional(),
    })
  ),

  experiences: z.array(
    z.object({
      company: z.string(),
      job_title: z.string(),
      date_start: z.string(),
      date_end: z.string().optional(),
      job_description: z.string(),
    })
  ),

  projects: z.array(
    z.object({
      name: z.string(),
      date_start: z.string(),
      date_end: z.string(),
      languages_used: z.array(z.string()).optional(),
      frameworks_used: z.array(z.string()).optional(),
      technologies_used: z.array(z.string()).optional(),
      description: z.string(),
      github_url: z.string().optional(),
      demo_url: z.string().optional(),
    })
  ),

  education: z.array(
    z.object({
      degree: z.string(),
      majors: z.array(z.string()),
      minors: z.array(z.string()),
      gpa: z.string().optional(),
      institution: z.string(),
      awards: z.array(z.string()),
      year_start: z.number(),
      year_end: z.number().optional(),
      courses: z.array(
        z.object({
          name: z.string(),
          grade: z.string().optional(),
          description: z.string().optional(),
        })
      ),
    })
  ),
});
