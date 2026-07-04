import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Login from './page/Auth/Login'
import Register from './page/Auth/Register'
import PageForUser from './page/dashboard/PageForUser'
import PageForAdmin from './page/dashboard/PageForAdmin'
// import ProtectedRoute from './page/protectedPage/ProtectedRoute'
// import RootRedirect from './page/rootRedirect/RootRedirect'
import { useState } from 'react'
import { useEffect } from 'react'


const router = createBrowserRouter([
  {
    path: '/userpage',
    // element: <ProtectedRoute element={<PageForUser />} allowedRoles={['admin', 'user']} />,
    element: <PageForUser />
  },
  {
    path: '/adminpage',
    // element: <ProtectedRoute element={<PageForAdmin />} allowedRoles={['admin']} />,
    element: <PageForAdmin />
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    // Если пользователь зашел просто на сайт ( / ), автоматически редиректим его на логин
    path: '/',
    // element: <RootRedirect />,
    element:  <Login />,
  },
  {
    // Обработка несуществующих страниц (404 Not Found)
    path: '*',
    element: <div style={{ padding: '20px', textAlign: 'center' }}><h2>404 - Страница не найдена</h2></div>,
  },
])

// function App() {
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const verifySession = async () => {
//       const token = localStorage.getItem('token');

//       // Если токена нет, проверять нечего — сразу выключаем лоадер
//       if (!token || token === 'undefined') {
//         setIsLoading(false);
//         return;
//       }

//       try {
//         // Меняем порт на 5001 (так как твой бэкенд слушает 5001)
//         const response = await fetch('/api/auth/me', {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         });

//         const data = await response.json();

//         if (!response.ok) {
//           // 🚨 Токен протух — тотальная зачистка
//           localStorage.removeItem('token');
//           localStorage.removeItem('userRole');
//           localStorage.removeItem('isAuthenticated');
          
//           // Перенаправляем на логин через жесткую перезагрузку вкладки
//           window.location.href = '/login';
//         } else {
//           console.log("Session appruved, User:", data.user);
//           // Можно обновить роль в localStorage на всякий случай, если она изменилась в БД
//           localStorage.setItem('userRole', data.user.role);
//           localStorage.setItem('isAuthenticated', 'true');
//         }
//       } catch (error) {
//         console.error("Error during check session", error);
//       } finally {
//         setIsLoading(false); // Выключаем загрузку в любом случае
//       }
//     };

//     verifySession();
//   }, []);

//   // Пока идет фоновый запрос на бэкенд, показываем аккуратный загрузчик
//   if (isLoading) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
//         <h3>Loading session...</h3>
//       </div>
//     );
//   }

//   // Когда проверка завершена, рендерим роутер
//   return <RouterProvider router={router} />;
// }

// 2. Рендерим приложение, оборачивая его в RouterProvider
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>,
) 