
import { useEffect, useState } from "react";
import { Search, Package } from "lucide-react";
import { getProducts, getCategories } from "../services/api";

// Convert Django image URL to React public image URL.
// Example:
// https://backend.onrender.com/media/products/rice.png
// becomes /rice.png

function getProductImage(image) {
  if (!image) return null;

  const filename = String(image)
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .pop();

  return filename ? `/${filename}` : null;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [productRes, categoryRes] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);

        if (!active) return;

        const productData = productRes.data;
        const categoryData = categoryRes.data;

        setProducts(
          Array.isArray(productData)
            ? productData
            : productData.results ?? []
        );

        setCategories(
          Array.isArray(categoryData)
            ? categoryData
            : categoryData.results ?? []
        );
      } catch (err) {
        if (!active) return;

        console.error("Product loading error:", err);
        setError("Unable to load products from Django.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      String(product.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(product.barcode || "").includes(search);

    const matchesCategory =
      category === "all" ||
      String(product.category) === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="products-page">
      <div className="products-heading">
        <div>
          <h2>Product Management</h2>
          <p>Products added through Django Admin</p>
        </div>

        <span className="product-count">
          {filteredProducts.length} Products
        </span>
      </div>

      <div className="product-filters">
        <div className="search-box">
          <Search size={19} />

          <input
            type="text"
            placeholder="Search product or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>

          {categories.map((item) => (
            <option
              key={item.id}
              value={String(item.id)}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading products...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading &&
        !error &&
        filteredProducts.length === 0 && (
          <p>No products found.</p>
        )}

      {!loading && !error && (
        <div className="product-grid">
          {filteredProducts.map((product) => {
            const imageURL = getProductImage(product.image);
            const imageFailed = failedImages[product.id];

            return (
              <div
                className="product-card"
                key={product.id}
              >
                <div className="product-image">
                  {imageURL && !imageFailed ? (
                    <img
                      src={
                        product.image
                          ? `/${String(product.image).split("?")[0].split("/").pop()}`
                          : "/placeholder.png"
                      }
                      alt={product.name}
                      onError={(e) => {
                        console.error("Image failed:", e.currentTarget.src);
                      }}
                    />
                  ) : (
                    <Package
                      size={52}
                      color="#94a3b8"
                    />
                  )}
                </div>

                <div className="product-info">
                  <span className="category-name">
                    {product.category_name}
                  </span>

                  <h3>{product.name}</h3>

                  <p>Barcode: {product.barcode}</p>
                  <p>SKU: {product.sku}</p>

                  <div className="product-bottom">
                    <strong>
                      ₹{Number(
                        product.selling_price || 0
                      ).toFixed(2)}
                    </strong>

                    <span
                      className={
                        product.stock_quantity <=
                        product.low_stock_threshold
                          ? "stock-low"
                          : "stock-good"
                      }
                    >
                      Stock: {product.stock_quantity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
