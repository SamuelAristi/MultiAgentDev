"use client";

import { getStoreById } from "@/data/mock";

interface StoreHeaderProps {
  storeId: string;
}

/**
 * StoreHeader Component
 * Muestra el header principal con el nombre de la tienda y subtítulo de agentes
 */
export function StoreHeader({ storeId }: StoreHeaderProps) {
  const store = getStoreById(storeId);
  const storeName = store?.name || "Tienda";

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between">
        {/* Left side - Title and subtitle */}
        <div>
          {/* Store badge */}
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
            </span>
            <span className="text-xs font-medium text-purple-400">
              Activo
            </span>
          </div>

          {/* Main title */}
          <h1 className="text-4xl font-bold text-white mb-2 capitalize">
            {storeName}
          </h1>

          {/* Subtitle */}
          <div className="flex items-center gap-2 mb-1">
            <AgentIcon className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-gray-300">Agentes</h2>
          </div>

          {/* Description */}
          <p className="text-gray-500 max-w-lg">
            Selecciona un agente para interactuar con su asistente de IA
            especializado en{" "}
            <span className="text-purple-400">{storeName}</span>
          </p>
        </div>

        {/* Right side - Action button */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              bg-white/5 border border-white/10
              text-gray-400 hover:text-white hover:bg-white/10
              transition-all duration-200
            "
            aria-label="Notificaciones"
          >
            <BellIcon className="h-5 w-5" />
          </button>

          {/* Help button */}
          <button
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              bg-purple-500/20 border border-purple-500/30
              text-purple-400 hover:text-purple-300 hover:bg-purple-500/30
              transition-all duration-200
            "
            aria-label="Ayuda"
          >
            <HelpIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Icons
// ============================================================================

function AgentIcon({ className }: { className?: string }) {
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
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
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
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
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      />
    </svg>
  );
}
