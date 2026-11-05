import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { usePreferences } from '../../context/preferences-context';
import { PreferenceControls } from '../../context/PreferencesContext';

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
    const { t } = usePreferences();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState<Category[]>([]);
    const [city, setCity] = useState<City[]>([]);

    // Modal Control State
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const { logout } = useAuth();

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
                fetch('/api/ticket/', { cache: 'no-store' }),
                fetch('/api/ticket/category'),
                fetch('/api/ticket/city')
            ]);

            if (!ticketRes.ok || !categoryRes.ok || !cityRes.ok) {
                throw new Error('Failed to load events, categories, or cities.');
            }
            const ticketsResult = await ticketRes.json();
            const categoriesResult = await categoryRes.json();
            const cityResult = await cityRes.json();
            
            if (!ticketsResult.success || !categoriesResult.success || !cityResult.success) {
                throw new Error('The server could not load event data.');
            }
            setTickets(ticketsResult.data);
            setCategory(categoriesResult.data);
            setCity(cityResult.data);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async  () => {
        await logout();
        navigate('/', { replace: true });
    };

    useEffect(() => {
        fetchTicketsAndCategory();
    }, []);

    useEffect(() => {
        const refreshTickets = async () => {
            try {
                const response = await fetch('/api/ticket/', { cache: 'no-store' });
                if (!response.ok) throw new Error(`Event request failed with status ${response.status}.`);
                const result = await response.json();
                if (!result.success || !Array.isArray(result.data)) throw new Error('The event service returned invalid data.');
                setTickets(result.data);
            } catch (refreshError) {
                console.error('Failed to refresh event list:', refreshError);
                if (tickets.length === 0) setError('Events could not be refreshed.');
            }
        };
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void refreshTickets();
        };
        const interval = window.setInterval(refreshWhenVisible, 60_000);
        window.addEventListener('focus', refreshWhenVisible);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshWhenVisible);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [tickets.length]);

    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === 'All' || ticket.cat_name === selectedCategory;
        const matchesCity = selectedCity === 'All' || ticket.city_name === selectedCity;
        const matchesPrice = Number(ticket.price || 0) <= maxPrice;

        let matchesDate = true;
        if (selectedDate && ticket.event_date) {
            const eventDate = new Date(ticket.event_date);
            const ticketDateStr = [
                eventDate.getFullYear(),
                String(eventDate.getMonth() + 1).padStart(2, '0'),
                String(eventDate.getDate()).padStart(2, '0')
            ].join('-');
            matchesDate = ticketDateStr === selectedDate;
        }

        return matchesSearch && matchesCategory && matchesCity && matchesPrice && matchesDate;
    });
    const selectedTicketEnded = selectedTicket
        ? !selectedTicket.event_date || new Date(selectedTicket.event_date).getTime() <= Date.now()
        : false;

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between select-none">
            {/* Navigation Bar */}
            <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:flex-nowrap sm:px-6 lg:px-8">
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
                            {t('My Tickets')}
                        </button>
                    </div>

                    <nav className="flex items-center gap-2 sm:gap-6">
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium bg-gray-900 hover:bg-red-950/30 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-900/50 px-4 py-2 rounded-xl transition"
                        >
                            {t('Log Out')}
                        </button>
                        <PreferenceControls />
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t('Upcoming Events')}</h1>
                        <p className="mt-1 text-sm text-gray-400">{t('Discover concerts, comedy, and esports finals in Poland.')}</p>
                    </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* LEFT COLUMN: FILTERS */}
                    <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900/80 p-4 sm:p-6 lg:sticky lg:top-24 lg:col-span-1">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <h2 className="text-base font-bold text-white">{t('Filters')}</h2>
                            <button
                                onClick={() => {
                                    setSelectedCategory('All');
                                    setSelectedCity('All');
                                    setMaxPrice(6000);
                                    setSelectedDate('');
                                    setSearchQuery('');
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 bg-purple-950/30 border border-purple-900/50 rounded-lg px-3 py-1.5 transition"
                            >
                                {t('Reset All')}
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('Category')}</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                            >
                                <option value="All">{t('All Categories')}</option>
                                {category.map((cat) => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('City (Poland)')}</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                            >
                                <option value="All">{t('All Cities')}</option>
                                {city.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('Event Date')}</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('Max Price')}</label>
                                <span className="text-sm font-bold text-purple-400">{maxPrice.toLocaleString()} $</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="6000"
                                step="50"
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
                                placeholder={t('Search for artists, conferences, matches...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-sm shadow-xl"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-400 px-2.5 py-1 rounded-md transition"
                                >
                                    {t('Clear')}
                                </button>
                            )}
                        </div>

                        {loading && (
                            <div className="text-center py-20 text-gray-500">
                                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-purple-500 rounded-full mb-4"></div>
                                <p className="text-sm">{t('Assembling available events...')}</p>
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-12 text-red-400 bg-red-950/20 border border-red-900/50 rounded-2xl text-sm">
                                ⚠️ {t('Error')}: {error}. {t('Check backend server status.')}
                            </div>
                        )}

                        {!loading && !error && filteredTickets.length === 0 && (
                            <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-20 text-center text-gray-500 text-sm">
                                🎟️ {t('No upcoming events match your selected filters.')}
                            </div>
                        )}

                        {!loading && !error && filteredTickets.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredTickets.map((ticket) => {
                                    const eventEnded = !ticket.event_date || new Date(ticket.event_date).getTime() <= Date.now();
                                    const hasAvailableSeats = Number(ticket.available_seats || 0) > 0;
                                    return (
                                    <article
                                        key={ticket.id} 
                                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${eventEnded ? 'border-gray-800 bg-gray-900/60' : 'border-gray-800 bg-gray-900 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/5'}`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="line-clamp-2 text-left font-bold leading-snug text-white transition-colors hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                                                >
                                                    {ticket.title}
                                                </button>
                                                <span className="text-xs font-bold text-purple-400 bg-purple-950/40 border border-purple-900/40 px-2.5 py-1 rounded-lg shrink-0">
                                                   {Number(ticket.price) === 0 ? t('Free') : `${t('From')} ${Number(ticket.price).toLocaleString()} $`}
                                                </span>
                                            </div>
                                            {eventEnded && (
                                                <span className="mb-3 inline-block rounded-md border border-gray-700 bg-gray-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                    {t('Event ended')}
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                                                {ticket.description || t('No event description available.')}
                                            </p>
                                        </div>

                                        <div className="mt-4 border-t border-gray-800/40 pt-4 flex items-center justify-between text-xs">
                                            <span className="flex flex-wrap items-center gap-1 text-gray-400">
                                                📅 {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'TBA'}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-[11px] text-gray-500">
                                                {ticket.available_seats ?? 0} {t('seats')}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={eventEnded || !hasAvailableSeats}
                                                onClick={() => navigate(`/selection-page/${ticket.id}`)}
                                                className="rounded-xl bg-gray-800 px-3.5 py-1.5 font-semibold text-white transition duration-200 hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {eventEnded ? t('Event Ended') : hasAvailableSeats ? t('Buy Now') : t('Sold Out')}
                                            </button>
                                            </div>
                                        </div>
                                    </article>
                                    );
                                })}
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
                                {t('Close')}
                            </button>
                        </div>

                        {/* Modal Meta Deck */}
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">{t('Full Scope Information')}</span>
                                <p className="text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto pr-2 border-l-2 border-purple-500/40 pl-3">
                                    {selectedTicket.description || t('No exhaustive overview provided for this event sequence.')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-gray-950/50 p-4 rounded-xl border border-gray-800/40 text-xs">
                                <div>
                                    <span className="text-gray-500 font-medium block">{t('Geographic Arena')}</span>
                                    <span className="text-white font-bold mt-0.5 block">📍 {selectedTicket.city_name}, Poland</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 font-medium block">{t('Event Schedule')}</span>
                                    <span className="text-white font-bold mt-0.5 block">
                                        📅 {selectedTicket.event_date ? new Date(selectedTicket.event_date).toLocaleDateString() : t('To Be Announced')}
                                    </span>
                                </div>
                                {selectedTicket.total_seats && (
                                    <>
                                        <div>
                                            <span className="text-gray-500 font-medium block">{t('Total Allocation')}</span>
                                            <span className="text-white font-bold mt-0.5 block">{selectedTicket.total_seats} {t('Nodes')}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-medium block">{t('Available Core')}</span>
                                            <span className="text-emerald-400 font-bold mt-0.5 block">{selectedTicket.available_seats} {t('Blocks')}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Modal Action Footer */}
                        <div className="bg-gray-950/60 p-4 border-t border-gray-800/60 flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{t('Standard Value')}</span>
                                <span className="text-xl font-black text-white">{Number(selectedTicket.price) === 0 ? t('Free') : `${Number(selectedTicket.price).toLocaleString()} $`}</span>
                            </div>
                            <button
                                disabled={selectedTicketEnded || !selectedTicket.available_seats}
                                onClick={() => {
                                    setSelectedTicket(null);
                                    navigate(`/selection-page/${selectedTicket.id}`);
                                }}
                                className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-950/40 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {selectedTicketEnded ? t('Event Ended') : selectedTicket.available_seats ? t('Secure Operational Seat') : t('Sold Out')}
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