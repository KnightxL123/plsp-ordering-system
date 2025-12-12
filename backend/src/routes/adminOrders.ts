import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (search) {
      const term = String(search);
      where.OR = [
        { id: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        { user: { fullName: { contains: term, mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
            variant: {
              select: { id: true, name: true },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(orders);
  } catch (error) {
    console.error("Error fetching admin orders", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    console.error("Error fetching order", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  const allowedStatuses = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status: status as any },
    });

    return res.json(order);
  } catch (error: any) {
    console.error("Error updating order status", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
