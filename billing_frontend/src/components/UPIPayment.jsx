
import { QRCodeSVG } from "qrcode.react";

export default function UPIPayment({
  amount,
  upiId,
  merchantName = "Fresh Supermarket",
}) {
  const validAmount = Number(amount);

  if (!upiId || !Number.isFinite(validAmount) || validAmount <= 0) {
    return <p>UPI payment details are not configured.</p>;
  }

  const upiUrl =
    `upi://pay?pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent(merchantName)}` +
    `&am=${validAmount.toFixed(2)}` +
    `&cu=INR`;

  return (
    <div className="upi-payment">
      <h3>Scan & Pay</h3>

      <QRCodeSVG
        value={upiUrl}
        size={220}
        level="M"
        includeMargin
      />

      <h2>₹{validAmount.toFixed(2)}</h2>

      <p>UPI ID: {upiId}</p>

      <p>
        Scan using Google Pay, PhonePe, Paytm,
        or another UPI app.
      </p>

      <small>
        This QR code requests payment only.
        It does not confirm that payment succeeded.
      </small>
    </div>
  );
}
