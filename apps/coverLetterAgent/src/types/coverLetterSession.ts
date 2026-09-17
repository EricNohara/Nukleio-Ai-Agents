import { z } from "zod";
import { coverLetterSessionSchema } from "../schemas/coverLetterSessionSchema";

export type CoverLetterSession = z.infer<typeof coverLetterSessionSchema>;
