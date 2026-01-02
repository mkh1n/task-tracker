"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Project, TaskFile, Task } from "@/lib/types";
import FilePreviewCard from "@/components/FilePreviewCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  DocumentIcon,
  FolderIcon,
  XMarkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function FilesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedProjectData, setSelectedProjectData] =
    useState<Project | null>(null);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTaskForUpload, setSelectedTaskForUpload] =
    useState<string>("");
  const [selectedFileTask, setSelectedFileTask] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
  const loadProjects = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: members } = await supabase
      .from("project_members")
      .select("project_id");

    if (!members?.length) {
      setLoading(false);
      setProjects([]);
      return;
    }

    const ids = members.map((m) => m.project_id);
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .in("id", ids)
      .order("name");

    setProjects(projectsData || []);

    // Добавь проверку
    if (projectsData && projectsData.length > 0) {
      loadProjectData(projectsData[0].id);
    }

    setLoading(false);
  };

  loadProjects();
}, []);
  const handleFileDeleted = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedFileTask((prev) => {
      const newState = { ...prev };
      delete newState[fileId];
      return newState;
    });
  };
  const loadProjectData = async (projectId: string) => {
    setSelectedProject(projectId);
    const project = projects.find((p) => p.id === projectId);
    setSelectedProjectData(project || null);

    // Загружаем задачи проекта
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setTasks(tasksData || []);

    // Загружаем все файлы проекта
    const { data: filesData } = await supabase
      .from("task_files")
      .select("*")
      .in("task_id", tasksData?.map((t) => t.id) || [])
      .order("uploaded_at", { ascending: false });

    setFiles(filesData || []);

    // Загружаем связи файлов с задачами
    const taskMap: { [key: string]: string } = {};
    for (const file of filesData || []) {
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", file.task_id)
        .single();
      taskMap[file.id] = task?.title || "Задача";
    }
    setSelectedFileTask(taskMap);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      !selectedProject ||
      !event.target.files?.length ||
      !selectedTaskForUpload
    ) {
      alert("Сначала выберите задачу");
      return;
    }

    const file = event.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}.${fileExt}`;
      const filePath = `${selectedProject}/${selectedTaskForUpload}/${fileName}`;

      // Загрузка в Storage
      const { error: uploadError } = await supabase.storage
        .from("task-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Получаем пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      // Вставка в БД
      const { error: dbError } = await supabase.from("task_files").insert({
        task_id: selectedTaskForUpload,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      // Получаем задачу для нового файла
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", selectedTaskForUpload)
        .single();

      // Обновляем список файлов
      const { data: newFiles } = await supabase
        .from("task_files")
        .select("*")
        .in(
          "task_id",
          tasks.map((t) => t.id)
        )
        .order("uploaded_at", { ascending: false });

      setFiles(newFiles || []);

      // Обновляем связи для ВСЕХ файлов
      const taskMap: { [key: string]: string } = {};
      for (const file of newFiles || []) {
        const { data: fileTask } = await supabase
          .from("tasks")
          .select("title")
          .eq("id", file.task_id)
          .single();
        taskMap[file.id] = fileTask?.title || "Задача";
      }
      setSelectedFileTask(taskMap);

      setShowUploadModal(false);
      setSelectedTaskForUpload("");
    } catch (error: any) {
      console.error("Ошибка загрузки файла:", error);
      alert(`Ошибка: ${error.message || "Не удалось загрузить файл"}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
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
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Файлы проектов</h1>
          <p className="text-gray-400">
            Управление файлами и документами в проектах
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Заглушка проектов */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Выберите проект
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border border-gray-700 p-5 rounded-xl bg-gray-800 animate-pulse"
                >
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Заглушка файлов */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Загрузка файлов
                </h2>
                <p className="text-gray-400">
                  Выберите проект и задачу для загрузки файлов
                </p>
              </div>
              <div className="h-10 bg-gray-700 rounded-lg w-32 animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="border border-gray-700 rounded-xl p-4 bg-gray-800 animate-pulse"
                >
                  <div className="h-8 w-8 bg-gray-700 rounded mb-2 mx-auto"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-6">📁</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            У вас пока нет проектов
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Создайте первый проект и задачу, чтобы начать загружать файлы
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => (window.location.href = "/projects/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Создать проект
            </button>
            <button
              onClick={() => (window.location.href = "/projects")}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Просмотреть проекты
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Файлы проектов</h1>
        <p className="text-gray-400">
          Управление файлами и документами в проектах
        </p>
      </motion.div>

      {/* Список проектов */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Выберите проект
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadProjectData(project.id)}
              className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                selectedProject === project.id
                  ? "bg-gray-700/50 border-blue-500 ring-1 ring-blue-500/50"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-700/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <FolderIcon
                  className={`h-5 w-5 ${
                    selectedProject === project.id
                      ? "text-blue-400"
                      : "text-gray-400"
                  }`}
                />
                <h3 className="font-bold text-white">{project.name}</h3>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                {project.description || "Без описания"}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {selectedProject && selectedProjectData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {selectedProjectData.name} - Все файлы
              </h2>
              <p className="text-gray-400">{selectedProjectData.description}</p>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Загрузить файл</span>
            </button>
          </div>

          {/* Статистика */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <DocumentIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">
                Файлов:{" "}
                <span className="font-semibold text-white">{files.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">•</span>
              <span className="text-gray-300">
                Задач:{" "}
                <span className="font-semibold text-white">{tasks.length}</span>
              </span>
            </div>
          </div>

          {/* Список файлов */}
          {files.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                В проекте пока нет файлов
              </h3>
              <p className="text-gray-400 mb-6">
                Загрузите первый файл, чтобы начать работу
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              key={files.length}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {files.map((file, index) => (
                <motion.div
                  key={file.id}
                  variants={itemVariants}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  <FilePreviewCard file={file} onDelete={handleFileDeleted} />
                  {/* Ссылка на задачу при наведении */}
                  {selectedFileTask[file.id] && (
                    <a
                      href={`/task/${file.task_id}`}
                      className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseEnter={(e) => {
                        const tooltip = document.createElement("div");
                        tooltip.className =
                          "absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10";
                        tooltip.textContent =
                          selectedFileTask[file.id] || "Задача";
                        tooltip.style.minWidth = "max-content";
                        tooltip.id = "task-tooltip-" + file.id;
                        e.currentTarget.appendChild(tooltip);
                      }}
                      onMouseLeave={(e) => {
                        const tooltip = e.currentTarget.querySelector(
                          "#task-tooltip-" + file.id
                        );
                        if (tooltip) e.currentTarget.removeChild(tooltip);
                      }}
                    >
                      <div className="flex items-center min-w-0 max-w-[110px]">
                        <span className="truncate flex-1">
                          {selectedFileTask[file.id] || "Задача"}
                        </span>
                        <ArrowRightIcon className="h-3 w-3 flex-shrink-0 ml-1" />
                      </div>
                    </a>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Модальное окно загрузки */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Загрузить файл</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Выберите задачу
                </label>
                <select
                  value={selectedTaskForUpload}
                  onChange={(e) => setSelectedTaskForUpload(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Выберите задачу</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={!selectedTaskForUpload || uploading}
                  className="hidden"
                />
                <div
                  className={`w-full text-center py-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTaskForUpload && !uploading
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {uploading ? "Загрузка..." : "Выберите файл"}
                </div>
              </label>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
