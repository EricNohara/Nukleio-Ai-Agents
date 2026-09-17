import { IObjectiveEvaluationResult } from "../../interfaces/IEvaluator";
import { JobInfo } from "../../types/jobInfo";
import { UserInfo } from "../../types/userInfo";

export async function objectiveEvaluator(
  draft: string,
  userInfo: UserInfo,
  jobData: JobInfo,
): Promise<IObjectiveEvaluationResult> {
  const issues: string[] = [];

  // Trim + normalize
  const text = draft.trim();
  const dearIndex = text.toLowerCase().indexOf("dear ");
  let bodyText = text;

  if (dearIndex !== -1) {
    bodyText = text.slice(dearIndex);
  }

  // Split into raw paragraph blocks
  const rawParagraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Treat as a "paragraph" ONLY if it contains > 1 sentences
  const paragraphs = rawParagraphs.filter((p) => {
    const sentenceCount = p
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean).length;

    return sentenceCount > 1;
  });

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);

  const wordCount = words.length;
  const paragraphCount = paragraphs.length;
  const avgSentenceLength =
    sentences.length > 0 ? wordCount / sentences.length : 0;

  // Must include greeting
  const greetingMatch = text.match(/Dear\s+([^,]+),/i);
  if (!greetingMatch) {
    issues.push("Missing greeting (must include 'Dear ...').");
  }

  // 2. HIRING-MANAGER NAME CHECK
  if (jobData.hiring_team && jobData.hiring_team.length > 0) {
    const possibleNames = jobData.hiring_team
      .flatMap((m) => {
        const full = m.name?.trim();
        if (!full) return [];

        // Split into words
        const parts = full.split(/\s+/);

        // Remove punctuation from each part
        const strippedParts = parts.map(
          (p) => p.replace(/^[^\w]+|[^\w]+$/g, ""), // remove punctuation at start/end
        );

        // Remove suffixes or certifications
        const cleanedParts = strippedParts.filter(
          (p) => !/^(cpsr|phd|md|jr|sr|ii|iii|iv)$/i.test(p),
        );

        const cleanedFull = cleanedParts.join(" ");

        return [
          cleanedFull.toLowerCase(),
          ...cleanedParts.map((p) => p.toLowerCase()),
        ];
      })
      .filter((n) => n.length > 0);

    const greetingUsed = greetingMatch?.[1]?.trim().toLowerCase() || null;

    if (greetingUsed) {
      // Must match one of the known names
      const matchesKnown = possibleNames.some((n) => greetingUsed.includes(n));
      if (!matchesKnown) {
        issues.push(
          `Greeting appears to not use available recruiter name. Expected one of: ${possibleNames.join(
            ", ",
          )}`,
        );
      }
    }
  }

  // Must end with user signature or closing phrase
  // Normalize newlines
  const normalized = text.replace(/\r\n/g, "\n");

  // Regex:
  // - "Sincerely," (with optional trailing spaces)
  // - 2 to 4 blank lines (newline groups)
  // - then the exact username (case-insensitive)
  const closingRegex = userInfo.name
    ? new RegExp(
        `Sincerely,\\s*(?:\\n\\s*){2,4}${userInfo.name.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}`,
        "i",
      )
    : null;

  if (closingRegex && !closingRegex.test(normalized)) {
    issues.push(
      `Closing format incorrect. Must be "Sincerely," followed by 2 - 4 blank lines, then "${userInfo.name}".`,
    );
  }

  // Must have >= 3 paragraphs
  if (paragraphCount < 3) {
    issues.push("Too few paragraphs (must have at least 3).");
  }

  if (paragraphCount > 5) {
    issues.push("Too many paragraphs (must have at most 5)");
  }

  // LENGTH REQUIREMENTS
  if (wordCount < 250) {
    issues.push("Cover letter too short (must be at least 250 words).");
  }

  if (wordCount > 450) {
    issues.push("Cover letter too long (must be under 450 words).");
  }

  if (avgSentenceLength > 30) {
    issues.push("Average sentence length too high (should be under 30 words).");
  }

  // DETECT CLICHE PHRASES TO AVOID - gotten from researching phrases to avoid
  const clichePhrases = [
    "to whom it may concern",
    "i'm writing to apply",
    "ever since i was little",
    "ever since i was young",
    "since i was little",
    "since i was young",
    "as you can see on my resume",
    "as you see on my resume",
    "i'm the perfect fit",
    "excellent written and oral skills",
    "dream come true",
    "go-getter",
    "think outside the box",
    "self-starter",
    "detail-oriented",
    "the extra mile",
    "problem solver",
    "creative thinker",
    "Hey",
    "Hi",
    "Hello",
    "good communicator",
    "team player",
    "i will fix things",
    "i am writing to express my interest",
    "i believe i would be a great fit",
    "i am excited to apply",
    "thank you for your time and consideration",
  ];

  for (const phrase of clichePhrases) {
    if (text.toLowerCase().includes(phrase)) {
      issues.push(`Contains generic cliche phrase: "${phrase}"`);
    }
  }

  return {
    pass: issues.length === 0,
    issues,
    stats: {
      wordCount,
      paragraphCount,
      avgSentenceLength,
    },
  };
}
