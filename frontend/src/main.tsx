import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { PageForAdmin } from './page/dashboard/PageForAdmin';
import RootRedirect from './page/rootRedirect/RootRedirect';
import { TicketsPage } from './page/dashboard/TicketPage';
import { HomePage } from './page/dashboard/MainPage';
import { UserPage } from './page/dashboard/PageForUser';
import ProtectedRoute from './page/protectedPage/ProtectedRoute';
import NotFound from './page/ErrorPage/NotFound';
import { SeatSelectionPage } from './page/dashboard/SeatSelectionPage';
import { SuccessPage } from './page/dashboard/SuccessPayPage';
import { SuccessTopUp } from './page/dashboard/SuccessTopUp';
import { VerifyTicketPage } from './page/dashboard/VerifyTicketPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/verify/:token',
    element: <VerifyTicketPage />
  },
  {
    path: '/success-top-up',
    element: <ProtectedRoute element={<SuccessTopUp />} allowedRoles={['admin', 'user']} />
  },
  {
    path: '/success',
    element: <ProtectedRoute element={<SuccessPage />} allowedRoles={['admin', 'user']} />
  },
  {
    path: '/selection-page/:id',
    element: <ProtectedRoute element={<SeatSelectionPage />} allowedRoles={['admin', 'user']} />
  },
  {
    path: '/mainpage',
    element: <HomePage />
  },
  {
    path: '/ticketpage',
    element: <ProtectedRoute element={<TicketsPage />} allowedRoles={['admin', 'user']} />
  },
  {
    path: '/userpage',
    element: <ProtectedRoute element={<UserPage />} allowedRoles={['admin', 'user']} />
  },
  {
    path: '/adminpage',
    element: <ProtectedRoute element={<PageForAdmin />} allowedRoles={['admin']} />
  },
  {
    path: '/',
    element: <RootRedirect />
  },
  {
    path: '*',
    element: <NotFound />
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <PreferencesProvider>
        <RouterProvider router={router} />
      </PreferencesProvider>
    </AuthProvider>
  </React.StrictMode>
);