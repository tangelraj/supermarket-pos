
import { useEffect, useState } from "react";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("Loading products...");

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/"}products/`,
        {
         credentials: "include",
         }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : data.results ?? [];

        setProducts(items);
        setStatus(`Successfully loaded ${items.length} products`);
      })
      .catch((error) => {
        console.error("Django API Error:", error);
        setStatus(`ERROR: ${error.message}`);
      });
  }, []);

  return (
    <div>
      <h2>Product Management</h2>
      <p>{status}</p>

      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-image">
              {product.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <p>No Image</p>
              )}
            </div>

            <div className="product-info">
              <h3>{product.name}</h3>
              <p>Category: {product.category_name}</p>
              <p>Barcode: {product.barcode}</p>
              <p>SKU: {product.sku}</p>
              <p>Price: ₹{product.selling_price}</p>
              <p>Stock: {product.stock_quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
