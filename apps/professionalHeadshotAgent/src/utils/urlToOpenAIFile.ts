import { toFile } from "openai";

export async function urlToOpenAIFile(url: string, filename: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match?.[1] || !match[2]) throw new Error("Invalid image data");
  return toFile(Buffer.from(match[2], "base64"), filename, { type: match[1] });
}
