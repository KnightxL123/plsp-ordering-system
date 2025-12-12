import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/all", authenticate, requireAdmin, async (_req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching all categories", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { name, description, isActive } = req.body as {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body as {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  };

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "Name cannot be empty" });
  }

  try {
    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    res.json(category);
  } catch (error: any) {
    console.error("Error updating category", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.productCategory.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error archiving category", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
