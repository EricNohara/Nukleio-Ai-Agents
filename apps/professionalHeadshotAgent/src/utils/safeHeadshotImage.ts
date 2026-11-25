import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const MAX_BYTES = 1024 * 1024;
const blocked = new BlockList();
for (const [address, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(address, bits, "ipv4");
const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return globalIpv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

export function validateStorageImageUrl(value: string, userId: string, kind: "inputs" | "generated"): URL {
  const configured = new URL(process.env.SUPABASE_URL ?? "");
  const url = new URL(value);
  const bucket = process.env.SUPABASE_HEADSHOT_BUCKET ?? "professional_headshots";
  const prefix = `/storage/v1/object/public/${bucket}/${kind}/${userId}/`;
  if (configured.protocol !== "https:" || configured.username || configured.password || configured.port || isIP(configured.hostname) ||
      url.origin !== configured.origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(prefix)) {
    throw new Error("Unapproved image URL");
  }
  const name = url.pathname.slice(prefix.length);
  const pattern = kind === "generated" ? /^headshot-[a-zA-Z0-9.-]+\.(?:webp|jpg|jpeg|png)$/ : /^(?:reference|background)-[a-zA-Z0-9-]+\.(?:webp|jpg|jpeg|png)$/;
  if (!pattern.test(name)) throw new Error("Unapproved image path");
  return url;
}

export async function loadHeadshotImage(value: string, userId: string, kind: "inputs" | "generated"): Promise<string> {
  const url = validateStorageImageUrl(value, userId, kind);
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Image DNS lookup timed out")), 5000);
      timer.unref();
    }),
  ]);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Unsafe image destination");
  const target = addresses[0]!;
  const result = await new Promise<{ bytes: Buffer; contentType: string }>((resolve, reject) => {
    const deadline = setTimeout(() => req.destroy(new Error("Image download timed out")), 15000);
    const req = request({ protocol: "https:", hostname: target.address, family: target.family, servername: url.hostname, path: url.pathname, method: "GET", headers: { host: url.host }, timeout: 15000 }, (res) => {
      const contentType = (res.headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
      const length = Number(res.headers["content-length"] ?? 0);
      if (res.statusCode !== 200 || !["image/jpeg", "image/png", "image/webp"].includes(contentType) || !Number.isFinite(length) || length > MAX_BYTES) {
        res.destroy(); reject(new Error("Invalid image response")); return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) { res.destroy(new Error("Image exceeds size limit")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => size ? resolve({ bytes: Buffer.concat(chunks), contentType }) : reject(new Error("Empty image")));
      res.on("error", reject);
      res.on("aborted", () => reject(new Error("Image response interrupted")));
    });
    req.on("timeout", () => req.destroy(new Error("Image download timed out")));
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end();
  });
  return `data:${result.contentType};base64,${result.bytes.toString("base64")}`;
}
