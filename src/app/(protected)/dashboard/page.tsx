'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Project, Profile, Task } from "@/lib/types";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [waitingTasks, setWaitingTasks] = useState<Task[]>([]); // Задачи на утверждении
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setMounted(false);

      // Получаем текущего пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setMounted(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setUser(profile);

      // Получаем проекты, где пользователь участник
      const { data: members } = await supabase
        .from("project_members")
        .select("project_id");

      if (!members?.length) {
        setLoading(false);
        setMounted(true);
        return;
      }

      const projectIds = members.map((m) => m.project_id);
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
      setProjects(projectsData || []);

      // Получаем задачи, где пользователь исполнитель
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projectIds)
        .eq("assigned_to", user.id);
      setTasks(tasksData || []);

      // Получаем задачи на утверждении (status = 'review')
      if (profile?.is_admin) {
        // Админ видит ВСЕ задачи на утверждении
        const { data: waitingData } = await supabase
          .from("tasks")
          .select("*")
          .eq("status", "review");
        setWaitingTasks(waitingData || []);
      } else {
        // Обычный пользователь видит только задачи, которые он отправил на утверждение (создатель)
        const { data: waitingData } = await supabase
          .from("tasks")
          .select("*")
          .eq("status", "review")
          .eq("created_by", user.id); // ✅ Только задачи, которые он создал
        setWaitingTasks(waitingData || []);
      }

      setTimeout(() => {
        setLoading(false);
        setTimeout(() => {
          setMounted(true);
        }, 50);
      }, 300);
    };

    fetchDashboard();
  }, []);

  // Статистика по задачам текущего пользователя
  const planned = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const waiting = tasks.filter((t) => t.status === "review").length;

  // Анимация для заглушек (stagger только один раз)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Показываем только первые 3 проекта, если больше
  const displayedProjects = showAllProjects ? projects : projects.slice(0, 3);
  const hasMoreProjects = projects.length > 3;

  // Показываем только первые 3 задачи, если больше
  const displayedTasks = showAllTasks ? tasks : tasks.slice(0, 3);
  const hasMoreTasks = tasks.length > 3;

  return (
    <div className="p-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-2xl font-bold mb-6 text-white"
      >
        Панель управления
      </motion.h1>

      {/* Статистика задач */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton-stats"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            {[1, 2, 3].map((index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-800 p-4 rounded-lg animate-pulse border border-gray-700"
              >
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/4"></div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="real-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-800/30">
              <h3 className="font-semibold text-blue-200">К выполнению</h3>
              <p className="text-3xl font-bold text-white mt-2">{planned}</p>
            </div>
            <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-800/30">
              <h3 className="font-semibold text-yellow-200">В работе</h3>
              <p className="text-3xl font-bold text-white mt-2">{inProgress}</p>
            </div>
            <div className="bg-green-900/30 p-4 rounded-lg border border-green-800/30">
              <h3 className="font-semibold text-green-200">Выполнено</h3>
              <p className="text-3xl font-bold text-white mt-2">{completed}</p>
            </div>
            {/* <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-800/30">
              <h3 className="font-semibold text-purple-200">На утверждении</h3>
              <p className="text-3xl font-bold text-white mt-2">{waiting}</p>
            </div> */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Проекты */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Ваши проекты</h2>
          {!loading && projects.length > 0 && (
            <span className="text-sm text-gray-400">
              {projects.length} проектов
            </span>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton-projects"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1, 2, 3].map((index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="border border-gray-700 p-5 rounded-xl bg-gray-800 flex flex-col animate-pulse"
              >
                <div className="h-5 bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
                <div className="h-6 bg-gray-700 rounded w-1/3 mt-auto"></div>
              </motion.div>
            ))}
          </motion.div>
        ) : projects.length > 0 ? (
          <motion.div
            key="real-projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Link href={`/projects/${project.id}`} className="block h-full">
                    <div className="border border-gray-700 p-5 rounded-xl bg-gray-800 hover:bg-gray-700/50 transition-all duration-200 flex flex-col h-full">
                      <h3 className="font-bold text-white text-lg mb-2">
                        {project.name}
                      </h3>
                      <p className="text-gray-300 text-sm mb-4 flex-grow">
                        {project.description || "Без описания"}
                      </p>
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              project.status === "planned"
                                ? "bg-gray-700 text-gray-300"
                                : project.status === "in_progress"
                                ? "bg-yellow-900/50 text-yellow-300"
                                : "bg-green-900/50 text-green-300"
                            }`}
                          >
                            {project.status === "planned"
                              ? "Запланирован"
                              : project.status === "in_progress"
                              ? "В работе"
                              : "Завершён"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {project.customer}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Кнопка "Показать все проекты" или "Перейти к проектам" */}
            {hasMoreProjects && !showAllProjects && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <button
                  onClick={() => setShowAllProjects(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Показать все {projects.length} проектов
                </button>
              </motion.div>
            )}

            {hasMoreProjects && showAllProjects && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <Link
                  href="/projects"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors inline-block"
                >
                  Перейти к проектам
                </Link>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="no-projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                У вас пока нет проектов
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Создайте первый проект, чтобы начать работу
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Задачи */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Ваши задачи</h2>
          {!loading && tasks.length > 0 && (
            <span className="text-sm text-gray-400">
              {tasks.length} задач
            </span>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton-tasks"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {[1, 2, 3, 4].map((index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
              >
                <div className="flex items-start">
                  <div className="h-5 w-5 bg-gray-700 rounded mr-3 mt-0.5"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="flex items-center">
                      <div className="h-3 bg-gray-700 rounded w-1/4 mr-4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/5"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-700 rounded w-16"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="real-tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {tasks.length > 0 ? (
              <>
                {displayedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                      <Link href={`/task/${task.id}`} className="block">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-colors duration-200">
                          <div className="flex items-start">
                            <div className={`h-5 w-5 rounded-full mr-3 mt-0.5 flex items-center justify-center ${
                              task.status === 'done' ? 'bg-green-900/30' : 
                              task.status === 'in_progress' ? 'bg-yellow-900/30' : 
                              task.status === 'review' ? 'bg-purple-900/30' : 'bg-gray-700'
                            }`}>
                              <div className={`h-2 w-2 rounded-full ${
                                task.status === 'done' ? 'bg-green-400' : 
                                task.status === 'in_progress' ? 'bg-yellow-400' : 
                                task.status === 'review' ? 'bg-purple-400' : 'bg-gray-400'
                              }`}></div>
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-medium text-white mb-1">
                                {task.title}
                              </h4>
                              <div className="flex items-center text-sm text-gray-300">
                                <span className="mr-4">
                                  {projects.find((p) => p.id === task.project_id)?.name ||
                                    "Без проекта"}
                                </span>
                                <span>
                                  {task.status === 'done' ? 'Завершена' : 
                                   task.status === 'in_progress' ? 'В работе' : 
                                   task.status === 'review' ? 'На утверждении' : 'В ожидании'}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-medium text-gray-300 px-2 py-1 bg-gray-700 rounded">
                              Приоритет: {task.priority || "Средний"}
                            </span>
                          </div>
                        </div>
                      </Link>
                  </motion.div>
                ))}
                
                {/* Кнопка "Показать все задачи" */}
                {hasMoreTasks && !showAllTasks && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <button
                      onClick={() => setShowAllTasks(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      Показать все {tasks.length} задач
                    </button>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">У вас пока нет назначенных задач</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Новые задачи появятся здесь, когда вам их назначат
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>



       {/* Задачи на утверждении */}
       {user?.is_admin ? 
       (
        <>
       <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4 mt-10"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Задачи на утверждении</h2>
          {!loading && waitingTasks.length > 0 && (
            <span className="text-sm text-gray-400">
              {waitingTasks.length} задач
            </span>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton-waiting"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 mb-8"
          >
            {[1, 2].map((index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
              >
                <div className="flex items-start">
                  <div className="h-5 w-5 bg-gray-700 rounded mr-3 mt-0.5"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="flex items-center">
                      <div className="h-3 bg-gray-700 rounded w-1/4 mr-4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/5"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-700 rounded w-16"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="real-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 mb-8"
          >
            {waitingTasks.length > 0 ? (
              waitingTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Link href={`/task/${task.id}`} className="block">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-colors duration-200">
                      <div className="flex items-start">
                        <div className="h-5 w-5 rounded-full mr-3 mt-0.5 flex items-center justify-center bg-purple-900/30">
                          <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium text-white mb-1">
                            {task.title}
                          </h4>
                          <div className="flex items-center text-sm text-gray-300">
                            <span className="mr-4">
                              {projects.find((p) => p.id === task.project_id)?.name ||
                                "Без проекта"}
                            </span>
                            <span className="text-purple-400">На утверждении</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-300 px-2 py-1 bg-gray-700 rounded">
                          {user?.is_admin ? "Для утверждения" : "Ожидает"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">
                    {user?.is_admin 
                      ? "Нет задач на утверждении" 
                      : "У вас нет задач на утверждении"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {user?.is_admin 
                      ? "Все задачи утверждены или ожидают доработки" 
                      : "Все ваши задачи утверждены или ожидают доработки"}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </>
    ) : ''}
      
    </div>
  );
}