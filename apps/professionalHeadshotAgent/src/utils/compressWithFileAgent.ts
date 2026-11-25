import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { randomUUID } from "node:crypto";

type CompressionResult = { bytes: Buffer; contentType: string };

function compressionUrl(path: string): URL {
  const baseUrl = process.env.FILE_COMPRESSION_AGENT_BASE_URL?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!baseUrl || !region) throw new Error("File compression agent is not configured");
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(`.lambda-url.${region}.on.aws`)) {
    throw new Error("Invalid File Compression Agent URL");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${path}`;
  return url;
}

async function invoke(path: "prepare" | "compress", operation: string, body: unknown): Promise<Response> {
  const url = compressionUrl(path);
  const region = process.env.AWS_REGION?.trim() as string;
  const serialized = JSON.stringify(body);
  const signer = new SignatureV4({ credentials: defaultProvider(), region, service: "lambda", sha256: Sha256 });
  const signed = await signer.sign(new HttpRequest({
    protocol: url.protocol,
    hostname: url.hostname,
    method: "POST",
    path: url.pathname,
    headers: {
      host: url.host,
      "content-type": "application/json",
      "x-nukleio-operation": operation,
      "x-nukleio-request-id": randomUUID(),
    },
    body: serialized,
  }));
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(signed.headers)) {
    if (name !== "host" && typeof value === "string") headers[name] = value;
  }
  return fetch(url, { method: "POST", headers, body: serialized });
}

export async function compressGeneratedHeadshot(source: Buffer): Promise<CompressionResult> {
  const preparedResponse = await invoke("prepare", "compress_file_prepare", {
    contentType: "image/jpeg",
    mediaKind: "generated-headshot",
  });
  const prepared = await preparedResponse.json() as {
    jobId?: string;
    upload?: { fields?: Record<string, string>; url?: string };
    detail?: string;
    error?: string;
  };
  if (!preparedResponse.ok || !prepared.jobId || !prepared.upload?.url || !prepared.upload.fields) {
    throw new Error(prepared.detail ?? prepared.error ?? "Unable to prepare headshot compression");
  }
  const form = new FormData();
  for (const [name, value] of Object.entries(prepared.upload.fields)) form.append(name, value);
  form.append("file", new Blob([source], { type: "image/jpeg" }), "generated-headshot.jpg");
  const staged = await fetch(prepared.upload.url, { method: "POST", body: form });
  if (!staged.ok) throw new Error("Unable to stage generated headshot for compression");

  const compressed = await invoke("compress", "compress_file", {
    contentType: "image/jpeg",
    jobId: prepared.jobId,
    mediaKind: "generated-headshot",
  });
  if (!compressed.ok) {
    const failure = await compressed.json().catch(() => null) as { detail?: string; error?: string } | null;
    throw new Error(failure?.detail ?? failure?.error ?? "Generated headshot could not be compressed");
  }
  return {
    bytes: Buffer.from(await compressed.arrayBuffer()),
    contentType: compressed.headers.get("content-type") ?? "image/webp",
  };
}
