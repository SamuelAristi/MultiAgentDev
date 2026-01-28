"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/supabase";
import { stores } from "@/data/mock";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import IconButton from "@mui/material/IconButton";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isAdmin?: boolean;
}

/**
 * Sidebar Component
 * Menú lateral colapsable con logo de 2B y lista de tiendas
 */
export function Sidebar({ isOpen, onToggle, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const currentStoreId = pathname.split("/tienda/")[1] || "snatched";

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen bg-dark-100 border-r border-white/5
        transition-all duration-300 ease-in-out
        ${isOpen ? "w-[280px]" : "w-[80px]"}
      `}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />

      <div className="relative flex h-full flex-col">
        {/* Header with Logo and Toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className={`flex items-center gap-3 ${!isOpen && "justify-center w-full"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-glow flex-shrink-0">
              <span className="text-xl font-bold text-white">2B</span>
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-white">2B</h1>
                <p className="text-xs text-gray-500">Marketing Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <div className={`px-4 py-3 ${!isOpen && "flex justify-center"}`}>
          <IconButton
            onClick={onToggle}
            sx={{
              color: "#a855f7",
              backgroundColor: "rgba(168, 85, 247, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(168, 85, 247, 0.2)",
              },
              borderRadius: "12px",
              width: isOpen ? "100%" : "48px",
              justifyContent: isOpen ? "flex-start" : "center",
              gap: "12px",
              padding: "10px 16px",
            }}
          >
            {isOpen ? <MenuOpenIcon /> : <MenuIcon />}
            {isOpen && (
              <span className="text-sm font-medium text-purple-400">
                Cerrar menú
              </span>
            )}
          </IconButton>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Tiendas Label */}
          {isOpen && (
            <div className="mb-3 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tiendas
              </span>
            </div>
          )}

          {/* Store List */}
          <nav className="space-y-1">
            {stores.map((store) => {
              const isActive = currentStoreId === store.id;

              return (
                <Link
                  key={store.id}
                  href={`/tienda/${store.id}`}
                  className={`
                    relative flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200 group
                    ${!isOpen && "justify-center"}
                    ${
                      isActive
                        ? "bg-purple-500/20 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                  title={!isOpen ? store.name : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full" />
                  )}

                  {/* Store icon */}
                  <span
                    className={`
                      flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold
                      transition-all duration-200 flex-shrink-0
                      ${
                        isActive
                          ? "bg-purple-500/30 text-purple-300"
                          : "bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300"
                      }
                    `}
                  >
                    {store.name.charAt(0).toUpperCase()}
                  </span>

                  {/* Store info - only when open */}
                  {isOpen && (
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className={`font-medium truncate ${
                          isActive ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {store.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {store.description}
                      </p>
                    </div>
                  )}

                  {/* Active glow effect */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl ring-1 ring-purple-500/30 pointer-events-none" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="my-6 border-t border-white/5" />

          {/* Configuración Item */}
          {isOpen && (
            <>
              <div className="mb-3 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Próximamente
                </span>
              </div>
              <button
                className="
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl
                  text-gray-500 hover:text-gray-400 hover:bg-white/5
                  transition-all duration-200 cursor-not-allowed opacity-60
                "
                disabled
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <span className="font-medium">Configuración</span>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-4">
          <div className={`flex items-center gap-3 ${!isOpen && "justify-center"}`}>
            <div className={`
              flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0
              ${isAdmin ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"}
            `}>
              {isAdmin ? (
                <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || "Usuario"}
                  </p>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {profile?.email || ""}
                </p>
              </div>
            )}
            {isOpen && (
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                title="Cerrar sesión"
              >
                <LogoutIcon sx={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Icons
// ============================================================================

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
