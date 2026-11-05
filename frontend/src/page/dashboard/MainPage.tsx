import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginModal } from '../Auth/Login';
import { RegisterModal } from '../Auth/Register';
import { useAuth } from '../../context/useAuth';
import { usePreferences } from '../../context/preferences-context';
import { PreferenceControls } from '../../context/PreferencesContext';

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    event_date: string | null;
}

const phrases = [
    'All the best events in just one click',
    'Discover amazing live experiences'
];

const getCardsPerView = (width: number) => width < 640 ? 1 : width < 1024 ? 2 : 3;

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const { t } = usePreferences();

    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);

    const [featuredEvents, setFeaturedEvents] = useState<Ticket[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [cardsPerView, setCardsPerView] = useState(() => getCardsPerView(window.innerWidth));

    const [typedText, setTypedText] = useState('');

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setTypedText(phrases[0]);
            return;
        }

        let currentPhraseIndex = 0;
        let currentCharIndex = 0;
        let isDeleting = false;
        let timeoutId: ReturnType<typeof setTimeout>;

        const type = () => {
            const currentPhrase = t(phrases[currentPhraseIndex]);

            if (!isDeleting) {
                setTypedText(currentPhrase.substring(0, currentCharIndex + 1));
                currentCharIndex++;

                if (currentCharIndex === currentPhrase.length) {
                    isDeleting = true;
                    timeoutId = setTimeout(type, 2000);
                    return;
                }
                timeoutId = setTimeout(type, 70);
            } else {
                setTypedText(currentPhrase.substring(0, currentCharIndex - 1));
                currentCharIndex--;

                if (currentCharIndex === 0) {
                    isDeleting = false;
                    currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
                    timeoutId = setTimeout(type, 500);
                    return;
                }
                timeoutId = setTimeout(type, 40);
            }
        };

        timeoutId = setTimeout(type, 100);

        return () => clearTimeout(timeoutId);
    }, [t]);

    useEffect(() => {
        const updateCardsPerView = () => setCardsPerView(getCardsPerView(window.innerWidth));
        window.addEventListener('resize', updateCardsPerView);
        return () => window.removeEventListener('resize', updateCardsPerView);
    }, []);

    const visibleCards = Math.max(1, Math.min(cardsPerView, featuredEvents.length));

    useEffect(() => {
        setCurrentIndex(index => Math.min(index, Math.max(0, featuredEvents.length - visibleCards)));
    }, [visibleCards, featuredEvents.length]);

    // 2. Очистка URL параметров без вызова refreshUser (он уже вызывается в AuthContext)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('token')) {
            try {
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.warn("History API restricted:", e);
            }
        }
    }, []); // Пустой массив зависимостей предотвращает зацикливание

    // 3. Загрузка билетов
    const fetchFeaturedEvents = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setEventsError(null);
            const response = await fetch('/api/ticket/', {
                credentials: 'include',
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Event request failed with status ${response.status}.`);

            const result = await response.json();
            if (!result.success || !Array.isArray(result.data)) throw new Error('The event service returned invalid data.');
            setFeaturedEvents(result.data);
        } catch (error) {
            console.error("Failed to fetch tickets", error);
            if (showLoading) setFeaturedEvents([]);
            setEventsError('Events could not be loaded. Please try again later.');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeaturedEvents();
    }, [fetchFeaturedEvents]);

    useEffect(() => {
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void fetchFeaturedEvents(false);
        };
        const interval = window.setInterval(refreshWhenVisible, 60_000);
        window.addEventListener('focus', refreshWhenVisible);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshWhenVisible);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [fetchFeaturedEvents]);

    const maxSlideIndex = Math.max(0, featuredEvents.length - visibleCards);
    const prevSlide = () => setCurrentIndex(index => index === 0 ? maxSlideIndex : index - 1);

    const nextSlide = () => setCurrentIndex(index => index >= maxSlideIndex ? 0 : index + 1);

    const checkLogin = () => {
        if (user) {
            if (user.role === "admin") {
                navigate('/adminpage');
            } else {
                navigate('/userpage');
            }
        } else {
            setIsLoginOpen(true);
            setIsRegisterOpen(false);
        }
    };

    const handleLoginSuccess = async () => {
        setIsLoginOpen(false);
        if (refreshUser) {
            await refreshUser();
        }
    };

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between relative overflow-x-hidden">

            {/* Header */}
            <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
                <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
                        <span className="text-2xl">🎟️</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            TicketPro
                        </span>
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={checkLogin}
                            className="max-w-[48vw] shrink-0 truncate rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 active:scale-95 sm:max-w-none sm:px-5"
                        >
                            {user ? `${t('Dashboard')} (${user.username || user.email || t('User')})` : t('Sign In')}
                        </button>
                        <PreferenceControls />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center max-w-7xl w-full mx-auto px-4 pt-2 pb-8 space-y-12">

                {/* Печатающийся текст */}
                <h1 className="min-h-[96px] px-2 text-center text-3xl font-extrabold leading-tight sm:min-h-[140px] sm:text-6xl">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-400 bg-clip-text text-transparent">
                        {typedText}
                    </span>
                    <span className="text-pink-500 animate-pulse ml-1">_</span>
                </h1>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-purple-950/50 text-purple-300 border border-purple-800/50">
                    🚀 {t('Next-Generation Microservice Platform')}
                </div>

                {/* Slider */}
                {!loading && featuredEvents.length > 0 ? (
                    <div className="relative mx-auto w-full max-w-5xl px-12">
                        <div className="relative">
                            {featuredEvents.length > cardsPerView && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Previous events"
                                        onClick={prevSlide}
                                        className="absolute -left-11 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-gray-800 bg-gray-950 text-gray-400 shadow-xl transition hover:text-white"
                                    >
                                        ←
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Next events"
                                        onClick={nextSlide}
                                        className="absolute -right-11 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-gray-800 bg-gray-950 text-gray-400 shadow-xl transition hover:text-white"
                                    >
                                        →
                                    </button>
                                </>
                            )}
                            <div className="w-full overflow-hidden rounded-2xl">
                                <div
                                    className="flex transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
                                >
                                    {featuredEvents.map((event) => (
                                        <div key={event.id} className="shrink-0 px-2" style={{ flexBasis: `${100 / visibleCards}%` }}>
                                            <div className={`relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 ${event.event_date && new Date(event.event_date).getTime() <= Date.now() ? 'border-gray-800 bg-gray-900/60' : 'border-gray-800 bg-gray-900'}`}>
                                                <div className="space-y-2 relative z-10">
                                                    <span className="text-xl">📅</span>
                                                    <h3 className="line-clamp-2 break-words text-sm font-bold text-white">
                                                        {event.title}
                                                    </h3>
                                                    {event.event_date && new Date(event.event_date).getTime() <= Date.now() && (
                                                        <span className="inline-block rounded-md border border-gray-700 bg-gray-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                            {t('Event ended')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800/60 pt-3 text-xs">
                                                    <span className="text-gray-400">
                                                        {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Soon'}
                                                    </span>
                                                    <span className="font-semibold text-purple-400 bg-purple-950/40 border border-purple-900/30 px-2 py-0.5 rounded-md">
                                                        {Number(event.price) === 0 ? t('Free') : `${Number(event.price).toLocaleString()} $`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-gray-500">
                        {loading ? t('Loading events...') : eventsError || t('No events are available yet.')}
                    </div>
                )}

                <div className="max-w-3xl w-full text-center flex flex-col items-center justify-center space-y-8">
                    <p className="text-gray-400 text-base sm:text-lg max-w-xl font-light">
                        {t('Welcome to TicketPro. Sign in to the system to get access to the current event schedule and fast ticket purchasing.')}
                    </p>

                    <div className="relative group">
                        {user && (
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                        )}

                        <button
                            onClick={checkLogin}
                            className={`relative px-8 py-4 font-semibold rounded-2xl transition active:scale-95 shadow-xl overflow-hidden ${
                                user
                                    ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-[length:200%_auto] animate-gradient text-white border border-purple-400/30'
                                    : 'bg-white text-gray-950 hover:bg-gray-100 shadow-white/5'
                            }`}
                        >
                            {user && (
                                <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shine"></span>
                            )}

                            <span className="relative z-10 flex items-center gap-2">
                                {user ? t('Go to Dashboard →') : t('Get Started →')}
                            </span>
                        </button>
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-900 bg-gray-950/30 py-6 text-center text-sm text-gray-600">
                &copy; 2026 TicketPro.
            </footer>

            <LoginModal
                isOpen={isLoginOpen}
                onClose={handleLoginSuccess}
                onSwitchToRegister={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }}
            />

            <RegisterModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSwitchToLogin={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }}
            />

            <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes shine {
                    0% { transform: translateX(-100%); }
                    60% { transform: translateX(200%); }
                    100% { transform: translateX(200%); }
                }

                .animate-gradient {
                    animation: gradient 3s ease infinite;
                }

                .animate-shine {
                    animation: shine 2.5s infinite;
                }
            `}</style>
        </div>
    );
};

export default HomePage;