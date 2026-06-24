import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import {
  findLocalUserByUsername,
  createLocalUser,
  updateLocalUserLastSignIn,
} from "./queries/local-users";
import {
  signLocalSessionToken,
  verifyLocalSessionToken,
  LOCAL_AUTH_COOKIE,
} from "./local-auth";
import { env } from "./lib/env";
import { randomBytes, timingSafeEqual, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64) as Buffer).toString("hex");
  return `${salt}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const testHash = (await scryptAsync(password, salt, 64) as Buffer).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(6).max(100),
        displayName: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await findLocalUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }

      const passwordHash = await hashPassword(input.password);
      const result = await createLocalUser({
        username: input.username,
        passwordHash,
        displayName: input.displayName || input.username,
        email: input.email,
      });

      return { success: true, userId: result[0].id };
    }),

  login: publicQuery
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await findLocalUserByUsername(input.username);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      await updateLocalUserLastSignIn(user.id);

      const token = await signLocalSessionToken({
        userId: user.id,
        username: user.username,
      });

      // Set cookie via header
      const cookieStr = `${LOCAL_AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${env.isProduction ? "; Secure" : ""}`;
      ctx.resHeaders.append("set-cookie", cookieStr);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.displayName || user.username,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    // Check for local auth cookie
    const cookieHeader = ctx.req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      })
    );

    const token = cookies[LOCAL_AUTH_COOKIE];
    if (!token) return null;

    const claim = await verifyLocalSessionToken(token);
    if (!claim) return null;

    const user = await findLocalUserByUsername(claim.username);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.displayName || user.username,
      email: user.email,
      role: user.role,
      authType: "local" as const,
    };
  }),

  logout: publicQuery.mutation(({ ctx }) => {
    ctx.resHeaders.append(
      "set-cookie",
      `${LOCAL_AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    );
    return { success: true };
  }),
});
