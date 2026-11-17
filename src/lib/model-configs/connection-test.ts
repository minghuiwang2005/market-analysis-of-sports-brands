import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { AppError } from "@/lib/api-response";
import { decryptApiKey } from "@/lib/model-configs/encryption";
import type { llmModelConfigs } from "@/lib/db/schema";

type Config = typeof llmModelConfigs.$inferSelect;
const MAX_RESPONSE_BYTES = 16_384;

function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51) || (a === 203 && b === 0));
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return normalized.startsWith("2") || normalized.startsWith("3"); // global unicast 2000::/3 only
  }
  return false;
}

async function validateAndResolve(url: URL) {
  if (url.protocol !== "https:" || url.port && url.port !== "443" || url.username || url.password || !url.hostname || url.hostname.endsWith(".local")) {
    throw new AppError("UNSAFE_MODEL_URL", "连接测试仅允许标准 HTTPS 公网接口地址。", 422);
  }
  const results = await dnsLookup(url.hostname, { all: true, verbatim: true });
  if (!results.length || results.some(({ address }) => !publicAddress(address))) throw new AppError("UNSAFE_MODEL_URL", "接口地址解析到了非公网主机，已阻止连接。", 422);
  return results[0];
}

function providerDiagnostic(body: string, apiKey: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return null; }
  if (typeof parsed !== "object" || parsed === null) return null;
  const payload = parsed as Record<string, unknown>;
  const error = payload.error;
  const details = typeof error === "object" && error !== null ? error as Record<string, unknown> : null;
  const values = [
    details?.code,
    details?.type,
    details?.message,
    details?.detail,
    typeof error === "string" ? error : null,
    payload.error_description,
    payload.message,
    payload.detail,
  ];
  const message = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(": ");
  if (!message) return null;
  return (apiKey ? message.split(apiKey).join("[REDACTED]") : message)
    .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:sk-(?:proj-|or-v1-)?)[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function testModelConnection(config: Config) {
  const url = new URL(config.baseUrl);
  const address = await validateAndResolve(url);
  const apiKey = decryptApiKey({ ciphertext: config.apiKeyCiphertext, iv: config.apiKeyIv, authTag: config.apiKeyAuthTag, last4: config.apiKeyLast4, keyVersion: config.keyVersion });
  const path = `${url.pathname.replace(/\/$/, "")}/chat/completions${url.search}`;
  const body = JSON.stringify({ model: config.model, messages: [{ role: "user", content: "ping" }], max_tokens: 1, ...(config.reasoningEnabled ? { thinking: { type: "enabled" } } : {}) });

  await new Promise<void>((resolve, reject) => {
    const req = httpsRequest({
      protocol: "https:", hostname: url.hostname, port: 443, method: "POST", path,
      servername: url.hostname, timeout: config.timeoutSeconds * 1000,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "content-length": Buffer.byteLength(body) },
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, (res) => {
      let bytes = 0;
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes <= MAX_RESPONSE_BYTES) chunks.push(chunk);
        else req.destroy(new Error("response too large"));
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else {
          const status = res.statusCode ?? 502;
          const providerMessage = providerDiagnostic(Buffer.concat(chunks).toString("utf8"), apiKey);
          const diagnostic = `HTTP ${status}${providerMessage ? `: ${providerMessage}` : ""}`;
          reject(new AppError("MODEL_TEST_FAILED", `模型服务返回 HTTP ${status}。请核对接口地址、模型名称、API Key 和请求参数。`, 502, { diagnostic }));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => reject(error));
    req.end(body);
  });
  return { success: true as const };
}
