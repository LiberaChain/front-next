"use client";

import Header from "../_components/Header";
import QRCodeGenerator from "../_components/QRCodeGenerator";

export default function Objects() {
  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700 mb-6">
            <h2 className="text-lg font-medium text-white mb-4">
              Location/Object QR Codes
            </h2>
            <p className="text-sm text-gray-400">
              You can generate QR codes for locations or objects that others can
              scan and associate with posts. Each QR code contains a private key
              secured by public key cryptography and verified through IPFS.
              <br />
              This can be used for various purposes, such as proving the
              presence of user near the location/object, businesses can create
              QR codes to provide rewards, access, or information about
              place/object, and users can prove their interaction with a
              specific place or item.
            </p>
          </div>

          <QRCodeGenerator />
        </div>
      </main>
    </div>
  );
}
