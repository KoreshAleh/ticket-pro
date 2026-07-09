import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typewriter } from 'react-simple-typewriter';
import { LoginModal } from '../Auth/Login';
import { RegisterModal } from '../Auth/Register';

interface Ticket {
    id: number;
    title: string;
    description: string | null;
    price: string | number;
    event_date: string | null;
}

interface ApiResponse {
    success: boolean;
    data: Ticket[];
}

export const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
    const [isToken, setIsToken] = useState<boolean>(() => {
        return !!localStorage.getItem('token');
    });

    const [featuredEvents, setFeaturedEvents] = useState<Ticket[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchFeaturedEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/ticket/');
            if (!response.ok) throw new Error();

            const result: ApiResponse = await response.json();
            if (result.success && result.data.length > 0) {
                setFeaturedEvents(result.data);
            } else {
                throw new Error();
            }
        } catch (error) {


        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeaturedEvents();
    }, []);

    const prevSlide = () => {
        setCurrentIndex((prev) => {
            if (featuredEvents.length <= 3) return 0;

            // Если мы в самом начале, перепрыгиваем на последнюю возможную позицию
            return prev === 0 ? featuredEvents.length - 3 : prev - 1;
        });
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => {
            if (featuredEvents.length <= 3) return 0;

            // Если дошли до конца (показана последняя тройка карточек),
            // сбрасываем индекс в 0, чтобы слайдер вернулся в начало
            return prev >= featuredEvents.length - 3 ? 0 : prev + 1;
        });
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const googleToken = urlParams.get('token');
        const googleRole = urlParams.get('role');

        if (googleToken && googleRole) {
            localStorage.setItem('token', googleToken);
            localStorage.setItem('userRole', googleRole);
            localStorage.setItem('isAuthenticated', 'true');
            setIsToken(true);

            window.history.replaceState({}, document.title, window.location.pathname);

            if (googleRole === 'admin') {
                navigate('/adminpage', { replace: true });
            } else {
                navigate('/userpage', { replace: true });
            }
        }
    }, [navigate]);

    const checkLogin = () => {
        if (isToken) {
            const role = localStorage.getItem('userRole');
            if (role === "admin") {
                navigate('/adminpage');
            } else {
                navigate('/userpage');
            }
        } else {
            setIsLoginOpen(true);
        }
    };

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between relative">

            {/* Header */}
            <header className="border-b border-gray-900 bg-gray-950/50 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎟️</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            TicketPro
                        </span>
                    </div>
                    <button
                        onClick={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }}
                        className="text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl transition active:scale-95 shadow-lg shadow-purple-600/20"
                    >
                        Sign In
                    </button>
                </div>
            </header>

            {/* Main Container */}
            <main className="flex-grow flex flex-col items-center justify-center max-w-7xl w-full mx-auto px-4 pt-2 pb-8 space-y-24">
                <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight min-h-[100px] sm:min-h-[140px] flex items-center justify-center">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-400 bg-clip-text text-transparent">
                        <Typewriter
                            words={['All the best events', 'In just one click']}
                            loop={0}
                            cursor
                            cursorStyle="_"
                            typeSpeed={70}
                            deleteSpeed={50}
                            delaySpeed={1500}
                        />
                    </span>
                </h1>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-purple-950/50 text-purple-300 border border-purple-800/50">
                    🚀 Next-Generation Microservice Platform
                </div>

                {/* --- СЛАЙДЕР СВЕРХУ --- */}
                {!loading && featuredEvents.length > 0 ? (
                    <div className="w-full max-w-5xl mx-auto space-y-3 relative px-12">
                        <div className="relative">
                            {/* Левая кнопка */}
                            <button
                                onClick={prevSlide}
                                className="absolute -left-12 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-900 transition z-20 shadow-xl"
                            >
                                ←
                            </button>

                            {/* Правая кнопка */}
                            <button
                                onClick={nextSlide}
                                className="absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-900 transition z-20 shadow-xl"
                            >
                                →
                            </button>

                            {/* Окно просмотра слайдера */}
                            <div className="overflow-hidden w-full rounded-2xl">
                                <div
                                    className="flex transition-transform duration-500 ease-in-out"
                                    style={{ transform: `translateX(-${currentIndex * 33.3333}%)` }}
                                >
                                    {featuredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="w-1/3 min-w-[33.3333%] px-2 shrink-0 transition"
                                        >
                                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between h-44 relative overflow-hidden hover:border-gray-700 group w-full">
                                                <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-600/10 rounded-full blur-xl group-hover:bg-purple-600/20 transition"></div>

                                                <div className="space-y-2 relative z-10">
                                                    <span className="text-xl">📅</span>
                                                    <h3 className="font-bold text-white text-sm sm:text-base line-clamp-2">
                                                        {event.title}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-800/60 relative z-10">
                                                    <span className="text-gray-400">
                                                        {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Soon'}
                                                    </span>
                                                    <span className="font-semibold text-purple-400 bg-purple-950/40 border border-purple-900/30 px-2 py-0.5 rounded-md">
                                                        {Number(event.price).toLocaleString()} $
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !loading ? (
                    /* ИЗМЕНЕНО: Красивый блок "Soon", если массив карточек пуст */
                    <div className="w-full max-w-md mx-auto bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                        <span className="text-2xl block mb-2">⏳</span>
                        <h3 className="text-sm font-semibold text-gray-400">New Events Coming Soon</h3>
                        <p className="text-xs text-gray-600 mt-1">We are updating our schedule. Stay tuned!</p>
                    </div>
                ) : (
                    /* В процессе загрузки (loading === true) показываем пустой элемент или спиннер */
                    <div className="h-44 flex items-center justify-center text-gray-500 text-sm">
                        <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></span>
                        Loading events...
                    </div>
                )}

                {/* --- НИЖНИЙ БЛОК (HERO SECTION) --- */}
                <div className="max-w-3xl w-full text-center flex flex-col items-center justify-center space-y-12">
                    <p className="text-gray-400 text-base sm:text-lg max-w-xl font-light">
                        Welcome to TicketPro. Sign in to the system to get access to the current event schedule and fast ticket purchasing.
                    </p>

                    <div className="pt-2">
                        <button
                            onClick={checkLogin}
                            className="px-8 py-4 bg-white text-gray-950 font-semibold rounded-2xl hover:bg-gray-100 transition active:scale-95 shadow-xl shadow-white/5"
                        >
                            Get Started →
                        </button>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="border-t border-gray-900 bg-gray-950/30 py-6 text-center text-sm text-gray-600">
                &copy; 2026 TicketPro. React + TypeScript + Tailwind CSS.
            </footer>

            {/* MODALS */}
            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onSwitchToRegister={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }}
            />

            <RegisterModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSwitchToLogin={() => { setIsRegisterOpen(false); setIsLoginOpen(true); }}
            />

        </div>
    );
};