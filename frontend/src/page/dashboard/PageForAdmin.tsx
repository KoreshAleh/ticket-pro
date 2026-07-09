import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    event_date: string;
    total_seats: number;
    available_seats: number;
}

interface ApiResponse {
    success: boolean;
    data: Ticket[];
}

export const PageForAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Функция получения данных из бэкенда/БД
    const fetchAdminTickets = async () => {
        try {
            setLoading(true);
            setError(null);

            // Запрос к эндпоинту (подставь свой, если он отличается, например /api/tickets или /api/admin/tickets)
            const response = await fetch('/api/ticket/');
            if (!response.ok) throw new Error('Failed to fetch tickets from database');

            const result: ApiResponse = await response.json();
            if (result.success) {
                setTickets(result.data);
            } else {
                throw new Error('Database returned unsuccessful status');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminTickets();
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col">

            {/* Admin Header */}
            <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚙️</span>
                        <span
                            className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
                            onClick={() => navigate('/mainpage')}>
                            TicketPro Admin
                        </span>
                        <span className="text-xs font-semibold bg-purple-950 text-purple-400 border border-purple-900/50 px-2 py-0.5 rounded-md">
                            Control Panel
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/userpage')}
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
                        >
                            View Site
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 px-4 py-2 rounded-xl transition active:scale-95"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 space-y-8">

                {/* --- TOP STATISTICS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Events</p>
                        <p className="text-3xl font-bold mt-2 text-white">{tickets.length}</p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">🎫</div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets Sold</p>
                        <p className="text-3xl font-bold mt-2 text-purple-400">
                            {tickets.reduce((acc, t) => acc + (Number(t.total_seats) - Number(t.available_seats)), 0).toLocaleString()}
                        </p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">📈</div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Capacity</p>
                        <p className="text-3xl font-bold mt-2 text-gray-300">
                            {tickets.reduce((acc, t) => acc + Number(t.total_seats), 0).toLocaleString()}
                        </p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">👥</div>
                    </div>

                    {/* REDIS STATUS CARD */}
                    <div className="bg-gray-900 border border-purple-900/30 p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/10">
                        <p className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Redis Cache
                        </p>
                        <p className="text-3xl font-bold mt-2 text-white">Active</p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">⚡</div>
                    </div>
                </div>

                {/* --- MANAGEMENT SECTION --- */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">

                    {/* Section Header */}
                    <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">Tickets & Events Management</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Create, edit and monitor active ticket sales from Database</p>
                        </div>
                        <button className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition active:scale-95 shadow-lg shadow-purple-600/20 flex items-center gap-2">
                            <span>+</span> Create New Ticket
                        </button>
                    </div>

                    {/* Table Container */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800/60 bg-gray-950/40 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    <th className="p-4 pl-6">Event Title</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Available / Total Seats</th>
                                    <th className="p-4 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                                                Loading admin records from DB...
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-red-400 bg-red-950/10">
                                            ⚠️ Error: {error}. <button onClick={fetchAdminTickets} className="underline ml-2 text-white hover:text-purple-400">Retry</button>
                                        </td>
                                    </tr>
                                ) : tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">No events found in database.</td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-800/20 transition-colors group">
                                            <td className="p-4 pl-6 font-semibold text-white group-hover:text-purple-400 transition-colors">
                                                {ticket.title}
                                            </td>
                                            <td className="p-4 text-gray-400">
                                                {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'Soon'}
                                            </td>
                                            <td className="p-4 font-medium text-emerald-400">
                                                {Number(ticket.price).toLocaleString()} $
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-200 font-mono">
                                                        {ticket.available_seats} / {ticket.total_seats}
                                                    </span>
                                                    {/* Прогресс-бар заполненности мест */}
                                                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className="h-full bg-purple-600 rounded-full"
                                                            style={{ width: `${(Number(ticket.available_seats) / Number(ticket.total_seats)) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right space-x-2">
                                                <button className="text-xs font-medium text-gray-400 hover:text-white bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg transition hover:border-gray-700">
                                                    Edit
                                                </button>
                                                <button className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg transition hover:bg-red-950/50">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="border-t border-gray-900 bg-gray-950/30 py-4 text-center text-xs text-gray-600">
                TicketPro Admin Core Suite &bull; Secure Encrypted Session
            </footer>

        </div>
    );
};