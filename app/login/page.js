import Image from "next/image";
import Link from "next/link";
import LoginFlow from "./_components/login-flow";

export const metadata = {
  title: "Login",
  description:
    "Login to your LiberaChain account to access your decentralized identity and content.",
};

export default function LoginPage() {
  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="LiberaChain Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign in to your digital identity
        </h2>
        <p className="mt-2 text-center text-sm text-gray-100">
          Access your decentralized identity and content
        </p>
      </div>

      <LoginFlow />
    </div>
  );
}
