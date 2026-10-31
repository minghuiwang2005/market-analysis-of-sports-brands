import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, encoded: string) {
  const [algorithm, saltHex, keyHex, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex || extra || !/^[a-f\d]{32}$/i.test(saltHex) || !/^[a-f\d]{128}$/i.test(keyHex)) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}
