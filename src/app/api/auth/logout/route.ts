import { SESSION_COOKIE } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-response";
import { assertSameOrigin, requireAdminSession } from "@/lib/auth/guard";

export async function POST(request: Request) {
  try {
    requireAdminSession(request);
    assertSameOrigin(request);
    return Response.json({ data: { loggedOut: true } }, { headers: { "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` } });
  } catch (error) { return errorResponse(error); }
}
