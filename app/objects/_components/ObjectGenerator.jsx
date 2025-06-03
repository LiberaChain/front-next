"use client";

import { FilebaseIPFSProvider } from "@/app/_core/storage/ipfs/FilebaseIPFSService";
import { InfoIcon, ShieldCheckIcon, WarningIcon } from "@phosphor-icons/react";
import { ethers } from "ethers";
import { useState, useRef } from "react";

export default function ObjectGenerator({ refreshObjectsList }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [objectId, setObjectId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  // Form data
  const [objectType, setObjectType] = useState("object");
  const [objectName, setObjectName] = useState("");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [reward, setReward] = useState("");

  const qrCodeRef = useRef(null);

  const handleGenerateObjectForBlockchain = async (e) => {
    e.preventDefault();

    if (!objectName.trim()) {
      setError("Object name is required");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      setQrCodeDataUrl("");
      setObjectId("");
      setPrivateKey("");
      setPublicKey("");
      setIpfsCid("");

      console.log("1. Starting object creation process...");

      const liberaService = await BlockchainService.libera();
      console.log("2. Connected to Libera blockchain service");

      // Prepare object metadata
      const objectData = {
        name: objectName.trim(),
        description: description.trim(),
        type: objectType,
        ...(coordinates && { coordinates }),
        ...(reward && { reward }),
        timestamp: new Date().toISOString(),
      };
      console.log("3. Prepared object metadata:", objectData);

      // Create the object on-chain with IPFS metadata
      const { tx, objectIdentity } = await createObject(
        liberaService,
        objectData,
        "0.01"
      );
      console.log("4. Object creation transaction sent:", tx.hash);

      // Wait for transaction confirmation
      console.log("5. Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("6. Transaction confirmed in block:", receipt.blockNumber);

      // Get object ID from event
      const event = receipt.events?.find((e) => e.event === "ObjectCreated");
      const newObjectId = event?.args?.tokenId;
      console.log("7. New object created with ID:", newObjectId.toString());

      setObjectId(newObjectId.toString());
      setPrivateKey(objectIdentity.privateKey);
      setPublicKey(objectIdentity.publicKey);

      // Show success message
      setSuccess(`Successfully created object: ${objectName}`);
      console.log("8. Object creation process completed successfully");
    } catch (error) {
      console.error("Failed to create object:", error);
      setError(error.message || "Failed to create object");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateObject = async (e) => {
    e.preventDefault();

    if (!objectName.trim()) {
      setError("Object name is required");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      setQrCodeDataUrl("");
      setObjectId("");
      setPrivateKey("");
      setPublicKey("");
      setIpfsCid("");

      // Create new cryptographic identity for the object
      const objectWallet = ethers.Wallet.createRandom();
      console.log(
        `1. Generated new cryptographic identity for the Object: ${objectWallet.address}`
      );

      const signingKey = objectWallet.signingKey;
      const privateKey = objectWallet.privateKey;
      const publicKeyPoints = signingKey.compressedPublicKey;
      const uncompressedPublicKey = signingKey.publicKey;

      const objectDID = `did:libera:object:${objectWallet.address}`;

      console.debug(`Prepared object credentials:`, {
        address: objectWallet.address,
        privateKey: objectWallet.privateKey,
        publicKey: uncompressedPublicKey,
        did: objectDID,
      });

      const objectMetadata = {
        name: objectName.trim(),
        description: description.trim(),
        type: objectType,
        coordinates: coordinates ? coordinates.trim() : null,
        reward: reward ? reward.trim() : null,
        timestamp: new Date().toISOString(),
        did: objectDID,
        publicKey: uncompressedPublicKey,
      };

      // Upload metadata to IPFS
      const ipfs = FilebaseIPFSProvider.getInstance();
      const ipfsResult = await ipfs.uploadFile(
        `objects/${objectWallet.address}.json`,
        JSON.stringify(objectMetadata)
      );
      const ipfsCID = await ipfs.getLatestCID(
        `objects/${objectWallet.address}.json`
      );
      console.log("2. Metadata uploaded to IPFS:", ipfsResult, ipfsCID);

      // Store credentials
      let objects = localStorage.getItem("liberaChainObjects");
      objects = objects ? JSON.parse(objects) : [];
      objects.push({
        ...objectMetadata,
        privateKey,
        cid: ipfsCID,
      });
      localStorage.setItem("liberaChainObjects", JSON.stringify(objects));

      console.log("3. Stored object credentials in localStorage:", {
        address: objectWallet.address,
        privateKey,
        publicKey: uncompressedPublicKey,
        ipfsCid: ipfsResult.cid,
      });

      console.debug("Stored object credentials in localStorage:", objects);

      refreshObjectsList?.();

      setObjectId(objectWallet.address);
      setPrivateKey(privateKey);
      setPublicKey(uncompressedPublicKey);
      setIpfsCid(ipfsCID);

      // Show success message
      setSuccess(`Successfully created object: ${objectName}`);
      console.log("4. Object creation process completed successfully");
    } catch (error) {
      console.error("Failed to create object:", error);
      setError(error.message || "Failed to create object");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">Create New Object</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/40 p-4">
          <div className="flex">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-900/40 p-4">
          <div className="flex">
            <div className="text-sm text-green-400">{success}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerateObject} className="space-y-4">
        <div>
          <label
            htmlFor="object-type"
            className="block text-sm font-medium text-gray-300"
          >
            Type
          </label>
          <div className="mt-1">
            <select
              id="object-type"
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            >
              <option value="object">Object</option>
              <option value="location">Location</option>
              <option value="event">Event</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="object-name"
            className="block text-sm font-medium text-gray-300"
          >
            Name
          </label>
          <div className="mt-1">
            <input
              id="object-name"
              type="text"
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              placeholder={
                objectType === "location"
                  ? "Eiffel Tower"
                  : objectType === "object"
                  ? "Vintage Guitar"
                  : objectType === "event"
                  ? "Tech Conference"
                  : "Organic Coffee"
              }
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-300"
          >
            Description
          </label>
          <div className="mt-1">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your object..."
              rows={3}
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="coordinates"
            className="block text-sm font-medium text-gray-300"
          >
            Coordinates (optional)
          </label>
          <div className="mt-1">
            <input
              id="coordinates"
              type="text"
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              placeholder="48.8584,2.2945"
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Format: latitude,longitude
          </p>
        </div>

        <div>
          <label
            htmlFor="reward"
            className="block text-sm font-medium text-gray-300"
          >
            Reward (optional)
          </label>
          <div className="mt-1">
            <input
              id="reward"
              type="text"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="10 points, 5% discount, etc."
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={generating}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating Object...
              </>
            ) : (
              "Create Object"
            )}
          </button>
        </div>
      </form>

      {objectId && (
        <div className="mt-6 bg-gray-700 rounded-lg p-6 border border-gray-600">
          <h3 className="text-md font-medium text-white mb-4">
            Object Created Successfully
          </h3>

          <div className="mt-3 text-sm text-gray-300">
            <p>
              Type: <span className="text-emerald-400">{objectType}</span>
            </p>
            <p>
              Name: <span className="text-emerald-400">{objectName}</span>
            </p>
            <p>
              Object ID: <span className="text-emerald-400">{objectId}</span>
            </p>
            {coordinates && (
              <p>
                Coordinates:{" "}
                <span className="text-emerald-400">{coordinates}</span>
              </p>
            )}
            {reward && (
              <p>
                Reward: <span className="text-emerald-400">{reward}</span>
              </p>
            )}
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-4 text-sm text-gray-400 hover:text-gray-300"
          >
            {showDetails ? "Hide Technical Details" : "Show Technical Details"}
          </button>

          {showDetails && (
            <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-600 text-xs text-gray-400 w-full">
              <p className="mb-2">Object ID:</p>
              <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                {objectId}
              </div>

              <p className="mb-2">Private Key:</p>
              <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                {privateKey}
              </div>

              <p className="mb-2">Public Key:</p>
              <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                {publicKey}
              </div>

              <p className="mb-2">IPFS CID:</p>
              <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                {ipfsCid}
              </div>
            </div>
          )}

          <div className="space-y-4 text-sm mt-6">
            <div className="flex items-start">
              <ShieldCheckIcon className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-emerald-400 font-medium">
                  Object Created On-Chain
                </h4>
                <p className="text-gray-400 mt-1">
                  Your object has been created on the blockchain with a unique
                  cryptographic identity. The object's metadata is stored on
                  IPFS and linked on-chain.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <InfoIcon className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-blue-400 font-medium">Next Steps</h4>
                <p className="text-gray-400 mt-1">
                  1. Save the private key securely - it's needed for future
                  object operations.
                  <br />
                  2. Users can now interact with your object using its ID.
                  <br />
                  3. You can update the object's metadata or transfer ownership
                  through the blockchain.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <WarningIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium">Security Notice</h4>
                <p className="text-gray-400 mt-1">
                  Keep the private key secure and never share it. It proves
                  ownership of this object and is required for administrative
                  operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
