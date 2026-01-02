'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [user, setUser] = useState<{
    full_name: string | null;
    is_admin: boolean;
    business_role: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // ✅ Получаем текущий путь

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && !initialLoad) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, is_admin, business_role")
          .eq("id", authUser.id)
          .single();
        setUser(profile);
      } else {
        setUser(null);
      }

      setTimeout(() => {
        setLoading(false);
        setInitialLoad(false);
      }, 300);
    };

    fetchProfile();

    const { data:
       { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        fetchProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // ✅ Функция для определения активной ссылки
  const isActiveLink = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const showSkeleton = loading && initialLoad;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-lg shadow-gray-900/20 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Логотип / Название */}
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link href="/dashboard" className="text-xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
              TaskTracker
            </Link>
          </motion.div>

          {user ? (
            <div className="flex items-center space-x-2"> {/* ✅ Уменьшил отступы между кнопками */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Link
                  href="/dashboard"
                  className={`text-gray-300 transition-colors duration-200 py-2 px-3 rounded-lg ${
                    isActiveLink('/dashboard') || pathname === '/' // ✅ Обработка главной страницы
                      ? 'text-blue-400 bg-blue-900/30 border border-blue-800/30' // ✅ Активный стиль как hover
                      : 'hover:text-blue-400 hover:bg-gray-700/50'
                  }`}
                >
                  Главная
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link
                  href="/projects"
                  className={`text-gray-300 transition-colors duration-200 py-2 px-3 rounded-lg ${
                    isActiveLink('/projects')
                      ? 'text-blue-400 bg-blue-900/30 border border-blue-800/30' // ✅ Активный стиль
                      : 'hover:text-blue-400 hover:bg-gray-700/50'
                  }`}
                >
                  Проекты
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Link
                  href="/files"
                  className={`text-gray-300 transition-colors duration-200 py-2 px-3 rounded-lg ${
                    isActiveLink('/files')
                      ? 'text-blue-400 bg-blue-900/30 border border-blue-800/30' // ✅ Активный стиль
                      : 'hover:text-blue-400 hover:bg-gray-700/50'
                  }`}
                >
                  Файлы
                </Link>
              </motion.div>

              {/* Только для админа */}
              <AnimatePresence>
                {!showSkeleton && user?.is_admin && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Link
                      href="/team"
                      className={`text-gray-300 transition-colors duration-200 py-2 px-3 rounded-lg ${
                        isActiveLink('/team')
                          ? 'text-blue-400 bg-blue-900/30 border border-blue-800/30' // ✅ Активный стиль
                          : 'hover:text-blue-400 hover:bg-gray-700/50'
                      }`}
                    >
                      Сотрудники
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Профиль и выход */}
              <motion.div
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <AnimatePresence mode="wait">
                  {showSkeleton ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-right hidden sm:block"
                    >
                      <div className="h-4 bg-gray-700 rounded w-24 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="user-info"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-right hidden sm:block"
                    >
                      <div className="text-sm font-medium text-white">
                        {user.full_name}
                      </div>
                      {user.business_role !== "none" && user.business_role && (
                        <div className="text-xs text-gray-400 text-center">
                          {user.business_role}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={handleLogout}
                  className="flex items-center text-gray-400 hover:text-red-600 cursor-pointer transition-colors duration-200 p-2 rounded-lg hover:bg-gray-700/50"
                  title="Выйти"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </motion.button>
              </motion.div>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
    </motion.header>
  );
}