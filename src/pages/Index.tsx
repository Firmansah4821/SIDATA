import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthPage from '@/pages/Auth';
import UserDashboard from '@/pages/UserDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

export default function Index() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <AuthPage onSignIn={auth.signIn} />;
  }

  if (auth.isAdmin) {
    return <AdminDashboard auth={auth} />;
  }

  return <UserDashboard auth={auth} />;
}
