import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { usePreferences } from '../../context/preferences-context';

type VerificationState = 'checking' | 'success' | 'pending' | 'error';

export const SuccessTopUp: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const { t } = usePreferences();
    const [state, setState] = useState<VerificationState>('checking');
    const [message, setMessage] = useState('');
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        let cancelled = false;
        if (!sessionId) {
            setState('error');
            setMessage(t('Stripe payment session is missing.'));
            return;
        }

        const verify = async () => {
            const deadline = Date.now() + 30_000;
            while (!cancelled && Date.now() < deadline) {
                try {
                    const response = await fetch(`/api/payment/verify/${encodeURIComponent(sessionId)}`, {
                        credentials: 'include',
                        cache: 'no-store'
                    });
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(t(result.message || 'Could not verify the payment.'));
                    }
                    if (result.paid && result.completed && result.type === 'BALANCE_TOPUP') {
                        await refreshUser();
                        if (!cancelled) setState('success');
                        return;
                    }
                    if (!result.paid) {
                        await new Promise(resolve => window.setTimeout(resolve, 1500));
                        continue;
                    }
                    throw new Error(t('This payment session is not a balance top-up.'));
                } catch (error) {
                    if (!cancelled) {
                        setState('error');
                        setMessage(error instanceof Error ? error.message : t('Could not verify the payment.'));
                    }
                    return;
                }
            }
            if (!cancelled) {
                setState('pending');
                setMessage(t('Payment confirmation is taking longer than expected. Your balance will update when Stripe confirms it.'));
            }
        };

        void verify();
        return () => { cancelled = true; };
    }, [sessionId, refreshUser, t]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-gray-100">
            <section className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
                {state === 'checking' ? (
                    <>
                        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                        <h1 className="text-xl font-bold">{t('Verifying payment')}</h1>
                    </>
                ) : (
                    <>
                        <div className={`mb-5 text-4xl font-bold ${state === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {state === 'success' ? '✓' : state === 'error' ? '✕' : '…'}
                        </div>
                        <h1 className="text-xl font-bold">
                            {state === 'success' ? t('Balance topped up') : state === 'pending' ? t('Payment pending') : t('Payment verification failed')}
                        </h1>
                        {message && <p className="mt-3 text-sm text-gray-400">{message}</p>}
                    </>
                )}
                <button
                    type="button"
                    onClick={() => navigate('/userpage')}
                    disabled={state === 'checking'}
                    className="mt-7 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                    {t('Return to dashboard')}
                </button>
            </section>
        </main>
    );
};
