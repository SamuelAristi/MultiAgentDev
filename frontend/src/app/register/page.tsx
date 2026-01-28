"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase";

export default function RegisterPage() {
  const { signUp, isLoading: authLoading, isConfigured } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp(email, password, fullName);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Show success message
      setSuccess(true);
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

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-dark-900 to-pink-900/10 pointer-events-none" />

        <div className="relative w-full max-w-md text-center">
          <div className="glass-card rounded-2xl p-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
              <svg
                className="h-8 w-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h2>
            <p className="text-gray-400 mb-6">
              Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión con <strong className="text-white">{email}</strong>.
            </p>

            <Link
              href="/login"
              className="btn-gradient inline-block px-8 py-3 rounded-xl font-medium text-white"
            >
              Iniciar sesión
            </Link>
          </div>
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
          <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="text-gray-400 mt-2">Únete a la plataforma de marketing con IA</p>
        </div>

        {/* Register Form */}
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

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

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
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
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
                  Creando cuenta...
                </span>
              ) : (
                "Crear cuenta"
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

          {/* Login link */}
          <p className="text-center text-gray-400">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          Al registrarte, aceptas nuestros{" "}
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
