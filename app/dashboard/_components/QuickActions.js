import {
  ChatsCircleIcon,
  CubeFocusIcon,
  NewspaperIcon,
  UserCirclePlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

export default function QuickActions({ pendingRequestsCount }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white">Quick Actions</h2>
      <p className="text-xs text-gray-400 mt-2">
        Access your most used features quickly. Click on any action to get
        started.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <Link
          href="/chat"
          className="inline-flex items-center justify-left px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <ChatsCircleIcon className="h-5 w-5 mr-2" weight="duotone" />
          Messages
        </Link>
        <Link
          href="/posts"
          className="inline-flex items-center justify-left px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <NewspaperIcon className="h-5 w-5 mr-2" weight="duotone" />
          Social Posts
        </Link>

        <Link
          href="/objects"
          className="inline-flex items-center justify-left px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <CubeFocusIcon className="h-5 w-5 mr-2" weight="duotone" />
          Locations / Objects
        </Link>

        <Link
          href="/friends"
          className="inline-flex items-center justify-left px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <UserCirclePlusIcon className="h-5 w-5 mr-2" weight="duotone" />
          Friends
          {pendingRequestsCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {pendingRequestsCount}
            </span>
          )}
        </Link>

        {/* <Link
          href="/groups"
          className="inline-flex items-center justify-left px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <UsersThreeIcon className="h-5 w-5 mr-2" weight="duotone" />
          Groups
        </Link> */}
      </div>
    </div>
  );
}
