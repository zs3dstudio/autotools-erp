import { z } from "zod";
import { getCompanySettings, upsertCompanySettings, addAuditLog } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const companySettingsRouter = router({
  get: protectedProcedure.query(async () => {
    return getCompanySettings();
  }),

  update: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1).max(256).optional(),
        tagline: z.string().max(256).optional(),
        address: z.string().optional(),
        phone: z.string().max(64).optional(),
        email: z.string().email().max(320).optional().or(z.literal("")),
        website: z.string().max(256).optional(),
        currency: z.string().max(8).optional(),
        currencySymbol: z.string().max(8).optional(),
        logoUrl: z.string().optional(),
        primaryColor: z.string().max(32).optional(),
        taxRate: z.string().optional(),
        receiptFooter: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can update company settings");
      }
      const result = await upsertCompanySettings(input);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE_COMPANY_SETTINGS",
        entityType: "CompanySettings",
        entityId: "1",
        details: `Updated company settings`,
      });
      return result;
    }),
});
