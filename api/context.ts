import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User, LocalUser } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { authenticateLocalRequest } from "./local-auth";

export type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar?: string | null;
  role: "user" | "admin";
  authType: "oauth" | "local";
  unionId?: string;
  username?: string;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UnifiedUser;
};

function unifyOAuthUser(user: User): UnifiedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role as "user" | "admin",
    authType: "oauth",
    unionId: user.unionId,
  };
}

function unifyLocalUser(user: LocalUser): UnifiedUser {
  return {
    id: user.id,
    name: user.displayName || user.username,
    email: user.email,
    role: user.role as "user" | "admin",
    authType: "local",
    username: user.username,
  };
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try OAuth first
  try {
    const oauthUser = await authenticateRequest(opts.req.headers);
    if (oauthUser) {
      ctx.user = unifyOAuthUser(oauthUser);
      return ctx;
    }
  } catch {
    // OAuth not available, try local auth
  }

  // Try local auth
  try {
    const localUser = await authenticateLocalRequest(opts.req.headers);
    if (localUser) {
      ctx.user = unifyLocalUser(localUser);
      return ctx;
    }
  } catch {
    // Local auth not available
  }

  return ctx;
}
