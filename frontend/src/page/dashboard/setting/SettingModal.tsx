import React, { useEffect, useState } from 'react';
import { usePreferences } from '../../../context/preferences-context';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: {
        id: number;
        username?: string;
        email?: string;
        role?: string;
        balance?: string | number;
        avatar?: string;
    } | null;
    onProfileUpdate?: () => void | Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onProfileUpdate
}) => {
    const { t } = usePreferences();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUsername(currentUser?.username || '');
            setMessage('');
            setIsError(false);
        }
    }, [currentUser, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(t(data.message || 'Could not update profile.'));
            }

            await onProfileUpdate?.();
            setMessage(t('Profile updated successfully.'));
            window.setTimeout(onClose, 800);
        } catch (error) {
            setIsError(true);
            setMessage(error instanceof Error ? error.message : t('Could not connect to the server.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
                type="button"
                aria-label={t('Close settings')}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">{t('Profile Settings')}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-lg text-gray-400 transition hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                            {t('Email')}
                        </label>
                        <input
                            type="email"
                            value={currentUser?.email || ''}
                            disabled
                            className="w-full cursor-not-allowed rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3 text-sm text-gray-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-400">
                            {t('Username')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={event => setUsername(event.target.value)}
                            minLength={1}
                            maxLength={100}
                            required
                            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white transition focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div className="text-xs text-gray-400">
                        {t('Account type:')} {currentUser?.role === 'admin' ? t('Administrator') : t('User')}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 rounded-xl bg-gray-800 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? t('Saving...') : t('Save')}
                        </button>
                    </div>
                </form>

                {message && (
                    <p className={`mt-4 text-center text-sm font-semibold ${isError ? 'text-red-400' : 'text-green-400'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};
