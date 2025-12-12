import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import authRoutes from "./routes/auth";
import adminOrdersRoutes from "./routes/adminOrders";
import ordersRoutes from "./routes/orders";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/admin/orders", adminOrdersRoutes);
app.use("/orders", ordersRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);

export default app;
