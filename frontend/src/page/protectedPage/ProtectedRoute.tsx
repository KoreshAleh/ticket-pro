import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Пока идет запрос на /api/auth/me — показываем прелоадер
  if (loading) {
    return (
      <div className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin border-4 w-8 h-8 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 1. Если пользователь не авторизован — редиректим на главную/логин
  if (!user) {
    return <Navigate to="/mainpage" replace />;
  }

  // 2. Проверка ролей
  if (!allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif', color: '#fff', backgroundColor: '#030712', minHeight: '100vh' }}>
        <h2 style={{ color: '#dc3545' }}>403 - Access Denied</h2>
        <p style={{ color: '#9ca3af' }}>You do not have permission to access this page.</p>
      </div>
    );
  }

  // 3. Всё прошло успешно — показываем страницу
  return element;
};

export default ProtectedRoute;