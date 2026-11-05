import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsModal } from './setting/SettingModal';
import { TopUpModal } from './TopUpModal';
import { useAuth } from '../../context/useAuth'; // 👈 Используем наш Context!
import { usePreferences } from '../../context/preferences-context';
import { PreferenceControls } from '../../context/PreferencesContext';

interface MyTicket {
  id: number;
  title: string;
  event_date: string | null;
  price: string | number;
  purchase_date: string;
  seat_number?: string;
  description?: string;
  sector_id?: string;
  row_number?: number;
  qr_code?: string;
}

interface ApiResponse {
  success: boolean;
  data: MyTicket[];
}

export const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = usePreferences();
  // 💡 Достаем user, loading, logout и refreshUser прямо из Контекста!
  const { user, loading: authLoading, logout, refreshUser } = useAuth();

  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<MyTicket | null>(null);

  // 1. Загрузка купленных билетов
  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingTickets(true);
      setError(null);
      const response = await fetch(`/api/ticket/my?_t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        setMyTickets(data.data || []);
      } else {
        setError("Failed to load tickets");
      }
    } catch {
      setError("Network error during fetching tickets");
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  }, []);

  // 2. Проверка авторизации и первичная загрузка билетов
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/mainpage', { replace: true });
      return;
    }

    if (!user) return;

    void fetchTickets();
    const refreshTickets = () => {
      if (document.visibilityState === 'visible') void fetchTickets(true);
    };
    const interval = window.setInterval(refreshTickets, 60_000);
    window.addEventListener('focus', refreshTickets);
    document.addEventListener('visibilitychange', refreshTickets);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshTickets);
      document.removeEventListener('visibilitychange', refreshTickets);
    };
  }, [user, authLoading, navigate, fetchTickets]);

  // 3. Функция безопасного вывода из аккаунта
  const handleLogout = async () => {
    await logout(); // Вызываем logout из Context (он сбросит user в null и почистит куки)
    navigate('/mainpage', { replace: true });
  };

  // 4. Защита от белого экрана во время загрузки или отсутствия user
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
          {t('Loading profile...')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between">

      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
              <span className="text-2xl">🎟️</span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                TicketPro
              </span>
            </div>

            <button
              onClick={() => navigate('/ticketpage')}
              className="rounded-lg border border-purple-900/50 bg-purple-950/30 px-2 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-purple-900/40 hover:text-purple-300 sm:px-3 sm:text-sm"
            >
              🚀 {t('Event Schedule')}
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/adminpage')}
                className="rounded-lg border border-pink-900/50 bg-pink-950/30 px-2 py-1.5 text-xs font-medium text-pink-400 transition hover:bg-pink-900/40 hover:text-pink-300 sm:px-3 sm:text-sm"
              >
                ⚙️ {t('Admin Dashboard')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-400 transition hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400 sm:px-4 sm:text-sm"
            >
              {t('Log Out')}
            </button>
            <PreferenceControls />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Profile Column */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 border border-purple-500/30">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user.username?.[0]?.toUpperCase() || '👤'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-lg font-bold text-white leading-tight truncate">{user.username || 'User'}</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email || 'No email'}</p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('Account Balance')}</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              {user.balance ?? 0} $
            </span>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-2">
            <button
              onClick={() => setIsTopUpOpen(true)}
              className="w-full text-left text-sm text-purple-400 hover:text-purple-300 transition font-medium flex items-center gap-2"
            >
              💳 {t('Top Up Balance')}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full text-left text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              ⚙️ {t('Profile Settings')}
            </button>
          </div>
        </div>

        {/* Tickets Column */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">{t('My Purchased Tickets')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('Your active passes for upcoming events are stored here.')}</p>
          </div>

          {loadingTickets ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
              {t('Loading your tickets...')}
            </div>
          ) : error ? (
            <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-6 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          ) : myTickets.length === 0 ? (
            <div   onClick={() => navigate('/ticketpage')} className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500">
              🎟️ {t("You haven't purchased any tickets yet.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition duration-200"
                >
                  <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>

                  <div className="space-y-3 pl-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white group-hover:text-purple-300 transition text-base leading-snug">
                        {ticket.title}
                      </h3>
                      <span className="text-xs font-extrabold bg-purple-950/60 border border-purple-800/50 text-purple-300 px-2.5 py-1 rounded-lg shrink-0">
                        {ticket.price ? `${Number(ticket.price).toFixed(2)} $` : t('Free')}
                      </span>
                    </div>

                    {ticket.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {ticket.sector_id && (
                        <span className="inline-flex items-center text-xs font-medium bg-gray-800/80 border border-gray-700/60 text-gray-300 px-2.5 py-1 rounded-md">
                          🏛️ {t('Sector:')} <strong className="ml-1 text-white">{ticket.sector_id}</strong>
                        </span>
                      )}
                      {ticket.row_number !== undefined && (
                        <span className="inline-flex items-center text-xs font-medium bg-gray-800/80 border border-gray-700/60 text-gray-300 px-2.5 py-1 rounded-md">
                          ↔️ {t('Row:')} <strong className="ml-1 text-white">{ticket.row_number}</strong>
                        </span>
                      )}
                      {ticket.seat_number && (
                        <span className="inline-flex items-center text-xs font-medium bg-purple-900/40 border border-purple-800/60 text-purple-200 px-2.5 py-1 rounded-md">
                          💺 {t('Seat:')} <strong className="ml-1 text-purple-300">{ticket.seat_number}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-800/80 pt-4 flex items-center justify-between text-xs pl-1">
                    <div className="text-gray-400 space-y-0.5">
                      <div>{t('Date')}: <span className="text-gray-200 font-medium">{ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : t('TBA')}</span></div>
                      <div className="text-[10px] text-gray-500">{t('Purchased')}: {ticket.purchase_date ? new Date(ticket.purchase_date).toLocaleDateString() : t('Recent')}</div>
                    </div>
                    <button onClick={() => setSelectedTicket(ticket)}
                      className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-900/50 px-3 py-1.5 rounded-lg transition"
                    >

                      {t('View QR')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-900 bg-gray-950/30 py-6 text-center text-sm text-gray-600">
        &copy; 2026 TicketPro. {t('User Dashboard.')}
      </footer>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('Your Ticket QR')}
            </h2>

            {selectedTicket.qr_code ? (
              <img
                src={selectedTicket.qr_code}
                alt={t('Ticket QR Code')}
                className="w-64 h-64 mx-auto bg-white rounded-xl p-2"
              />
            ) : (
              <p className="text-gray-400">{t('QR code is not available.')}</p>
            )}

            <button
              onClick={() => setSelectedTicket(null)}
              className="mt-5 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      )}

      {/* Модальные окна */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => {
          setIsTopUpOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          refreshUser();
        }}
        currentUser={user}
        onProfileUpdate={refreshUser}
      />
    </div>
  );
};