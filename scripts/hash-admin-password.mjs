import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write("请在交互式终端运行 pnpm auth:hash-password。\n");
  process.exit(1);
}

process.stdout.write("管理员密码（至少 12 位，不回显）: ");
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
let password = "";
process.stdin.on("data", (chunk) => {
  for (const char of chunk) {
    if (char === "\u0003") { process.stdout.write("\n已取消。\n"); process.exit(1); }
    if (char === "\r" || char === "\n") {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (password.length < 12) { process.stderr.write("密码至少需要 12 位。\n"); process.exit(1); }
      const salt = randomBytes(16);
      const key = scryptSync(password, salt, 64);
      password = "";
      process.stdout.write(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${key.toString("hex")}\n`);
      process.exit(0);
    }
    if (char === "\u007f" || char === "\b") password = password.slice(0, -1);
    else if (char >= " ") password += char;
  }
});
