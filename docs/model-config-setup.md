# 管理员与模型参数配置

模型配置 API Key 会使用 AES-256-GCM 在服务端加密后写入 Neon。认证凭据与加密密钥必须作为服务端环境变量配置，不要加入 Git、浏览器代码或日志。

## 本地开发

1. 在项目目录运行 `pnpm auth:hash-password`，输入至少 12 位的管理员密码。命令不会回显密码，并输出 `ADMIN_PASSWORD_HASH`。
2. 复制 `.env.example` 为 `.env.local`，填写 `ADMIN_USERNAME`、上一步生成的 `ADMIN_PASSWORD_HASH`。
3. 分别生成会话密钥和 API Key 加密密钥：

   ```sh
   openssl rand -hex 32
   openssl rand -hex 32
   ```

   第一条结果填写到 `AUTH_SESSION_SECRET`，第二条填写到 `MODEL_API_KEY_ENCRYPTION_KEY`。两项必须是不同的随机值。
4. 确认 `DATABASE_URL` 指向 Neon，然后运行 `pnpm db:migrate`。
5. 重启 `pnpm dev` 并打开 `/login`。

## Vercel

在项目的 **Settings → Environment Variables** 中添加上述四项管理员/加密变量，环境至少选择 Production；需要在预览环境测试时，也给 Preview 设置独立值。不要在前端变量名前添加 `NEXT_PUBLIC_`。保存后重新部署，使函数加载新环境变量。生产和预览环境可共用 Neon 的前提是其数据隔离符合你的要求；建议为 Preview 使用独立数据库。

## 密钥轮换

不要直接替换 `MODEL_API_KEY_ENCRYPTION_KEY`：现有记录将无法解密。轮换需要先部署数据重加密流程，再切换环境变量。遗失密钥后，已保存的模型 API Key 无法恢复，只能在模型参数页重新录入。
