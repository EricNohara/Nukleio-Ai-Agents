import {
  generateProfessionalHeadshotAgent,
  HeadshotAttire,
} from "./agents/generateProfessionalHeadshotAgent";
import {
  ReferencePhotoValidationResult,
  validateReferencePhotoAgent,
} from "./agents/validateReferencePhotoAgent";
import getOpenAIClient from "./utils/getOpenAIClient";
import { uploadHeadshotToSupabase } from "./utils/uploadHeadshotToSupabase";
import { reviseProfessionalHeadshotAgent } from "./agents/reviseProfessionalHeadshotAgent";

const openAIClient = getOpenAIClient();
const MAX_HEADSHOT_BYTES = 1024 * 1024;

export async function runPipeline({
  userId,
  referenceUrl,
  backgroundDescription,
  backgroundUrl,
  attire,
  layout,
  deliveryMode,
}: {
  userId: string;
  referenceUrl: string;
  backgroundDescription: string | null;
  backgroundUrl?: string | undefined;
  attire: HeadshotAttire;
  layout: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  deliveryMode: "cached" | "transient";
}) {
  // validate the reference image
  const validation: ReferencePhotoValidationResult =
    await validateReferencePhotoAgent(openAIClient, referenceUrl);

  if (!validation.ok) {
    return {
      success: false,
      publicUrl: null,
      error: "Reference image is not suitable for headshot generation.",
      validation,
    };
  }

  // generate the professional headshot
  const headshot = await generateProfessionalHeadshotAgent(
    openAIClient,
    referenceUrl,
    backgroundDescription,
    attire,
    layout,
    backgroundUrl,
  );

  // upload the headshot to supabase
  const b64Image = headshot.data?.[0]?.b64_json ?? null;

  if (!b64Image) {
    return {
      success: false,
      publicUrl: null,
      error: "OpenAI did not return image data.",
      validation,
    };
  }

  const imageBuffer = Buffer.from(b64Image, "base64");
  if (imageBuffer.length > MAX_HEADSHOT_BYTES) {
    throw new Error("Generated headshot exceeds the 1 MB storage limit");
  }

  if (deliveryMode === "transient") {
    return { success: true, imageBase64: b64Image, contentType: "image/jpeg", validation };
  }

  const publicUrl = await uploadHeadshotToSupabase(imageBuffer, {
    userId,
    contentType: "image/jpeg",
  });

  // return the public url
  return {
    success: publicUrl !== null,
    publicUrl,
    validation,
  };
}

export async function runRevisionPipeline({
  userId,
  headshotUrl,
  feedback,
  layout,
  deliveryMode,
}: {
  userId: string;
  headshotUrl: string;
  feedback: string;
  layout: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  deliveryMode: "cached" | "transient";
}) {
  // validate the reference image
  const validation: ReferencePhotoValidationResult =
    await validateReferencePhotoAgent(openAIClient, headshotUrl);

  if (!validation.ok) {
    return {
      success: false,
      publicUrl: null,
      error: "Reference image is not suitable for headshot generation.",
      validation,
    };
  }

  // revise the professional headshot
  const headshot = await reviseProfessionalHeadshotAgent(
    openAIClient,
    headshotUrl,
    feedback,
    layout,
  );

  // upload the headshot to supabase
  const b64Image = headshot.data?.[0]?.b64_json ?? null;

  if (!b64Image) {
    return {
      success: false,
      publicUrl: null,
      error: "OpenAI did not return image data.",
      validation,
    };
  }

  const imageBuffer = Buffer.from(b64Image, "base64");
  if (imageBuffer.length > MAX_HEADSHOT_BYTES) {
    throw new Error("Generated headshot exceeds the 1 MB storage limit");
  }

  if (deliveryMode === "transient") {
    return { success: true, imageBase64: b64Image, contentType: "image/jpeg", validation };
  }

  const publicUrl = await uploadHeadshotToSupabase(imageBuffer, {
    userId,
    contentType: "image/jpeg",
  });

  // return the public url
  return {
    success: publicUrl !== null,
    publicUrl,
    validation,
  };
}
