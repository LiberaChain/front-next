import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';

export default function UserProfile({
  profileData,
  ipfsProfile,
  showQrCode,
  onToggleQrCode
}) {
  // Generate QR code URL that works with external scanners
  const generateQrCodeUrl = (did) => {
    // If running in a deployed environment, use the actual domain
    // For development, use localhost
    const baseUrl = typeof window !== 'undefined' ? 
      window.location.origin : 
      'http://localhost:3000';
    
    // Create a URL that will open the app and navigate to the dashboard with the DID as a parameter
    return `${baseUrl}/dashboard?addFriend=${encodeURIComponent(did)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <div className="flex items-center space-x-4">
        <div className="bg-emerald-600 rounded-full p-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{ipfsProfile?.username || profileData?.displayName || "Anonymous User"}</h2>
          <p className="text-sm text-gray-400">Decentralized Identity</p>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-300">Your DID</h3>
          <button 
            onClick={onToggleQrCode}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            {showQrCode ? "Hide QR" : "Show QR"}
          </button>
        </div>
        <div className="mt-1 bg-gray-700 rounded-md p-2">
          <code className="text-xs text-emerald-400 break-all">{profileData?.did || "Not available"}</code>
        </div>
        
        {showQrCode && profileData?.did && (
          <div className="mt-4 flex justify-center flex-col items-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeCanvas 
                value={generateQrCodeUrl(profileData.did)} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Scan with any camera app to add as friend
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-300">Wallet Address</h3>
        <div className="mt-1 bg-gray-700 rounded-md p-2">
          <code className="text-xs text-blue-400 break-all">{profileData?.wallet || "Not available"}</code>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-300">Account Created</h3>
        <p className="text-sm text-gray-400">
          {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleString() : "Unknown"}
        </p>
      </div>
    </div>
  );
}