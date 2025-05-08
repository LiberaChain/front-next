export default function LoginSuccess() {
  return (
    <div className="text-center py-5">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white">Verification Successful!</h3>
      <p className="mt-2 text-sm text-gray-400">DID verified with blockchain cryptography. Redirecting to dashboard...</p>
    </div>
  );
}