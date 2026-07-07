import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем хук навигации

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    total_seats?: number;
    available_seats?: number;
    event_date: string | null;
    created_at: string;
}

interface ApiResponse {
    success: boolean;
    fromCache: boolean;
    data: Ticket[];
}

export const TicketsPage: React.FC = () => {
    const navigate = useNavigate(); // Инициализируем navigate
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [fromCache, setFromCache] = useState<boolean | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/ticket/');
            if (!response.ok) {
                throw new Error('Ошибка при загрузке данных с сервера');
            }

            const result: ApiResponse = await response.json();

            if (result.success) {
                setTickets(result.data);
                setFromCache(result.fromCache);
            } else {
                throw new Error('Бэкенд вернул success: false');
            }
        } catch (err: any) {
            setError(err.message || 'Что-то пошло не так');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');
        navigate('/', { replace: true });
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans antialiased flex flex-col">
            {/* Навигационная панель */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                    {/* Левая часть: Логотип и Кнопка "Назад" */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
                            <span className="text-2xl">🎟️</span>
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                TicketPro
                            </span>
                        </div>

                        {/* КНОПКА НАЗАД */}
                        <button
                            onClick={() => navigate('/userpage')} // Перенаправляем обратно в личный кабинет
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
                        >
                            В личный кабинет
                        </button>
                    </div>

                    <nav className="flex items-center gap-6">
                        <a href="#" className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98">Афиша</a>
                        <button
                            onClick={() => navigate('/userpage')}
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
                        >
                            Мои билеты
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium bg-gray-900 hover:bg-red-950/30 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-900/50 px-4 py-2 rounded-xl transition"
                        >
                            Выйти
                        </button>
                    </nav>
                </div>
            </header>

            {/* Главный контент */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Актуальные события
                        </h1>
                        <p className="mt-2 text-sm text-gray-400">
                            Покупайте билеты на лучшие концерты и матчи в пару кликов.
                        </p>
                    </div>

                    {/* Статус кэша */}
                    {!loading && !error && fromCache !== null && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border self-start sm:self-center transition-all ${fromCache
                            ? 'bg-green-950/50 text-green-400 border-green-800/50'
                            : 'bg-blue-950/50 text-blue-400 border-blue-800/50'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${fromCache ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                            {fromCache ? 'Считано из Redis 🚀' : 'Загружено из Postgres 🐘'}
                        </div>
                    )}
                </div>

                {/* Индикатор загрузки */}
                {loading && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-500 rounded-full mb-4"></div>
                        <p>Загрузка билетов...</p>
                    </div>
                )}

                {/* Ошибка */}
                {error && (
                    <div className="text-center py-12 text-red-400 bg-red-950/20 border border-red-900/50 rounded-2xl">
                        ⚠️ Ошибка: {error}. Проверь бэкенд и Docker!
                    </div>
                )}

                {/* Сетка билетов */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map((ticket) => (
                            <div key={ticket.id} className="bg-gray-800/40 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/5 group">
                                <div>
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                            {ticket.title}
                                        </h3>
                                        <span className="text-sm font-semibold text-purple-400 bg-purple-950/40 border border-purple-900/50 px-2.5 py-1 rounded-lg shrink-0">
                                            {Number(ticket.price).toLocaleString()} $
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-3 mb-4">
                                        {ticket.description || 'Описание события отсутствует.'}
                                    </p>
                                </div>

                                <div className="mt-4 border-t border-gray-800/60 pt-4 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        📅 {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'Скоро'}
                                    </span>
                                    <button className="text-xs font-semibold bg-gray-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl transition duration-200">
                                        Купить
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="border-t border-gray-800 bg-gray-950/50 py-6 text-center text-sm text-gray-500">
                &copy; 2026 TicketPro. React + TypeScript + Tailwind CSS.
            </footer>
        </div>
    );
};