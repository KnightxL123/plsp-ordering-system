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

interface OrdersApiResponse {
  data: Order[];
  total: number;
  page: number;
  perPage: number;
}

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatDateInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<string>("ALL");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const buildParams = (includePagination = true) => {
    const params: Record<string, string> = {};
    if (selectedStatus !== "ALL") {
      params.status = selectedStatus;
    }
    if (activeSearch.trim()) {
      params.search = activeSearch.trim();
    }
    if (selectedPayment !== "ALL") {
      params.paymentMethod = selectedPayment;
    }
    if (startDateTime) {
      params.startDate = startDateTime;
    }
    if (endDateTime) {
      params.endDate = endDateTime;
    }
    if (includePagination) {
      params.page = String(page);
      params.perPage = String(perPage);
    }
    return params;
  };

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const res = await api.get<OrdersApiResponse | Order[]>("/admin/orders", {
          params: buildParams(true),
        });
        if (Array.isArray(res.data)) {
          setOrders(res.data);
          setTotal(res.data.length);
          setPage(1);
          setPerPage(Math.min(perPage, Math.max(1, res.data.length)) || 20);
        } else {
          setOrders(res.data.data);
          setTotal(res.data.total);
          setPage(res.data.page);
          setPerPage(res.data.perPage);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [selectedStatus, activeSearch, selectedPayment, startDateTime, endDateTime, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [selectedStatus, activeSearch, selectedPayment, startDateTime, endDateTime]);

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

  const filteredOrders = orders;

  async function handleExport() {
    try {
      const res = await api.get<ArrayBuffer>("/admin/orders", {
        params: { ...buildParams(false), export: "csv" },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export CSV");
    }
  }

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-slate-700">
          <span>Filter by status:</span>
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
        </label>
        <label className="flex items-center gap-2 text-slate-700">
          <span>Payment:</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none"
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="CASH_ON_PICKUP">Cash on Pickup</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveSearch(searchInput);
          }}
        >
          <input
            type="text"
            placeholder="Search ID, email, name..."
            className="min-w-[220px] rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Search
          </button>
          {(activeSearch || searchInput) && (
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSearchInput("");
                setActiveSearch("");
              }}
            >
              Clear
            </button>
          )}
        </form>
        <div className="flex flex-wrap items-end gap-2 text-xs text-slate-700">
          <label className="flex flex-col">
            <span className="mb-1">Start</span>
            <input
              type="datetime-local"
              className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1">End</span>
            <input
              type="datetime-local"
              className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
            />
          </label>
          {(startDateTime || endDateTime) && (
            <button
              type="button"
              className="self-end rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setStartDateTime("");
                setEndDateTime("");
              }}
            >
              Clear Dates
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Preset:</span>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                setStartDateTime(formatDateInput(start));
                setEndDateTime(formatDateInput(end));
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                const day = now.getDay(); // Sunday=0
                start.setDate(now.getDate() - day);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                setStartDateTime(formatDateInput(start));
                setEndDateTime(formatDateInput(end));
              }}
            >
              This week
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                const start = new Date(end);
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                setStartDateTime(formatDateInput(start));
                setEndDateTime(formatDateInput(end));
              }}
            >
              Last 7 days
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                setStartDateTime(formatDateInput(start));
                setEndDateTime(formatDateInput(end));
              }}
            >
              This month
            </button>
          </div>
          <button
            type="button"
            className="self-end rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={handleExport}
          >
            Export CSV
          </button>
        </div>
      </div>
      {(selectedStatus !== "ALL" ||
        selectedPayment !== "ALL" ||
        activeSearch ||
        startDateTime ||
        endDateTime) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {selectedStatus !== "ALL" && (
            <FilterChip label={`Status: ${statusLabels[selectedStatus] ?? selectedStatus}`} onClear={() => setSelectedStatus("ALL")} />
          )}
          {selectedPayment !== "ALL" && (
            <FilterChip
              label={`Payment: ${selectedPayment === "CASH_ON_PICKUP" ? "Cash on Pickup" : "Online"}`}
              onClear={() => setSelectedPayment("ALL")}
            />
          )}
          {activeSearch && (
            <FilterChip label={`Search: ${activeSearch}`} onClear={() => {
              setActiveSearch("");
              setSearchInput("");
            }} />
          )}
          {startDateTime && (
            <FilterChip
              label={`Start: ${new Date(startDateTime).toLocaleString("en-PH")}`}
              onClear={() => setStartDateTime("")}
            />
          )}
          {endDateTime && (
            <FilterChip
              label={`End: ${new Date(endDateTime).toLocaleString("en-PH")}`}
              onClear={() => setEndDateTime("")}
            />
          )}
        </div>
      )}
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
                    <div>{new Date(order.createdAt).toLocaleString("en-PH")}</div>
                    <button
                      className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setDetailOrder(order)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filteredOrders.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
          <div>
            Showing {(page - 1) * perPage + 1}-
            {Math.min(page * perPage, total)} of {total} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
            <label className="flex items-center gap-1 text-xs">
              <span>Per page:</span>
              <select
                className="rounded border border-slate-300 px-2 py-1"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      )}
    </div>
  );
};

export default OrdersPage;

interface FilterChipProps {
  label: string;
  onClear: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 shadow-sm">
    {label}
    <button
      type="button"
      className="text-slate-500 hover:text-slate-800"
      onClick={onClear}
      aria-label={`Remove ${label}`}
    >
      ×
    </button>
  </span>
);

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const total = Number(order.totalAmount) || 0;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
            <p className="font-mono text-sm text-slate-800">{order.id}</p>
          </div>
          <button
            className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="grid gap-6 px-6 py-4 md:grid-cols-2">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Status & Payment</h2>
            <div className="text-sm text-slate-700">
              <div>
                <span className="font-medium">Status:</span> {statusLabels[order.status] ?? order.status}
              </div>
              <div>
                <span className="font-medium">Payment Method:</span>{" "}
                {order.paymentMethod === "CASH_ON_PICKUP" ? "Cash on Pickup" : order.paymentMethod}
              </div>
              <div>
                <span className="font-medium">Payment Status:</span> {order.paymentStatus}
              </div>
              {order.payment?.provider && (
                <div>
                  <span className="font-medium">Provider:</span> {order.payment.provider}
                </div>
              )}
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">Pickup Details</h2>
            <div className="text-sm text-slate-700">
              <div>
                <span className="font-medium">Location:</span>{" "}
                {order.pickupLocation ? order.pickupLocation : "No location provided"}
              </div>
              <div>
                <span className="font-medium">Schedule:</span>{" "}
                {order.pickupSchedule ? new Date(order.pickupSchedule).toLocaleString("en-PH") : "No schedule provided"}
              </div>
            </div>
          </section>
        </div>
        <section className="px-6 pb-4">
          <h2 className="text-sm font-semibold text-slate-700">Items</h2>
          <div className="mt-2 overflow-hidden rounded border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{item.product.name}</td>
                    <td className="px-3 py-2 text-slate-600">{item.variant?.name ?? "—"}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">
                      ₱{Number(item.lineTotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end text-base font-semibold text-slate-800">
            Total: ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </div>
        </section>
      </div>
    </div>
  );
};
