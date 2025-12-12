import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { status, search, paymentMethod, startDate, endDate, export: exportFormat } = req.query;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (paymentMethod) {
      where.paymentMethod = String(paymentMethod);
    }

    if (search) {
      const term = String(search);
      where.OR = [
        { id: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        { user: { fullName: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const parsed = new Date(String(startDate));
        if (!Number.isNaN(parsed.getTime())) {
          where.createdAt.gte = parsed;
        }
      }
      if (endDate) {
        const parsed = new Date(String(endDate));
        if (!Number.isNaN(parsed.getTime())) {
          const end = new Date(parsed);
          if (!String(endDate).includes("T")) {
            end.setDate(end.getDate() + 1);
          }
          where.createdAt.lte = end;
        }
      }
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
    const skip = (page - 1) * perPage;

    const include = {
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
    };

    if (String(exportFormat).toLowerCase() === "csv") {
      const exportLimit = 5000;
      const exportOrders = await prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        take: exportLimit,
      });

      const headers = [
        "Order ID",
        "Status",
        "Payment Method",
        "Payment Status",
        "Total Amount",
        "Customer Name",
        "Customer Email",
        "Pickup Location",
        "Pickup Schedule",
        "Created At",
      ];

      const rows = exportOrders.map((order) => [
        order.id,
        order.status,
        order.paymentMethod,
        order.paymentStatus,
        order.totalAmount.toString(),
        order.user?.fullName ?? "",
        order.user?.email ?? "",
        order.pickupLocation ?? "",
        order.pickupSchedule ? order.pickupSchedule.toISOString() : "",
        order.createdAt.toISOString(),
      ]);

      const csv = [headers.join(","), ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=\"orders-export.csv\"");
      return res.send(csv);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: perPage,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      data: orders,
      total,
      page,
      perPage,
    });
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
