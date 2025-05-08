export default function LoginStart({ onConnectWallet, onQrCodeAuth }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-white mb-2">
          Decentralized Authentication
        </h3>
        <p className="text-sm text-gray-400">
          Connect your crypto wallet or DID-enabled mobile app to authenticate
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none"
          onClick={onConnectWallet}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>Connect Wallet</span>
        </button>
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 py-3 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
          onClick={onQrCodeAuth}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Scan QR with Mobile Wallet</span>
        </button>
      </div>

      <div className="pt-4 text-center">
        <p className="text-xs text-gray-400">
          By signing in with your decentralized identity, you retain full
          control of your data.
          <br />
          No passwords or centralized storage required.
        </p>
      </div>
    </div>
  );
}
