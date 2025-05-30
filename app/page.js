import Image from "next/image";
import {
  CrosshairIcon,
  GithubLogoIcon,
  GitPullRequestIcon,
  LockIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import HomePageLinks from "@components/HomePageLinks";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2FD7A2] via-[#1A223F] to-[#0F172A] flex flex-col items-center justify-start">
      <div className="flex flex-col items-center justify-center mt-24 mb-16 px-4 text-center">
        <div className="flex items-center gap-4 mb-4">
          <Image
            src="/logo.svg"
            width={80}
            height={80}
            className="w-14 md:w-20"
            alt="LiberaChain Logo"
          />
          <h1 className="text-white text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
            LiberaChain
          </h1>
        </div>
        <p className="text-lg md:text-2xl text-gray-200 max-w-2xl mb-6 font-light">
          The open source, decentralized social network for the next generation.
          Own your data. Connect freely. Join the movement.
        </p>
        <HomePageLinks />
      </div>

      {/* Features Section */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-4 mb-20">
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          <CrosshairIcon className="text-[#2FD7A2] mb-3 w-10 h-10" />
          <h2 className="text-white text-2xl font-semibold mb-2">
            Decentralized
          </h2>
          <p className="text-gray-300">
            No central authority. Your posts and data are stored on the
            blockchain and IPFS, ensuring true ownership and censorship
            resistance.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          <LockIcon className="text-[#2FD7A2] mb-3 w-10 h-10" />
          <h2 className="text-white text-2xl font-semibold mb-2">
            Privacy First
          </h2>
          <p className="text-gray-300">
            Your identity and data are protected with cryptography. Share what
            you want, when you want, with full control.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          <GitPullRequestIcon className="text-[#2FD7A2] mb-3 w-10 h-10" />
          <h2 className="text-white text-2xl font-semibold mb-2">
            Open Source
          </h2>
          <p className="text-gray-300">
            Transparent and community-driven. Contribute on{" "}
            <a
              href="https://github.com/LiberaChain"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#2FD7A2]"
            >
              GitHub
            </a>{" "}
            and help shape the future of social networking.
          </p>
        </div>
        <div className="bg-[#1A223F] rounded-2xl p-8 shadow-lg flex flex-col items-center text-center border border-[#2FD7A2]/20">
          <UsersThreeIcon className="text-[#2FD7A2] mb-3 w-10 h-10" />
          <h2 className="text-white text-2xl font-semibold mb-2">
            Community Powered
          </h2>
          <p className="text-gray-300">
            Join a global community of innovators, creators, and free thinkers.
            LiberaChain is built for and by its users.
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="w-full max-w-3xl px-4 mb-16 text-center">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
          What is LiberaChain?
        </h3>
        <p className="text-gray-300 mb-4">
          LiberaChain is a decentralized, blockchain-based social network that
          empowers users to connect, share, and interact without intermediaries.
          Our mission is to return control of social media to the people,
          ensuring privacy, transparency, and freedom of expression for all.
        </p>
        <a
          href="https://github.com/LiberaChain"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-[#2FD7A2] text-[#0F172A] font-semibold shadow hover:bg-white hover:text-[#2FD7A2] transition"
        >
          <GithubLogoIcon className="w-5 h-5" />
          View on GitHub
        </a>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} LiberaChain. Open Source. Decentralized.
        Yours.
      </footer>
    </div>
  );
}
