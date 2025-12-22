"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileText, Plus, LogOut, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserFile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  files: UserFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string) => void;
  isLoading?: boolean;
}

export function Sidebar({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  isLoading,
}: SidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <aside 
      className={`h-screen bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with collapse toggle */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0"
            >
              <h1 className="text-lg font-bold text-[var(--foreground)] truncate">
                Research Explorer
              </h1>
              {session?.user?.name && (
                <p className="text-xs text-[var(--muted)] truncate mt-1">
                  {session.user.name}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-[var(--foreground)]/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Analysis Button */}
      <div className="p-3">
        <button
          onClick={onCreateFile}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors text-sm ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="New Analysis"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Analysis</span>}
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center text-[var(--muted)] text-sm py-4">
            {isCollapsed ? "..." : "Loading..."}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center text-[var(--muted)] text-sm py-4">
            {isCollapsed ? "" : "No files yet"}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeFileId === file.id
                    ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "hover:bg-[var(--foreground)]/5 text-[var(--muted)]"
                } ${isCollapsed ? "justify-center" : ""}`}
                onClick={() => onSelectFile(file.id)}
                title={isCollapsed ? file.name : undefined}
              >
                <FileText className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate text-sm">
                      {file.name.replace(/ - \d{1,2}\/\d{1,2}\/\d{4}.*$/, "").replace(/\.[^/.]+$/, "")} - {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors text-sm ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
