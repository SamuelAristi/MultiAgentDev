"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading: authLoading, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Redirect to dashboard on success
      router.push("/tienda/snatched");
    } catch (err) {
      setError("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <span className="text-gray-400">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-dark-900 to-pink-900/10 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-glow mb-4">
            <span className="text-3xl font-bold text-white">2B</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenido de nuevo</h1>
          <p className="text-gray-400 mt-2">Inicia sesión para continuar</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Configuration warning */}
            {!isConfigured && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-sm text-yellow-400">
                  <strong>Configuración requerida:</strong> Por favor configura las variables de entorno de Supabase en tu archivo .env.local
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* Forgot password link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !isConfigured}
              className="btn-gradient w-full py-3 rounded-xl font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-800 text-gray-500">o</span>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center text-gray-400">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
              Regístrate
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          Al iniciar sesión, aceptas nuestros{" "}
          <Link href="/terms" className="text-purple-400 hover:underline">
            Términos de servicio
          </Link>{" "}
          y{" "}
          <Link href="/privacy" className="text-purple-400 hover:underline">
            Política de privacidad
          </Link>
        </p>
      </div>
    </div>
  );
}
