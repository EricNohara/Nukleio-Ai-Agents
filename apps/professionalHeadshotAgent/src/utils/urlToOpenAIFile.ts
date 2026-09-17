import axios from "axios";
import { toFile } from "openai";

export async function urlToOpenAIFile(url: string, filename: string) {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
  });

  const contentTypeHeader = response.headers["content-type"];
  const contentType =
    typeof contentTypeHeader === "string" ? contentTypeHeader : "image/png";
  const buffer = Buffer.from(response.data);

  return toFile(buffer, filename, { type: contentType });
}
