"use client";

import { QrCodeIcon } from "@phosphor-icons/react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";

export default function RevealableQR({
  qrData,
  image = null,
  showButton = true,
  className = "",
  footnote = "",
  onReveal = () => {},
  onHide = () => {},
  shouldReveal = false,
  buttonShowText = "Reveal QR code",
  buttonHideText = "Hide QR code",
  buttonSize = "small", // 'small' or 'large'
  displayDurationSeconds = 15, // Default to 15 seconds
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  const toggleReveal = () => {
    setIsRevealed((prev) => !prev);
  };

  useEffect(() => {
    // Automatically hide QR code after N seconds
    let timer;
    if (isRevealed) {
      timer = setTimeout(() => {
        setIsRevealed(false);
        onHide();
      }, displayDurationSeconds * 1000); // Convert seconds to milliseconds
    }

    if (isRevealed) {
      onReveal();
    }

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [isRevealed, displayDurationSeconds]);

  useEffect(() => {
    // If shouldReveal is true, reveal the QR code immediately
    if (shouldReveal) {
      setIsRevealed(true);
      onReveal();
    }
  }, [shouldReveal, onReveal]);

  return (
    <div className={`relative ${className}`}>
      {showButton && (
        <button
          onClick={toggleReveal}
          className={`text-emerald-400 hover:text-emerald-300 flex items-center outline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            ${
              buttonSize === "small" ? "p-1 text-xs px-3" : "p-2 text-sm px-3"
            }`}
        >
          <QrCodeIcon className="h-4 w-4 mr-1" weight="bold" />
          {isRevealed ? buttonHideText : buttonShowText}
        </button>
      )}

      {isRevealed && qrData && (
        <div className="mt-4 flex justify-center flex-col items-center">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeCanvas
              value={qrData}
              size={250}
              level="M"
              imageSettings={{
                src: image, // Path to your logo
                height: 70,
                width: 70,
                excavate: true, // Ensures the logo doesn't obscure the QR code
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Scan with any camera app or within the LiberaChat.{" "}
            {footnote && <span className="text-gray-500">{footnote}</span>}
            <br />
            {(qrData?.startsWith("https://") ||
              qrData?.startsWith("http://")) && (
              <>
                Unable to scan code? You could try using{" "}
                <a href={qrData} className="text-emerald-500 hover:underline">
                  this link
                </a>
                .
              </>
            )}
            <br />
            QR code dissappears after {displayDurationSeconds} seconds.
          </p>
        </div>
      )}
      {isRevealed && !qrData && (
        <div className="mt-4 text-red-500">
          Error: QR code data is not available at the moment.
        </div>
      )}
    </div>
  );
}
