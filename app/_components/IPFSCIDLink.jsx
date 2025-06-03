export default function IPFSCIDLink({ cid, children }) {
  if (!cid) {
    return <span className="text-red-500">Invalid CID</span>;
  }

  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

  return (
    <a
      href={ipfsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:underline opacity-60"
    >
      {children || cid.slice(0, 6) + '...' + cid.slice(-4)}
    </a>
  );
}
