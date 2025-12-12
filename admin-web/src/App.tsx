import React, { useEffect } from "react";
import {
  NavLink,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (!token && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
    if (token && location.pathname === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [token, location.pathname, navigate]);

  if (location.pathname === "/login") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-4 text-lg font-semibold border-b border-slate-700">
          PLSP Admin
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block rounded px-3 py-2 ${
                isActive ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `block rounded px-3 py-2 ${
                isActive ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `block rounded px-3 py-2 ${
                isActive ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            Orders
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `block rounded px-3 py-2 ${
                isActive ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            Categories
          </NavLink>
        </nav>
        <div className="px-2 pb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
