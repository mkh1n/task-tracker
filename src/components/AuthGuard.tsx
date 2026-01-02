// components/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Разрешаем доступ к публичным страницам
      const publicPaths = ['/auth/login', '/auth/register', '/auth/reset'];
      const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));
      
      // Если нет сессии и мы на защищенной странице — редирект
      if (!session && !isPublicPath) {
        router.replace('/auth/login');
        return;
      }
      
      // Если есть сессия и мы на странице логина — редирект на dashboard
      if (session && pathname?.startsWith('/auth')) {
        router.replace('/dashboard');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      </div>
    );
  }

  return <>{children}</>;
}