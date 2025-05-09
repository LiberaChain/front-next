import Image from "next/image";
import Link from "next/link";

// export const metadata = {
//   title: {
//     default: "LiberaChain",
//   },
// };

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center p-8 rounded-lg shadow-lg bg-gray-800">
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-3xl font-semibold text-gray-300 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-400 mb-8">
          Oops! The page you are looking for seems to have vanished.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300 inline-flex items-center gap-2"
        >
          <span className="ml-2 text-white font-semibold text-lg">
            Open

            <Image
              src="/logo.svg"
              alt="LiberaChain"
              width={32}
              height={32}
              className="h-8 w-auto inline-block ml-4 mr-2"
            />
            LiberaChain
          </span>
        </Link>
      </div>
    </div>
  );
}
