// src/app/(protected)/layout.tsx
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
      </div>
    </AuthGuard>
  );
}