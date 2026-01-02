"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Task, Profile, TaskFile } from "@/lib/types";
import FilePreviewCard from "@/components/FilePreviewCard";
import {
  PaperClipIcon,
  UserCircleIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [assignee, setAssignee] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const loadTask = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      setCurrentUser(currentUserProfile);

      // Задача
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();
      setTask(taskData);

      // Автор и исполнитель
      if (taskData) {
        const { data: creatorProf } = await supabase
          .from("profiles")
          .select("id, full_name, business_role, is_admin, created_at")
          .eq("id", taskData.created_by)
          .single();
        setCreator(creatorProf);

        if (taskData.assigned_to) {
          const { data: assigneeProf } = await supabase
            .from("profiles")
            .select("id, full_name, business_role, is_admin, created_at")
            .eq("id", taskData.assigned_to)
            .single();
          setAssignee(assigneeProf);
        }
      }

      // Комментарии
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, author:author_id(full_name, business_role, is_admin)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      setComments(commentsData || []);

      // Файлы
      const { data: filesData } = await supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId);
      setFiles(filesData || []);

      setLoading(false);
    };

    loadTask();
  }, [taskId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (!error && task) {
      setTask({
        ...task,
        status: newStatus as "todo" | "in_progress" | "review" | "done",
      });
    }
    setUpdatingStatus(false);
  };

 // Функция транслитерации
const transliterate = (str: string): string => {
  const cyrillic = 'абвгдеёжзийклmnопрстуфхцчшщъыьэюя';
  const latin = 'abvgdeejzijklmnoprstufhzcss_y_eua';
  const map: Record<string, string> = {};

  for (let i = 0; i < cyrillic.length; i++) {
    map[cyrillic[i]] = latin[i];
    map[cyrillic[i].toUpperCase()] = latin[i].toUpperCase();
  }

  return str
    .replace(/[а-яё]/gi, (char) => map[char] || char)
    .replace(/[^a-z0-9.-]/gi, '_'); // Заменяем недопустимые символы
};

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !task) return;

  setUploading(true);

  // Транслитерируем имя файла
  const fileName = transliterate(file.name);
  const filePath = `tasks/${task.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('task-files')
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    alert("Ошибка загрузки: " + uploadError.message);
  } else {
    const { error: dbError } = await supabase.from("task_files").insert({
      task_id: task.id,
      file_path: filePath,
      file_name: file.name, // оригинальное имя сохраняем в БД
      file_type: file.type,
      uploaded_by: currentUser!.id,
    });

    if (!dbError) {
      // Обновляем файлы без перезагрузки
      const { data: newFiles } = await supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId);
      setFiles(newFiles || []);
    } else {
      console.error('Ошибка вставки в БД:', dbError);
      alert('Ошибка базы данных: ' + dbError.message);
    }
  }
  setUploading(false);
  e.target.value = ""; // Сбрасываем инпут
};
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    const { error } = await supabase.from("comments").insert({
      task_id: taskId,
      author_id: currentUser.id,
      content: newComment,
    });

    if (!error) {
      // Добавляем комментарий в список без перезагрузки
      const newCommentData = {
        id: Date.now().toString(), // временный id
        content: newComment,
        created_at: new Date().toISOString(),
        author: {
          full_name: currentUser.full_name,
          business_role: currentUser.business_role,
          is_admin: currentUser.is_admin,
        },
      };
      setComments((prev) => [...prev, newCommentData]);
      setNewComment("");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот комментарий?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (!error) {
        setComments((prev) =>
          prev.filter((comment) => comment.id !== commentId)
        );
      }
    } catch (error: any) {
      console.error("Ошибка удаления комментария:", error);
      alert("Не удалось удалить комментарий");
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return;

    try {
      // Удаляем комментарии
      const { error: commentsError } = await supabase
        .from("comments")
        .delete()
        .eq("task_id", taskId);

      if (commentsError) throw commentsError;

      // Удаляем файлы из Storage
      const { data: taskFiles } = await supabase
        .from("task_files")
        .select("file_path")
        .eq("task_id", taskId);

      if (taskFiles?.length) {
        const filePaths = taskFiles.map((f) => f.file_path);
        await supabase.storage.from("task-files").remove(filePaths);
      }

      // Удаляем записи из task_files
      await supabase.from("task_files").delete().eq("task_id", taskId);

      // Удаляем задачу
      const { error: taskError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (taskError) throw taskError;

      router.push(`/projects/${task?.project_id}`);
    } catch (error: any) {
      console.error("Ошибка:", error);
      alert("Ошибка: " + error.message);
    }
  };

  const handleEditTask = () => {
    router.push(`/task/edit/${taskId}`); // Перенаправляем на редактирование
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Заголовок */}
          <div className="mb-6">
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-full mb-1 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3 animate-pulse"></div>
          </div>

          {/* Инфо */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>

          {/* Файлы */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-5 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 bg-gray-700 rounded w-20"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
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

          {/* Комментарии */}
          <div>
            <div className="h-5 bg-gray-700 rounded w-24 mb-3 animate-pulse"></div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 border rounded animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!task) return null;

  // Проверяем права
  const isAssignee = currentUser?.id === task.assigned_to;
  const isCreator = currentUser?.id === task.created_by;
  const isAdmin = currentUser?.is_admin;

  // Кто может изменять статус
  const canChangeStatus = isAssignee || isCreator || isAdmin;

  // Кто может управлять задачей (редактировать/удалять)
  const canManageTask = isAdmin || isCreator;

  // Формат статуса на русском
  const statusLabels: Record<string, string> = {
    todo: "К выполнению",
    in_progress: "В работе",
    review: "На проверке",
    done: "Выполнено",
  };

  // Цвета приоритета
  const priorityColors: Record<string, string> = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  // Формат роли
  const formatRole = (role: string) => {
    if (role === "none") return "";
    return `(${role})`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Заголовок с кнопками управления */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
            <p className="text-gray-300 mt-1">{task.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-2">
                Приоритет:
                <span
                  className={`px-2 py-1 rounded-full text-xs text-white ${
                    priorityColors[task.priority]
                  }`}
                >
                  {task.priority === "low"
                    ? "Низкий"
                    : task.priority === "medium"
                    ? "Средний"
                    : task.priority === "high"
                    ? "Высокий"
                    : "Критический"}
                </span>
              </span>
              {task.tag && (
                <span className="px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                  {task.tag}
                </span>
              )}
              {task.github_branch_url && (
                <a
                  href={task.github_branch_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* Кнопки управления задачей */}
          {canManageTask && (
            <div className="flex gap-2">
              <button
                onClick={handleEditTask}
                className="flex items-center px-3 py-1 rounded-full text-gray-300 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-2 " />
                Редактировать
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex items-center px-3 py-1 rounded-full text-gray-300 border border-gray-700 cursor-pointer hover:bg-red-900/30 hover:border-red-800/50 hover:text-red-300 transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-2 " />
                Удалить
              </button>
            </div>
          )}
        </div>

        {/* Инфо */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 mb-1">Автор</div>
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-gray-400" />
              <span className="text-white">
                {creator?.full_name}
                {creator?.business_role !== "none" && (
                  <span className="text-gray-400 ml-1">
                    {formatRole(creator?.business_role || "")}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 mb-1">Исполнитель</div>
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-gray-400" />
              {assignee ? (
                <span className="text-white">
                  {assignee.full_name}
                  {assignee.business_role !== "none" && (
                    <span className="text-gray-400 ml-1">
                      {formatRole(assignee.business_role)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400">Не назначен</span>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-gray-400 mb-1">Статус</div>
            <div className="text-white font-medium">
              {statusLabels[task.status]}
            </div>
          </div>
        </div>

        {/* Управление статусом */}
        {canChangeStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6"
          >
            <div className="flex flex-wrap gap-2">
              {/* Исполнитель может взять в работу */}
              {task.status === "todo" && isAssignee && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={updatingStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? "Обновление..." : "Взять в работу"}
                </button>
              )}

              {/* Исполнитель может отправить на проверку */}
              {task.status === "in_progress" && isAssignee && (
                <button
                  onClick={() => handleStatusChange("review")}
                  disabled={updatingStatus}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? "Обновление..." : "Отправить на проверку"}
                </button>
              )}

              {/* Создатель или админ могут принять или отправить на доработку */}
              {task.status === "review" && (isCreator || isAdmin) && (
                <>
                  <button
                    onClick={() => handleStatusChange("done")}
                    disabled={updatingStatus}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {updatingStatus ? "Обновление..." : "Принять"}
                  </button>
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={updatingStatus}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {updatingStatus ? "Обновление..." : "На доработку"}
                  </button>
                </>
              )}
              {task.status === "done" && isAdmin && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={updatingStatus}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? "Обновление..." : "На доработку"}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Файлы */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <PaperClipIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Файлы</h2>
            <label className="ml-auto bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg cursor-pointer text-sm text-white transition-colors disabled:opacity-50">
              {uploading ? "Загрузка..." : "Загрузить"}
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          {files.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-xl">
              <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">Нет файлов</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {files.map((file) => (
                <FilePreviewCard key={file.id} file={file} />
              ))}
            </div>
          )}
        </div>

        {/* Комментарии */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Комментарии</h2>
          <div className="space-y-4 mb-4">
            <AnimatePresence>
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border border-gray-700 rounded-lg bg-gray-800 relative"
                >
                  {/* Кнопка удаления комментария */}
                  {(currentUser?.id === comment.author_id ||
                    currentUser?.is_admin) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                      aria-label="Удалить комментарий"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                    <div className="font-medium text-white">
                      {comment.author.full_name}
                      {comment.author.business_role !== "none" && (
                        <span className="text-gray-400 text-sm ml-1">
                          {formatRole(comment.author.business_role)}
                        </span>
                      )}
                    </div>
                    {comment.author.is_admin && (
                      <span className="ml-2 px-2 py-1 bg-blue-600 text-xs text-white rounded-full">
                        Админ
                      </span>
                    )}
                  </div>
                  <div className="text-gray-300">{comment.content}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(comment.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ваш комментарий..."
              className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Отправить
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
