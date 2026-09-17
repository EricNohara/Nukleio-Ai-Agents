import OpenAI from "openai";
import { urlToOpenAIFile } from "../utils/urlToOpenAIFile";

export type HeadshotAttire =
  | "auto"
  | "business"
  | "businessCasual"
  | "smartCasual"
  | "casual"
  | "techProfessional"
  | "academic";

const attirePromptMap: Record<HeadshotAttire, string> = {
  auto: `
    Choose professional, flattering attire appropriate for a LinkedIn-style headshot.
    Keep clothing realistic, neutral, and not distracting.
  `,

  business: `
    Dress the subject in formal business attire such as a suit jacket, blazer, dress shirt, or blouse.
    The look should feel corporate, polished, and executive.
  `,

  businessCasual: `
    Dress the subject in business casual attire such as a blazer, button-down shirt, blouse, sweater, or neat professional top.
    The look should be polished but approachable.
  `,

  smartCasual: `
    Dress the subject in elevated smart casual attire.
    Use clean, modern clothing that feels professional but not overly formal.
  `,

  casual: `
    Dress the subject in clean casual attire such as a plain shirt, simple sweater, or neutral top.
    Keep it appropriate for a relaxed professional profile photo.
  `,

  techProfessional: `
    Dress the subject in modern tech-professional attire.
    Use a clean shirt, simple sweater, overshirt, or minimal blazer.
    The look should feel polished, startup-friendly, and modern.
  `,

  academic: `
    Dress the subject in academic professional attire.
    Use a blazer, cardigan, sweater, button-down shirt, blouse, or other thoughtful professional clothing.
    The look should feel intelligent, approachable, and university-appropriate.
  `,
};

function getAttirePrompt(attire: HeadshotAttire) {
  return attirePromptMap[attire];
}

function buildPrompt(
  backgroundDescription: string | null,
  hasBackgroundImage: boolean,
  attire: HeadshotAttire,
) {
  const attirePrompt = getAttirePrompt(attire);

  if (hasBackgroundImage) {
    return `
      You are a professional photographer that creates realistic professional headshots.
      Use the first input image as the subject reference.
      Use the second input image as the background reference.
      Create a realistic professional headshot of the subject while preserving facial identity, skin tone, and general likeness.
      Blend the subject naturally into the provided background image.

      Attire instructions:
      ${attirePrompt}

      Improve lighting, polish, and professionalism while keeping the subject natural.
      The output should look like a high-quality corporate or LinkedIn-style headshot.
      There should only be a single subject in the final image.
      The final image should use professional headshot composition.
      Straighten the subject's head and posture if necessary.
      The face should appear naturally upright and centered.
      Correct minor camera tilt or subject tilt from the reference image.
      The shoulders should appear level and balanced.
      The camera framing should feel symmetrical and professional.
      Use realistic portrait alignment similar to a LinkedIn or corporate studio headshot.
      Avoid awkward leaning, tilted posture, or off-angle composition unless explicitly requested.
      The subject's face and head should be entirely within view.
      Keep the clothing realistic and anatomically consistent.
      Do not preserve the original outfit unless it already matches the requested attire.
      Do not preserve accidental tilt, slouching, or asymmetrical framing from the reference image.
      Do not change the person's body type, age, gender presentation, or facial identity.
      Do not add extra people, extra limbs, text, watermarks, or distortions.
    `.trim();
  }

  return `
    You are a professional photographer that creates realistic professional headshots.
    Create a realistic professional headshot of the subject in the reference image.
    Preserve the person's facial identity, skin tone, and general likeness.

    Background setting: ${backgroundDescription ?? "professional neutral studio background"}.

    Attire instructions:
    ${attirePrompt}

    Improve lighting, polish, and professionalism while keeping the subject natural.
    The output should look like a high-quality corporate or LinkedIn-style headshot.
    There should only be a single subject in the final image.
    The final image should use professional headshot composition.
    Straighten the subject's head and posture if necessary.
    The face should appear naturally upright and centered.
    Correct minor camera tilt or subject tilt from the reference image.
    The shoulders should appear level and balanced.
    The camera framing should feel symmetrical and professional.
    Use realistic portrait alignment similar to a LinkedIn or corporate studio headshot.
    Avoid awkward leaning, tilted posture, or off-angle composition unless explicitly requested.
    The subject's face and head should be entirely within view.
    Keep the clothing realistic and anatomically consistent.
    Do not preserve the original outfit unless it already matches the requested attire.
    Do not preserve accidental tilt, slouching, or asymmetrical framing from the reference image.
    Do not change the person's body type, age, gender presentation, or facial identity.
    Do not add extra people, extra limbs, text, watermarks, or distortions.
  `.trim();
}

export async function generateProfessionalHeadshotAgent(
  openAIClient: OpenAI,
  referenceUrl: string,
  backgroundDescription: string | null,
  attire: HeadshotAttire,
  layout: "1024x1024" | "1536x1024" | "1024x1536" | "auto",
  backgroundUrl?: string,
) {
  const hasBackgroundImageInput = Boolean(backgroundUrl);
  const prompt = buildPrompt(
    backgroundDescription,
    hasBackgroundImageInput,
    attire,
  );
  const referenceImageFile = await urlToOpenAIFile(
    referenceUrl,
    "referenceImage.png",
  );

  let imageInput:
    | Awaited<ReturnType<typeof urlToOpenAIFile>>
    | Awaited<ReturnType<typeof urlToOpenAIFile>>[];

  if (hasBackgroundImageInput && backgroundUrl) {
    const backgroundImageFile = await urlToOpenAIFile(
      backgroundUrl,
      "backgroundImage.png",
    );
    imageInput = [referenceImageFile, backgroundImageFile];
  } else {
    imageInput = referenceImageFile;
  }

  const response = await openAIClient.images.edit({
    model: "gpt-image-2",
    image: imageInput,
    prompt,
    size: layout,
    quality: "medium",
    output_format: "jpeg",
    output_compression: 75,
  });

  return response;
}
