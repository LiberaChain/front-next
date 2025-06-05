"use client";

import { useState, useEffect } from "react";
import { FilebaseIPFSProvider } from "@/app/_core/storage/ipfs/FilebaseIPFSService";
import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  ClockCounterClockwise,
  InfoIcon,
  LinkSimple,
} from "@phosphor-icons/react";
import Link from "next/link";
import RevealableQR from "@/app/_components/RevealableQR";
import { INSTANCE_URL } from "@/app/_core/constants";

export default function CollectedObjectsList() {
  const [redeemedObjects, setRedeemedObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRedeemedObjects() {
      try {
        setLoading(true);
        setError(null);

        // Get user's profile data
        const userProfileData = localStorage.getItem("liberaChainIdentity");
        if (!userProfileData) {
          throw new Error("User profile not found");
        }

        const userProfile = JSON.parse(userProfileData);
        const userAddress = userProfile.did?.replace("did:libera:", "") || "";

        if (!userAddress) {
          throw new Error("Invalid user profile");
        }

        // Load redemption records from localStorage first (for offline mode)
        let redemptions = localStorage.getItem("liberaChainRedemptions");
        redemptions = redemptions ? JSON.parse(redemptions) : [];

        // Prepare an array to store the full object data
        const objectsWithDetails = [];

        // Connect to IPFS
        const ipfs = FilebaseIPFSProvider.getInstance();

        // Fetch redemption records from user's profile directory on IPFS
        try {
          const userRedemptionsPath = `redemptions/${userProfile.did}`;
          const redemptionFiles = await ipfs.listDirectory(userRedemptionsPath);

          // Process each redemption file
          for (const file of redemptionFiles) {
            try {
              // Get the redemption record
              const cid = await ipfs.getLatestCID(file.Key);

              if (cid) {
                const response = await ipfs.fetchFileByCID(cid);
                if (response) {
                  // Parse the redemption record
                  const redemptionRecord = JSON.parse(await response.text());

                  // Get the object DID from the redemption record
                  const objectDid = redemptionRecord.objectDid;
                  const objectAddress = objectDid.replace(
                    "did:libera:object:",
                    ""
                  );

                  // Fetch the object's details
                  const objectFilePath = `objects/${objectAddress}.json`;
                  const objectExists = await ipfs.fileExists(objectFilePath);

                  if (objectExists) {
                    const objectCid = await ipfs.getLatestCID(objectFilePath);
                    const objectResponse = await ipfs.fetchFileByCID(objectCid);

                    if (objectResponse) {
                      // Parse the object data
                      const objectData = JSON.parse(
                        await objectResponse.text()
                      );

                      // Add this object with redemption details to our list
                      objectsWithDetails.push({
                        ...objectData,
                        redemptionDate: redemptionRecord.timestamp,
                        redemptionSignature: redemptionRecord.signature,
                        redemptionCid: cid,
                        cid: objectCid,
                      });
                    }
                  } else {
                    // Object details not found, just add what we have from the redemption
                    objectsWithDetails.push({
                      did: objectDid,
                      name: "Unknown Object",
                      description: "Object details not found",
                      redemptionDate: redemptionRecord.timestamp,
                      redemptionSignature: redemptionRecord.signature,
                      cid: null,
                    });
                  }
                }
              }
            } catch (fileError) {
              console.error("Error processing redemption file:", fileError);
            }
          }
        } catch (ipfsError) {
          console.error("Error fetching redemptions from IPFS:", ipfsError);

          // If IPFS fetch fails, use local data only
          for (const redemption of redemptions) {
            objectsWithDetails.push({
              did: redemption.objectDid,
              name: redemption.objectName || "Unknown Object",
              description: "Local record only",
              redemptionDate: redemption.timestamp,
              redemptionSignature: redemption.signature,
              redemptionCid: redemption.cid,
              verification: "Local only",
              cid: redemption.cid,
            });
          }
        }

        // Sort by redemption date, newest first
        objectsWithDetails.sort(
          (a, b) => new Date(b.redemptionDate) - new Date(a.redemptionDate)
        );

        setRedeemedObjects(objectsWithDetails);
      } catch (error) {
        console.error("Failed to load redeemed objects:", error);
        setError(error.message || "Failed to load your redeemed objects");
      } finally {
        setLoading(false);
      }
    }

    loadRedeemedObjects();
  }, []);

  // Function to shorten signature for display
  const shortenSignature = (signature) => {
    if (!signature) return "N/A";
    return `${signature.slice(0, 6)}...${signature.slice(-4)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">
        Your Redeemed Objects
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/40 p-4">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      <div className="mb-4 flex items-center space-x-2">
        <Link
          className="text-sm text-emerald-400 hover:underline"
          href="/objects/redeem"
        >
          Redeem more objects
        </Link>
      </div>

      <div className="text-sm text-gray-400 mb-4">
        You can view all objects you have redeemed through QR codes or links.
        Each object contains cryptographic proof of your interaction.
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-500 border-t-emerald-500 rounded-full mb-2"></div>
          <p>Loading redeemed objects...</p>
        </div>
      ) : redeemedObjects.length === 0 ? (
        <div className="py-8 text-center text-gray-400 border border-dashed border-gray-600 rounded-lg">
          <CircleNotchIcon className="h-8 w-8 mx-auto mb-2" />
          <p>You haven't redeemed any objects yet.</p>
          <p className="text-sm mt-2">
            Scan QR codes or use redemption links to collect objects.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {redeemedObjects.map((object, index) => (
            <div
              key={`${object.did}-${index}`}
              className="bg-gray-700 p-4 rounded-lg border border-gray-600"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                    <h3 className="font-medium text-emerald-400">
                      {object.name || "Unknown Object"}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-300 mt-1">
                    {object.description || "No description available"}
                  </p>

                  <div className="flex items-center mt-2 space-x-2">
                    <span className="px-2 py-1 bg-gray-800 text-xs rounded-full text-emerald-400 capitalize">
                      {object.type || "Object"}
                    </span>

                    {object.redemptionDate && (
                      <span className="px-2 py-1 bg-gray-800 text-xs rounded-full text-gray-300">
                        Redeemed:{" "}
                        {new Date(object.redemptionDate).toLocaleDateString()}
                      </span>
                    )}

                    {object.reward && (
                      <span className="px-2 py-1 bg-emerald-900/40 text-xs rounded-full text-emerald-300">
                        {object.reward}
                      </span>
                    )}
                  </div>

                  <RevealableQR
                    className="mt-3"
                    qrData={`${INSTANCE_URL}/objects/verify?did=${encodeURIComponent(
                      object.did
                    )}&signature=${encodeURIComponent(
                      object.redemptionSignature
                    )}&cid=${encodeURIComponent(object.redemptionCid)}`}
                    buttonShowText="Show proof QR code"
                    buttonHideText="Hide proof QR code"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-600">
                <details className="text-xs">
                  <summary className="text-emerald-400 cursor-pointer">
                    Verification Details
                  </summary>
                  <div className="mt-2 pl-2 border-l-2 border-gray-600 space-y-1">
                    <p className="text-gray-400">
                      <span className="text-gray-500">Object ID:</span>{" "}
                      {object.did}
                    </p>
                    <p className="text-gray-400">
                      <span className="text-gray-500">Redeemed:</span>{" "}
                      {new Date(object.redemptionDate).toLocaleString()}
                    </p>
                    <p className="text-gray-400">
                      <span className="text-gray-500">Signature:</span>{" "}
                      {shortenSignature(object.redemptionSignature)}
                    </p>
                    {object.cid && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">IPFS:</span>{" "}
                        <IPFSCIDLink cid={object.cid} />
                      </p>
                    )}
                  </div>
                </details>
              </div>
            </div>
          ))}

          <div className="mt-4 flex items-start bg-gray-750 rounded-lg p-4 border border-gray-650">
            <InfoIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-400">
              <p>
                All redeemed objects contain cryptographic proof of your
                interaction. These proofs are stored in your decentralized
                identity and can be verified by anyone.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
