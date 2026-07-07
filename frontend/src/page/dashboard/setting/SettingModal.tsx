import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: {
        id: number,
        username: string,
        email: string,
        role: string
        balance?: string | number,
        avatar?: any
    } | null;
    onProfileUpdate?: (updatedUser: { username: string }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    onProfileUpdate
}) => {
    const [username, setUsername] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);

    // Синхронизируем стейт, когда модалка открывается и данные юзера подгружены
    useEffect(() => {
        if (currentUser?.username) {
            setUsername(currentUser.username);
        }
    }, [currentUser, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const token = localStorage.getItem('token');
            // Здесь твой роут бэкенда для обновления профиля
            const response = await fetch('/api/user/update', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Не удалось обновить профиль');
            }

            setIsError(false);
            setMessage('Данные успешно обновлены!');

            // Если передали функцию обновления, вызываем её, чтобы обновить стейт на главной
            if (onProfileUpdate) {
                onProfileUpdate({ username });
            }

            setTimeout(() => {
                setMessage('');
                onClose();
            }, 1000);

        } catch (err: any) {
            setIsError(true);
            setMessage(err.message || 'Ошибка соединения с сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Задний фон с размытием */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Карточка настроек */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>⚙️</span> Настройки профиля
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition text-lg"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {/* Email (Заблокирован для изменения, чисто для инфы) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Электронная почта
                        </label>
                        <input
                            type="email"
                            value={currentUser?.email || 'user@example.com'}
                            disabled
                            className="w-full bg-gray-950/50 border border-gray-850 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed text-sm focus:outline-none"
                        />
                    </div>

                    {/* Имя пользователя (Можно редактировать) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                            Имя пользователя
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ваше имя"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition text-sm"
                            required
                        />
                    </div>

                    {/* Роль в системе */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                            Ваш статус
                        </label>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/30 border border-purple-900/50 text-xs font-medium text-purple-300">
                            🛡️ {currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-850 hover:bg-gray-800 text-gray-300 font-medium py-2.5 rounded-xl transition text-sm text-center"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 font-medium py-2.5 rounded-xl transition text-sm text-center ${loading
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-98'
                                }`}
                        >
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </form>

                {/* Уведомления об успехе/ошибке */}
                {message && (
                    <p className={`mt-4 text-center text-sm font-semibold ${isError ? 'text-red-400' : 'text-green-400'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};