export default function IntroStep({ onNext, error }) {
  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      onNext();
    }}>
      <div>
        <h3 className="text-lg font-medium text-white">Welcome to LiberaChain</h3>
        <p className="mt-2 text-sm text-gray-400">
          LiberaChain uses decentralized identity (DID) technology to give you complete control over your digital identity. 
          No email, no password, no central authority.
        </p>
      </div>

      <div className="rounded-md bg-gray-700 p-4">
        <h4 className="text-sm font-medium text-white mb-2">How this works:</h4>
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-300">
          <li>Connect your Ethereum wallet (like MetaMask)</li>
          <li>Your wallet address generates your unique DID</li>
          <li>Secure messaging keys are created for encrypted communication</li>
          <li>Your public key is stored on-chain and private key in your wallet</li>
          <li>Your account is only valid if registered on the blockchain</li>
          <li>No central database storing your personal data</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/40 p-4">
          <div className="flex">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Get Started
        </button>
      </div>
    </form>
  );
}