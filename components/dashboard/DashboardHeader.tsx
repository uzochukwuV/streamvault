"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Music,
  TrendingUp,
  Wallet,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardHeaderProps {
  onSearch?: (query: string) => void;
}

export function DashboardHeader({ onSearch }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-40">
      <div className="flex items-center justify-between p-6">
        {/* Search */}
        <div className="flex items-center gap-6 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              placeholder="Search tracks, artists, playlists..."
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Wallet Info */}
          {user?.credits && (
            <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <div className="text-sm">
                <span className="text-yellow-400 font-semibold">{user.credits.balance}</span>
                <span className="text-gray-400 ml-1">SV Credits</span>
              </div>
            </div>
          )}

          {/* Notifications */}
          <button className="relative p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors duration-200">
            <Bell className="w-5 h-5 text-gray-300" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold">
                    {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-white">{user?.displayName}</div>
                  <div className="text-xs text-gray-400">
                    {user?.creator ? user.creator.stageName : 'Music Fan'}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg font-bold">
                        {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white">{user?.displayName}</div>
                      <div className="text-sm text-gray-400">@{user?.username}</div>
                      {user?.creator && (
                        <div className="text-xs text-purple-400 flex items-center gap-1 mt-1">
                          <Music className="w-3 h-3" />
                          Creator
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors duration-200 text-left">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-white">Profile Settings</span>
                  </button>

                  {user?.creator && (
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors duration-200 text-left">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-white">Creator Analytics</span>
                    </button>
                  )}

                  <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors duration-200 text-left">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-white">Settings</span>
                  </button>

                  <hr className="border-white/10 my-2" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-left text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}