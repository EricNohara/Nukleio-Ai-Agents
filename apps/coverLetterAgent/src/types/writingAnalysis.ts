import z from "zod";
import {
  qualitativeSchema,
  quantitativeSchema,
  writingAnalysisSchema,
} from "../schemas/writingSchema";

export type QuantitativeMetrics = z.infer<typeof quantitativeSchema>;

export type QualitativeMetrics = z.infer<typeof qualitativeSchema>;

export type WritingAnalysis = z.infer<typeof writingAnalysisSchema>;
