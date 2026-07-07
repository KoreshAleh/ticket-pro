import React from 'react';
import { Navigate } from 'react-router-dom'; // Импортируем компонент Navigate

function RootRedirect() {
  // Нам больше не нужен хук useNavigate() здесь
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  // 1. Если токен на месте и он валидный — автоматически пускаем дальше через компоненты <Navigate />
  if (token && token !== 'undefined' && isAuthenticated) {
    return userRole === 'admin' 
      ? <Navigate to="/adminpage" replace />
      : <Navigate to="/userpage" replace />; 
  }

  // 2. Если токена нет — отправляем на логин
  return <Navigate to="/mainpage" replace />;
}

export default RootRedirect;