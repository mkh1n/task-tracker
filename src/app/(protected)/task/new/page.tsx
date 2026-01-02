"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Project, TaskFile, Task } from "@/lib/types";

import FilePreviewCard from "@/components/FilePreviewCard";

export default function NewTaskPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "critical"
  >("medium");
  const [tagInput, setTagInput] = useState(""); // Ввод тега
  const [tags, setTags] = useState<string[]>([]); // Массив тегов
  const [githubBranchUrl, setGithubBranchUrl] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!projectId) return router.push("/projects");

    const loadMembers = async () => {
      setLoadingMembers(true);
      const { data: memberIds } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId);

      if (memberIds?.length) {
        const ids = memberIds.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, business_role, is_admin, created_at")
          .in("id", ids);
        setMembers(profilesData || []);
      }
      setLoadingMembers(false);
    };

    loadMembers();
  }, [projectId, router]);

  // Обработка ввода тегов
  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title,
      description,
      priority,
      tag: tags.join(",") || null, // Сохраняем теги как строку
      github_branch_url: githubBranchUrl || null,
      assigned_to: assignedTo || null,
      created_by: user!.id,
    });

    if (error) {
      alert("Ошибка: " + error.message);
    } else {
      router.push(`/projects/${projectId}`);
    }
    setLoading(false);
  };

  if (!projectId) return null;

  // Цвета приоритета
  const priorityColors: Record<string, string> = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Новая задача</h1>
        <p className="text-gray-400">Создайте новую задачу для проекта</p>
      </motion.div>

      {loadingMembers ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="h-12 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          <div className="h-32 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-14 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="h-14 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          </div>
          <div className="h-14 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          <div className="h-14 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
        </motion.div>
      ) : (
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Введите название задачи"
                required
              />
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
                placeholder="Опишите задачу подробнее..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Приоритет
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className={`w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none`}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критический</option>
                  </select>
                  {/* Цветная полоска приоритета */}
                  <div
                    className={`absolute top-0 left-0 h-1 w-full ${priorityColors[priority]} rounded-t-lg`}
                  ></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Теги
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={handleTagInput}
                    onKeyPress={handleTagKeyPress}
                    onBlur={addTag}
                    placeholder="Баг, фича, рефактор..."
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  {/* Кнопка добавления тега */}
                  <button
                    type="button"
                    onClick={addTag}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-400 hover:bg-blue-700 text-white px-3 py-1 rounded text-md"
                  >
                    +
                  </button>
                </div>

                {/* Отображение тегов */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <AnimatePresence>
                    {tags.map((tag) => (
                      <motion.span
                        key={tag}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => removeTag(tag)}
                        className={`px-3 py-1 bg-gray-800 rounded-full text-gray-300 border border-gray-700`}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ветка GitHub
              </label>
              <input
                type="url"
                value={githubBranchUrl}
                onChange={(e) => setGithubBranchUrl(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="https://github.com/username/repo/branches/..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Файлы
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-gray-400">
                    Нажмите для загрузки файлов или перетащите сюда
                  </span>
                  <span className="text-sm text-gray-500">
                    Поддерживаются все форматы
                  </span>
                </label>
              </div>

              {/* Отображение выбранных файлов через FilePreviewCard */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedFiles.map((file, index) => {
                    // Создаём временный объект для FilePreviewCard
                    const tempFile = {
                      id: `temp-${index}`,
                      task_id: "",
                      file_path: URL.createObjectURL(file),
                      file_name: file.name,
                      file_type: file.type,
                      uploaded_by: "",
                      uploaded_at: new Date().toISOString(),
                    };

                    return (
                      <div key={index} className="relative">
                        <FilePreviewCard file={tempFile} />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 z-10"
                          aria-label="Удалить файл"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Назначить
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Не назначать</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}{" "}
                    {member.business_role !== "none"
                      ? `(${member.business_role})`
                      : ""}
                  </option>
                ))}
              </select>
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
                  Создание...
                </div>
              ) : (
                "Создать задачу"
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
      )}
    </div>
  );
}
