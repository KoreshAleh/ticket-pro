import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentModal } from './PaymentModal';
import { useAuth } from '../../context/useAuth';
import { usePreferences } from '../../context/preferences-context';
import { PreferenceControls } from '../../context/PreferencesContext';

interface Seat {
    id: string;
    row: number;
    number: number;
    status: 'available' | 'sold' | 'selected';
    price: number;
    is_mine: boolean;
}

interface Sector {
    id: string;
    name: string;
    color: string;
    totalSeats: number;
    availableSeats: number;
}

const sectorOptions: Omit<Sector, 'totalSeats' | 'availableSeats'>[] = [
    { id: 'vip-1', name: 'VIP Lounge 1', color: 'border-amber-500 hover:bg-amber-500/10 text-amber-400' },
    { id: 'sec-a', name: 'Sector A (West)', color: 'border-purple-500 hover:bg-purple-500/10' },
    { id: 'sec-b', name: 'Sector B (North)', color: 'border-blue-500 hover:bg-blue-500/10' },
    { id: 'sec-c', name: 'Sector C (East)', color: 'border-pink-500 hover:bg-pink-500/10' },
    { id: 'sec-d', name: 'Sector D (South)', color: 'border-indigo-500 hover:bg-indigo-500/10' },
];

interface ModalState {
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
}

export const SeatSelectionPage: React.FC = () => {
    const { id } = useParams();
    const ticketId = Number(id);
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const { t } = usePreferences();

    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [isReserved, setIsReserved] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(900);
    const [loading, setLoading] = useState<boolean>(true);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loadingSectors, setLoadingSectors] = useState<boolean>(true);

    // Данные пользователя
    const [userId, setUserId] = useState<number | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userBalance, setUserBalance] = useState<number>(0);

    // Управление модальным окном выбора оплаты
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    // 1. Загрузка профиля пользователя (с балансом)
    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await res.json();
            if (res.ok && data.success && data.user) {
                setUserId(data.user.id);
                setUserEmail(data.user.email);
                setUserBalance(Number(data.user.balance || 0));
            }
        } catch (err) {
            console.error("Failed to load user info:", err);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            setLoadingSectors(false);
            return;
        }

        setLoadingSectors(true);
        Promise.all(sectorOptions.map(async (sector) => {
            const response = await fetch(`/api/booking/seats/${ticketId}/${sector.id}`, {
                credentials: 'include',
                cache: 'no-store'
            });
            const result = await response.json();
            if (!response.ok || !result.success || !Array.isArray(result.data)) {
                throw new Error(result.message || `Could not load availability for ${sector.name}.`);
            }
            const availableSeats = result.data.filter((seat: Seat) => seat.status === 'available').length;
            return { ...sector, totalSeats: result.data.length, availableSeats };
        })).then(availableSectors => {
            if (!cancelled) setSectors(availableSectors);
        }).catch(error => {
            console.error('Failed to load sector availability:', error);
            if (!cancelled) {
                setSectors([]);
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Availability Error',
                    message: 'Could not load live seat availability. Please reload this page and try again.'
                });
            }
        }).finally(() => {
            if (!cancelled) setLoadingSectors(false);
        });

        return () => { cancelled = true; };
    }, [ticketId]);

    // 2. Восстановление брони из localStorage при загрузке
    useEffect(() => {
        if (!userId) return;
        try {
            const savedLock = localStorage.getItem(`lock_ticket_${ticketId}`);
            if (savedLock) {
                const lock = JSON.parse(savedLock) as { userId: number; sector: Sector; seat: Seat; expiresAt: number };
                const remainingTime = Math.floor((lock.expiresAt - Date.now()) / 1000);
                if (lock.userId === userId && remainingTime > 0) {
                    setSelectedSector(lock.sector);
                    setIsReserved(true);
                    setTimeLeft(remainingTime);
                    setSelectedSeat(lock.seat);
                } else {
                    localStorage.removeItem(`lock_ticket_${ticketId}`);
                }
            }
        } catch (error) {
            console.error('Could not restore the saved seat hold:', error);
            localStorage.removeItem(`lock_ticket_${ticketId}`);
        } finally {
            setLoading(false);
        }
    }, [ticketId, userId]);

    // 3. Fetch-запрос мест
    useEffect(() => {
        if (!selectedSector) {
            setSeats([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetch(`/api/booking/seats/${ticketId}/${selectedSector.id}`, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.data)) {
                    throw new Error(result.message || 'Could not load seat availability.');
                }
                if (cancelled) return;
                let backendSeats: Seat[] = result.data;
                const savedLock = localStorage.getItem(`lock_ticket_${ticketId}`);
                if (savedLock) {
                    try {
                        const lock = JSON.parse(savedLock) as { userId: number; seat: Seat; expiresAt: number };
                        const lockedSeat = backendSeats.find(seat => String(seat.id) === String(lock.seat.id));
                        const ownsActiveHold = lock.userId === userId &&
                            lock.expiresAt > Date.now() &&
                            lockedSeat?.status === 'selected' &&
                            lockedSeat.is_mine;

                        if (ownsActiveHold) {
                            backendSeats = backendSeats.map(seat =>
                                String(seat.id) === String(lock.seat.id) ? { ...seat, is_mine: true } : seat
                            );
                        } else {
                            localStorage.removeItem(`lock_ticket_${ticketId}`);
                            setIsReserved(false);
                            setSelectedSeat(null);
                            setTimeLeft(900);
                        }
                    } catch (error) {
                        console.error('Could not validate the saved seat hold:', error);
                        localStorage.removeItem(`lock_ticket_${ticketId}`);
                        setIsReserved(false);
                        setSelectedSeat(null);
                    }
                }
                setSeats(backendSeats);
            })
            .catch(err => {
                if (cancelled) return;
                console.error("Error loading seats:", err);
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Fetch Error',
                    message: 'Failed to load live stadium grid from the cluster.'
                });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [selectedSector, ticketId, userId]);

    // 4. Логика таймера
    useEffect(() => {
        if (!isReserved) return;
        const timer = setInterval(() => {
            setTimeLeft(previous => previous > 0 ? previous - 1 : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, [isReserved]);

    // 5. Очистка при истечении таймера
    useEffect(() => {
        if (timeLeft === 0 && isReserved) {
            if (selectedSeat && selectedSector) {
                fetch('/api/booking/cancelSelected', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        ticketId: ticketId,
                        sectorId: selectedSector.id,
                        row: selectedSeat.row,
                        seat: selectedSeat.number
                    })
                })
                    .then(() => fetch(`/api/booking/seats/${ticketId}/${selectedSector.id}`, { credentials: 'include' }))
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.data) {
                            let backendSeats = Array.isArray(res.data) ? res.data : res.data.data || [];
                            setSeats(backendSeats);
                        }
                    })
                    .catch(err => console.error("Error auto-releasing seat on backend:", err));
            }

            setIsReserved(false);
            setSelectedSeat(null);
            setIsPaymentModalOpen(false);
            localStorage.removeItem(`lock_ticket_${ticketId}`);

            setModal({
                isOpen: true,
                type: 'error',
                title: 'Hold Expired',
                message: 'Your 15-minute reservation window has closed. The seat was released.'
            });
        }
    }, [timeLeft, isReserved, selectedSeat, selectedSector, ticketId, userId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const handleSeatClick = (clickedSeat: Seat) => {
        if (isReserved) return;
        if (clickedSeat.status !== 'available') return;

        if (selectedSeat && selectedSeat.id === clickedSeat.id) {
            setSelectedSeat(null);
            return;
        }

        setSelectedSeat(clickedSeat);
    };

    const handleConfirmHold = async () => {
        if (!selectedSeat || !selectedSector) return;

        try {
            const response = await fetch('/api/booking/checkSelected', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    ticketId: ticketId,
                    sectorId: selectedSector.id,
                    row: selectedSeat.row,
                    seat: selectedSeat.number
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setIsReserved(true);
                setTimeLeft(900);

                const serverSeat = result.data;
                const updatedSeat: Seat = {
                    ...selectedSeat,
                    id: String(serverSeat?.id || selectedSeat.id),
                    price: Number(serverSeat?.price || selectedSeat.price || 0)
                };

                setSelectedSeat(updatedSeat);

                const expirationTime = Date.now() + 900 * 1000;
                localStorage.setItem(`lock_ticket_${ticketId}`, JSON.stringify({
                    userId,
                    sector: selectedSector,
                    seat: updatedSeat,
                    expiresAt: expirationTime
                }));

                setSeats(prev => prev.map(s =>
                    String(s.id) === String(selectedSeat.id)
                        ? { ...s, status: 'selected' as const, is_mine: true, price: updatedSeat.price }
                        : s
                ));

                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Seat Secured',
                    message: 'Seat held successfully'
                });
            } else {
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Seat Unavailable',
                    message: result.message || "This specific seat was just taken by someone else!"
                });

                try {
                    const latestResponse = await fetch(`/api/booking/seats/${ticketId}/${selectedSector.id}`, {
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    const latestSeats = await latestResponse.json();
                    if (latestResponse.ok && latestSeats.success && Array.isArray(latestSeats.data)) {
                        setSeats(latestSeats.data);
                    }
                } catch (refreshError) {
                    console.error('Failed to refresh seats after a hold conflict:', refreshError);
                }
                setSelectedSeat(null);
            }
        } catch {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Network Failure',
                message: "Could not establish a connection to the ticket booking server."
            });
        }
    };

    const handleCancelReservation = async (askConfirm = true) => {
        if (askConfirm) {
            const confirmCancel = window.confirm(t("Are you sure you want to cancel your reservation?"));
            if (!confirmCancel) return;
        }

        const seatToRelease = selectedSeat;
        if (seatToRelease && selectedSector && isReserved) {
            try {
                const response = await fetch('/api/booking/cancelSelected', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        ticketId: ticketId,
                        sectorId: selectedSector.id,
                        row: seatToRelease.row,
                        seat: seatToRelease.number
                    })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'The server could not release this seat.');
                }
            } catch (error) {
                console.error("Failed to notify backend about cancelled lock:", error);
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Could Not Cancel Hold',
                    message: error instanceof Error ? error.message : 'The seat hold could not be released. Please try again.'
                });
                return;
            }
        }

        setIsReserved(false);
        setSelectedSeat(null);
        setIsPaymentModalOpen(false);
        localStorage.removeItem(`lock_ticket_${ticketId}`);
        if (seatToRelease) {
            setSeats(prev => prev.map(seat =>
                String(seat.id) === String(seatToRelease.id)
                    ? { ...seat, status: 'available' as const, is_mine: false }
                    : seat
            ));
        }
    };

    const handlePaymentSuccess = async (updatedBalance?: number) => {
        const purchasedSeatId = selectedSeat?.id;

        setIsPaymentModalOpen(false);
        setIsReserved(false);
        setSelectedSeat(null);
        setSeats(prev => prev.map(seat =>
            seat.id === purchasedSeatId ? { ...seat, status: 'sold' } : seat
        ));
        localStorage.removeItem(`lock_ticket_${ticketId}`);
        if (updatedBalance !== undefined) setUserBalance(updatedBalance);
        await Promise.all([fetchUserData(), refreshUser()]);

        setModal({
            isOpen: true,
            type: 'success',
            title: selectedSeat?.price === 0 ? 'Free Ticket Claimed' : 'Transaction Authorized',
            message: selectedSeat?.price === 0 ? 'Your free ticket has been added to My Tickets.' : 'Ticket successfully purchased!'
        });
    };

    const handleCloseModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.title === 'Transaction Authorized' || modal.title === 'Free Ticket Claimed') {
            navigate('/userpage');
        }
    };

    const handleSectorChange = () => {
        if (!isReserved) {
            setSelectedSector(null);
            setSelectedSeat(null);
        }
    };

    const rows = Array.from({ length: 10 }, (_, i) => i + 1);

    if (loading && seats.length === 0) {
        return (
            <div className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center">
                <div className="animate-spin border-4 w-8 h-8 border-purple-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen font-sans flex flex-col justify-between">
            <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">TicketPro</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white transition">
                            &larr; {t('Back to Events')}
                        </button>
                        <PreferenceControls />
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col items-start gap-5 px-3 py-5 sm:gap-8 sm:px-4 sm:py-8 lg:flex-row">
                <div className="flex w-full flex-grow flex-col items-center overflow-x-auto rounded-3xl border border-gray-900 bg-gray-900/20 p-3 shadow-2xl backdrop-blur-sm sm:p-8">
                    {!selectedSector ? (
                        <div className="w-full max-w-2xl text-center py-6">
                            <h2 className="text-xl font-black text-white mb-2">{t('Select Arena Sector')}</h2>
                            <p className="mb-8 text-xs text-gray-500">{t('Choose your target grandstand zone.')}</p>
                            {loadingSectors && <p className="mb-4 text-sm text-gray-400">{t('Loading live seat availability...')}</p>}
                            {!loadingSectors && sectors.length === 0 && (
                                <p className="text-sm text-red-400">{t('Seat availability could not be loaded. Reload to try again.')}</p>
                            )}
                            <div className="mx-auto grid max-w-xl grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
                                {sectors.map((sec) => (
                                    <button
                                        type="button"
                                        key={sec.id}
                                        onClick={() => setSelectedSector(sec)}
                                        disabled={loadingSectors || sec.availableSeats === 0}
                                        className={`flex h-32 flex-col justify-between rounded-2xl border bg-gray-900/40 p-3 text-center transition duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-36 sm:p-5 ${sec.color}`}
                                    >
                                        <span className="block text-xs font-black tracking-wide sm:text-sm">{t(sec.name)}</span>
                                        <div>
                                            <span className="text-xs text-gray-400 block mt-2">{sec.availableSeats} {t('Left')}</span>
                                            <span className="text-[10px] text-gray-600 block">{t('out of')} {sec.totalSeats}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-full flex items-center justify-between mb-8 border-b border-gray-900 pb-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSectorChange}
                                        disabled={isReserved}
                                        className={`text-xs px-3 py-1.5 rounded-xl border border-gray-800 transition ${isReserved ? 'opacity-50 cursor-not-allowed text-gray-600' : 'bg-gray-900 hover:bg-gray-800 text-purple-400'}`}
                                    >
                                        &larr; {t('Change Sector')}
                                    </button>
                                    <span className="text-sm font-black text-white">{t('Active Sector')}: <span className="text-purple-400">{t(selectedSector.name)}</span></span>
                                </div>
                                <div className="w-48 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-60"></div>
                            </div>

                            <div className="w-full max-w-xl h-3 bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-600 rounded-b-3xl opacity-70 shadow-[0_10px_30px_rgba(99,102,241,0.4)] mb-16 text-center text-[10px] tracking-[0.3em] font-bold text-indigo-200 pt-4 uppercase">
                                {t('STADIUM FIELD / ARENA STAGE')}
                            </div>

                            <div className="flex min-w-[750px] flex-col gap-3 rounded-2xl border border-gray-900 bg-gray-950/40 p-4">
                                {rows.map(rowNum => {
                                    const rowSeats = seats.filter(s => s.row === rowNum);
                                    const curvePadding = Math.abs(5.5 - rowNum) * 4;

                                    return (
                                        <div
                                            key={rowNum}
                                            className="flex items-center justify-center gap-1.5"
                                            style={{ paddingLeft: `${curvePadding}px`, paddingRight: `${curvePadding}px` }}
                                        >
                                            <span className="w-6 text-[10px] font-mono text-gray-600 font-bold text-right mr-3 select-none">R{rowNum}</span>
                                            {rowSeats.map((seat) => {
                                                const isCurrentSelection = selectedSeat !== null && String(selectedSeat.id) === String(seat.id);
                                                const isOtherHold = seat.status === 'selected' && !seat.is_mine;
                                                const isSelected = isCurrentSelection || (seat.status === 'selected' && seat.is_mine);
                                                const isReservedStatus = seat.status === 'sold';
                                                const aisleClass = seat.number === 4 || seat.number === 12 ? 'mr-6' : '';

                                                return (
                                                    <button
                                                        key={seat.id}
                                                        disabled={isReservedStatus || isOtherHold || (isReserved && !isSelected)}
                                                        onClick={() => handleSeatClick(seat)}
                                                        className={`h-7 w-7 text-[9px] font-bold rounded-md border transition-all duration-150 ${aisleClass} ${isReservedStatus ? "bg-red-950/10 border-red-900/20 text-red-900/40 cursor-not-allowed" :
                                                            isOtherHold ? "cursor-not-allowed border-amber-900/60 bg-amber-950/40 text-amber-500" :
                                                            isSelected ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-105" :
                                                                "bg-gray-900 border-gray-800 text-gray-500 hover:border-purple-500/50 hover:text-gray-200 hover:scale-105"
                                                            }`}
                                                        title={`${t(selectedSector.name)} • ${t('Row')} ${seat.row} • ${t('Seat')} ${seat.number} • ${t(isReservedStatus ? 'Sold' : isOtherHold ? 'Held by another user' : isSelected ? 'Selected' : 'Available')}`}
                                                        aria-label={`${t(selectedSector.name)}, ${t('Row')} ${seat.row}, ${t('Seat')} ${seat.number}, ${t(isReservedStatus ? 'Sold' : isOtherHold ? 'Held by another user' : isSelected ? 'Selected' : 'Available')}`}
                                                    >
                                                        {seat.number}
                                                    </button>
                                                );
                                            })}
                                            <span className="w-6 text-[10px] font-mono text-gray-600 font-bold text-left ml-3 select-none">R{rowNum}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 flex w-full flex-wrap justify-center gap-x-5 gap-y-3 border-t border-gray-900/60 pt-6 text-xs text-gray-400 sm:mt-12 sm:gap-8">
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-gray-900 border border-gray-800 rounded-md"></span> {t('Available Seat')}</div>
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-amber-950 border border-amber-900 rounded-md"></span> {t('Held')}</div>
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-md"></span> {t('Selected')}</div>
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-red-950/20 border border-red-900/30 rounded-md"></span> {t('Sold Out')}</div>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-full lg:w-80 bg-gray-900 border border-gray-900 rounded-3xl p-6 shrink-0 shadow-xl">
                    <h2 className="text-xs font-bold tracking-wider text-gray-400 uppercase border-b border-gray-800 pb-4">{t('Checkout Panel')}</h2>
                    {selectedSeat && selectedSector ? (
                        <div className="mt-5 space-y-4">
                            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">{t('Allocation')}</span>
                                <p className="text-lg font-extrabold text-white mt-1">{t('Row')} {selectedSeat.row}, {t('Seat')} {selectedSeat.number}</p>
                                <span className="text-[11px] text-purple-400 font-medium block mt-1">{t(selectedSector.name)}</span>
                                <span className="text-xs text-emerald-400 font-bold block mt-2">
                                    {selectedSeat.price === 0 ? t('Free ticket') : `${t('Price')}: $${selectedSeat.price}`}
                                </span>
                            </div>

                            {!isReserved ? (
                                <button
                                    onClick={handleConfirmHold}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-lg shadow-purple-950/20"
                                >
                                    {t('Confirm & Lock Seat')}
                                </button>
                            ) : (
                                <div className="bg-yellow-950/10 border border-yellow-900/30 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">{t('Reservation Active')}</span>
                                        <span className="text-sm font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-900/20">{formatTime(timeLeft)}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        {t('The stadium computing cluster has locked this seat.')}
                                    </p>

                                    <button
                                        onClick={() => setIsPaymentModalOpen(true)}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-lg shadow-emerald-950/20"
                                    >
                                        {selectedSeat.price === 0 ? t('Claim Free Ticket') : t('Proceed to Payment')}
                                    </button>

                                    <button
                                        onClick={() => handleCancelReservation(true)}
                                        className="w-full bg-transparent hover:bg-red-950/20 text-red-400 border border-red-900/40 py-2.5 rounded-xl font-bold text-[11px] tracking-wider transition uppercase"
                                    >
                                        {t('Cancel Reservation')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-600 text-xs border border-dashed border-gray-800 rounded-2xl mt-5 px-4 leading-relaxed">
                            {!selectedSector
                                ? t("Select a conceptual stadium sector zone inside the matrix layout first.")
                                : t("Click on any open operational location within the grandstand block matrix to assign booking nodes.")
                            }
                        </div>
                    )}
                </div>
            </main>

            {/* --- 💳 МОДАЛЬНОЕ ОКНО ВЫБОРА ОПЛАТЫ --- */}
            {selectedSeat && selectedSector && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    ticketId={ticketId}
                    sectorId={selectedSector.id}
                    row={selectedSeat.row}
                    seat={selectedSeat.number}
                    seatId={Number(selectedSeat.id)}
                    userId={userId}
                    userEmail={userEmail}
                    price={selectedSeat.price}
                    userBalance={userBalance}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {/* --- ОВЕРЛЕЙ УВЕДОМЛЕНИЙ --- */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            {modal.type === 'success' && <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold">✓</div>}
                            {modal.type === 'error' && <div className="h-8 w-8 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 font-bold">✕</div>}
                            {modal.type === 'info' && <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold">i</div>}
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">{t(modal.title)}</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">{t(modal.message)}</p>
                        <button
                            onClick={handleCloseModal}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition border ${modal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' :
                                modal.type === 'error' ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white' :
                                    'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
                                }`}
                        >
                            {t('Acknowledge')}
                        </button>
                    </div>
                </div>
            )}

            <footer className="border-t border-gray-900 bg-gray-950 py-5 text-center text-[10px] text-gray-600 tracking-wide">
                &copy; 2026 TicketPro Ecosystem. {t('High-Performance Concierge Architecture.')}
            </footer>
        </div>
    );
};