import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addAuditLog,
  createCategory,
  createProduct,
  createSupplier,
  getAllCategories,
  getAllSuppliers,
  getProductByBarcode,
  getProductById,
  getProducts,
  updateProduct,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const productsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getProducts(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getProductById(input.id);
    }),

  getByBarcode: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ input }) => {
      return getProductByBarcode(input.barcode);
    }),

  create: adminProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        landingCost: z.string(),
        branchCost: z.string(),
        retailPrice: z.string(),
        reorderLevel: z.number().optional(),
        barcode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createProduct(input);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "CREATE",
        entityType: "Product",
        details: `Created product: ${input.name} (${input.sku})`,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        landingCost: z.string().optional(),
        branchCost: z.string().optional(),
        retailPrice: z.string().optional(),
        reorderLevel: z.number().optional(),
        barcode: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (ctx.user.role === "manager" && input.branchCost !== undefined) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Managers cannot change branch cost",
        });
      }

      const { id, ...data } = input;
      await updateProduct(id, data);
      await addAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        action: "UPDATE",
        entityType: "Product",
        entityId: String(id),
        details: `Updated product ${id}`,
      });
      return { success: true };
    }),

  // Categories
  listCategories: protectedProcedure.query(async () => getAllCategories()),

  createCategory: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      await createCategory(input);
      return { success: true };
    }),

  // Suppliers
  listSuppliers: protectedProcedure.query(async () => getAllSuppliers()),

  createSupplier: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createSupplier(input);
      return { success: true };
    }),
});
