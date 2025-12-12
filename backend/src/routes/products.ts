import { Router } from "express";
import prisma from "../lib/prisma";

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

export default router;
