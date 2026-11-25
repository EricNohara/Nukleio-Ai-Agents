import { z } from "zod";
import { jobInfoSchema } from "./jobInfoSchema";
import { writingAnalysisSchema } from "./writingSchema";

export const coverLetterSessionSchema = z.object({
  jobData: jobInfoSchema,
  writingAnalysis: writingAnalysisSchema.nullable(),
  writingSample: z.string().nullable(),
  currentDraft: z.string(),
});
