import { useState } from 'react';
import QRCode from 'qrcode.react';

export default function QRModal({ isVisible, onClose, p2pEnabled, peerId }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (peerId) {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="qr-modal">
      <div className="qr-modal-content">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {p2pEnabled ? 'Share Your Peer ID' : 'Your Chat ID'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {p2pEnabled ? (
          <>
            <p className="text-gray-300 mb-4">
              Share this Peer ID with your contacts to enable direct P2P messaging:
            </p>
            <div className="qr-code-container">
              {peerId ? (
                <QRCode
                  value={peerId}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-gray-500">No Peer ID available</p>
                </div>
              )}
            </div>
            {peerId && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={peerId}
                    readOnly
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-300">
            P2P mode is disabled. Enable P2P mode to share your Peer ID for direct messaging.
          </p>
        )}
      </div>
    </div>
  );
}