
import { useEffect, useState } from "react";
import { Eye, FileDown, Printer, Search, RefreshCw } from "lucide-react";
import { getSalesHistory } from "../services/api";
import { downloadInvoicePdf } from "../services/invoicePdf";

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSales() {
    try {
      setLoading(true);
      setError("");
      const response = await getSalesHistory();
      const data = response.data;
      setSales(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error(err);
      setError("Unable to load sales history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = sales.filter((sale) =>
    sale.invoice_number
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount),
    0
  );

  const totalItems = sales.reduce(
    (sum, sale) =>
      sum +
      sale.items.reduce(
        (count, item) => count + item.quantity,
        0
      ),
    0
  );

  function printBill(sale) {
    setSelectedSale(sale);
    // Allow React to render the selected receipt before printing.
    setTimeout(() => window.print(), 100);
  }

  return (
    <div className="sales-history-page">
      <h2>Sales History</h2>
      <p>View, search, and download previous invoices.</p>

      <div className="sales-stats">
        <div>
          <span>Total Sales</span>
          <h3>₹{totalSales.toFixed(2)}</h3>
        </div>

        <div>
          <span>Total Bills</span>
          <h3>{sales.length}</h3>
        </div>

        <div>
          <span>Items Sold</span>
          <h3>{totalItems}</h3>
        </div>
      </div>

      <div className="sales-toolbar">
        <div className="sales-search">
          <Search size={18} />
          <input
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button onClick={loadSales}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading && <p>Loading sales...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <div className="sales-table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.invoice_number}</td>
                  <td>
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td>{sale.payment_method.toUpperCase()}</td>
                  <td>
                    {sale.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}
                  </td>
                  <td>₹{sale.total_amount}</td>
                  <td>
                    <div className="sales-actions">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        title="View Bill"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() => printBill(sale)}
                        title="Print Bill"
                      >
                        <Printer size={16} />
                      </button>

                      <button
                        onClick={() => downloadInvoicePdf(sale)}
                        title="Download PDF"
                      >
                        <FileDown size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="6">No bills found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale && (
        <div className="checkout-overlay">
          <div className="checkout-dialog">
            <h2>Fresh Supermarket</h2>
            <p>Invoice: {selectedSale.invoice_number}</p>
            <p>Payment: {selectedSale.payment_method}</p>
            <hr />

            {selectedSale.items.map((item, index) => (
              <div key={index} className="bill-item-row">
                <span>
                  {item.product} × {item.quantity}
                </span>
                <strong>₹{item.line_total}</strong>
              </div>
            ))}

            <hr />
            <p>Subtotal: ₹{selectedSale.subtotal}</p>
            <p>Tax: ₹{selectedSale.tax_amount}</p>
            <h3>Total: ₹{selectedSale.total_amount}</h3>

            <div className="bill-actions">
              <button onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>

              <button
                onClick={() => downloadInvoicePdf(selectedSale)}
              >
                <FileDown size={16} /> Download PDF
              </button>

              <button onClick={() => setSelectedSale(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="print-receipt">
          <h2>FRESH SUPERMARKET</h2>
          <p>Invoice: {selectedSale.invoice_number}</p>
          <hr />
          {selectedSale.items.map((item, index) => (
            <p key={index}>
              {item.product} × {item.quantity} — ₹{item.line_total}
            </p>
          ))}
          <hr />
          <h3>Total: ₹{selectedSale.total_amount}</h3>
          <p>Payment: {selectedSale.payment_method}</p>
          <p>Thank you for shopping!</p>
        </div>
      )}
    </div>
  );
}
