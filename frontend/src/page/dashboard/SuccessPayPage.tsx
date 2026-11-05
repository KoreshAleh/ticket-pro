import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePreferences } from '../../context/preferences-context';

export const SuccessPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = usePreferences();
    const [loading, setLoading] = useState<boolean>(true);
    const [status, setStatus] = useState<'success' | 'pending' | 'error'>('success');

    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        let cancelled = false;

        if (!sessionId) {
            setStatus('error');
            setLoading(false);
            return () => {
                cancelled = true;
            };
        }

        const verifyPayment = async () => {
            try {
                for (let attempt = 0; attempt < 30; attempt++) {
                    const response = await fetch(`/api/payment/verify/${encodeURIComponent(sessionId)}`, {
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(result.message || 'Payment could not be verified.');
                    }

                    if (result.paid && result.ticketId) {
                        localStorage.removeItem(`lock_ticket_${result.ticketId}`);
                    }

                    if (!result.paid) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }

                    if (result.completed) {
                        if (!cancelled) setStatus('success');
                        return;
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                if (!cancelled) setStatus('pending');
            } catch (error) {
                console.error('Ticket payment verification failed:', error);
                if (!cancelled) setStatus('error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void verifyPayment();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    if (loading) {
        return (
            <div className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center">
                <div className="animate-spin border-4 w-8 h-8 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="bg-gray-950 text-gray-100 min-h-screen flex flex-col items-center justify-center px-4">
            <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center shadow-2xl">
                {status === 'success' ? (
                    <>
                        <div className="mx-auto h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 text-3xl font-bold mb-6">
                            ✓
                        </div>
                        <h1 className="text-2xl font-black text-white mb-3">{t('Payment Successful!')}</h1>
                        <p className="text-xs text-gray-400 leading-relaxed mb-8">
                            {t('Your transaction was authorized. The seat reservation is locked into the registry and your ticket has been generated.')}
                        </p>
                        <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850 mb-8 text-left">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">{t('Session Identifier')}</span>
                            <span className="text-[11px] font-mono text-emerald-400 break-all block mt-1">{sessionId}</span>
                        </div>
                    </>
                ) : status === 'pending' ? (
                    <>
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-3xl font-bold">
                            …
                        </div>
                        <h1 className="mb-3 text-2xl font-black text-white">{t('Payment Received')}</h1>
                        <p className="mb-8 text-xs leading-relaxed text-gray-400">
                            {t('Your payment is confirmed, but ticket registration is still processing. Check your dashboard shortly; do not pay again.')}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 text-3xl font-bold mb-6">
                            ✕
                        </div>
                        <h1 className="text-2xl font-black text-white mb-3">{t('Verification Failed')}</h1>
                        <p className="text-xs text-gray-400 leading-relaxed mb-8">
                            {t('We could not confirm that your ticket was registered. Please check your purchased tickets before trying to pay again. If the payment was charged, contact support with this session identifier.')}
                        </p>
                        {sessionId && (
                            <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850 mb-8 text-left">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">{t('Session Identifier')}</span>
                                <span className="text-[11px] font-mono text-emerald-400 break-all block mt-1">{sessionId}</span>
                            </div>
                        )}
                    </>
                )}

                <button
                    onClick={() => navigate('/userpage')}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-lg shadow-emerald-950/20"
                >
                    {t('Go to Dashboard')}
                </button>
            </div>
        </div>
    );
};