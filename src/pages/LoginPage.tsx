import { Navigate } from 'react-router-dom';
import { Grain, TopBar } from '../components/Chrome';
import { AuthForm } from '../components/AuthGate';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/my-tickets" replace />;

  return (
    <div className="page">
      <Grain />
      <TopBar cta={{ label: 'BACK', to: '/' }} />
      <main className="page__body">
        <h1 className="book__h">YOUR ACCOUNT</h1>
        <p className="book__lede">Log in, or create an account to book and track tickets.</p>
        <AuthForm />
      </main>
    </div>
  );
}
