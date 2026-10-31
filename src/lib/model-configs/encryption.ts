import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "@/lib/api-response";

export type EncryptedApiKey = { ciphertext: string; iv: string; authTag: string; last4: string; keyVersion: number };

function encryptionKey() {
  const value = process.env.MODEL_API_KEY_ENCRYPTION_KEY ?? "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new AppError("MODEL_ENCRYPTION_NOT_CONFIGURED", "模型 API Key 加密尚未配置 MODEL_API_KEY_ENCRYPTION_KEY。", 503);
  return Buffer.from(value, "hex");
}

export function encryptApiKey(plaintext: string): EncryptedApiKey {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex"), last4: plaintext.slice(-4), keyVersion: 1 };
}

export function decryptApiKey(value: EncryptedApiKey) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "hex"));
  decipher.setAuthTag(Buffer.from(value.authTag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
