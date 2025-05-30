import Image from "next/image";
import Link from "next/link";

export default function Header({ children, title }) {
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
                  className="h-8 w-auto inline-block"
                />
                <span className="ml-2 text-white font-semibold text-lg hidden sm:inline-block">
                  LiberaChain
                </span>
              </Link>
              {title && (
                <span className="ml-4 px-2 py-1 bg-emerald-800 font-semibold text-white text-xs rounded-md">
                  {title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center">{children}</div>
        </div>
      </div>
    </header>
  );
}
