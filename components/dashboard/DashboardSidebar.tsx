"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Radio,
  Heart,
  Music,
  Upload,
  BarChart3,
  Coins,
  Users,
  Settings,
  Plus,
  Disc,
  TrendingUp,
  Headphones
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNavItems = [
  { icon: Home, label: "Home", href: "/dashboard", badge: null },
  { icon: Search, label: "Browse", href: "/dashboard/browse", badge: null },
  { icon: Radio, label: "Radio", href: "/dashboard/radio", badge: null },
  { icon: Heart, label: "Liked Songs", href: "/dashboard/liked", badge: null },
];

const creatorNavItems = [
  { icon: Upload, label: "Upload", href: "/dashboard/upload", badge: null },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", badge: null },
  { icon: Coins, label: "Creator Coins", href: "/dashboard/coins", badge: "NEW" },
  { icon: Users, label: "Fans", href: "/dashboard/fans", badge: null },
];

const userPlaylists = [
  { id: 1, name: "Chill Vibes", icon: "🎧", trackCount: 24 },
  { id: 2, name: "Workout Mix", icon: "💪", trackCount: 18 },
  { id: 3, name: "Focus Flow", icon: "🧠", trackCount: 32 },
];

export function DashboardSidebar() {
  const { user, isCreator } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <aside className={`bg-gradient-to-b from-neutral-900/80 via-neutral-950/80 to-black/80 backdrop-blur-sm border-r border-white/10 text-white transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-72'
    } flex flex-col h-full`}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">
            SV
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold">StreamVault</h1>
              <p className="text-xs text-gray-400">Web3 Music Platform</p>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        <div>
          {!isCollapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-2">
              Discover
            </h3>
          )}
          <ul className="space-y-2">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Creator Tools (if user is a creator) */}
        {isCreator && (
          <div>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-2">
                Creator Tools
              </h3>
            )}
            <ul className="space-y-2">
              {creatorNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Playlists */}
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Your Playlists
              </h3>
              <button className="p-1 hover:bg-white/10 rounded-md transition-colors duration-200">
                <Plus className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
            <ul className="space-y-2">
              {userPlaylists.map((playlist) => (
                <li key={playlist.id}>
                  <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 text-left">
                    <div className="w-8 h-8 bg-white/5 rounded-md flex items-center justify-center text-sm">
                      {playlist.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {playlist.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {playlist.trackCount} songs
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10">
        {/* User Stats */}
        {!isCollapsed && user?.creator && (
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Creator Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-white">{user.creator.totalPlays.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total Plays</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user.creator.followerCount.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Followers</div>
              </div>
            </div>
          </div>
        )}

        {/* Version */}
        <div className="text-xs text-gray-500 text-center">
          {!isCollapsed && "Made with ❤️ · StreamVault v2"}
        </div>
      </div>
    </aside>
  );
}