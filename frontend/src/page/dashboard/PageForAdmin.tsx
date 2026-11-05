import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth'; // 👈 Используем единый контекст
import { usePreferences } from '../../context/preferences-context';
import { PreferenceControls } from '../../context/PreferencesContext';

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    event_date: string;
    total_seats: number;
    available_seats: number;
    sold_seats: number;
    category_id: number;
    city_id: number;
    cat_name: string;
    city_name: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

interface EventForm {
    title: string;
    description: string;
    eventDate: string;
    price: string;
    categoryId: string;
    cityId: string;
}

export const PageForAdmin: React.FC = () => {
    const navigate = useNavigate();
    const { t } = usePreferences();
    // 💡 Достаем данные пользователя и глобальную функцию logout из контекста
    const { user, loading: authLoading, logout } = useAuth();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
    const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState<EventForm>({
        title: '', description: '', eventDate: '', price: '', categoryId: '', cityId: ''
    });

    // Функция получения данных билетов
    const fetchAdminTickets = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);

            const response = await fetch('/api/ticket/', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
            });

            if (response.status === 401 || response.status === 403) {
                // Если нет прав или сессия истекла — уводим на главную
                navigate('/mainpage', { replace: true });
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch tickets from database');

            const result: ApiResponse<Ticket[]> = await response.json();
            if (result.success) {
                setTickets(result.data);
            } else {
                throw new Error('Database returned unsuccessful status');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [navigate]);

    const fetchEventOptions = useCallback(async () => {
        const [categoryResponse, cityResponse] = await Promise.all([
            fetch('/api/ticket/category', { credentials: 'include' }),
            fetch('/api/ticket/city', { credentials: 'include' })
        ]);
        if (!categoryResponse.ok || !cityResponse.ok) throw new Error('Failed to load event categories and cities.');
        const [categoryData, cityData]: [ApiResponse<Array<{ id: number; name: string }>>, ApiResponse<Array<{ id: number; name: string }>>] =
            await Promise.all([categoryResponse.json(), cityResponse.json()]);
        if (!categoryData.success || !cityData.success) throw new Error('Failed to load event categories and cities.');
        setCategories(categoryData.data);
        setCities(cityData.data);
    }, []);

    // Проверка прав и первичная загрузка данных
    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'admin') {
                navigate('/mainpage', { replace: true });
            } else {
                void fetchAdminTickets();
                void fetchEventOptions().catch((err: Error) => setError(err.message));
            }
        }
    }, [user, authLoading, navigate, fetchAdminTickets, fetchEventOptions]);

    useEffect(() => {
        if (authLoading || user?.role !== 'admin') return;

        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void fetchAdminTickets(true);
        };
        const interval = window.setInterval(refreshWhenVisible, 15_000);
        window.addEventListener('focus', refreshWhenVisible);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshWhenVisible);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [authLoading, user, fetchAdminTickets]);

    const openCreateForm = () => {
        setEditingId(null);
        setForm({ title: '', description: '', eventDate: '', price: '', categoryId: '', cityId: '' });
        setFormError(null);
        setFormOpen(true);
    };

    const openEditForm = (ticket: Ticket) => {
        setEditingId(ticket.id);
        setForm({
            title: ticket.title,
            description: ticket.description || '',
            eventDate: (() => {
                const date = new Date(ticket.event_date);
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                return date.toISOString().slice(0, 16);
            })(),
            price: String(ticket.price),
            categoryId: String(ticket.category_id),
            cityId: String(ticket.city_id)
        });
        setFormError(null);
        setFormOpen(true);
    };

    const saveEvent = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            const response = await fetch(`/api/ticket/admin/events${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    eventDate: new Date(form.eventDate).toISOString(),
                    price: Number(form.price),
                    categoryId: Number(form.categoryId),
                    cityId: Number(form.cityId)
                })
            });
            if (response.status === 404 && editingId) {
                setFormOpen(false);
                setEditingId(null);
                await fetchAdminTickets(true);
                return;
            }
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Could not save event.');
            setFormOpen(false);
            await fetchAdminTickets();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not save event.');
        } finally {
            setSaving(false);
        }
    };

    const deleteEvent = async (ticket: Ticket) => {
        if (!window.confirm(`Delete "${ticket.title}"? This is only allowed when it has no purchases or active seat holds.`)) return;
        try {
            const response = await fetch(`/api/ticket/admin/events/${ticket.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.status === 404) {
                await fetchAdminTickets();
                return;
            }
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Could not delete event.');
            await fetchAdminTickets();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete event.');
        }
    };

    // Выход из системы
    const handleLogout = async () => {
        await logout(); // 👈 Вызываем метод из контекста, а не локальный fetch
        navigate('/mainpage', { replace: true });
    };

    // Защита от рендера/падения компонента при загрузке или отсутствии прав
    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                    {t('Verifying admin session...')}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col">

            {/* Admin Header */}
            <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚙️</span>
                        <span
                            className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent cursor-pointer"
                            onClick={() => navigate('/mainpage')}>
                            TicketPro Admin
                        </span>
                        <span className="text-xs font-semibold bg-purple-950 text-purple-400 border border-purple-900/50 px-2 py-0.5 rounded-md">
                            {t('Control Panel')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => navigate('/userpage')}
                            className="text-sm font-medium text-gray-400 hover:text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-900/50 rounded-lg flex items-center gap-1.5 px-3 py-1.5 transition duration-200 hover:scale-105 active:scale-98"
                        >
                            {t('View Site')}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 px-4 py-2 rounded-xl transition active:scale-95"
                        >
                            {t('Logout')}
                        </button>
                        <PreferenceControls />
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 space-y-8">

                {/* --- TOP STATISTICS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Total Events')}</p>
                        <p className="text-3xl font-bold mt-2 text-white">{tickets.length}</p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">🎫</div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Tickets Sold')}</p>
                        <p className="text-3xl font-bold mt-2 text-purple-400">
                            {tickets.reduce((acc, ticket) => acc + Number(ticket.sold_seats || 0), 0).toLocaleString()}
                        </p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">📈</div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Total Capacity')}</p>
                        <p className="text-3xl font-bold mt-2 text-gray-300">
                            {tickets.reduce((acc, t) => acc + Number(t.total_seats), 0).toLocaleString()}
                        </p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">👥</div>
                    </div>

                    {/* Event configuration summary */}
                    <div className="bg-gray-900 border border-purple-900/30 p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/10">
                        <p className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            {t('Seat map')}
                        </p>
                        <p className="text-3xl font-bold mt-2 text-white">{t('5 sections')}</p>
                        <div className="absolute right-4 bottom-4 text-2xl opacity-20">🪑</div>
                    </div>
                </div>

                {/* --- MANAGEMENT SECTION --- */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">

                    <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white">{t('Tickets & Events Management')}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{t('Create, edit and monitor active ticket sales from Database')}</p>
                        </div>
                        <button onClick={openCreateForm} className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition active:scale-95 shadow-lg shadow-purple-600/20 flex items-center gap-2">
                            <span>+</span> {t('Create New Ticket')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800/60 bg-gray-950/40 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    <th className="p-4 pl-6">{t('Event Title')}</th>
                                    <th className="p-4">{t('Date')}</th>
                                    <th className="p-4">{t('Price')}</th>
                                    <th className="p-4">{t('Available / Total Seats')}</th>
                                    <th className="p-4 pr-6 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                                                {t('Loading admin records from DB...')}
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-red-400 bg-red-950/10">
                                            ⚠️ {t('Error')}: {error}. <button onClick={() => void fetchAdminTickets()} className="underline ml-2 text-white hover:text-purple-400">{t('Retry')}</button>
                                        </td>
                                    </tr>
                                ) : tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">{t('No events found in database.')}</td>
                                    </tr>
                                ) : (
                                    tickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-800/20 transition-colors group">
                                            <td className="p-4 pl-6 font-semibold text-white group-hover:text-purple-400 transition-colors">
                                                {ticket.title}
                                            </td>
                                            <td className="p-4 text-gray-400">
                                                {ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : t('Soon')}
                                            </td>
                                            <td className="p-4 font-medium text-emerald-400">
                                                {Number(ticket.price) === 0 ? t('Free') : `${Number(ticket.price).toLocaleString()} $`}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-200 font-mono">
                                                        {ticket.available_seats} / {ticket.total_seats}
                                                    </span>
                                                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className="h-full bg-purple-600 rounded-full"
                                                            style={{ width: `${(Number(ticket.available_seats) / Number(ticket.total_seats)) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right space-x-2">
                                                <button onClick={() => openEditForm(ticket)} className="text-xs font-medium text-gray-400 hover:text-white bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg transition hover:border-gray-700">
                                                    {t('Edit')}
                                                </button>
                                                <button onClick={() => void deleteEvent(ticket)} className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg transition hover:bg-red-950/50">
                                                    {t('Delete')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {formOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                        <form onSubmit={saveEvent} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6">
                            <h2 className="text-xl font-bold text-white">{editingId ? t('Edit event') : t('Create event')}</h2>
                            <label className="block text-sm text-gray-300">
                                {t('Event title')}
                                <input required maxLength={255} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white" />
                            </label>
                            <label className="block text-sm text-gray-300">
                                {t('Description')}
                                <textarea maxLength={10000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white" />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm text-gray-300">
                                    {t('Date and time')}
                                    <input type="datetime-local" required value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white" />
                                </label>
                                <label className="block text-sm text-gray-300">
                                    {t('Price per seat')}
                                    <input type="number" min="0" max="999999.99" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white" />
                                    <span className="mt-1 block text-xs text-gray-500">{t('Enter 0 for a free event.')}</span>
                                </label>
                                <label className="block text-sm text-gray-300">
                                    {t('Category')}
                                    <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white">
                                        <option value="">{t('Select category')}</option>
                                        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                                    </select>
                                </label>
                                <label className="block text-sm text-gray-300">
                                    {t('City')}
                                    <select required value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-white">
                                        <option value="">{t('Select city')}</option>
                                        {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                                    </select>
                                </label>
                            </div>
                            {formError && <p className="text-sm text-red-400">{formError}</p>}
                            <p className="text-xs text-gray-500">{t('A new event receives 800 seats across the five supported sections.')}</p>
                            <div className="flex justify-end gap-3">
                                <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300">{t('Cancel')}</button>
                                <button type="submit" disabled={saving || !categories.length || !cities.length} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                    {saving ? t('Saving...') : editingId ? t('Save changes') : t('Create event')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </main>

            {/* Footer */}
            <footer className="border-t border-gray-900 bg-gray-950/30 py-4 text-center text-xs text-gray-600">
                {t('TicketPro Admin Core Suite')} &bull; {t('Secure Encrypted Session')}
            </footer>

        </div>
    );
};