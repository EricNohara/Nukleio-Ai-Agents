import { z } from "zod";
import {
  jobInfoLlmResponseSchema,
  jobInfoSchema,
} from "../schemas/jobInfoSchema";

export type JobInfoLlmResponse = z.infer<typeof jobInfoLlmResponseSchema>;

export type JobInfo = z.infer<typeof jobInfoSchema>;
