import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserFromToken } from '../../utils/auth';

interface Seat {
    id: string;
    row: number;
    number: number;
    status: 'available' | 'reserved' | 'selected';
}

interface Sector {
    id: string;
    name: string;
    color: string;
    totalSeats: number;
    availableSeats: number;
}

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

    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [isReserved, setIsReserved] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(900);
    const [loading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<number | null>(null);

    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    const sectors: Sector[] = [
        { id: 'sec-a', name: 'Sector A (West)', color: 'border-purple-500 hover:bg-purple-500/10', totalSeats: 160, availableSeats: 42 },
        { id: 'sec-b', name: 'Sector B (North)', color: 'border-blue-500 hover:bg-blue-500/10', totalSeats: 160, availableSeats: 105 },
        { id: 'sec-c', name: 'Sector C (East)', color: 'border-pink-500 hover:bg-pink-500/10', totalSeats: 160, availableSeats: 12 },
        { id: 'sec-d', name: 'Sector D (South)', color: 'border-indigo-500 hover:bg-indigo-500/10', totalSeats: 160, availableSeats: 88 },
        { id: 'vip-1', name: 'VIP Lounge Lounge 1', color: 'border-amber-500 hover:bg-amber-500/10 text-amber-400', totalSeats: 160, availableSeats: 15 },
    ];

    useEffect(() => {
        const currentUser = getUserFromToken();
        setUser(currentUser.id);
    }, []);

    
    useEffect(() => {
        const savedLock = localStorage.getItem(`lock_ticket_${ticketId}`);
        if (savedLock) {
            const { sector, seat, expiresAt } = JSON.parse(savedLock);
            const remainingTime = Math.floor((expiresAt - Date.now()) / 1000);

            if (remainingTime > 0) {
                setSelectedSector(sector);
                setIsReserved(true);
                setTimeLeft(remainingTime);
                setSelectedSeat(seat);
            } else {
                localStorage.removeItem(`lock_ticket_${ticketId}`);
            }
        }
        setLoading(false);
    }, [ticketId]);

  
    useEffect(() => {
        if (!selectedSector) {
            setSeats([]);
            return;
        }

        setLoading(true);

        fetch(`/api/booking/seats/${ticketId}/${selectedSector.id}`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    let backendSeats = res.data;

                    // Восстанавливаем локальный статус 'selected', если у юзера есть активная бронь
                    const savedLock = localStorage.getItem(`lock_ticket_${ticketId}`);
                    if (savedLock) {
                        const { seat, expiresAt } = JSON.parse(savedLock);
                        if (Math.floor((expiresAt - Date.now()) / 1000) > 0) {
                            backendSeats = backendSeats.map((s: Seat) =>
                                s.id === seat.id ? { ...s, status: 'selected' as const } : s
                            );
                        }
                    }

                    setSeats(backendSeats);
                }
            })
            .catch(err => {
                console.error("Error loading seats:", err);
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Fetch Error',
                    message: 'Failed to load live stadium grid from the cluster.'
                });
            })
            .finally(() => setLoading(false));

    }, [selectedSector, ticketId]);

    // 3. Логика таймера удержания
    useEffect(() => {
        if (!isReserved || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [isReserved, timeLeft]);

    // 4. Очистка при истечении таймера
    useEffect(() => {
        if (timeLeft === 0 && isReserved) {
            handleCancelReservation(false);
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Hold Expired',
                message: 'Your 15-minute reservation window has closed. The seat was released.'
            });
        }
    }, [timeLeft, isReserved]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const handleSeatClick = async (clickedSeat: Seat) => {
        if (isReserved) return;
        if (clickedSeat.status === 'reserved') return;

        if (clickedSeat.status === 'selected') {
            setSelectedSeat(null);
            setSeats(prev => prev.map(s => s.id === clickedSeat.id ? { ...s, status: 'available' } : s));
            return;
        }

        try {
            const response = await fetch('/api/booking/checkSelected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user,
                    ticketId: ticketId,
                    sectorId: selectedSector?.id,
                    row: clickedSeat.row,
                    seat: clickedSeat.number
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setSelectedSeat(clickedSeat);
                setIsReserved(true);
                setTimeLeft(900);

                const expirationTime = Date.now() + 900 * 1000;
                localStorage.setItem(`lock_ticket_${ticketId}`, JSON.stringify({
                    sector: selectedSector,
                    seat: clickedSeat,
                    expiresAt: expirationTime
                }));

                setSeats(prev => prev.map(s => {
                    if (s.id === clickedSeat.id) return { ...s, status: 'selected' as const };
                    if (s.status === 'selected') return { ...s, status: 'available' as const };
                    return s;
                }));

                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Seat Secured',
                    message: `Successfully claimed an active hold on Row ${clickedSeat.row}, Seat ${clickedSeat.number}.`
                });
            } else {
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Seat Unavailable',
                    message: result.message || "This specific seat is already taken."
                });

                // Перекрашиваем в зарезервированное, так как бэкенд отказал
                setSeats(prev => prev.map(s => s.id === clickedSeat.id ? { ...s, status: 'reserved' as const } : s));
            }
        } catch (error) {
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
            const confirmCancel = window.confirm("Are you sure you want to cancel your reservation?");
            if (!confirmCancel) return;
        }

        setIsReserved(false);
        setSelectedSeat(null);
        localStorage.removeItem(`lock_ticket_${ticketId}`);
        setSeats(prev => prev.map(s => s.status === 'selected' ? { ...s, status: 'available' as const } : s));
    };

    const handlePayment = () => {
        localStorage.removeItem(`lock_ticket_${ticketId}`);
        setModal({
            isOpen: true,
            type: 'success',
            title: 'Transaction Authorized',
            message: `Payment successful! Row ${selectedSeat?.row}, Seat ${selectedSeat?.number} is secured.`
        });
    };

    const handleCloseModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.title === 'Transaction Authorized') {
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
                    <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white transition">
                        &larr; Back to Events
                    </button>
                </div>
            </header>

            <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-grow w-full bg-gray-900/20 border border-gray-900 rounded-3xl p-8 flex flex-col items-center overflow-x-auto shadow-2xl backdrop-blur-sm">
                    {!selectedSector ? (
                        <div className="w-full max-w-2xl text-center py-6">
                            <h2 className="text-xl font-black text-white mb-2">Select Arena Sector</h2>
                            <p className="text-xs text-gray-500 mb-10">Choose your target grandstand zone.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto">
                                {sectors.map((sec) => (
                                    <div
                                        key={sec.id}
                                        onClick={() => setSelectedSector(sec)}
                                        className={`border rounded-2xl p-5 cursor-pointer transition duration-300 transform hover:-translate-y-1 bg-gray-900/40 text-center flex flex-col justify-between h-36 ${sec.color}`}
                                    >
                                        <span className="text-sm font-black tracking-wide block">{sec.name}</span>
                                        <div>
                                            <span className="text-xs text-gray-400 block mt-2">{sec.availableSeats} Left</span>
                                            <span className="text-[10px] text-gray-600 block">out of {sec.totalSeats}</span>
                                        </div>
                                    </div>
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
                                        &larr; Change Sector
                                    </button>
                                    <span className="text-sm font-black text-white">Active Sector: <span className="text-purple-400">{selectedSector.name}</span></span>
                                </div>
                                <div className="w-48 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-60"></div>
                            </div>

                            <div className="w-full max-w-xl h-3 bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-600 rounded-b-3xl opacity-70 shadow-[0_10px_30px_rgba(99,102,241,0.4)] mb-16 text-center text-[10px] tracking-[0.3em] font-bold text-indigo-200 pt-4 uppercase">
                                STADIUM FIELD / ARENA STAGE
                            </div>

                            <div className="flex flex-col gap-3 min-w-[750px] p-4 bg-gray-950/40 rounded-2xl border border-gray-900">
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
                                                const isSelected = seat.status === 'selected';
                                                const isReservedStatus = seat.status === 'reserved';
                                                const aisleClass = seat.number === 4 || seat.number === 12 ? 'mr-6' : '';

                                                return (
                                                    <button
                                                        key={seat.id}
                                                        disabled={isReservedStatus || (isReserved && !isSelected)}
                                                        onClick={() => handleSeatClick(seat)}
                                                        className={`h-7 w-7 text-[9px] font-bold rounded-md border transition-all duration-150 ${aisleClass} ${isReservedStatus ? "bg-red-950/10 border-red-900/20 text-red-900/40 cursor-not-allowed" :
                                                                isSelected ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-105" :
                                                                    "bg-gray-900 border-gray-800 text-gray-500 hover:border-purple-500/50 hover:text-gray-200 hover:scale-105"
                                                            }`}
                                                        title={`${selectedSector.name} • Row ${seat.row} • Seat ${seat.number}`}
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

                            <div className="flex justify-center gap-8 mt-12 border-t border-gray-900/60 pt-6 w-full text-xs text-gray-400">
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-gray-900 border border-gray-800 rounded-md"></span> Available Seat</div>
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-md"></span> Selected Seat</div>
                                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-red-950/20 border border-red-900/30 rounded-md"></span> Sold Out</div>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-full lg:w-80 bg-gray-900 border border-gray-900 rounded-3xl p-6 shrink-0 shadow-xl">
                    <h2 className="text-xs font-bold tracking-wider text-gray-400 uppercase border-b border-gray-800 pb-4">Checkout Panel</h2>
                    {selectedSeat && selectedSector ? (
                        <div className="mt-5 space-y-4">
                            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Allocation</span>
                                <p className="text-lg font-extrabold text-white mt-1">Row {selectedSeat.row}, Seat {selectedSeat.number}</p>
                                <span className="text-[11px] text-purple-400 font-medium block mt-1">{selectedSector.name}</span>
                            </div>
                            {isReserved && (
                                <div className="bg-yellow-950/10 border border-yellow-900/30 p-4 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Redis Hold Active</span>
                                        <span className="text-sm font-mono font-bold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-900/20">{formatTime(timeLeft)}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        The stadium computing cluster has locked this seat.
                                    </p>
                                    <button
                                        onClick={handlePayment}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-lg shadow-emerald-950/20"
                                    >
                                        Authorize Payment
                                    </button>
                                    <button
                                        onClick={() => handleCancelReservation(true)}
                                        className="w-full bg-transparent hover:bg-red-950/20 text-red-400 border border-red-900/40 py-2.5 rounded-xl font-bold text-[11px] tracking-wider transition uppercase"
                                    >
                                        Cancel Lock
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-600 text-xs border border-dashed border-gray-800 rounded-2xl mt-5 px-4 leading-relaxed">
                            {!selectedSector
                                ? "Select a conceptual stadium sector zone inside the matrix layout first."
                                : "Click on any open operational location within the grandstand block matrix to assign booking nodes."
                            }
                        </div>
                    )}
                </div>
            </main>

            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            {modal.type === 'success' && <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold">✓</div>}
                            {modal.type === 'error' && <div className="h-8 w-8 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 font-bold">✕</div>}
                            {modal.type === 'info' && <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold">i</div>}
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">{modal.title}</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">{modal.message}</p>
                        <button
                            onClick={handleCloseModal}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition border ${modal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' :
                                    modal.type === 'error' ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white' :
                                        'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
                                }`}
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            )}

            <footer className="border-t border-gray-900 bg-gray-950 py-5 text-center text-[10px] text-gray-600 tracking-wide">
                &copy; 2026 TicketPro Ecosystem. High-Performance Concierge Architecture.
            </footer>
        </div>
    );
};