import React, { useEffect, useState } from "react";
import api from "../lib/api";

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  lineTotal: string;
  product: {
    id: string;
    name: string;
  };
  variant: {
    id: string;
    name: string;
  } | null;
}

interface PaymentInfo {
  id: string;
  provider: string;
  status: string;
  amount: string;
}

interface Order {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  pickupLocation?: string | null;
  pickupSchedule?: string | null;
  user: UserInfo;
  items: OrderItem[];
  payment: PaymentInfo | null;
}

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const res = await api.get<Order[]>("/admin/orders");
        setOrders(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      setUpdatingId(orderId);
      const res = await api.patch<Order>(`/admin/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: res.data.status } : o)));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders =
    selectedStatus === "ALL"
      ? orders
      : orders.filter((o) => o.status === selectedStatus);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-slate-700">Filter by status:</span>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="ALL">All</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="text-sm text-slate-600">No orders yet.</div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Order ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Customer</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Items</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Total</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Status / Payment</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-slate-900">{order.user?.fullName}</div>
                    <div className="text-xs text-slate-500">{order.user?.email}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-700">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    ₱{Number(order.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {statusLabels[order.status] ?? order.status}
                        </span>
                        <select
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none"
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                        >
                          {Object.keys(statusLabels).map((value) => (
                            <option key={value} value={value}>
                              {statusLabels[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {order.paymentMethod === "CASH_ON_PICKUP"
                          ? "Cash on Pickup"
                          : order.paymentMethod}
                        {order.pickupLocation
                          ? `  Pickup: ${order.pickupLocation}`
                          : ""}
                        {order.pickupSchedule
                          ? `  Schedule: ${new Date(order.pickupSchedule).toLocaleString("en-PH")}`
                          : ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {new Date(order.createdAt).toLocaleString("en-PH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
