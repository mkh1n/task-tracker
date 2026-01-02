"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Project, Task, Profile } from "@/lib/types";
import Link from "next/link";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "@/components/LoaderSpinner";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ is_admin: boolean } | null>(
    null
  );
  const [canManageProject, setCanManageProject] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Загружаем проект
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!proj) {
        router.push("/projects");
        return;
      }

      // Загружаем роль пользователя
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_role, is_admin")
        .eq("id", user!.id)
        .single();
      setUserRole(profile?.business_role);

      if (proj && profile) {
        setCanManageProject(profile.is_admin || proj.created_by === user!.id);
      }
      // Загружаем участников
      const { data: memberIds } = await supabase
        .from("project_members")
        .select("user_id");
      if (memberIds?.length) {
        const ids = memberIds.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, business_role, is_admin, created_at")
          .in("id", ids);
        setMembers(profilesData || []);
      }

      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user!.id)
        .single();
      setCurrentUser(currentUserProfile);

      // Загружаем задачи
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setTasks(tasksData || []);

      setProject(proj);

      setTimeout(() => {
        setLoading(false);
      }, 300);
    };

    loadProject();
  }, [projectId, router]);

  const handleAddMember = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId });
    if (!error) window.location.reload();
  };

  const handleEditProject = () => {
    router.push(`/projects/edit/${projectId}`);
  };

  const handleDeleteProject = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот проект?")) return;

    try {
      // Удаляем задачи проекта
      await supabase.from("tasks").delete().eq("project_id", projectId);

      // Удаляем участников
      await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId);

      // Удаляем файлы из Storage
      const { data: taskFiles } = await supabase
        .from("task_files")
        .select("file_path")
        .eq("project_id", projectId);

      if (taskFiles?.length) {
        const filePaths = taskFiles.map((f) => f.file_path);
        await supabase.storage.from("task-files").remove(filePaths);
      }

      // Удаляем записи из task_files
      await supabase.from("task_files").delete().eq("project_id", projectId);

      // Удаляем сам проект
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      router.push("/projects");
    } catch (error) {
      console.error("Ошибка удаления проекта:", error);
      alert("Не удалось удалить проект");
    }
  };

  // Анимация для заглушек
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
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton-page"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Заглушка заголовка проекта */}
            <div className="mb-6">
              <div className="h-9 bg-gray-800 rounded w-3/4 mb-3 animate-pulse"></div>
              <div className="h-5 bg-gray-800 rounded w-full mb-2 animate-pulse"></div>
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-4 animate-pulse"></div>
              <div className="flex gap-4 mt-2">
                <div className="h-6 bg-gray-800 rounded w-32 animate-pulse"></div>
                <div className="h-6 bg-gray-800 rounded w-40 animate-pulse"></div>
              </div>
            </div>

            {/* Заглушка участников */}
            <div className="mb-8">
              <div className="h-7 bg-gray-800 rounded w-40 mb-4 animate-pulse"></div>
              <div className="flex flex-wrap gap-3 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 bg-gray-800 rounded-full w-32 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            {/* Заглушка задач */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="h-7 bg-gray-800 rounded w-32 animate-pulse"></div>
                <div className="h-8 bg-gray-800 rounded w-28 animate-pulse"></div>
              </div>

              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-700 rounded-lg p-4 bg-gray-800 animate-pulse"
                  >
                    <div className="flex justify-between mb-3">
                      <div className="h-5 bg-gray-700 rounded w-1/2"></div>
                      <div className="h-6 bg-gray-700 rounded w-20"></div>
                    </div>
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-700 rounded w-32"></div>
                      <div className="h-4 bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="real-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Заголовок проекта */}
            <div className="mb-8">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-3xl font-bold text-white mb-3"
              >
                {project!.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-gray-300 text-lg mb-4"
              >
                {project!.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex flex-wrap gap-4 mt-3 text-sm"
              >
                <span className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 border border-gray-700">
                  Статус:{" "}
                  <span className="font-medium">
                    {project!.status === "planned"
                      ? "Запланирован"
                      : project!.status === "in_progress"
                      ? "В работе"
                      : "Завершён"}
                  </span>
                </span>
                {project!.customer && (
                  <span className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 border border-gray-700">
                    Заказчик: {project!.customer}
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 border border-gray-700">
                  Задачи: {tasks.length}
                </span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 border border-gray-700">
                  Участники: {members.length}
                </span>
              </motion.div>
              {canManageProject && ( // ✅ Админ или создатель
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="flex gap-2 mt-3"
                >
                  <button
                    onClick={handleEditProject}
                    className="flex items-center px-3 py-1 rounded-full text-gray-300 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Редактировать
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="flex items-center px-3 py-1 rounded-full text-gray-300 border border-gray-700 cursor-pointer hover:bg-red-900/30 hover:border-red-800/50 hover:text-red-300 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Удалить
                  </button>
                </motion.div>
              )}
            </div>

            {/* Участники */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-10"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Участники проекта
              </h2>
              <div className="flex flex-wrap gap-3 mb-6">
                {members.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-sm text-gray-400">
                      {member.business_role}
                      {member.is_admin && " • Администратор"}
                    </div>
                  </motion.div>
                ))}
              </div>

              {userRole === "admin" && (
                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="font-medium text-white mb-3">
                    Добавить участника
                  </h3>
                  <div className="flex gap-2">
                    <select className="bg-gray-800 border border-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="">Выберите сотрудника</option>
                      {/* Здесь можно загрузить всех, кроме текущих */}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById(
                          "newMember"
                        ) as HTMLSelectElement;
                        if (select?.value) handleAddMember(select.value);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Задачи */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Задачи проекта
                </h2>
                <Link
                  href={`/task/new?project=${projectId}`}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4" />
                  Новая задача
                </Link>
              </div>

              {tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center"
                >
                  <p className="text-gray-400 text-lg mb-2">
                    В проекте пока нет задач
                  </p>
                  <p className="text-gray-500">
                    Создайте первую задачу, чтобы начать работу
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Link href={`/task/${task.id}`} className="block">
                        <div className="border border-gray-700 rounded-lg p-5 bg-gray-800 hover:bg-gray-700/50 transition-all duration-200">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-medium text-white text-lg">
                              {task.title}
                            </h3>
                            <span
                              className={`text-xs font-medium px-3 py-1 rounded-full ${
                                task.priority === "critical"
                                  ? "bg-red-900/30 text-red-300 border border-red-800/30"
                                  : task.priority === "high"
                                  ? "bg-orange-900/30 text-orange-300 border border-orange-800/30"
                                  : task.priority === "medium"
                                  ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800/30"
                                  : "bg-gray-700 text-gray-300 border border-gray-600"
                              }`}
                            >
                              {task.priority === "critical"
                                ? "Критический"
                                : task.priority === "high"
                                ? "Высокий"
                                : task.priority === "medium"
                                ? "Средний"
                                : "Низкий"}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-4">
                            {task.description || "Без описания"}
                          </p>
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-4">
                              <span className="text-gray-400">
                                Статус:{" "}
                                <span
                                  className={`font-medium ${
                                    task.status === "done"
                                      ? "text-green-400"
                                      : task.status === "in_progress"
                                      ? "text-yellow-400"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {task.status === "done"
                                    ? "Завершена"
                                    : task.status === "in_progress"
                                    ? "В работе"
                                    : "В ожидании"}
                                </span>
                              </span>
                              {task.tag && (
                                <span className="text-gray-400">
                                  Тег:{" "}
                                  <span className="font-medium text-blue-400">
                                    {task.tag}
                                  </span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(task.created_at).toLocaleDateString(
                                "ru-RU"
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
