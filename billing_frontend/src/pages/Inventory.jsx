
import { useEffect, useState } from "react";
import {
  Boxes,
  Package,
  AlertTriangle,
  Search,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";

import {
  getProducts,
  restockProduct,
} from "../services/api";

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Restock popup
  const [restockItem, setRestockItem] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockError, setRestockError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const response = await getProducts();
      const data = response.data;

      setProducts(
        Array.isArray(data)
          ? data
          : data.results ?? []
      );
    } catch (err) {
      console.error("Inventory error:", err);
      setError("Unable to load inventory from Django.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  function getStockStatus(product) {
    const stock = Number(product.stock_quantity);
    const threshold = Number(
      product.low_stock_threshold ?? 5
    );

    if (stock <= 0) return "out";
    if (stock <= threshold) return "low";
    return "available";
  }

  const lowStock = products.filter(
    (product) => getStockStatus(product) === "low"
  );

  const outOfStock = products.filter(
    (product) => getStockStatus(product) === "out"
  );

  const totalUnits = products.reduce(
    (sum, product) =>
      sum + Number(product.stock_quantity || 0),
    0
  );

  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      String(product.barcode ?? "").includes(query);

    const matchesFilter =
      filter === "all" ||
      getStockStatus(product) === filter;

    return matchesSearch && matchesFilter;
  });

  function openRestock(product) {
    setRestockItem(product);
    setRestockQuantity("");
    setRestockError("");
    setSuccess("");
  }

  function closeRestock() {
    if (restockLoading) return;

    setRestockItem(null);
    setRestockQuantity("");
    setRestockError("");
  }

  async function handleRestock(event) {
    event.preventDefault();

    if (!restockItem) return;

    const quantity = Number(restockQuantity);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      setRestockError(
        "Please enter a valid positive whole number."
      );
      return;
    }

    try {
      setRestockLoading(true);
      setRestockError("");

      await restockProduct(restockItem.id, quantity);

      setSuccess(
        `${restockItem.name}: ${quantity} units added successfully.`
      );

      setRestockItem(null);
      setRestockQuantity("");

      await loadInventory();
    } catch (err) {
      console.error("Restock error:", err);

      if ([401, 403].includes(err.response?.status)) {
        setRestockError(
          "Staff login is required to update stock. " +
          "Check your API authentication."
        );
      } else {
        setRestockError(
          err.response?.data?.detail ||
          "Unable to update stock. Please try again."
        );
      }
    } finally {
      setRestockLoading(false);
    }
  }

  return (
    <div className="inventory-page">
      <div className="inventory-heading">
        <div>
          <h1>Inventory Management</h1>
          <p>Monitor product stock and availability</p>
        </div>

        <button
          type="button"
          onClick={loadInventory}
          disabled={loading}
          className="inventory-refresh"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "#15803d" }}>
          {success}
        </p>
      )}

      {/* Inventory summary */}
      <div className="inventory-stats">
        <div className="inventory-stat">
          <Package size={24} />
          <span>Total Products</span>
          <h2>{products.length}</h2>
        </div>

        <div className="inventory-stat">
          <Boxes size={24} />
          <span>Total Stock Units</span>
          <h2>{totalUnits}</h2>
        </div>

        <div className="inventory-stat">
          <AlertTriangle size={24} />
          <span>Low Stock</span>
          <h2>{lowStock.length}</h2>
        </div>

        <div className="inventory-stat">
          <AlertTriangle size={24} />
          <span>Out of Stock</span>
          <h2>{outOfStock.length}</h2>
        </div>
      </div>

      {/* Search and filters */}
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search product or barcode..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
        >
          <option value="all">All Products</option>
          <option value="available">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Inventory table */}
      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Low Stock Limit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product);

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.barcode || "-"}</td>

                    <td>
                      ₹{Number(
                        product.selling_price
                      ).toFixed(2)}
                    </td>

                    <td>{product.stock_quantity}</td>

                    <td>
                      {product.low_stock_threshold ?? 5}
                    </td>

                    <td>
                      <span
                        className={`inventory-status ${status}`}
                      >
                        {status === "available"
                          ? "In Stock"
                          : status === "low"
                          ? "Low Stock"
                          : "Out of Stock"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="inventory-restock-btn"
                        onClick={() => openRestock(product)}
                      >
                        <Plus size={16} />
                        Restock
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="7">
                    No matching products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Restock popup */}
      {restockItem && (
        <div className="inventory-modal-overlay">
          <div
            className="inventory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restock-title"
          >
            <div className="inventory-modal-header">
              <h2 id="restock-title">
                Restock Product
              </h2>

              <button
                type="button"
                onClick={closeRestock}
                disabled={restockLoading}
                aria-label="Close"
                className="inventory-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <p>
              Product:{" "}
              <strong>{restockItem.name}</strong>
            </p>

            <p>
              Current Stock:{" "}
              <strong>
                {restockItem.stock_quantity}
              </strong>
            </p>

            <form onSubmit={handleRestock}>
              <label htmlFor="restock-quantity">
                Quantity to Add
              </label>

              <input
                id="restock-quantity"
                type="number"
                min="1"
                step="1"
                required
                value={restockQuantity}
                onChange={(event) =>
                  setRestockQuantity(event.target.value)
                }
                placeholder="Enter quantity"
              />

              <p>
                New Stock:{" "}
                <strong>
                  {Number(restockItem.stock_quantity) +
                    (Number.isSafeInteger(
                      Number(restockQuantity)
                    ) &&
                    Number(restockQuantity) > 0
                      ? Number(restockQuantity)
                      : 0)}
                </strong>
              </p>

              {restockError && (
                <p
                  role="alert"
                  className="inventory-restock-error"
                >
                  {restockError}
                </p>
              )}

              <div className="inventory-modal-actions">
                <button
                  type="button"
                  onClick={closeRestock}
                  disabled={restockLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={restockLoading}
                  className="inventory-save-btn"
                >
                  {restockLoading
                    ? "Saving..."
                    : "Save Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
