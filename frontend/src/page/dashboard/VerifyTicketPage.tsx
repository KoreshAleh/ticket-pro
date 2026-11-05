import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePreferences } from '../../context/preferences-context';

interface TicketDetails {
    title: string;
    event_date: string;
    sector_id: string;
    row_number: number;
    seat_number: number;
}

type VerificationState = 'loading' | 'valid' | 'invalid' | 'error';

export const VerifyTicketPage: React.FC = () => {
    const { token } = useParams();
    const { t } = usePreferences();
    const [state, setState] = useState<VerificationState>('loading');
    const [ticket, setTicket] = useState<TicketDetails | null>(null);

    useEffect(() => {
        let cancelled = false;
        const verify = async () => {
            try {
                const response = await fetch(`/api/ticket/verify/${encodeURIComponent(token || '')}`, {
                    cache: 'no-store'
                });
                const result = await response.json();
                if (cancelled) return;
                if (response.status === 404) {
                    setState('invalid');
                    return;
                }
                if (!response.ok || !result.success || !result.valid) {
                    throw new Error(result.message || 'Ticket verification is unavailable.');
                }
                setTicket(result.data);
                setState('valid');
            } catch {
                if (!cancelled) setState('error');
            }
        };
        void verify();
        return () => { cancelled = true; };
    }, [token]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-gray-100">
            <section className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
                {state === 'loading' ? (
                    <>
                        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                        <h1 className="text-xl font-bold">{t('Verifying ticket')}</h1>
                    </>
                ) : state === 'valid' && ticket ? (
                    <>
                        <div className="mb-4 text-4xl font-bold text-emerald-400">✓</div>
                        <h1 className="text-xl font-bold text-emerald-300">{t('Valid ticket')}</h1>
                        <p className="mt-4 font-semibold">{ticket.title}</p>
                        <p className="mt-2 text-sm text-gray-400">
                            {new Date(ticket.event_date).toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                            {t(ticket.sector_id)} · {t('Row')} {ticket.row_number} · {t('Seat')} {ticket.seat_number}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="mb-4 text-4xl font-bold text-red-400">✕</div>
                        <h1 className="text-xl font-bold">{t(state === 'invalid' ? 'Invalid ticket' : 'Verification unavailable')}</h1>
                        <p className="mt-3 text-sm text-gray-400">
                            {t(state === 'invalid' ? 'This QR code does not match a valid purchased ticket.' : 'Please try again later.')}
                        </p>
                    </>
                )}
            </section>
        </main>
    );
};
