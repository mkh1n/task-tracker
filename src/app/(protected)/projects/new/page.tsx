'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const router = useRouter();

  // Загружаем всех пользователей при монтировании
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const {  data } = await supabase
        .from('profiles')
        .select('id, full_name, business_role, is_admin, created_at');
      setAllUsers(data || []);
      setFilteredUsers(data || []);
      setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  // Фильтрация при поиске
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter(user =>
        user.full_name?.toLowerCase().includes(term) ||
        user.business_role?.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Создаём проект
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        customer,
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: user!.id,
        status: 'planned',
      })
      .select('id')
      .single();

    if (projectError) {
      alert('Ошибка создания проекта: ' + projectError.message);
      setLoading(false);
      return;
    }

    // Добавляем участников
    if (selectedMembers.length > 0) {
      const membersData = selectedMembers.map(userId => ({
        project_id: projectData.id,
        user_id: userId,
      }));

      const { error: membersError } = await supabase
        .from('project_members')
        .insert(membersData);

      if (membersError) {
        alert('Проект создан, но участники не добавлены: ' + membersError.message);
      }
    }

    router.push('/projects');
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
          </div>
          
          {/* Описание */}
          <div className="h-32 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
          
          {/* Участники */}
          <div className="space-y-4">
            <div className="h-10 bg-gray-800 rounded-xl border border-gray-700 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-800 rounded-lg border border-gray-700 animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Кнопка */}
          <div className="h-12 bg-blue-600 rounded-lg animate-pulse"></div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Новый проект</h1>
        <p className="text-gray-400">Создайте новый проект и добавьте участников</p>
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

          {/* Выбор участников */}
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
                      id={`user-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor={`user-${user.id}`} className="flex-1 ml-3 flex items-center gap-2">
                      <span className="text-white font-medium">{user.full_name}</span>
                      <span className="text-gray-400 text-sm">
                        ({user.is_admin ? 'Админ' : user.business_role})
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
                Создание...
              </div>
            ) : (
              'Создать проект'
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