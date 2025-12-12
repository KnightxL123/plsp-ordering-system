import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { items, paymentMethod, pickupLocation, pickupSchedule } = req.body as {
    items?: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
    }>;
    paymentMethod?: string;
    pickupLocation?: string;
    pickupSchedule?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Order items are required" });
  }

  const allowedPaymentMethods = ["ONLINE", "CASH_ON_PICKUP"];
  if (!paymentMethod || !allowedPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ message: "Invalid payment method" });
  }

  try {
    const productIds = Array.from(new Set(items.map((i) => i.productId)));

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "One or more products not found" });
    }

    let totalAmount = 0;

    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;

      const variant = item.variantId
        ? product.variants.find((v) => v.id === item.variantId) ?? null
        : null;

      const unitPriceNumber = Number(variant?.price ?? product.basePrice);
      const lineTotalNumber = unitPriceNumber * item.quantity;

      totalAmount += lineTotalNumber;

      return {
        productId: product.id,
        variantId: variant ? variant.id : null,
        quantity: item.quantity,
        unitPrice: unitPriceNumber,
        lineTotal: lineTotalNumber,
      };
    });

    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        status: "PENDING_PAYMENT",
        paymentMethod,
        paymentStatus: paymentMethod === "ONLINE" ? "PENDING" : "UNPAID",
        totalAmount,
        pickupLocation: pickupLocation || null,
        pickupSchedule: pickupSchedule ? new Date(pickupSchedule) : null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
      },
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
