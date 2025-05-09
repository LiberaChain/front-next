import { clearAuthData } from "../utils/authService";
import { useIsAuthenticated } from "./auth";
import Header from "./Header";

export default function ContentWrapper({ children, title }) {
  const { isAuthenticated, _ } = useIsAuthenticated();

  const handleLogout = () => {
    clearAuthData();

    router.push("/");
  };

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-10">
      <Header title={title}>
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
          >
            Log out
          </button>
        )}
      </Header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {children}
      </main>
    </div>
  );
}
