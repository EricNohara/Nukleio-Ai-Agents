import writingAnalysisAgent from "./agents/writingAnalysisAgent";
import { WritingAnalysis } from "./types/writingAnalysis";
import getOpenAIClient from "./utils/ai/getOpenAIClient";
import firstDraftAgent from "./agents/firstDraftAgent";
import { IDraftEvaluationResult } from "./interfaces/IEvaluator";
import draftEvaluatorAgent from "./agents/draftEvaluatorAgent";
import revisionAgent from "./agents/revisionAgent";
import userRevisionAgent from "./agents/userRevisionAgent";
import OpenAI from "openai";
import jobResearchAgent from "./agents/jobResearchAgent";
import skillsMatchEvaluatorAgent from "./agents/skillsMatchEvaluatorAgent";
import revisionDraftNamingAgent from "./agents/revisionDraftNamingAgent";
import { userInfoFilteringAgent } from "./agents/userInfoFilteringAgent";
import { CoverLetterSession } from "./types/coverLetterSession";
import { UserInfo } from "./types/userInfo";
import { JobInfo } from "./types/jobInfo";

const MAX_ITERATIONS = 2;

async function runCorePipeline({
  clientOpenAI,
  userInfo,
  jobData,
  writingSample,
}: {
  clientOpenAI: OpenAI;
  userInfo: UserInfo;
  jobData: JobInfo;
  writingSample?: string | undefined;
}) {
  // invoke writing analysis agent
  const cleanedWritingSample = writingSample
    ? writingSample.replace(/\s+/g, " ").trim()
    : null;

  const writingAnalysis: WritingAnalysis | null = cleanedWritingSample
    ? await writingAnalysisAgent(clientOpenAI, cleanedWritingSample)
    : null;

  // invoke cover letter first draft agent
  let currentDraft: string = await firstDraftAgent(
    clientOpenAI,
    userInfo,
    jobData,
    writingAnalysis,
    writingSample,
  );

  // evaluation feedback loop
  let lastEvaluation: IDraftEvaluationResult;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // evaluate current draft
    lastEvaluation = await draftEvaluatorAgent(
      clientOpenAI,
      currentDraft,
      userInfo,
      jobData,
      writingAnalysis,
      writingSample,
    );

    // Determine pass/fail
    const objectivePass =
      lastEvaluation.objectiveEvaluation.pass &&
      lastEvaluation.objectiveEvaluation.issues.length === 0;

    const llmPass = lastEvaluation.llmEvaluation.score >= 80;

    const stylePass = lastEvaluation.writingStyleEvaluation
      ? lastEvaluation.writingStyleEvaluation.deviations.every(
          (d) => d.severity !== "high",
        )
      : true;

    const isPassed = objectivePass && llmPass && stylePass;

    if (isPassed) break; // success

    // Produce revised draft
    currentDraft = await revisionAgent(
      clientOpenAI,
      lastEvaluation,
      currentDraft,
      userInfo,
      jobData,
      writingAnalysis,
      writingSample,
    );
  }

  // calculate skills match score at the end
  const skillsMatchScore = await skillsMatchEvaluatorAgent(
    clientOpenAI,
    userInfo,
    jobData,
  );

  // return things needed to store session
  return {
    jobData,
    writingAnalysis,
    writingSample,
    currentDraft,
    skillsMatchScore,
  };
}

// pipeline for job research agentic workflow
export async function runPipeline({
  userId,
  userInfo,
  jobTitle,
  companyName,
  jobDescriptionDump,
  writingSample,
}: {
  userId: string;
  userInfo: UserInfo;
  jobTitle: string;
  companyName: string;
  jobDescriptionDump: string;
  writingSample?: string | undefined;
}) {
  // get OpenAI Client
  const clientOpenAI = getOpenAIClient();

  // invoke job research agent
  const jobData: JobInfo = await jobResearchAgent(
    clientOpenAI,
    jobDescriptionDump,
    jobTitle,
    companyName,
  );

  if (!jobData) {
    throw new Error("Failed to research inputted job. Please try again.");
  }

  // filter user data for the job
  const filteredUserInfo: UserInfo = await userInfoFilteringAgent(
    clientOpenAI,
    userInfo,
    jobData,
  );

  return await runCorePipeline({
    clientOpenAI,
    userInfo: filteredUserInfo,
    jobData,
    writingSample,
  });
}

// for one shot user revisions
export async function runRevisionPipeline({
  userInfo,
  session,
  feedback,
}: {
  userInfo: UserInfo;
  session: CoverLetterSession;
  feedback: string;
}) {
  const clientOpenAI = getOpenAIClient();

  // generate the revised draft
  const revisedDraft = await userRevisionAgent(
    clientOpenAI,
    userInfo,
    session.jobData,
    session.writingAnalysis,
    session.writingSample,
    session.currentDraft,
    feedback,
  );

  // generate the draft name from revision
  const draftName = await revisionDraftNamingAgent(clientOpenAI, feedback);

  return {
    revisedDraft,
    draftName,
  };
}
