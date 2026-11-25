import OpenAI from "openai";
import { WritingAnalysis } from "../../types/writingAnalysis";
import writingAnalysisAgent from "../../agents/writingAnalysisAgent";
import { IWritingStyleEvaluationResult } from "../../interfaces/IEvaluator";

function compareMetric(
  name: string,
  userValue: number,
  draftValue: number,
): {
  metric: string;
  userValue: number;
  draftValue: number;
  difference: number;
  severity: "low" | "medium" | "high";
  status: "matches" | "draft_higher" | "draft_lower";
} {
  const difference = draftValue - userValue;
  const absDiff = Math.abs(difference);

  let severity: "low" | "medium" | "high" = "low";

  if (absDiff > 20) severity = "high";
  else if (absDiff > 10) severity = "medium";

  const status: "matches" | "draft_higher" | "draft_lower" =
    absDiff < 5 ? "matches" : difference > 0 ? "draft_higher" : "draft_lower";

  return {
    metric: name,
    userValue,
    draftValue,
    difference,
    severity,
    status,
  };
}

export function compareWritingStyles(
  userStyle: WritingAnalysis,
  draftStyle: WritingAnalysis,
) {
  const deviations = [
    compareMetric(
      "avgSentenceLength",
      userStyle.avgSentenceLength,
      draftStyle.avgSentenceLength,
    ),
    compareMetric(
      "avgSyllablesPerWord",
      userStyle.avgSyllablesPerWord,
      draftStyle.avgSyllablesPerWord,
    ),
    compareMetric(
      "fleschKincaidGrade",
      userStyle.fleschKincaidGrade,
      draftStyle.fleschKincaidGrade,
    ),
    compareMetric(
      "punctuationComplexity",
      userStyle.punctuationComplexity,
      draftStyle.punctuationComplexity,
    ),
  ];

  // Build qualitative summary
  const summary: string[] = [];

  deviations.forEach((d) => {
    if (d.status === "matches") {
      summary.push(`${d.metric} closely matches the user's natural style.`);
    } else if (d.status === "draft_higher") {
      summary.push(
        `${
          d.metric
        } is higher than user's usual writing (${d.difference.toFixed(
          2,
        )}). Severity: ${d.severity}.`,
      );
    } else {
      summary.push(
        `${d.metric} is lower than user's usual writing (${d.difference.toFixed(
          2,
        )}). Severity: ${d.severity}.`,
      );
    }
  });

  return { deviations, summary };
}

export default async function writingStyleEvaluator(
  clientOpenAI: OpenAI,
  draft: string,
  writingAnalysis: WritingAnalysis | null,
): Promise<IWritingStyleEvaluationResult | null> {
  if (!writingAnalysis) return null;

  const draftWritingAnalysis: WritingAnalysis = await writingAnalysisAgent(
    clientOpenAI,
    draft,
    true,
  );

  // compare to user's writing analysis
  const comparison: IWritingStyleEvaluationResult = compareWritingStyles(
    writingAnalysis,
    draftWritingAnalysis,
  );

  // output comparison
  return comparison;
}
