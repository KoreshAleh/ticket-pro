import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserFromToken } from '../../utils/auth';
import { SettingsModal } from './setting/SettingModal';

interface MyTicket {
  id: number;
  title: string;
  event_date: string | null;
  price: string | number;
  purchase_date: string;
  seat_number?: string;
}

interface ApiResponse {
    success: boolean;
    fromCache: boolean;
    data: MyTicket[];
}

interface User {
  id: number;
  username?: string;
  email?: string;
  role?: string;
  balance?: string | number;
  avatar?: any;
}

export const UserPage: React.FC = () => {
  const navigate = useNavigate();
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [IMuser, setIMuser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorUser, setErrorUser] = useState<boolean>(false);

  useEffect(() => {
    const currentUser = getUserFromToken();
    const token = localStorage.getItem('token');

    if (!token || !currentUser || !currentUser.id) {
      setErrorUser(true);
      setLoading(false);
      return;
    }

    const user = {
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      balance: '500 $',
      role: currentUser.role,
      avatar: currentUser.avatar
    };

    setIMuser(user);

    const fetchUser = async () => {
      try {
        setLoading(true); 

        // ЧИНИМ URL: убираем ?id=, так как бэкенд берёт его из токена
        const response = await fetch('/api/ticket/my', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          setErrorUser(true);
          setError("Failed to load tickets"); 
        } else {
          setErrorUser(false);
          setMyTickets(data.data); 
        }
      } catch (err) {
        setErrorUser(true);
        setError("Network error during fetching tickets");
      } finally {
        setLoading(false); 
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
    navigate('/', { replace: true });
  };

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between">

      {/* Header */}
      <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
              <span className="text-2xl">🎟️</span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                TicketPro
              </span>
            </div>

            <button
              onClick={() => navigate('/ticketpage')}
              className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
            >
              🚀 Event Schedule
            </button>
            {IMuser?.role === 'admin' && (
              <button
                onClick={() => navigate('/adminpage')}
                className="text-sm font-medium text-pink-400 hover:text-pink-300 bg-pink-950/30 hover:bg-pink-900/40 border border-pink-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
              >
                ⚙️ Admin Dashboard
              </button>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm font-medium bg-gray-900 hover:bg-red-950/30 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-900/50 px-4 py-2 rounded-xl transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Profile Column */}
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0">
              <img src={IMuser?.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{IMuser?.username}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{IMuser?.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Account Balance</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              {IMuser?.balance}
            </span>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-2">
            <button className="w-full text-left text-sm text-purple-400 hover:text-purple-300 transition font-medium">
              💳 Top Up Balance
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full text-left text-sm text-gray-400 hover:text-white transition"
            >
              ⚙️ Profile Settings
            </button>
          </div>
        </div>

        {/* Tickets Column */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">My Purchased Tickets</h1>
            <p className="text-sm text-gray-400 mt-1">Your active passes for upcoming events are stored here.</p>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm">Loading your tickets...</div>
          ) : myTickets.length === 0 ? (
            <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500">
              🎟️ You haven't purchased any tickets yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500"></div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-bold text-white group-hover:text-purple-400 transition">
                        {ticket.title}
                      </h3>
                    </div>
                    {ticket.seat_number && (
                      <span className="inline-block text-xs font-semibold bg-gray-850 border border-gray-800 text-gray-300 px-2 py-1 rounded">
                        💺 {ticket.seat_number}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 border-t border-gray-800/60 pt-4 flex items-center justify-between text-xs">
                    <div className="text-gray-400 space-y-1">
                      <div>Date: <span className="text-gray-200">{ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'TBA'}</span></div>
                      <div className="text-[10px] text-gray-600">Purchased: {new Date(ticket.purchase_date).toLocaleDateString()}</div>
                    </div>
                    <button className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-900/50 hover:border-transparent font-medium px-3 py-1.5 rounded-lg transition">
                      View QR Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-900 bg-gray-950/30 py-6 text-center text-sm text-gray-600">
        &copy; 2026 TicketPro. User Dashboard.
      </footer>

      {/* Безопасный вызов модалки без ругани TypeScript */}
      {/* {IMuser && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={IMuser} 
          onProfileUpdate={(updated) => {}}
        />
      )} */}
    </div>
  );
};