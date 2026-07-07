import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRoles: string[];
}

function ProtectedRoute({ element, allowedRoles }: ProtectedRouteProps) {
  // Вытаскиваем данные из localStorage
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  // 1. Если токена нет или флаг авторизации false — жесткий редирект на логин
  if (!token || token === 'undefined' || !isAuthenticated) {
    return <Navigate to="/mainpage" replace />;
  }

  // 2. If user's role is not allowed for this page — 403 Access Denied
  if (!allowedRoles.includes(userRole || '')) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#dc3545' }}>🚫 403 - Access Denied</h2>
        <p style={{ color: '#666' }}>You do not have permission to access this page.</p>
      </div>
    );
  }

  // 3. Если всё совпало — показываем страницу
  return element;
}

export default ProtectedRoute;