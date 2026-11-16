
import { jsPDF } from "jspdf";

export function downloadInvoicePdf(receipt) {
  if (!receipt || !receipt.invoice_number) {
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const left = 18;
  const right = 192;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FRESH SUPERMARKET", 105, y, {
    align: "center",
  });

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("SALES RECEIPT - TEST TRANSACTION", 105, y, {
    align: "center",
  });

  y += 14;

  doc.text(`Invoice: ${receipt.invoice_number}`, left, y);
  y += 7;

  doc.text(
    `Payment: ${String(receipt.payment_method).toUpperCase()}`,
    left,
    y
  );
  y += 10;

  doc.line(left, y, right, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Product", left, y);
  doc.text("Qty", 115, y);
  doc.text("Amount (INR)", right, y, { align: "right" });

  y += 5;
  doc.line(left, y, right, y);
  y += 8;

  doc.setFont("helvetica", "normal");

  for (const item of receipt.items || []) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    const productName = String(item.product || "");
    const nameLines = doc.splitTextToSize(productName, 85);

    doc.text(nameLines, left, y);
    doc.text(String(item.quantity), 115, y);

    doc.text(
      Number(item.line_total).toFixed(2),
      right,
      y,
      { align: "right" }
    );

    y += Math.max(8, nameLines.length * 5 + 3);
  }

  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  doc.line(left, y, right, y);
  y += 9;

  doc.text("Subtotal (INR)", left, y);
  doc.text(
    Number(receipt.subtotal).toFixed(2),
    right,
    y,
    { align: "right" }
  );

  y += 8;

  doc.text("Tax (INR)", left, y);
  doc.text(
    Number(receipt.tax_amount).toFixed(2),
    right,
    y,
    { align: "right" }
  );

  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text("TOTAL (INR)", left, y);
  doc.text(
    Number(receipt.total_amount).toFixed(2),
    right,
    y,
    { align: "right" }
  );

  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Thank you for shopping with us!", 105, y, {
    align: "center",
  });

  doc.save(`${receipt.invoice_number}.pdf`);
}
