import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { AppError } from "@/lib/api-response";
import { decryptApiKey } from "@/lib/model-configs/encryption";
import type { llmModelConfigs } from "@/lib/db/schema";

type Config = typeof llmModelConfigs.$inferSelect;

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
      res.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 16_384) req.destroy(new Error("response too large")); });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new AppError("MODEL_TEST_FAILED", `模型服务返回 HTTP ${res.statusCode ?? "未知"}。请核对接口地址、模型名称和 API Key。`, 422));
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => reject(error));
    req.end(body);
  });
  return { success: true as const };
}
