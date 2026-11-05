import React, { useState } from 'react';
import { usePreferences } from '../../context/preferences-context';

interface PaymentModalProps {
    isOpen: boolean;
    ticketId: number;
    sectorId: string;
    row: number;
    seat: number;
    seatId: number;
    userId: number | null;
    userEmail: string | null;
    price: number;
    userBalance: number;
    onClose: () => void;
    onSuccess: (balance?: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    ticketId,
    sectorId,
    row,
    seat,
    seatId,
    userId,
    userEmail,
    price,
    userBalance,
    onClose,
    onSuccess
}) => {
    const { t } = usePreferences();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isBalanceEnough = userBalance >= price;

    const handlePayWithStripe = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/payment/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount: Math.round(price * 100),
                    currency: 'usd',
                    userId: userId,
                    userEmail: userEmail || 'user@example.com',
                    ticketId: ticketId,
                    sectorId: sectorId,
                    row: row,
                    seatNumId: Number(seatId)
                })
            });

            const data = await res.json();
            if (res.ok && data.url) {
                try {
                    const lockKey = `lock_ticket_${ticketId}`;
                    const lock = JSON.parse(localStorage.getItem(lockKey) || 'null');
                    if (lock?.userId === userId && String(lock.seat?.id) === String(seatId)) {
                        lock.expiresAt = data.expiresAt * 1000;
                        localStorage.setItem(lockKey, JSON.stringify(lock));
                    }
                } catch (storageError) {
                    console.error('Could not update the saved seat hold expiry:', storageError);
                }
                window.location.href = data.url;
            } else {
                throw new Error(data.error || data.message || "Failed to initiate Stripe session");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePayWithBalance = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/booking/buy-with-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userId: userId,
                    ticketId: ticketId,
                    sectorId: sectorId,
                    row: row,
                    seat: seat
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onSuccess(Number.isFinite(Number(data.balance)) ? Number(data.balance) : undefined);
            } else {
                throw new Error(data.message || 'Payment failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimFreeTicket = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/booking/claim-free', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ticketId, sectorId, row, seat })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Could not claim this free ticket.');
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not claim this free ticket.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                        {price === 0 ? t('Claim Free Ticket') : t('Select Payment Method')}
                    </h3>
                    <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-white text-xs font-bold">✕</button>
                </div>

                <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850 space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>{t('Total Price:')}</span>
                        <span className="text-emerald-400 font-bold">{price === 0 ? t('Free') : `$${price}`}</span>
                    </div>
                    {price > 0 && (
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>{t('Your Balance:')}</span>
                            <span className="text-white font-bold">${userBalance}</span>
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-900/50">{error}</p>}

                {price === 0 ? (
                    <button
                        type="button"
                        onClick={handleClaimFreeTicket}
                        disabled={loading}
                        className="w-full rounded-xl border border-emerald-400 bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-950/40 transition hover:from-emerald-500 hover:to-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? t('Claiming ticket...') : t('Claim free ticket')}
                    </button>
                ) : <div className="space-y-3 pt-2">
                    <button
                        onClick={handlePayWithBalance}
                        disabled={loading || !isBalanceEnough}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-between border ${
                            isBalanceEnough 
                                ? 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-950/40' 
                                : 'bg-gray-950 border-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        <span>{t('Pay with Account Balance')}</span>
                        {!isBalanceEnough && <span className="text-[10px] text-red-400 lowercase font-normal">({t('Insufficient funds')})</span>}
                    </button>

                    <button
                        onClick={handlePayWithStripe}
                        disabled={loading}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition flex items-center justify-between"
                    >
                        <span>{t('Pay with Card (Stripe)')}</span>
                        <span className="text-[10px] text-gray-400 font-normal">💳 {t('Stripe Gateway')}</span>
                    </button>
                </div>}

                <button onClick={onClose} disabled={loading} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition pt-2 block">
                    {t('Cancel')}
                </button>
            </div>
        </div>
    );
};