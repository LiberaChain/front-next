import { useState, useEffect, useRef } from 'react';
import { createLocationQRCode } from '../utils/qrCodeService';
import { getAllLocations } from '../utils/locationRegistryService';

// QR Code Generator component for creating location/object QR codes
export default function QRCodeGenerator() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [locationDid, setLocationDid] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [ipfsCid, setIpfsCid] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [userLocations, setUserLocations] = useState([]);
  
  // Form data
  const [locationType, setLocationType] = useState('location');
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [orgDid, setOrgDid] = useState('');
  const [reward, setReward] = useState('');
  
  // Refs
  const qrCodeRef = useRef(null);
  
  // Load user's existing locations on mount
  useEffect(() => {
    const loadUserLocations = async () => {
      try {
        const locations = await getAllLocations();
        setUserLocations(locations);
      } catch (error) {
        console.error('Error loading user locations:', error);
      }
    };
    
    loadUserLocations();
  }, []);
  
  // Handle generating new QR code
  const handleGenerateQRCode = async (e) => {
    e.preventDefault();
    
    if (!locationName.trim()) {
      setError('Location name is required');
      return;
    }
    
    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      setQrCodeDataUrl('');
      setLocationDid('');
      setPrivateKey('');
      setPublicKey('');
      setIpfsCid('');
      
      // Get user DID from profile data
      const profileData = JSON.parse(localStorage.getItem('liberaChainIdentity') || '{}');
      const userDid = profileData.did || 'unknown';
      
      // Create location data
      const locationData = {
        type: locationType,
        name: locationName,
        coordinates,
        orgDid: orgDid || userDid, // Use user's DID if no organization DID provided
        reward,
        createdBy: userDid
      };
      
      // Generate QR code for the location
      const result = await createLocationQRCode(locationData);
      
      // Store the results
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setLocationDid(result.locationDid);
      setPrivateKey(result.privateKeyHex);
      setPublicKey(result.publicKeyHex);
      setIpfsCid(result.ipfsCid);
      
      // Show success message
      setSuccess(`Successfully generated QR code for ${locationType}: ${locationName}`);
      
      // Reload user locations
      const locations = await getAllLocations();
      setUserLocations(locations);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError(`Failed to generate QR code: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };
  
  // Handle downloading QR code
  const handleDownloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qrcode-${locationType}-${locationName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Toggle showing technical details
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">Generate Location/Object QR Code</h2>
      
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
      
      <form onSubmit={handleGenerateQRCode} className="space-y-4">
        <div>
          <label htmlFor="location-type" className="block text-sm font-medium text-gray-300">
            Type
          </label>
          <div className="mt-1">
            <select
              id="location-type"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            >
              <option value="location">Location</option>
              <option value="object">Object</option>
              <option value="event">Event</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="location-name" className="block text-sm font-medium text-gray-300">
            Name
          </label>
          <div className="mt-1">
            <input
              id="location-name"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={`${locationType === 'location' ? 'Eiffel Tower' : locationType === 'object' ? 'Vintage Guitar' : locationType === 'event' ? 'Tech Conference' : 'Organic Coffee'}`}
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="coordinates" className="block text-sm font-medium text-gray-300">
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
          <label htmlFor="org-did" className="block text-sm font-medium text-gray-300">
            Organization DID (optional)
          </label>
          <div className="mt-1">
            <input
              id="org-did"
              type="text"
              value={orgDid}
              onChange={(e) => setOrgDid(e.target.value)}
              placeholder="did:ethr:0x..."
              className="bg-gray-700 text-white block w-full rounded-md border border-gray-600 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Leave blank to use your own DID
          </p>
        </div>
        
        <div>
          <label htmlFor="reward" className="block text-sm font-medium text-gray-300">
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
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate QR Code'
            )}
          </button>
        </div>
      </form>
      
      {qrCodeDataUrl && (
        <div className="mt-6 bg-gray-700 rounded-lg p-6 border border-gray-600">
          <h3 className="text-md font-medium text-white mb-4">Your QR Code</h3>
          
          <div className="flex flex-col items-center">
            <div className="bg-white p-2 rounded-lg" ref={qrCodeRef}>
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            
            <div className="mt-3 text-sm text-gray-300 text-center">
              <p>Type: <span className="text-emerald-400">{locationType}</span></p>
              <p>Name: <span className="text-emerald-400">{locationName}</span></p>
              {coordinates && <p>Coordinates: <span className="text-emerald-400">{coordinates}</span></p>}
              {reward && <p>Reward: <span className="text-emerald-400">{reward}</span></p>}
            </div>
            
            <button
              onClick={handleDownloadQRCode}
              className="mt-4 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download QR Code
            </button>
            
            <button
              onClick={toggleDetails}
              className="mt-2 text-sm text-gray-400 hover:text-gray-300"
            >
              {showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
            </button>
            
            {showDetails && (
              <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-600 text-xs text-gray-400 w-full">
                <p className="mb-2">Location DID:</p>
                <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                  {locationDid}
                </div>
                
                <p className="mb-2">Private Key (in QR code):</p>
                <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                  {privateKey}
                </div>
                
                <p className="mb-2">Public Key (stored on IPFS):</p>
                <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                  {publicKey}
                </div>
                
                <p className="mb-2">IPFS CID:</p>
                <div className="bg-gray-900 p-2 rounded mb-2 break-all">
                  {ipfsCid}
                </div>
                
                <p className="mt-4 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Security Note: The private key is embedded in the QR code. Anyone who scans this QR can prove they were at this location.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Display user's existing locations */}
      {userLocations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-medium text-white mb-4">Your Locations</h3>
          
          <div className="space-y-4">
            {userLocations.map((location) => (
              <div key={location.locationDid} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between">
                  <div>
                    <h4 className="text-emerald-400 font-medium">{location.locationName}</h4>
                    <p className="text-xs text-gray-400">Type: {location.type}</p>
                    {location.coordinates && <p className="text-xs text-gray-400">Coordinates: {location.coordinates}</p>}
                    {location.reward && <p className="text-xs text-emerald-500">Reward: {location.reward}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created: {new Date(location.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 break-all">
                  DID: {location.locationDid}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Explanation of cryptographic verification */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6 border border-gray-700">
        <h3 className="text-md font-medium text-white mb-2">About Cryptographic QR Codes</h3>
        <p className="text-sm text-gray-400 mb-4">
          These QR codes use public-key cryptography to securely verify locations and objects.
        </p>
        
        <div className="space-y-4 text-sm">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 className="text-emerald-400 font-medium">Secure Verification</h4>
              <p className="text-gray-400 mt-1">
                When a QR code is scanned, the embedded private key is used with the public key stored on IPFS to verify that the location is authentic.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-blue-400 font-medium">How It Works</h4>
              <p className="text-gray-400 mt-1">
                1. When you create a QR code, a unique cryptographic key pair is generated.<br />
                2. The private key is encoded in the QR code.<br />
                3. The public key and location details are stored on IPFS.<br />
                4. When someone scans the QR code, their device verifies that the private key corresponds to the public key.
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-yellow-400 font-medium">Security Notice</h4>
              <p className="text-gray-400 mt-1">
                Anyone with physical access to the QR code can scan it and prove they were at that location. This is intentional - it allows users to claim rewards by physically visiting locations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}