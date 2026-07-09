import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { LoginModal } from './page/Auth/Login'
import { RegisterModal } from './page/Auth/Register'
import { PageForAdmin } from './page/dashboard/PageForAdmin'
import RootRedirect from './page/rootRedirect/RootRedirect'
// import { useState } from 'react'
// import { useEffect } from 'react'
import { TicketsPage } from './page/dashboard/TicketPage'
import './index.css'
import { HomePage } from './page/dashboard/MainPage'
import { UserPage } from './page/dashboard/PageForUser'
import ProtectedRoute from './page/protectedPage/ProtectedRoute'
import NotFound from './page/ErrorPage/NotFound'



const router = createBrowserRouter([
  {
    path: '/mainpage',
    element: <HomePage  />
  },
  {
    path: '/ticketpage',
    element: <ProtectedRoute element={<TicketsPage />} allowedRoles={['admin', 'user']} />,
  },
  {
    path: '/userpage',
    element: <ProtectedRoute element={<UserPage />} allowedRoles={['admin', 'user']} />,
    // element: <UserPage />
  },
  {
    path: '/adminpage',
    element: <ProtectedRoute element={<PageForAdmin />} allowedRoles={['admin']} />,
    // element: <PageForAdmin />
  },
  {
    // Если пользователь зашел просто на сайт ( / ), автоматически редиректим его на логин
    path: '/',
    // element: <RootRedirect />,
    element:  <RootRedirect />,
  },
  {
    // Обработка несуществующих страниц (404 Not Found)
    path: '*',
    element: <NotFound /> 
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