import Header from "@/app/_components/Header";

export default function DashboardHeader({ onLogout }) {
  return (
    <Header>
      <button
        onClick={onLogout}
        className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
      >
        Log out
      </button>
    </Header>
  );
}
