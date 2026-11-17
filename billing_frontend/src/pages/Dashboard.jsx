
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { getProducts, getSalesHistory } from "../services/api";

import "./Dashboard.css";

// =====================================================
// HELPERS
// =====================================================

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getItems = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

const getLocalDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// =====================================================
// DASHBOARD COMPONENT
// =====================================================

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productResponse, salesResponse] =
        await Promise.all([
          getProducts(),
          getSalesHistory(),
        ]);

      setProducts(getItems(productResponse));
      setSales(getItems(salesResponse));
    } catch (err) {
      console.error("Dashboard API error:", err);

      setError(
        "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =====================================================
  // TOTAL SALES
  // =====================================================

  const totalSales = useMemo(() => {
    return sales.reduce(
      (sum, sale) =>
        sum + Number(sale.total_amount || 0),
      0
    );
  }, [sales]);

  // =====================================================
  // TODAY'S SALES
  // =====================================================

  const todayKey = getLocalDateKey(new Date());

  const todaySales = useMemo(() => {
    return sales.filter(
      (sale) =>
        getLocalDateKey(sale.created_at) === todayKey
    );
  }, [sales, todayKey]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce(
      (sum, sale) =>
        sum + Number(sale.total_amount || 0),
      0
    );
  }, [todaySales]);

  // =====================================================
  // INVENTORY CALCULATIONS
  // =====================================================

  const lowStock = useMemo(() => {
    return products.filter((product) => {
      const stock = Number(product.stock_quantity || 0);
      const threshold = Number(
        product.low_stock_threshold ?? 5
      );

      return stock > 0 && stock <= threshold;
    });
  }, [products]);

  const outOfStock = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock_quantity || 0) <= 0
    );
  }, [products]);

  // =====================================================
  // SALES CHART - LAST 7 DAYS
  // =====================================================

  const salesChartData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);

      date.setDate(
        date.getDate() - (6 - index)
      );

      const dateKey = getLocalDateKey(date);

      const dailySales = sales
        .filter(
          (sale) =>
            getLocalDateKey(sale.created_at) === dateKey
        )
        .reduce(
          (sum, sale) =>
            sum + Number(sale.total_amount || 0),
          0
        );

      return {
        day: date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          timeZone: "Asia/Kolkata",
        }),
        sales: dailySales,
      };
    });
  }, [sales]);

  // =====================================================
  // PAYMENT METHOD CHART
  // =====================================================

  const paymentChartData = useMemo(() => {
    return ["cash", "upi", "card"].map((method) => ({
      method: method.toUpperCase(),

      amount: sales
        .filter(
          (sale) =>
            String(
              sale.payment_method || ""
            ).toLowerCase() === method
        )
        .reduce(
          (sum, sale) =>
            sum + Number(sale.total_amount || 0),
          0
        ),
    }));
  }, [sales]);

  // =====================================================
  // PRODUCT STOCK CHART
  // =====================================================

  const stockChartData = useMemo(() => {
    return [...products]
      .sort(
        (a, b) =>
          Number(b.stock_quantity || 0) -
          Number(a.stock_quantity || 0)
      )
      .slice(0, 8)
      .map((product) => ({
        name: product.name,
        stock: Number(product.stock_quantity || 0),
      }));
  }, [products]);

  // =====================================================
  // DASHBOARD STATISTICS CARDS
  // =====================================================

  const cards = [
    {
      title: "Total Sales",
      value: money(totalSales),
      icon: IndianRupee,
    },
    {
      title: "Today's Sales",
      value: money(todayRevenue),
      icon: TrendingUp,
    },
    {
      title: "Total Bills",
      value: sales.length,
      icon: ShoppingCart,
    },
    {
      title: "Total Products",
      value: products.length,
      icon: Package,
    },
    {
      title: "Low Stock",
      value: lowStock.length + outOfStock.length,
      icon: AlertTriangle,
    },
  ];

  // =====================================================
  // JSX
  // =====================================================

  return (
    <div className="dashboard-page">

      {/* DASHBOARD HEADER */}

      <div className="dashboard-heading">
        <div>
          <h1>Sales Dashboard</h1>

          <p>
            Supermarket sales and inventory analytics
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={17} />

          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <p role="alert" className="dashboard-error">
          {error}
        </p>
      )}

      {/* LOADING */}

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>

          {/* ========================================
              FIVE STATISTICS CARDS
          ======================================== */}

          <div className="dashboard-stats">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  className="dashboard-stat-card"
                  key={card.title}
                >
                  <div className="dashboard-stat-top">
                    <span>{card.title}</span>

                    <Icon size={22} />
                  </div>

                  <h2>{card.value}</h2>
                </div>
              );
            })}
          </div>

          {/* ========================================
              SALES CHARTS
          ======================================== */}

          <div className="dashboard-grid">

            {/* DAILY SALES */}

            <section className="dashboard-panel">
              <h3>Daily Sales - Last 7 Days</h3>

              <div
                style={{
                  width: "100%",
                  height: 300,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={salesChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis dataKey="day" />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Bar
                      dataKey="sales"
                      name="Sales"
                      fill="#2563eb"
                      barSize={22}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* PAYMENT METHODS */}

            <section className="dashboard-panel">
              <h3>Payment Method Sales</h3>

              <div
                style={{
                  width: "100%",
                  height: 300,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={paymentChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis dataKey="method" />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Bar
                      dataKey="amount"
                      name="Amount"
                      fill="#16a34a"
                      barSize={22}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="dashboard-note">
                Sales grouped by recorded payment method.
              </p>
            </section>
          </div>

          {/* ========================================
              INVENTORY CHARTS AND ALERTS
          ======================================== */}

          <div className="dashboard-grid">

            {/* PRODUCT STOCK */}

            <section className="dashboard-panel">
              <h3>Product Stock Levels</h3>

              <div
                style={{
                  width: "100%",
                  height: 320,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={stockChartData}
                    layout="vertical"
                    margin={{
                      left: 15,
                      right: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis type="number" />

                    <YAxis
                      dataKey="name"
                      type="category"
                      width={105}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="stock"
                      name="Available Stock"
                      fill="#f59e0b"
                      barSize={14}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* INVENTORY ALERTS */}

            <section className="dashboard-panel">
              <h3>Inventory Alerts</h3>

              <div className="dashboard-alert-row">
                <span>Low Stock Products</span>

                <strong>{lowStock.length}</strong>
              </div>

              <div className="dashboard-alert-row">
                <span>Out of Stock Products</span>

                <strong>{outOfStock.length}</strong>
              </div>

              {lowStock.length === 0 &&
                outOfStock.length === 0 && (
                  <p className="dashboard-note">
                    No inventory alerts.
                  </p>
                )}

              {[
                ...outOfStock,
                ...lowStock,
              ]
                .slice(0, 5)
                .map((product) => (
                  <div
                    className="dashboard-alert-product"
                    key={product.id}
                  >
                    <span>{product.name}</span>

                    <strong>
                      {product.stock_quantity} left
                    </strong>
                  </div>
                ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
