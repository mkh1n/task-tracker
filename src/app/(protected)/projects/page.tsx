'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, Profile } from '@/lib/types';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [membersCount, setMembersCount] = useState<Record<string, number>>({});
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Получаем пользователя
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser!.id)
        .single();
      setUser(profile);

      let projectsData: Project[] = [];

      // Админ видит ВСЕ проекты
      if (profile.is_admin) {
        const { data: allProjects } = await supabase.from('projects').select('*');
        projectsData = allProjects || [];
      } else {
        // Обычный пользователь — только свои
        const { data: members } = await supabase
          .from('project_members')
          .select('project_id');
        if (members?.length) {
          const ids = members.map(m => m.project_id);
          const { data: userProjects } = await supabase
            .from('projects')
            .select('*')
            .in('id', ids);
          projectsData = userProjects || [];
        }
      }

      setProjects(projectsData);

      // Загружаем количество участников для каждого проекта
      const membersMap: Record<string, number> = {};
      for (const project of projectsData) {
        const { count } = await supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        membersMap[project.id] = count || 0;
      }
      setMembersCount(membersMap);

      setTimeout(() => {
        setLoading(false);
      }, 300);
    };

    loadData();
  }, []);

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white">Проекты</h1>
        {!loading && user?.is_admin && (
          <Link 
            href="/projects/new" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            Новый проект
          </Link>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="border border-gray-700 p-5 rounded-xl bg-gray-800 flex flex-col animate-pulse"
              >
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="h-6 bg-gray-700 rounded w-20"></div>
                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <div className="h-6 bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-700 rounded w-24"></div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : projects.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Проектов пока нет</h3>
            <p className="text-gray-400">
              {user?.is_admin 
                ? "Создайте первый проект, чтобы начать работу"
                : "Вас пока не добавили ни в один проект"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="projects"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/projects/${project.id}`} className="block h-full">
                  <div className="border border-gray-700 p-5 rounded-xl bg-gray-800 hover:bg-gray-700/50 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
                    <h3 className="font-bold text-white text-lg mb-2 line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4 flex-grow line-clamp-2">
                      {project.description || "Без описания"}
                    </p>
                    
                    {/* Даты проекта */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.start_date && (
                        <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          Начало: {formatDate(project.start_date)}
                        </span>
                      )}
                      {project.end_date && (
                        <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                          Завершение: {formatDate(project.end_date)}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between items-center mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'planned'
                            ? 'bg-gray-700 text-gray-300'
                            : project.status === 'in_progress'
                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800/30'
                            : 'bg-green-900/50 text-green-300 border border-green-800/30'
                        }`}>
                          {project.status === 'planned'
                            ? 'Запланирован'
                            : project.status === 'in_progress'
                            ? 'В работе'
                            : 'Завершён'}
                        </span>
                        
                        {/* Участники */}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          👥 {membersCount[project.id] || 0} участников
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        {project.customer && (
                          <span className="text-gray-400 truncate">
                            {project.customer}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {project.created_at && 
                            new Date(project.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Информация о количестве проектов */}
      {!loading && projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-gray-400 text-sm"
        >
          Всего проектов: {projects.length}
          {!user?.is_admin && " (доступные вам)"}
        </motion.div>
      )}
    </div>
  );
}