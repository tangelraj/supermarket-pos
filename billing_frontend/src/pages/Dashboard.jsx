
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  IndianRupee,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { getProducts, getSalesHistory } from "../services/api";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [productResponse, salesResponse] =
        await Promise.all([
          getProducts(),
          getSalesHistory(),
        ]);

      const productData = productResponse.data;
      const salesData = salesResponse.data;

      setProducts(
        Array.isArray(productData)
          ? productData
          : productData.results ?? []
      );

      setSales(
        Array.isArray(salesData)
          ? salesData
          : salesData.results ?? []
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );

  const today = new Date().toDateString();

  const todaySales = sales.filter(
    (sale) =>
      new Date(sale.created_at).toDateString() === today
  );

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );

  const lowStock = products.filter((product) => {
    const stock = Number(product.stock_quantity);
    const limit = Number(product.low_stock_threshold ?? 5);

    return stock > 0 && stock <= limit;
  });

  const outOfStock = products.filter(
    (product) => Number(product.stock_quantity) <= 0
  );

  // Sales for the last 7 days
  const salesChartData = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));

      const dayKey = date.toDateString();

      const dailyTotal = sales
        .filter(
          (sale) =>
            new Date(sale.created_at).toDateString() === dayKey
        )
        .reduce(
          (sum, sale) => sum + Number(sale.total_amount),
          0
        );

      return {
        day: date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        sales: dailyTotal,
      };
    }
  );

  // Payment method bar chart
  const paymentChartData = ["cash", "upi", "card"].map(
    (method) => ({
      method: method.toUpperCase(),
      amount: sales
        .filter(
          (sale) =>
            String(sale.payment_method).toLowerCase() === method
        )
        .reduce(
          (sum, sale) => sum + Number(sale.total_amount),
          0
        ),
    })
  );

  // Product stock bar chart
  const stockChartData = [...products]
    .sort(
      (a, b) =>
        Number(b.stock_quantity) - Number(a.stock_quantity)
    )
    .slice(0, 8)
    .map((product) => ({
      name: product.name,
      stock: Number(product.stock_quantity),
    }));

  const cards = [
    {
      title: "Total Sales",
      value: money(totalSales),
      icon: IndianRupee,
    },
    {
      title: "Today's Sales",
      value: money(todayRevenue),
      icon: IndianRupee,
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

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1>Sales Dashboard</h1>
          <p>Supermarket sales and inventory analytics</p>
        </div>

        <button
          type="button"
          className="dashboard-refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          <div className="dashboard-stats">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div className="dashboard-stat-card" key={card.title}>
                  <div className="dashboard-stat-top">
                    <span>{card.title}</span>
                    <Icon size={22} />
                  </div>

                  <h2>{card.value}</h2>
                </div>
              );
            })}
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <h3>Daily Sales - Last 7 Days</h3>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => money(value)} />
                    <Legend />
                    <Bar
                        dataKey="sales"
                        name="Sales"
                        fill="#2563eb"
                        barSize={18}
                        radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="dashboard-panel">
              <h3>Payment Method Sales</h3>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip formatter={(value) => money(value)} />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      fill="#16a34a"
                      barSize={18}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="dashboard-note">
                Payment methods are recorded but not
                independently verified.
              </p>
            </section>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <h3>Product Stock Levels</h3>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stockChartData}
                    layout="vertical"
                    margin={{ left: 15, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
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

              {lowStock.slice(0, 5).map((product) => (
                <div
                  className="dashboard-alert-product"
                  key={product.id}
                >
                  <span>{product.name}</span>
                  <strong>{product.stock_quantity} left</strong>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
