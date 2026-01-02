'use client';

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Ошибка входа: " + error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm"
        >
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-white mb-2">Вход</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Пароль
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Вход...
                </div>
              ) : (
                "Войти"
              )}
            </button>
          </form>

          {/* Тестовые аккаунты */}
          <div className="mt-4 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-4 text-center">Тестовые аккаунты</h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-xs text-gray-400 mb-1">Админ</div>
                <div className="text-sm text-white font-medium">admin@example.com</div>
                <div className="text-xs text-gray-400 mt-1">Пароль: admin123</div>
              </div>
              
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-xs text-gray-400 mb-1">Разработчик</div>
                <div className="text-sm text-white font-medium">developer@example.com</div>
                <div className="text-xs text-gray-400 mt-1">Пароль: developer123</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}