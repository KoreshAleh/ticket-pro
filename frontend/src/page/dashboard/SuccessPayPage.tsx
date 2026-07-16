import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const SuccessPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [status, setStatus] = useState<'success' | 'error'>('success');

    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            setLoading(false);
            return;
        }

        // Опционально: здесь можно сделать проверочный запрос на бэкенд, 
        // чтобы фронтенд убедился, что Stripe закрыл сессию со статусом "paid".
        // fetch(`/api/payment/verify?session_id=${sessionId}`)
        //   .then(res => res.json())
        //   .then(data => { if (!data.success) setStatus('error'); })
        
        setLoading(false);
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
                        <h1 className="text-2xl font-black text-white mb-3">Payment Successful!</h1>
                        <p className="text-xs text-gray-400 leading-relaxed mb-8">
                            Your transaction was authorized. The seat reservation is locked into the registry and your ticket has been generated.
                        </p>
                        <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850 mb-8 text-left">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Session Identifier</span>
                            <span className="text-[11px] font-mono text-emerald-400 break-all block mt-1">{sessionId}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 text-3xl font-bold mb-6">
                            ✕
                        </div>
                        <h1 className="text-2xl font-black text-white mb-3">Verification Failed</h1>
                        <p className="text-xs text-gray-400 leading-relaxed mb-8">
                            We could not verify your payment session token. Please contact our system support.
                        </p>
                    </>
                )}

                <button
                    onClick={() => navigate('/userpage')}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-3 rounded-xl font-bold text-xs tracking-wider transition uppercase shadow-lg shadow-emerald-950/20"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
};