import OpenAI from "openai";
import { urlToOpenAIFile } from "../utils/urlToOpenAIFile";

function buildPrompt(feedback: string) {
  return `
    You are revising an existing professional headshot.

    Goal:
    Produce an updated, realistic professional headshot based on the provided image and the user's feedback.

    Primary instruction:
    Use the provided image as the base image to revise using the user's feedback. Do not change anything about the image other than what the user provided as feedback.

    User feedback to apply:
    ${feedback}

    Output style:
    A high-quality, realistic, polished professional headshot suitable for LinkedIn.
`.trim();
}

export async function reviseProfessionalHeadshotAgent(
  openAIClient: OpenAI,
  headshotUrl: string,
  feedback: string,
  layout: "1024x1024" | "1536x1024" | "1024x1536" | "auto",
) {
  const prompt = buildPrompt(feedback);
  const referenceImageFile = await urlToOpenAIFile(
    headshotUrl,
    "revisionImage.png",
  );

  const response = await openAIClient.images.edit({
    model: "gpt-image-2",
    image: referenceImageFile,
    prompt,
    size: layout,
    quality: "medium",
    output_format: "jpeg",
    output_compression: 75,
  });

  return response;
}
