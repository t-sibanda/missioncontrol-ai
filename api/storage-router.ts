import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  generateFileKey,
} from "./cloud-storage";

export const storageRouter = createRouter({
  getUploadUrl: authedQuery
    .input(
      z.object({
        filename: z.string().min(1),
        fileType: z.enum(["resume_pdf", "resume_docx", "cover_letter", "avatar"]),
        contentType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.authType === "oauth" 
        ? ctx.user.unionId! 
        : String(ctx.user.id);

      const key = generateFileKey(userId, input.fileType, input.filename);
      const contentTypeMap: Record<string, string> = {
        resume_pdf: "application/pdf",
        resume_docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        cover_letter: "application/pdf",
        avatar: "image/png",
      };

      const result = await generateUploadUrl(
        key,
        input.contentType || contentTypeMap[input.fileType] || "application/octet-stream"
      );

      return result;
    }),

  getDownloadUrl: authedQuery
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ input }) => {
      return generateDownloadUrl(input.key);
    }),

  delete: authedQuery
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return deleteFile(input.key);
    }),
});
