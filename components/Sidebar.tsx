"use client";

import React from 'react';
import Link from 'next/link';
import {
  Home,
  Search,
  Heart,
  Radio,
  UploadIcon,
  Music4Icon,
  DollarSign,
  CogIcon,
} from "lucide-react";


import {MusicalNoteIcon} from "@heroicons/react/24/outline"

interface SidebarProps {
  user: any;
  unpublishedCount?: number;
}

export function Sidebar({ user, unpublishedCount = 0 }: SidebarProps) {
  return (
    <aside className="w-72 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white p-6 flex flex-col gap-6 border-r border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-neutral-600 to-neutral-500 rounded-lg flex items-center justify-center text-lg font-bold shadow-lg">
          SV
        </div>
        <div>
          <h1 className="text-lg font-bold">StreamVault</h1>
          <p className="text-xs text-neutral-400">Music • Creators • Economy</p>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/7 transition-colors"
            >
              <Home className="w-5 h-5 text-white/90" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/browse"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/7 transition-colors"
            >
              <Search className="w-5 h-5 text-white/80" />
              <span className="text-sm font-medium">Browse Tracks</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/upload"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/7 transition-colors"
            >
              <UploadIcon className="w-5 h-5 text-white/80" />
              <span className="text-sm font-medium">Upload Music</span>
            </Link>
          </li>
          {user?.creator && (
            <li>
              <Link
                href="/dashboard/manage-uploads"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/7 transition-colors"
              >
                <MusicalNoteIcon className="w-5 h-5 text-white/80" />
                <span className="text-sm font-medium">Manage Uploads</span>
                {unpublishedCount > 0 && (
                  <span className="bg-neutral-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {unpublishedCount}
                  </span>
                )}
              </Link>
            </li>
          )}
        </ul>

        {user?.creator && (
          <div className="mt-6">
            <h4 className="text-xs text-neutral-400 uppercase tracking-wide mb-3 font-semibold">
              Creator Tools
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/7 transition-colors"
                >
                  <DollarSign className="w-5 h-5 text-white/80" />
                  <span className="text-sm font-medium">Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/7 transition-colors"
                >
                  <CogIcon className="w-5 h-5 text-white/80" />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div>
        <h4 className="text-xs text-neutral-400 uppercase tracking-wide font-semibold">
          Your Library
        </h4>
        <ul className="mt-3 space-y-2">
          <li className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-md grid place-items-center">
                <Heart className="w-4 h-4 text-white/70" />
              </div>
              <span className="text-sm font-medium">Liked Tracks</span>
            </div>
          </li>
          <li className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-md grid place-items-center">
                <Radio className="w-4 h-4 text-white/70" />
              </div>
              <span className="text-sm font-medium">Recently Played</span>
            </div>
          </li>
        </ul>
      </div>

      <div className="text-xs text-neutral-500 font-medium">
        {user?.creator ? `Creator: ${user.creator.stageName}` : 'Listener'} • v2
      </div>
    </aside>
  );
}