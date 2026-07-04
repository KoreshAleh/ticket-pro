import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
    const navigate = useNavigate()

    // 1. Стейты для контроля инпутов
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // 2. Стейты для статуса запроса
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    // 3. Функция отправки формы
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);
         localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Если бэкенд вернул ошибку (например, 400 или 409)
                setIsError(true);
                setMessage(data.message || 'Что-то пошло не так');
            } else {
                // Если всё прошло успешно (статус 201)
                setIsError(false);
                

                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role)
                localStorage.setItem('isAuthenticated', 'true')




                setTimeout(() => {
                    navigate('/userpage');
                }, 1000);

                setTimeout(() => {
                    setUsername('');
                    setEmail('');
                    setPassword('');
                }, 1100);
                // Очищаем поля формы

            }
        } catch (err) {
            console.error('Ошибка при отправке:', err);
            setIsError(true);
            setMessage('Не удалось связаться с сервером. Проверь бэкенд!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{
                backgroundColor: '#fff',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '350px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Регистрация (React + TS)</h2>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="text"
                        placeholder="Имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Электронная почта"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: loading ? '#aaa' : '#007bff',
                            color: '#fff',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? 'Регистрация...' : 'Создать аккаунт'}
                    </button>
                    <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
                        Уже есть аккаунт? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Войти</Link>
                    </p>
                </form>

                {/* 4. Вывод сообщений (успех зеленым, ошибка красным) */}
                {message && (
                    <p style={{
                        marginTop: '15px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: isError ? '#dc3545' : '#28a745'
                    }}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

export default Register;