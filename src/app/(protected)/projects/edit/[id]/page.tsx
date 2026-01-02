"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Profile, Project } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function EditProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customer, setCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"planned" | "in_progress" | "completed">(
    "planned"
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      // Проверяем, админ ли текущий пользователь
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user!.id)
        .single();

      if (!profile?.is_admin) {
        alert("Доступ запрещён");
        router.push("/projects");
        return;
      }
      setIsAdmin(true);

      // Загружаем проект
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!project) {
        router.push("/projects");
        return;
      }

      // Устанавливаем значения формы
      setName(project.name);
      setDescription(project.description || "");
      setCustomer(project.customer || "");
      setStartDate(project.start_date || "");
      setEndDate(project.end_date || "");
      setStatus(project.status as any);

      // Загружаем текущих участников
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id");
      const memberIds = (members || []).map((m) => m.user_id);
      setSelectedMembers(memberIds);

      // Загружаем всех пользователей
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, business_role, is_admin, created_at");
      setAllUsers(users || []);
      setFilteredUsers(users || []);

      setLoadingUsers(false);
      setLoading(false);
    };

    loadData();
  }, [projectId, router]);

  // Фильтрация пользователей
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(term) ||
          user.business_role?.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Обновляем проект
    const { error: projectError } = await supabase
      .from("projects")
      .update({
        name,
        description,
        customer,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
      })
      .eq("id", projectId);

    if (projectError) {
      alert("Ошибка обновления проекта: " + projectError.message);
      setLoading(false);
      return;
    }

    // Обновляем участников: удаляем всех и добавляем заново
    // Получи текущих участников
    const { data: currentMembers } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);

    const currentIds = new Set(currentMembers?.map((m) => m.user_id));
    const newIds = new Set(selectedMembers);

    // Удаляем тех, кто вышел
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));
    if (toRemove.length) {
      await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .in("user_id", toRemove);
    }

    // Добавляем новых
    const toAdd = [...newIds].filter((id) => !currentIds.has(id));
    if (toAdd.length) {
      const addData = toAdd.map((user_id) => ({
        project_id: projectId,
        user_id,
      }));
      await supabase.from("project_members").insert(addData);
    }

    router.push(`/projects/${projectId}`);
  };

  if (loadingUsers) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Заголовок */}
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6 animate-pulse"></div>

          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          </div>

          {/* Описание */}
          <div className="h-32 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>

          {/* Участники */}
          <div className="space-y-4">
            <div className="h-10 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-800 rounded-lg border border-gray-700 animate-pulse"
                ></div>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-blue-600 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-gray-600 rounded-lg animate-pulse w-24"></div>
          </div>
        </motion.div>
      </div>
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Редактировать проект
        </h1>
        <p className="text-gray-400">Измените параметры проекта и участников</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Введите название проекта"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Заказчик
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Имя или компания заказчика"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="planned">Запланирован</option>
                <option value="in_progress">В работе</option>
                <option value="completed">Завершён</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Дата начала
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Дата окончания
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              rows={4}
              placeholder="Опишите проект подробнее..."
            />
          </div>

          {/* Участники */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Участники проекта
            </label>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Поиск по имени или роли..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="border border-gray-600 rounded-lg max-h-60 overflow-y-auto p-3 bg-gray-700/30">
              <AnimatePresence>
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center py-2 hover:bg-gray-700/50 px-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`edit-user-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor={`edit-user-${user.id}`}
                      className="flex-1 ml-3 flex items-center gap-2"
                    >
                      <span className="text-white font-medium">
                        {user.full_name}
                      </span>
                      <span className="text-gray-400 text-sm">
                        ({user.is_admin ? "Админ" : user.business_role})
                      </span>
                    </label>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {selectedMembers.length > 0 && (
              <div className="mt-3 text-sm text-gray-400">
                Выбрано: {selectedMembers.length} участников
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Сохранение...
              </div>
            ) : (
              "Сохранить изменения"
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Отмена
          </button>
        </div>
      </motion.form>
    </div>
  );
}
