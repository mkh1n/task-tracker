'use client';

import { TaskFile } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import {
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  ArchiveBoxIcon,
  LinkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

export default function FilePreviewCard({ file,    onDelete  }: { file: TaskFile, onDelete?: (id: string) => void; }) {
  const [fileSize, setFileSize] = useState<string>("");
  const [canDelete, setCanDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Получаем информацию о файле
    const getFileInfo = async () => {
      const { data: fileData } = await supabase.storage
        .from("task-files")
        .list(file.file_path.split("/").slice(0, -1).join("/"), {
          search: file.file_path.split("/").pop(),
        });

      if (fileData && fileData[0]) {
        const size = fileData[0].metadata?.size || 0;
        setFileSize(formatFileSize(size));
      }
    };

    getFileInfo();

    // Проверяем, может ли пользователь удалить
    checkDeletePermission();
  }, [file.file_path, file.uploaded_by]);

  const checkDeletePermission = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Проверяем, админ ли пользователь
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    setCanDelete(profile?.is_admin || file.uploaded_by === user.id);
  };

  const handleDelete = async () => {
  if (!confirm("Вы уверены, что хотите удалить этот файл?")) return;

  setDeleting(true);

  try {
    // Удаляем из Storage
    const { error: storageError } = await supabase.storage
      .from("task-files")
      .remove([file.file_path]);

    if (storageError) throw storageError;

    // Удаляем из базы
    const { error: dbError } = await supabase
      .from("task_files")
      .delete()
      .eq("id", file.id);

    if (dbError) throw dbError;

    // Удаляем элемент из DOM (временно, до обновления родителя)
    const cardElement = document.getElementById(`file-card-${file.id}`);
    if (cardElement) {
      cardElement.remove();
    }

    // Уведомляем родителя об удалении
    if (onDelete) onDelete(file.id);
  } catch (error) {
    console.error("Ошибка удаления файла:", error);
    alert("Не удалось удалить файл");
  } finally {
    setDeleting(false);
  }
};

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getFileIcon = () => {
    if (file.file_type.startsWith("image/")) {
      return <PhotoIcon className="h-8 w-8 text-blue-400" />;
    } else if (file.file_type.includes("pdf")) {
      return <DocumentTextIcon className="h-8 w-8 text-red-400" />;
    } else if (
      file.file_type.includes("presentation") ||
      file.file_type.includes("powerpoint")
    ) {
      return <PresentationChartBarIcon className="h-8 w-8 text-orange-400" />;
    } else if (
      file.file_type.includes("spreadsheet") ||
      file.file_type.includes("excel")
    ) {
      return <TableCellsIcon className="h-8 w-8 text-green-400" />;
    } else if (
      file.file_type.includes("zip") ||
      file.file_type.includes("rar") ||
      file.file_type.includes("tar")
    ) {
      return <ArchiveBoxIcon className="h-8 w-8 text-yellow-400" />;
    } else {
      return <DocumentIcon className="h-8 w-8 text-gray-400" />;
    }
  };

  const handleDownload = async () => {
    try {
      // Прямая загрузка файла через Storage
      const { data, error } = await supabase.storage
        .from('task-files')
        .download(file.file_path);

      if (error) throw error;

      // Создаём URL из бинарных данных
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      alert('Не удалось скачать файл');
    }
  };

  return (
    <motion.div
      id={`file-card-${file.id}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="border border-gray-700 rounded-xl p-4 bg-gray-800 hover:bg-gray-700/50 transition-all duration-200 group cursor-pointer relative"
      onClick={handleDownload}
    >
      {/* Кнопка удаления */}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Не срабатывает onClick на карточке
            handleDelete();
          }}
          disabled={deleting}
          className={`
            absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            z-10 cursor-pointer

            ${deleting ? "opacity-100" : ""}
            touch:opacity-100
            focus:outline-none focus:ring-2 focus:ring-red-400
          `}
          aria-label="Удалить файл"
        >
          {deleting ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <TrashIcon className="h-4 w-4" />
          )}
        </button>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="mb-2">{getFileIcon()}</div>
        <h4 className="font-medium text-white text-sm truncate w-full mb-1">
          {file.file_name}
        </h4>
        {fileSize && (
          <span className="text-xs text-gray-400 mb-2">{fileSize}</span>
        )}
      </div>

      <div className="border-t border-gray-700 pt-3 mt-2">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Тип:</span>
            <span className="text-gray-300">
              {file.file_type.split("/")[1] || file.file_type}
            </span>
          </div>
          {file.uploaded_at && (
            <div className="flex justify-between">
              <span>Загружен:</span>
              <span className="text-gray-300">
                {formatDate(file.uploaded_at)}
              </span>
            </div>
          )}
          {file.uploaded_by && (
            <div className="flex justify-between">
              <span>Загрузил:</span>
              <span className="text-gray-300 truncate">Вы</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}