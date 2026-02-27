import { z } from "zod";
import { getAuditLogs } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        userId: z.number().optional(),
        branchId: z.number().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditLogs(input ?? {});
    }),
});
