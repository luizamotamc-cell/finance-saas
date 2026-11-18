import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import DashboardPage from './features/dashboard/DashboardPage';
import TransactionsPage from './features/transactions/TransactionsPage';
import AccountsPage from './features/accounts/AccountsPage';
import CategoriesPage from './features/categories/CategoriesPage';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="transacoes" element={<TransactionsPage />} />
          <Route path="contas" element={<AccountsPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
