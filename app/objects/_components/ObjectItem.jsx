"use client";

import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
import QRScanner from "@/app/_components/QRScanner";
import RevealableQR from "@/app/_components/RevealableQR";
import { INSTANCE_URL } from "@/app/_core/constants";
import { FilebaseIPFSProvider } from "@/app/_core/storage/ipfs/FilebaseIPFSService";
import {
  BarcodeIcon,
  CheckIcon,
  ExclamationMarkIcon,
  QuestionIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react";
import { ethers } from "ethers";
import Link from "next/link";
import { useState } from "react";

export default function ObjectItem({ object }) {
  const [applyToUserDataURLString, setApplyToUserDataURLString] =
    useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleApplyCodeRead = (result) => {
    if (!result || !result.length) return;

    console.log("QR Code result:", result);

    const data = result[0].rawValue;
    if (data) {
      setApplyToUserDataURLString(data);
    }
  };

  const handleApplyToUser = async () => {
    if (isApplying) return;
    setIsApplying(true);
    setError(null);
    setSuccess(false);

    try {
      if (!applyToUserDataURLString) {
        setError("No data to apply. Please scan a valid QR code.");
        return;
      }

      if (!object.privateKey) {
        setError(
          "Object private key is missing. The data might be corrupted or not properly initialized."
        );
        return;
      }

      let url = `${applyToUserDataURLString}`.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        setError("Invalid QR code format. Please scan a valid QR code.");
        return;
      }

      if (!url.includes("/friends?addFriend=")) {
        setError(
          "The QR code is not valid. Please scan user QR code from their profile."
        );
        return;
      }

      url = new URL(url);
      const userDid = url.searchParams.get("addFriend");

      if (!userDid || !userDid.startsWith("did:")) {
        setError("Invalid QR code format. Missing the user DID parameter.");
        return;
      }

      try {
        const objectWallet = new ethers.Wallet(object.privateKey);

        // Create redemption data with timestamp
        const redemptionData = {
          objectDid: object.did,
          userDid: userDid,
          timestamp: new Date().toISOString(),
          action: "redeem",
        };

        // Sign the redemption data with object's private key
        const dataToSign = JSON.stringify(redemptionData);
        const messageHash = ethers.hashMessage(dataToSign);
        const signature = await objectWallet.signMessage(dataToSign);

        // Verify the signature to ensure it's valid
        const recoveredAddress = ethers.verifyMessage(dataToSign, signature);
        console.log(
          "Signature verification:",
          recoveredAddress === objectWallet.address
        );

        // Create the redemption record
        const redemptionRecord = {
          ...redemptionData,
          signature,
          verified: true,
        };

        // Store in user's profile redemptions in IPFS
        const ipfs = FilebaseIPFSProvider.getInstance();
        const userRedemptionsPath = `redemptions/${userDid}/${object.did}.json`;

        // Upload the redemption record
        const uploadResult = await ipfs.uploadFile(
          userRedemptionsPath,
          JSON.stringify(redemptionRecord)
        );
        console.log("Redemption record saved to IPFS:", uploadResult);

        // Get the CID of the uploaded file
        const cid = await ipfs.getLatestCID(userRedemptionsPath);
        console.log("Redemption record CID:", cid);

        console.log("Object successfully redeemed!");
      } catch (error) {
        console.error("Error creating redemption data:", error);
        setError(error.message || "Failed to create the verification object.");
        return;
      }

      setSuccess(true);
      setApplyToUserDataURLString(null);
    } catch (err) {
      console.error("Error applying to user:", err);
      setError("Failed to apply to user. Please try again.");
    } finally {
      setIsApplying(false);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }
  };

  return (
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
            <p className="text-xs text-emerald-500">Reward: {object.reward}</p>
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

      <div className="mt-4 flex justify-between items-center">
        <Link
          className="bg-emerald-500 text-white text-sm px-3 py-2 rounded hover:bg-emerald-600 transition-colors flex items-center"
          href={`/objects/verify?did=${encodeURIComponent(object.did)}`}
        >
          <QuestionMarkIcon size={16} className="inline mr-1" weight="bold" />
          Verify redeem status
        </Link>
      </div>

      <div className="mt-4 flex">
        <div className="flex-1">
          {error && (
            <div className="bg-red-500 text-white text-sm px-3 py-2 rounded mb-2 flex items-center">
              <ExclamationMarkIcon
                size={16}
                className="inline mr-1"
                weight="bold"
              />
              {error}
            </div>
          )}

          <QRScanner
            className="w-full"
            hideAfterScan={true}
            onScan={handleApplyCodeRead}
            enableText="Apply to user"
            disableText="Disable scanner"
          />
          {applyToUserDataURLString && (
            <button
              className="bg-blue-500 text-white text-sm px-3 py-2 rounded hover:bg-blue-600 transition-colors mt-2 w-full flex items-center justify-center"
              onClick={handleApplyToUser}
              disabled={isApplying}
            >
              <CheckIcon size={16} className="inline mr-1" weight="bold" />
              Confirm applying
            </button>
          )}
          {success && (
            <div className="bg-green-500 text-white text-sm px-3 py-2 rounded mt-2 flex items-center">
              <CheckIcon size={16} className="inline mr-1" weight="bold" />
              Successfully applied to user
            </div>
          )}
        </div>
      </div>

      <RevealableQR
        qrData={`${INSTANCE_URL}/objects/redeem?redeem=${encodeURIComponent(
          object.did
        )}&key=${encodeURIComponent(object.privateKey)}`}
        image="/logo-dark.svg"
        buttonSize="large"
        className="mt-2"
      />
    </div>
  );
}
