import { BarcodeIcon } from "@phosphor-icons/react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useEffect, useState } from "react";

export default function QRScanner({
  onScan,
  paused = false,
  triggerDisable = false,
  hideAfterScan = false,
  enableText = "Enable code scanner",
  disableText = "Disable code scanner",
}) {
  const [enableScanner, setEnableScanner] = useState(false);

  useEffect(() => {
    if (triggerDisable) {
      setEnableScanner(false);
    }
  }, [triggerDisable]);

  const [didScan, setDidScan] = useState(false);

  return (
    <>
      <button
        className="bg-gray-600 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors align-mi</button>ddle flex items-center mb-2"
        onClick={() => setEnableScanner(!enableScanner)}
        // disabled={paused}
      >
        <BarcodeIcon size={20} className="inline mr-1" />
        {enableScanner ? disableText : enableText}
      </button>

      <div
        className={`p-2 rounded-lg ${
          didScan
            ? "animate-pulse border-2 border-emerald-500"
            : "border border-gray-600"
        } ${paused ? "opacity-50" : "opacity-100"} ${
          ""
          //   enabled ? "bg-gray-800" : "bg-gray-700"
        } ${enableScanner ? "" : "hidden"}`}
      >
        <Scanner
          onScan={(result) => {
            setDidScan(true);
            if (hideAfterScan) {
              setEnableScanner(false);
            }
            onScan(result);
            setTimeout(() => setDidScan(false), 1000);
          }}
          onError={(error) => {
            console.error("QR Scanner Error:", error);
          }}
          constraints={{ facingMode: "environment" }}
          paused={!enableScanner}
          scanDelay={1000}
          allowMultiple={true}
          formats={["qr_code"]}
          sound={false}
        />
      </div>
    </>
  );
}
