import { renderResumeHtml } from "./utils/renderResumeHtml";
import { renderResumePdf } from "./utils/renderResumePdf";
import { uploadResumeToSupabase } from "./utils/uploadResumeToSupabase";
import getOpenAIClient from "./utils/getOpenAIClient";
import { enhanceResumeUserInfoAgent } from "./agents/enhanceResumeUserInfoAgent";
import { UserInfo } from "./types/userInfo";
import { compressGeneratedResume } from "./utils/compressWithFileAgent";

const openAIClient = getOpenAIClient();
const MAX_RESUME_BYTES = 1024 * 1024;

function makeSafePrefix(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "resume";
}

async function generateResumeFromUserInfoAndTemplate(
  userId: string,
  userInfo: UserInfo,
  templateId?: string | undefined,
  deliveryMode: "cached" | "transient" = "cached",
) {
  //   render the resume as HTML
  const html = renderResumeHtml(userInfo, templateId);

  //   render the HTML resume as a PDF
  const pdfBuffer = await renderResumePdf(html);
  if (deliveryMode === "transient") {
    return { pdfBase64: pdfBuffer.toString("base64") };
  }

  const compressedResume = await compressGeneratedResume(pdfBuffer);
  if (compressedResume.length > MAX_RESUME_BYTES) {
    throw new Error("Generated resume exceeds the 1 MB storage limit after compression");
  }

  // Upload retained resumes only.
  const safePrefix = makeSafePrefix(userInfo.name ?? userInfo.email);

  const resumeUrl = await uploadResumeToSupabase(compressedResume, {
    userId,
    fileNamePrefix: `${safePrefix}-resume`,
    contentType: "application/pdf",
  });

  return { resumeUrl };
}

export async function runGeneratePipeline({
  userId,
  userInfo,
  templateId,
  deliveryMode,
}: {
  userId: string;
  userInfo: UserInfo;
  templateId?: string | undefined;
  deliveryMode: "cached" | "transient";
}) {
  const result = await generateResumeFromUserInfoAndTemplate(
    userId,
    userInfo,
    templateId,
    deliveryMode,
  );

  if ("resumeUrl" in result && !result.resumeUrl) {
    throw new Error("Failed to upload generated resume");
  }

  return "pdfBase64" in result
    ? { success: true as const, pdfBase64: result.pdfBase64, contentType: "application/pdf" }
    : { success: true as const, resumeUrl: result.resumeUrl };
}

export async function runGenerateWithAiPipeline({
  userId,
  userInfo,
  templateId,
  targetJobs,
  deliveryMode,
}: {
  userId: string;
  userInfo: UserInfo;
  templateId?: string | undefined;
  targetJobs?: string[] | undefined;
  deliveryMode: "cached" | "transient";
}) {
  // run the enhancement agent
  const resumeEnhancedUserInfo: UserInfo = await enhanceResumeUserInfoAgent(
    openAIClient,
    userInfo,
    targetJobs
  );

  // generate the resume
  const result = await generateResumeFromUserInfoAndTemplate(
    userId,
    resumeEnhancedUserInfo,
    templateId,
    deliveryMode,
  );

  if ("resumeUrl" in result && !result.resumeUrl) {
    throw new Error("Failed to upload generated resume");
  }

  return "pdfBase64" in result
    ? { success: true as const, pdfBase64: result.pdfBase64, contentType: "application/pdf" }
    : { success: true as const, resumeUrl: result.resumeUrl };
}
