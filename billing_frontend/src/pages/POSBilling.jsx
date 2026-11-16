
import { useEffect, useRef, useState } from "react";

import {
  Search,
  ScanBarcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  FileDown,
  Eye,
  X,
  Receipt,
} from "lucide-react";

import { getProducts, checkoutSale } from "../services/api";
import BarcodeScanner from "../components/BarcodeScanner";
import UPIPayment from "../components/UPIPayment";
import { downloadInvoicePdf } from "../services/invoicePdf";

export default function POSBilling() {
  // Products and cart
  const [products, setProducts] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  // UI state
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBill, setShowBill] = useState(false);

  // Saved invoice
  const [receipt, setReceipt] = useState(null);

  const barcodeRef = useRef(null);
  const submittingRef = useRef(false);

  // Use the actual merchant UPI ID from .env
  const shopUpiId = import.meta.env.VITE_SHOP_UPI_ID || "";

  // Load products from Django
  async function loadProducts() {
    try {
      setLoading(true);

      const response = await getProducts();
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : data.results ?? [];

      setProducts(items);
    } catch (error) {
      console.error("Product loading error:", error);
      setMessage("Unable to load products from Django.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Add product to cart
  function addToCart(product) {
    if (receipt || submittingRef.current) {
      setMessage("Please start a new bill first.");
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      const stock = Number(product.stock_quantity);

      if (
        stock <= 0 ||
        (existing && existing.quantity >= stock)
      ) {
        setMessage(`Insufficient stock for ${product.name}`);
        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        { ...product, quantity: 1 },
      ];
    });

    setMessage(`${product.name} selected`);
  }

  // USB scanner / manual barcode input
  function scanBarcode(event) {
    event.preventDefault();

    const code = barcode.trim();

    if (!code) return;

    const product = products.find(
      (item) => String(item.barcode ?? "").trim() === code
    );

    if (product) {
      addToCart(product);
    } else {
      setMessage(`Barcode ${code} not found`);
    }

    setBarcode("");
    barcodeRef.current?.focus();
  }

  // Camera barcode scanning
  function handleCameraScan(scannedCode) {
    setShowScanner(false);

    const code = String(scannedCode).trim();

    const product = products.find(
      (item) => String(item.barcode ?? "").trim() === code
    );

    if (product) {
      addToCart(product);
    } else {
      setMessage(`Barcode ${code} not found`);
    }
  }

  // Change quantity
  function updateQuantity(id, change) {
    if (saving || receipt) return;

    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item;

          const newQuantity = item.quantity + change;

          if (newQuantity > Number(item.stock_quantity)) {
            setMessage(
              `Insufficient stock for ${item.name}`
            );
            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  // Remove item
  function removeItem(id) {
    if (saving || receipt) return;

    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  // Search products
  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    return (
      product.name.toLowerCase().includes(query) ||
      String(product.barcode ?? "").includes(query)
    );
  });

  // Calculate totals
  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.selling_price) * item.quantity,
    0
  );

  // Checkout and save bill
  async function handleCheckout() {
    if (
      !cart.length ||
      saving ||
      submittingRef.current ||
      receipt
    ) {
      return;
    }

    if (paymentMethod === "upi" && !shopUpiId) {
      setMessage("Configure your shop UPI ID first.");
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await checkoutSale(payload);

      setReceipt(response.data);
      setCart([]);
      setShowCheckout(false);
      setShowBill(true);

      setMessage(
        `Bill ${response.data.invoice_number} saved successfully!`
      );

      // Refresh stock after successful sale
      try {
        await loadProducts();
      } catch (error) {
        console.error("Product refresh error:", error);
      }
    } catch (error) {
      console.error("Checkout error:", error);

      const detail = error.response?.data?.error;

      setMessage(
        detail ||
        "Checkout could not be confirmed. Check Django Sales before retrying."
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  // Print receipt
  function printReceipt() {
    if (!receipt) return;

    setShowBill(false);

    // Print CSS displays only .print-receipt
    window.print();
  }

  // Download PDF
  function handleDownloadPdf() {
    if (!receipt) return;

    try {
      downloadInvoicePdf(receipt);
    } catch (error) {
      console.error("PDF error:", error);
      setMessage("Unable to download PDF invoice.");
    }
  }

  // Start a new bill
  function newBill() {
    if (saving) return;

    setReceipt(null);
    setCart([]);
    setBarcode("");
    setSearch("");
    setPaymentMethod("cash");
    setShowCheckout(false);
    setShowScanner(false);
    setShowBill(false);
    setMessage("");

    loadProducts();
    barcodeRef.current?.focus();
  }

  return (
    <div className="pos-page">
      <div className="pos-screen">
        <div className="pos-header">
          <div>
            <h2>POS Billing</h2>
            <p>
              Barcode scanning, UPI payment and bill generation
            </p>
          </div>
        </div>

        {message && (
          <p role="status" className="pos-message">
            {message}
          </p>
        )}

        {/* Successful checkout actions */}
        {receipt && (
          <div className="pos-success">
            <h3>
              <Receipt size={20} />
              Bill saved successfully
            </h3>

            <p>
              Invoice: <strong>{receipt.invoice_number}</strong>
            </p>

            <p>
              Total: <strong>₹{receipt.total_amount}</strong>
            </p>

            <div className="pos-receipt-actions">
              <button
                type="button"
                onClick={() => setShowBill(true)}
              >
                <Eye size={16} />
                View Bill
              </button>

              <button
                type="button"
                onClick={printReceipt}
              >
                <Printer size={16} />
                Print Bill
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
              >
                <FileDown size={16} />
                Download PDF
              </button>

              <button
                type="button"
                onClick={newBill}
              >
                New Bill
              </button>
            </div>
          </div>
        )}

        <div className="pos-layout">
          {/* Product selection */}
          <section className="pos-products">
            <h3>Scan Product</h3>

            <button
              type="button"
              className="camera-scan-button"
              onClick={() => setShowScanner(true)}
              disabled={Boolean(receipt) || saving}
            >
              <Camera size={18} />
              Scan Using Camera
            </button>

            <form onSubmit={scanBarcode}>
              <div className="pos-input-row">
                <ScanBarcode size={20} />

                <input
                  ref={barcodeRef}
                  value={barcode}
                  onChange={(event) =>
                    setBarcode(event.target.value)
                  }
                  placeholder="Scan or enter barcode"
                  disabled={Boolean(receipt) || saving}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={Boolean(receipt) || saving}
                >
                  Add
                </button>
              </div>
            </form>

            <h3>Manual Product Search</h3>

            <div className="pos-input-row">
              <Search size={20} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search product name or barcode..."
              />
            </div>

            {loading && <p>Loading products...</p>}

            {!loading && filteredProducts.length === 0 && (
              <p>No products found.</p>
            )}

            <div className="pos-product-grid">
              {filteredProducts.map((product) => (
                <button
                  type="button"
                  className="pos-product-card"
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={
                    Boolean(receipt) ||
                    saving ||
                    Number(product.stock_quantity) <= 0
                  }
                >
                  <strong>{product.name}</strong>

                  <span>
                    ₹{Number(product.selling_price).toFixed(2)}
                  </span>

                  <small>
                    Stock: {product.stock_quantity}
                  </small>

                  <Plus size={18} />
                </button>
              ))}
            </div>
          </section>

          {/* Current bill */}
          <section className="pos-cart">
            <h3>
              <ShoppingCart size={20} />
              Current Bill
            </h3>

            {cart.length === 0 && (
              <p>No products added yet.</p>
            )}

            {cart.map((item) => (
              <div
                className="pos-cart-item"
                key={item.id}
              >
                <div>
                  <strong>{item.name}</strong>

                  <p>
                    ₹{Number(item.selling_price).toFixed(2)} each
                  </p>
                </div>

                <div className="pos-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, -1)
                    }
                    disabled={saving}
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus size={16} />
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, 1)
                    }
                    disabled={saving}
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <strong>
                  ₹{(
                    Number(item.selling_price) *
                    item.quantity
                  ).toFixed(2)}
                </strong>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={saving}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <div className="pos-summary">
              <p>Items: {totalItems}</p>

              <h2>
                Total: ₹{subtotal.toFixed(2)}
              </h2>

              <button
                type="button"
                disabled={
                  !cart.length ||
                  saving ||
                  Boolean(receipt)
                }
                onClick={() => setShowCheckout(true)}
              >
                Checkout
              </button>
            </div>
          </section>
        </div>

        {/* Checkout dialog */}
        {showCheckout && (
          <div className="checkout-overlay">
            <div
              className="checkout-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Checkout"
            >
              <h2>Checkout</h2>

              <h3>
                Amount: ₹{subtotal.toFixed(2)}
              </h3>

              <label htmlFor="payment-method">
                Payment Method
              </label>

              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                disabled={saving}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>

              {/* UPI QR code */}
              {paymentMethod === "upi" && (
                <UPIPayment
                  amount={subtotal}
                  upiId={shopUpiId}
                  merchantName="Fresh Supermarket"
                />
              )}

              <p className="checkout-note">
                Test mode: payment is not automatically verified.
                Generate Bill records the selected payment method.
              </p>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={saving}
              >
                {saving
                  ? "Generating Bill..."
                  : "Generate Bill"}
              </button>

              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Camera scanner */}
        {showScanner && (
          <BarcodeScanner
            onScan={handleCameraScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* View Bill popup */}
        {showBill && receipt && (
          <div className="checkout-overlay">
            <div
              className="checkout-dialog bill-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="View Bill"
            >
              <div className="bill-header">
                <h2>Fresh Supermarket</h2>

                <button
                  type="button"
                  onClick={() => setShowBill(false)}
                  aria-label="Close bill"
                >
                  <X size={18} />
                </button>
              </div>

              <p>
                Invoice: {receipt.invoice_number}
              </p>

              <p>
                Payment: {receipt.payment_method}
              </p>

              <hr />

              {receipt.items?.map((item, index) => (
                <div
                  key={index}
                  className="bill-item-row"
                >
                  <div>
                    <strong>{item.product}</strong>

                    <p>
                      {item.quantity} × ₹{item.unit_price}
                    </p>
                  </div>

                  <strong>
                    ₹{item.line_total}
                  </strong>
                </div>
              ))}

              <hr />

              <div className="bill-total-row">
                <span>Subtotal</span>
                <span>₹{receipt.subtotal}</span>
              </div>

              <div className="bill-total-row">
                <span>Tax</span>
                <span>₹{receipt.tax_amount}</span>
              </div>

              <div className="bill-total-row">
                <strong>Total</strong>
                <strong>₹{receipt.total_amount}</strong>
              </div>

              <p>Thank you for shopping!</p>

              <div className="bill-actions">
                <button
                  type="button"
                  onClick={printReceipt}
                >
                  <Printer size={16} />
                  Print
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                >
                  <FileDown size={16} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowBill(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable bill */}
      {receipt && (
        <div className="print-receipt">
          <h2>FRESH SUPERMARKET</h2>

          <p>Sales Receipt - Test Transaction</p>

          <p>
            Invoice: {receipt.invoice_number}
          </p>

          <hr />

          {receipt.items?.map((item, index) => (
            <div key={index}>
              <div>{item.product}</div>

              <div>
                {item.quantity} × ₹{item.unit_price}
                {" = "}
                ₹{item.line_total}
              </div>
            </div>
          ))}

          <hr />

          <p>
            Subtotal: ₹{receipt.subtotal}
          </p>

          <p>
            Tax: ₹{receipt.tax_amount}
          </p>

          <h3>
            Total: ₹{receipt.total_amount}
          </h3>

          <p>
            Payment: {receipt.payment_method}
          </p>

          <p>Thank you for shopping!</p>
        </div>
      )}
    </div>
  );
}
