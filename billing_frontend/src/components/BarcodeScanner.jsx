
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const scannedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    let cancelled = false;

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 140 },
          },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScanRef.current(decodedText);
          },
          () => {}
        );

        if (cancelled && scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            "Camera could not start. Allow camera permission and try again."
          );
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;

      async function cleanup() {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          scanner.clear();
        } catch (err) {
          console.error("Scanner cleanup:", err);
        }
      }

      cleanup();
    };
  }, []);

  return (
    <div className="scanner-overlay">
      <div className="scanner-dialog">
        <h3>Scan Product Barcode</h3>
        <p>Point your camera at the product barcode.</p>

        <div id="barcode-reader" />

        {error && <p role="alert">{error}</p>}

        <button type="button" onClick={onClose}>
          Close Scanner
        </button>
      </div>
    </div>
  );
}
