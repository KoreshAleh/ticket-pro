import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    total_seats?: number;
    available_seats?: number;
    event_date: string | null;
    created_at: string;
    cat_name: string;
    city_name: string;
}

interface Category {
    id: number;
    name: string;
}

export interface City {
    id: number;
    name: string;
}

export const TicketsPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [fromCache, setFromCache] = useState<boolean | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState<Category[]>([]);
    const [city, setCity] = useState<City[]>([]);

    // Modal Control State
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedCity, setSelectedCity] = useState<string>('All');
    const [maxPrice, setMaxPrice] = useState<number>(6000);
    const [selectedDate, setSelectedDate] = useState<string>('');

    const fetchTicketsAndCategory = async () => {
        try {
            setLoading(true);
            const [ticketRes, categoryRes, cityRes] = await Promise.all([
                fetch('/api/ticket/'),
                fetch('/api/ticket/category'),
                fetch('/api/ticket/city')
            ]);

            const ticketsResult = await ticketRes.json();
            const categoriesResult = await categoryRes.json();
            const cityResult = await cityRes.json();
            
            if (ticketsResult.success) {
                setTickets(ticketsResult.data);
                setFromCache(ticketsResult.fromCache);
            }
            if (categoriesResult.success) {
                setCategory(categoriesResult.data);
            }
            if (cityResult.success) {
                setCity(cityResult.data);
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
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
        fetchTicketsAndCategory();
    }, []);

    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === 'All' || ticket.cat_name === selectedCategory;
        const matchesCity = selectedCity === 'All' || ticket.city_name === selectedCity;
        const matchesPrice = Number(ticket.price) <= maxPrice;

        let matchesDate = true;
        if (selectedDate && ticket.event_date) {
            const ticketDateStr = new Date(ticket.event_date).toISOString().split('T')[0];
            matchesDate = ticketDateStr === selectedDate;
        }

        return matchesSearch && matchesCategory && matchesCity && matchesPrice && matchesDate;
    });

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between select-none">
            {/* Navigation Bar */}
            <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                TicketPro
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/userpage')}
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200"
                        >
                            Dashboard
                        </button>
                    </div>

                    <nav className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/userpage')}
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200"
                        >
                            My Tickets
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium bg-gray-900 hover:bg-red-950/30 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-900/50 px-4 py-2 rounded-xl transition"
                        >
                            Log Out
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Upcoming Events</h1>
                        <p className="mt-1 text-sm text-gray-400">Discover concerts, comedy, and esports finals in Poland.</p>
                    </div>

                    {!loading && !error && fromCache !== null && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${fromCache ? 'bg-green-950/50 text-green-400 border-green-800/50' : 'bg-blue-950/50 text-blue-400 border-blue-800/50'}`}>
                            <span className={`w-2 h-2 rounded-full ${fromCache ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                            {fromCache ? 'Fetched from Redis 🚀' : 'Loaded from Postgres 🐘'}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* LEFT COLUMN: FILTERS */}
                    <div className="lg:col-span-1 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-6 sticky top-24">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h2 className="text-base font-bold text-white">Filters</h2>
                            <button
                                onClick={() => {
                                    setSelectedCategory('All');
                                    setSelectedCity('All');
                                    setMaxPrice(6000);
                                    setSelectedDate('');
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 bg-purple-950/30 border border-purple-900/50 rounded-lg px-3 py-1.5 transition"
                            >
                                Reset All
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                            >
                                <option value="All">All Categories</option>
                                {category.map((cat) => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">City (Poland)</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                            >
                                <option value="All">All Cities</option>
                                {city.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Event Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Max Price</label>
                                <span className="text-sm font-bold text-purple-400">{maxPrice.toLocaleString()} $</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="6000"
                                step="100"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full accent-purple-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIST */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="relative flex items-center w-full">
                            <span className="absolute left-4 text-gray-500 text-sm select-none pointer-events-none">🔍</span>
                            <input
                                type="text"
                                placeholder="Search for artists, conferences, matches..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-sm shadow-xl"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-400 px-2.5 py-1 rounded-md transition"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {loading && (
                            <div className="text-center py-20 text-gray-500">
                                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-500 rounded-full mb-4"></div>
                                <p className="text-sm">Assembling available events...</p>
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-12 text-red-400 bg-red-950/20 border border-red-900/50 rounded-2xl text-sm">
                                ⚠️ Error: {error}. Check backend server status.
                            </div>
                        )}

                        {!loading && !error && filteredTickets.length === 0 && (
                            <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-20 text-center text-gray-500 text-sm">
                                🎟️ No upcoming events match your selected filters.
                            </div>
                        )}

                        {!loading && !error && filteredTickets.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredTickets.map((ticket) => (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/5 group relative overflow-hidden cursor-pointer"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                                                    {ticket.title}
                                                </h3>
                                                <span className="text-xs font-bold text-purple-400 bg-purple-950/40 border border-purple-900/40 px-2.5 py-1 rounded-lg shrink-0">
                                                    {Number(ticket.price).toLocaleString()} $
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                                                {ticket.description || 'No event description available.'}
                                            </p>
                                        </div>

                                        <div className="mt-4 border-t border-gray-800/40 pt-4 flex items-center justify-between text-xs">
                                            <span className="text-gray-400 flex items-center gap-1">
                                                📅 {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'TBA'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevents modal trigger on button click
                                                    navigate(`/selection-page/${ticket.id}`);
                                                }}
                                                className="font-semibold bg-gray-800 hover:bg-purple-600 text-white px-3.5 py-1.5 rounded-xl transition duration-200"
                                            >
                                                Buy Now
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL SHEET OVERLAY */}
            {selectedTicket && (
                <div 
                    onClick={() => setSelectedTicket(null)}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/60 flex items-start justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-purple-400 bg-purple-950/40 border border-purple-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {selectedTicket.cat_name}
                                </span>
                                <h2 className="text-xl font-black text-white mt-2 leading-tight">
                                    {selectedTicket.title}
                               </h2>
                            </div>
                            <button 
                                onClick={() => setSelectedTicket(null)}
                                className="text-gray-500 hover:text-gray-300 text-sm font-semibold border border-gray-800 hover:border-gray-700 bg-gray-950 px-2.5 py-1 rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>

                        {/* Modal Meta Deck */}
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Full Scope Information</span>
                                <p className="text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto pr-2 border-l-2 border-purple-500/40 pl-3">
                                    {selectedTicket.description || 'No exhaustive overview provided for this event sequence.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-gray-950/50 p-4 rounded-xl border border-gray-800/40 text-xs">
                                <div>
                                    <span className="text-gray-500 font-medium block">Geographic Arena</span>
                                    <span className="text-white font-bold mt-0.5 block">📍 {selectedTicket.city_name}, Poland</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 font-medium block">Event Schedule</span>
                                    <span className="text-white font-bold mt-0.5 block">
                                        📅 {selectedTicket.event_date ? new Date(selectedTicket.event_date).toLocaleDateString() : 'To Be Announced'}
                                    </span>
                                </div>
                                {selectedTicket.total_seats && (
                                    <>
                                        <div>
                                            <span className="text-gray-500 font-medium block">Total Allocation</span>
                                            <span className="text-white font-bold mt-0.5 block">{selectedTicket.total_seats} Nodes</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-medium block">Available Core</span>
                                            <span className="text-emerald-400 font-bold mt-0.5 block">{selectedTicket.available_seats} Blocks</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Modal Action Footer */}
                        <div className="bg-gray-950/60 p-4 border-t border-gray-800/60 flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Standard Value</span>
                                <span className="text-xl font-black text-white">{Number(selectedTicket.price).toLocaleString()} $</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTicket(null);
                                    navigate(`/selection-page/${selectedTicket.id}`);
                                }}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-lg shadow-purple-950/40"
                            >
                                Secure Operational Seat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-gray-900 bg-gray-950 py-6 text-center text-xs text-gray-600">
                &copy; 2026 TicketPro. React + TypeScript + Tailwind CSS Architecture.
            </footer>
        </div>
    );
};