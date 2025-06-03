"use client";

import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
import RevealableQR from "@/app/_components/RevealableQR";
import { INSTANCE_URL } from "@/app/_core/constants";
import { BarcodeIcon, QrCodeIcon } from "@phosphor-icons/react";
import { useState, useEffect } from "react";

export default function ObjectsList({ onObjectSelect, refreshTrigger }) {
  const [userObjects, setUserObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserObjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Full user objects are stored for now only on device inside localStorage, they are still published to IPFS/blockchain for other side validation, but private key stays on device
      let objects = localStorage.getItem("liberaChainObjects");
      objects = objects ? JSON.parse(objects) : [];

      console.debug("Loaded user objects from localStorage:", objects);

      // Get user's address
      // const userAddress = await liberaService.signer.getAddress();

      // Load objects using the service
      // const objects = await objectsService.getUserObjects(userAddress);

      setUserObjects(objects);
    } catch (error) {
      console.error("Failed to load objects:", error);
      setError("Failed to load your objects. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUserObjects();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadUserObjects();
    }
  }, [refreshTrigger]);

  const handleInteract = async (objectId) => {
    try {
      onObjectSelect(objectId);
    } catch (error) {
      console.error("Failed to initiate interaction:", error);
      setError("Failed to start interaction. Please try again.");
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">
        <em>Objects, locations, events, ...</em> created by You
      </h2>

      <div className="space-y-4">
        {userObjects?.length === 0 && (
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
                  <p className="text-xs text-gray-400">Type: Location</p>

                  <p className="text-xs text-gray-400">
                    Coordinates: 123.456, -78.910
                  </p>
                  <p className="text-xs text-emerald-500">
                    Reward: 10% discount after 5 visits
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500 break-all">
                DID: did:libera:object:1234567890...
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
        {userObjects?.map((object) => (
          <div
            key={object.did}
            className="bg-gray-700 rounded-lg p-4 border border-gray-600"
          >
            <div className="flex justify-between">
              <div>
                <h4 className="text-emerald-400 font-medium">{object.name}</h4>
                <p className="text-xs text-gray-400">Type: {object.type}</p>
                {object.coordinates && (
                  <p className="text-xs text-gray-400">
                    Coordinates: {object.coordinates}
                  </p>
                )}
                {object.reward && (
                  <p className="text-xs text-emerald-500">
                    Reward: {object.reward}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  Created: {new Date(object.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500 break-all">
              DID: {object.did}
              <br />
              {object.cid && (
                <span className="block">
                  IPFS CID: <IPFSCIDLink cid={object.cid} />
                </span>
              )}
            </div>

            <div className="mt-2 flex">
              <button className="bg-gray-600 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                <BarcodeIcon size={20} className="inline mr-1 mb-1" />
                Enable code scanner
              </button>
            </div>

            <RevealableQR
              qrData={`${INSTANCE_URL}/objects/redeem?redeem=${encodeURIComponent(
                object.did
              )}&key=${encodeURIComponent(object.privateKey)}`}
              image="/logo-dark.svg"
              className="mt-4"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
