import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "./lib/env";
import { findLocalUserById } from "./queries/local-users";

const JWT_ALG = "HS256";
export const LOCAL_AUTH_COOKIE = "local_sid";

export type LocalSessionPayload = {
  userId: number;
  username: string;
};

export async function signLocalSessionToken(
  payload: LocalSessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyLocalSessionToken(
  token: string,
): Promise<LocalSessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
      clockTolerance: 60,
    });
    const userId = payload.userId as number;
    const username = payload.username as string;
    if (!userId || !username) return null;
    return { userId, username };
  } catch {
    return null;
  }
}

export async function authenticateLocalRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[LOCAL_AUTH_COOKIE];
  if (!token) return null;

  const claim = await verifyLocalSessionToken(token);
  if (!claim) return null;

  const user = await findLocalUserById(claim.userId);
  if (!user) return null;

  return user;
}
