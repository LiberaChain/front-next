"use client";

import { BarcodeIcon, QrCodeIcon } from "@phosphor-icons/react";
import { useState } from "react";

export default function ObjectsList() {
  const [userLocations, setUserLocations] = useState([]);

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">
        <em>Locations, objects, events, ...</em> created by You
      </h2>

      <div className="space-y-4">
        {userLocations?.length === 0 && (
          <>
            <p className="text-sm text-gray-400">
              You have not created any locations or objects yet.
            </p>
            <p className="text-sm text-gray-400">
              An example how one looks like:
            </p>
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 opacity-60">
              <div className="flex justify-between">
                <div>
                  <h4 className="text-emerald-400 font-medium">
                    Example Location
                  </h4>
                  <p className="text-xs text-gray-400">Type: {location.type}</p>

                  <p className="text-xs text-gray-400">
                    Coordinates: 123.456, -78.910
                  </p>
                  {location.reward && (
                    <p className="text-xs text-emerald-500">
                      Reward: 100 Tokens
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500 break-all">
                DID:
                did:libera:location:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  className="bg-emerald-500 text-white text-sm px-4 py-2 rounded hover:bg-emerald-600 transition-colors"
                  disabled
                >
                  <QrCodeIcon size={20} className="inline mr-1 mb-1" />
                  Reveal QR Code
                </button>
                <button
                  className="ml-2 bg-gray-600 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                  disabled
                >
                  <BarcodeIcon size={20} className="inline mr-1 mb-1" />
                  Enable code scanner
                </button>
              </div>
            </div>
          </>
        )}
        {userLocations?.map((location) => (
          <div
            key={location.locationDid}
            className="bg-gray-700 rounded-lg p-4 border border-gray-600"
          >
            <div className="flex justify-between">
              <div>
                <h4 className="text-emerald-400 font-medium">
                  {location.locationName}
                </h4>
                <p className="text-xs text-gray-400">Type: {location.type}</p>
                {location.coordinates && (
                  <p className="text-xs text-gray-400">
                    Coordinates: {location.coordinates}
                  </p>
                )}
                {location.reward && (
                  <p className="text-xs text-emerald-500">
                    Reward: {location.reward}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  Created: {new Date(location.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500 break-all">
              DID: {location.locationDid}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
