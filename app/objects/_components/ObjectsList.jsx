"use client";

import { BarcodeIcon, QrCodeIcon } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import BlockchainService from "@core/blockchain/BlockchainService";
import { ObjectsService } from "@core/objectsService";

export default function ObjectsList({ onObjectSelect }) {
  const [userObjects, setUserObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadUserObjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const liberaService = await BlockchainService.libera();
        const objectsService = new ObjectsService();
        
        // Get user's address
        const userAddress = await liberaService.signer.getAddress();
        
        // Load objects using the service
        const objects = await objectsService.getUserObjects(userAddress);
        setUserObjects(objects);

      } catch (error) {
        console.error('Failed to load objects:', error);
        setError('Failed to load your objects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserObjects();
  }, []);

  const handleInteract = async (objectId) => {
    try {
      onObjectSelect(objectId);
    } catch (error) {
      console.error('Failed to initiate interaction:', error);
      setError('Failed to start interaction. Please try again.');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">Your Objects</h2>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-900/30 border border-red-800/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Loading your objects...</p>
          </div>
        ) : userObjects.length === 0 ? (
          <div>
            <p className="text-sm text-gray-400 mb-2">
              You have not created any objects yet.
            </p>
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 opacity-60">
              <div className="flex justify-between">
                <div>
                  <h4 className="text-emerald-400 font-medium">Example Object</h4>
                  <p className="text-xs text-gray-400">Create your first object to see it here</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          userObjects.map((object) => (
            <div
              key={object.id}
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex justify-between">
                <div>
                  <h4 className="text-emerald-400 font-medium">{object.name}</h4>
                  <p className="text-xs text-gray-400">{object.description}</p>
                  {object.metadata?.coordinates && (
                    <p className="text-xs text-gray-400 mt-1">
                      Coordinates: {object.metadata.coordinates}
                    </p>
                  )}
                  {object.metadata?.reward && (
                    <p className="text-xs text-emerald-500 mt-1">
                      Reward: {object.metadata.reward}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {object.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleInteract(object.id)}
                  className="bg-emerald-500 text-white text-sm px-4 py-2 rounded hover:bg-emerald-600 transition-colors"
                >
                  <QrCodeIcon size={20} className="inline mr-1 mb-1" />
                  Interact
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
