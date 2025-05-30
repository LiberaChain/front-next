import {
  FileLockIcon,
  LockSimpleOpenIcon,
  QrCodeIcon,
  VaultIcon,
} from "@phosphor-icons/react";

export default function LoginStart({
  loading,
  onMethodSelect,
  browserWalletAvailable,
  ethereumWalletAvailable,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-white mb-2">
          Decentralized Authentication
        </h3>
        <p className="text-sm text-gray-400">
          Choose how you want to authenticate with your decentralized identity
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-transparent outline outline-emerald-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-transparent"
          onClick={() => onMethodSelect("ethereum")}
          disabled={!ethereumWalletAvailable || loading}
        >
          <VaultIcon className="h-5 w-5 mr-2" />
          <span>
            Connect Crypto Wallet{" "}
            {!ethereumWalletAvailable && (
              <> (install crypto wallet extension)</>
            )}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-transparent outline outline-blue-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:bg-blue-600 disabled:opacity-50 disabled:hover:bg-transparent"
          onClick={() => onMethodSelect("browser")}
          disabled={!browserWalletAvailable || loading}
        >
          <LockSimpleOpenIcon className="h-5 w-5 mr-2" />
          <span>
            Use Stored Browser Based Wallet{" "}
            {browserWalletAvailable ? "" : "(none available)"}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-transparent outline outline-blue-600 py-3 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-blue-600 focus:bg-blue-600 disabled:opacity-50 disabled:hover:bg-transparent"
          onClick={() => onMethodSelect("browser-recover")}
          disabled={loading}
        >
          <FileLockIcon className="h-5 w-5 mr-2" />
          <span>Use Recovery Phrase to Recover Browser Wallet</span>
        </button>

        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 py-3 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none disabled:opacity-50 disabled:hover:bg-gray-700"
          onClick={() => onMethodSelect("qr")}
          disabled={true}
        >
          <QrCodeIcon className="h-5 w-5 mr-2" />
          <span>Scan QR with Mobile App (comming soon)</span>
        </button>
      </div>

      <div className="pt-4 text-center">
        <p className="text-xs text-gray-400">
          Choose a crypto wallet for high security or a browser wallet for
          convenience.
          <br />
          All options give you full control of your data without centralized
          storage.
        </p>
      </div>
    </div>
  );
}
