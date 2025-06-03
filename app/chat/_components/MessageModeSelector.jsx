export default function MessageModeSelector({ mode, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Mode:</span>
      <select
        value={mode}
        disabled={true}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-[90px]"
      >
        <option value="standard">Standard</option>
        <option value="p2p">P2P Only</option>
        <option value="ipfs">IPFS (Encrypted)</option>
        <option value="hybrid">Hybrid (P2P + IPFS)</option>
      </select>
    </div>
  );
}