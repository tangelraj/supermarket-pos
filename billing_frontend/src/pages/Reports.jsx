
import { useEffect, useState } from "react";
import { Search, Package } from "lucide-react";
import { getProducts, getCategories } from "../services/api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [productRes, categoryRes] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);

        setProducts(productRes.data.results ?? productRes.data);
        setCategories(categoryRes.data.results ?? categoryRes.data);
      } catch (err) {
        console.error(err);
        setError("Unable to load products from Django.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.barcode.includes(search);

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
            <option key={item.id} value={String(item.id)}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading products...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && filteredProducts.length === 0 && (
        <p>No products found.</p>
      )}

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-image">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                />
              ) : (
                <Package size={52} color="#94a3b8" />
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
                  ₹{Number(product.selling_price).toFixed(2)}
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
        ))}
      </div>
    </div>
  );
}
