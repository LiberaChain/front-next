import Image from "next/image";
import Link from "next/link";

export default function DashboardHeader({ onLogout }) {
  return (
    <header className="bg-gray-800/50 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="LiberaChain"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <span className="ml-2 text-white font-semibold text-lg">
                LiberaChain
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={onLogout}
              className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
