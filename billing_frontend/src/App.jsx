
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  BarChart3,
  Receipt,
  LogOut,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import POSBilling from "./pages/POSBilling";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import SalesHistory from "./pages/SalesHistory";
import Login from "./pages/Login";

import {
  getSession,
  logoutStaff,
} from "./services/api";

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "POS Billing", path: "/billing", icon: ShoppingCart },
  { name: "Products", path: "/products", icon: Package },
  { name: "Inventory", path: "/inventory", icon: Boxes },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Sales History", path: "/sales", icon: Receipt },
];

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const response = await getSession();

        if (!active) return;

        setAuthenticated(
          response.data.authenticated === true
        );
        setUsername(response.data.username || "");
      } catch (error) {
        if (!active) return;

        console.error("Session check failed:", error);
        setAuthenticated(false);
      } finally {
        if (active) setChecking(false);
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, []);

  function handleLogin(data) {
    setAuthenticated(true);
    setUsername(data.username || "");
  }

  async function handleLogout() {
    try {
      await logoutStaff();
      setAuthenticated(false);
      setUsername("");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Unable to log out. Please try again.");
    }
  }

  if (checking) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Supermarket POS</h2>
          <p>Checking staff session...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              state={{ from: location.pathname }}
              replace
            />
          }
        />
      </Routes>
    );
  }

  if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpeg" alt="Supermarket Logo" />
          <span>Supermarket POS</span>
        </div>

        <nav>
          {menu.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <Icon size={20} />
              {name}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "20px" }}>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Supermarket Management System</h1>
            <p>Billing, Inventory and Sales Management</p>
          </div>

          <span>{username}</span>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/billing" element={<POSBilling />} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
