
import { useEffect, useState } from "react";

// Get image from React's public folder.
// Example:
// Django: https://backend.onrender.com/media/products/rice.png
// React:  /rice.png

function getProductImage(image) {
  if (!image) return null;

  const filename = String(image)
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .pop();

  if (!filename) return null;

  return `/${filename}`;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("Loading products...");
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        setLoading(true);

        const baseURL = (
          import.meta.env.VITE_API_URL ||
          "http://127.0.0.1:8000/api/"
        ).replace(/\/+$/, "");

        const response = await fetch(
          `${baseURL}/products/`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];

        setProducts(items);
        setStatus(
          `Successfully loaded ${items.length} products`
        );
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Django API Error:", error);
        setStatus(`ERROR: ${error.message}`);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => controller.abort();
  }, []);

  return (
    <div>
      <h2>Product Management</h2>

      <p>{status}</p>

      {!loading && (
        <div className="product-grid">
          {products.map((product) => {
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
                      src={imageURL}
                      alt={product.name}
                      loading="lazy"
                      onError={() => {
                        setFailedImages((previous) => ({
                          ...previous,
                          [product.id]: true,
                        }));
                      }}
                    />
                  ) : (
                    <p>No Image Available</p>
                  )}
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>

                  <p>
                    Category:{" "}
                    {product.category_name || "Uncategorized"}
                  </p>

                  <p>
                    Barcode: {product.barcode}
                  </p>

                  <p>
                    SKU: {product.sku}
                  </p>

                  <p>
                    Price: ₹
                    {Number(
                      product.selling_price || 0
                    ).toFixed(2)}
                  </p>

                  <p>
                    Stock: {product.stock_quantity}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
