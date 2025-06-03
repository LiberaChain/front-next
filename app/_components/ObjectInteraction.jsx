import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ObjectsService } from '@core/objectsService';

export default function ObjectInteraction({ objectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  const objectsService = new ObjectsService();

  const generateQR = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { payload, signature } = await objectsService.generateInteractionPayload(objectId);
      const qrPayload = JSON.stringify({ payload, signature });
      setQrData(qrPayload);
      
    } catch (err) {
      setError(err.message || 'Failed to generate QR code');
      console.error('QR generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyInteraction = async (qrPayload) => {
    try {
      setLoading(true);
      setError(null);
      setVerificationStatus('Verifying...');

      const { payload, signature } = JSON.parse(qrPayload);
      const tx = await objectsService.verifyAndRecordInteraction(objectId, { payload, signature });
      
      await tx.wait();
      setVerificationStatus('Verified');
      
    } catch (err) {
      setError(err.message || 'Failed to verify interaction');
      setVerificationStatus('Failed');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow">
      <div className="space-y-4">
        {/* QR Code Generation */}
        <div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">Object Interaction</h3>
          <button
            onClick={generateQR}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Generate QR Code
          </button>
        </div>

        {/* QR Code Display */}
        {qrData && (
          <div className="p-4 bg-white rounded">
            <QRCodeCanvas value={qrData} size={256} level="H" />
          </div>
        )}

        {/* Verification Status */}
        {verificationStatus && (
          <div className={`p-2 rounded ${
            verificationStatus === 'Verified' ? 'bg-green-600' : 
            verificationStatus === 'Failed' ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            <p className="text-white">{verificationStatus}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-600 rounded">
            <p className="text-white">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}