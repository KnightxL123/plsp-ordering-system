import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { categoryId, search } = req.query;

    const where: any = { isActive: true };

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (search) {
      where.name = {
        contains: String(search),
        mode: "insensitive",
      };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy: { name: "asc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching products", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.use(authenticate, requireAdmin);

router.get("/admin", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching admin products", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/admin/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin", async (req, res) => {
  const { name, description, categoryId, basePrice, imageUrl, isActive, variants } = req.body as {
    name?: string;
    description?: string | null;
    categoryId?: string;
    basePrice?: number | string;
    imageUrl?: string | null;
    isActive?: boolean;
    variants?: Array<{
      name?: string;
      sku?: string | null;
      price?: number | string | null;
      stockQuantity?: number;
    }>;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (!categoryId) {
    return res.status(400).json({ message: "Category is required" });
  }

  const priceNumber = Number(basePrice);
  if (Number.isNaN(priceNumber)) {
    return res.status(400).json({ message: "Invalid base price" });
  }

  if (variants) {
    for (const variant of variants) {
      if (variant && !variant.name?.trim()) {
        return res.status(400).json({ message: "Variant name cannot be empty" });
      }
      if (variant && !variant.sku?.trim()) {
        return res.status(400).json({ message: "Variant SKU is required" });
      }
      if (variant?.price !== undefined && variant.price !== null && Number.isNaN(Number(variant.price))) {
        return res.status(400).json({ message: "Variant price must be a valid number" });
      }
    }
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        categoryId,
        basePrice: priceNumber,
        imageUrl: imageUrl?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        variants: variants?.length
          ? {
              create: variants
                .filter((variant) => variant.name && variant.name.trim())
                .map((variant) => ({
                  name: variant.name!.trim(),
                  sku: variant.sku!.trim(),
                  price: variant.price !== undefined && variant.price !== null ? Number(variant.price) : null,
                  stockQuantity: variant.stockQuantity ?? 0,
                })),
            }
          : undefined,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/admin/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, categoryId, basePrice, imageUrl, isActive, variants } = req.body as {
    name?: string;
    description?: string | null;
    categoryId?: string;
    basePrice?: number | string;
    imageUrl?: string | null;
    isActive?: boolean;
    variants?: Array<{
      id?: string;
      name?: string;
      sku?: string | null;
      price?: number | string | null;
      stockQuantity?: number;
      _delete?: boolean;
    }>;
  };

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "Name cannot be empty" });
  }

  if (basePrice !== undefined && Number.isNaN(Number(basePrice))) {
    return res.status(400).json({ message: "Invalid base price" });
  }

  if (variants) {
    for (const variant of variants) {
      if (variant._delete) continue;
      if (variant.id && variant.sku !== undefined && !variant.sku?.trim()) {
        return res.status(400).json({ message: "Variant SKU cannot be empty" });
      }
      if (!variant.id && !variant.name?.trim()) {
        return res.status(400).json({ message: "Variant name cannot be empty" });
      }
      if (!variant.id && !variant.sku?.trim()) {
        return res.status(400).json({ message: "Variant SKU is required" });
      }
      if (variant.price !== undefined && variant.price !== null && Number.isNaN(Number(variant.price))) {
        return res.status(400).json({ message: "Variant price must be a valid number" });
      }
    }
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(basePrice !== undefined ? { basePrice: Number(basePrice) } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    if (variants && variants.length > 0) {
      const ops = variants.map((variant) => {
        if (variant.id && variant._delete) {
          return prisma.productVariant.delete({ where: { id: variant.id } });
        }
        if (variant.id) {
          return prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              ...(variant.name !== undefined ? { name: variant.name.trim() } : {}),
              ...(variant.sku !== undefined ? { sku: variant.sku!.trim() } : {}),
              ...(variant.price !== undefined ? { price: variant.price !== null ? Number(variant.price) : null } : {}),
              ...(variant.stockQuantity !== undefined ? { stockQuantity: variant.stockQuantity } : {}),
            },
          });
        }
        if (!variant._delete && variant.name && variant.name.trim()) {
          return prisma.productVariant.create({
            data: {
              productId: id,
              name: variant.name.trim(),
              sku: variant.sku!.trim(),
              price: variant.price !== undefined && variant.price !== null ? Number(variant.price) : null,
              stockQuantity: variant.stockQuantity ?? 0,
            },
          });
        }
        return null;
      }).filter(Boolean);

      if (ops.length) {
        await prisma.$transaction(ops as any);
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        variants: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating product", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/admin/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error archiving product", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
