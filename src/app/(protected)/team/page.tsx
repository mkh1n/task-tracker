"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile, BusinessRole } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user!.id)
        .single();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }

      setCurrentUserIsAdmin(true);

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      setProfiles(allProfiles || []);

      setTimeout(() => {
        setLoading(false);
      }, 300);
    };

    loadData();
  }, []);

  const updateBusinessRole = async (
    userId: string,
    business_role: BusinessRole
  ) => {
    await supabase.from("profiles").update({ business_role }).eq("id", userId);
    setProfiles(
      profiles.map((p) => (p.id === userId ? { ...p, business_role } : p))
    );
  };

  const getFullRole = (profile: Profile) => {
    if (profile.is_admin) {
      return profile.business_role !== "none"
        ? profile.business_role + " (admin)"
        : "admin";
    } else {
      return profile.business_role !== "none"
        ? profile.business_role
        : "developer";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Анимации для заглушек
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="h-8 bg-gray-800 rounded w-48 mb-6 animate-pulse"></div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="border border-gray-700 p-4 rounded-xl bg-gray-800 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 bg-gray-700 rounded w-32"></div>
                  <div className="h-9 bg-gray-700 rounded w-24"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  if (!currentUserIsAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-6 min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Доступ запрещён
          </h1>
          <p className="text-gray-400">
            Только администраторы могут просматривать эту страницу
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Сотрудники</h1>
        <p className="text-gray-400">
          Управление командой и ролями сотрудников
        </p>
        <div className="mt-4 text-sm text-gray-500">
          Всего сотрудников: {profiles.length}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        whileInView="visible"
        className="space-y-4"
      >
        {profiles.map((profile, index) => (
          <motion.div
            key={profile.id}
            variants={itemVariants}
            transition={{ delay: index * 0.05 }}
            className={`border border-gray-700 rounded-xl p-5 bg-gray-800 ${
              profile.id === currentUserId ? "ring-1 ring-blue-500/30" : ""
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-white text-lg">
                    {profile.full_name}
                    {profile.id === currentUserId && (
                      <span className="ml-2 text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                        Вы
                      </span>
                    )}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      profile.is_admin
                        ? "bg-purple-900/50 text-purple-300 border border-purple-800/30"
                        : profile.business_role === "none"
                        ? "bg-gray-700 text-gray-300"
                        : "bg-blue-900/50 text-blue-300 border border-blue-800/30"
                    }`}
                  >
                    {getFullRole(profile)}
                  </span>
                </div>

                <div className="text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    Участник с {formatDate(profile.created_at)}
                  </span>
                </div>

                <div className="text-xs text-gray-500">ID: {profile.id}</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Бейдж админа вместо переключателя */}
                {profile.is_admin && (
                  <div className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-lg border border-purple-800/30 text-sm">
                    Администратор
                  </div>
                )}
                {/* Переключатель админа (только для других пользователей) */}
                {profile.id !== currentUserId && (
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-400">
                      {profile.is_admin ? "Админ" : "Не админ"}
                    </span>
                    <button
                      onClick={() => {
                        const newAdminStatus = !profile.is_admin;
                        supabase
                          .from("profiles")
                          .update({ is_admin: newAdminStatus })
                          .eq("id", profile.id)
                          .then(() => {
                            setProfiles(
                              profiles.map((p) =>
                                p.id === profile.id
                                  ? { ...p, is_admin: newAdminStatus }
                                  : p
                              )
                            );
                          });
                      }}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none ${
                        profile.is_admin ? "bg-purple-600" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          profile.is_admin ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}
                {/* Выбор бизнес-роли */}
                <select
                  value={profile.business_role}
                  onChange={(e) =>
                    updateBusinessRole(
                      profile.id,
                      e.target.value as BusinessRole
                    )
                  }
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="none">Без роли</option>
                  <option value="product_manager">Product Manager</option>
                  <option value="tech_lead">Tech Lead</option>
                  <option value="developer">Developer</option>
                  <option value="qa_engineer">QA Engineer</option>
                  <option value="devops">DevOps</option>
                </select>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
