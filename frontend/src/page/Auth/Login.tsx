import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Login() {
    const navigate = useNavigate()

    useEffect(() => {
        // 1. Проверяем, есть ли в URL параметры от Google
        const urlParams = new URLSearchParams(window.location.search);
        const googleToken = urlParams.get('token');
        const googleRole = urlParams.get('role');

        if (googleToken && googleRole) {
            // 2. Сохраняем всё в localStorage (как при обычном логине)
            localStorage.setItem('token', googleToken);
            localStorage.setItem('userRole', googleRole);
            localStorage.setItem('isAuthenticated', 'true');

            // 3. Чистим URL строку, чтобы убрать токен из адреса ради безопасности
            window.history.replaceState({}, document.title, window.location.pathname);

            // 4. Мгновенно перенаправляем на нужную страницу в зависимости от роли
            if (googleRole === 'admin') {
                navigate('/adminpage', { replace: true });
            } else {
                navigate('/userpage', { replace: true });
            }
        }
    }, [navigate]);
    // 1. Стейты для контроля инпутов
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // 2. Стейты для статуса запроса
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    // 3. Функция отправки формы логина
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');
        navigate('/login', { replace: true });
        try {

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setIsError(true);
                setMessage(data.message || 'Wrong  email or password');
            } else {
                setIsError(false);

                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role)
                localStorage.setItem('isAuthenticated', 'true')



                setTimeout(() => {
                    if (data.user.role == "admin") {
                        navigate('/adminpage')
                    } else {
                        navigate('/userpage');
                    }


                }, 1000);

                setTimeout(() => {
                    setEmail('')
                    setPassword('')
                }, 1100);





            }
        } catch (err) {
            console.error('Error while enter', err);
            setIsError(true);
            setMessage('Connection error with server');
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
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Вход в аккаунт (TS)</h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                            backgroundColor: loading ? '#aaa' : '#28a745', // Сделаем кнопку логина зеленой
                            color: '#fff',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}

                    >

                        {loading ? 'Проверка...' : 'Войти'}

                    </button>

                    {/* РАЗДЕЛИТЕЛЬ */}
                    <div style={{ margin: '15px 0', textTransform: 'uppercase', fontSize: '12px', color: '#888', textAlign: 'center' }}>или</div>

                    {/* КНОПКА GOOGLE */}
                    <a
                        href="/api/auth/google"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            color: '#333',
                            textDecoration: 'none',
                            backgroundColor: '#fff',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                            alt="Google"
                            style={{ width: '18px', height: '18px' }}
                        />
                        Войти через Google
                    </a>

                    <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
                        Нет аккаунта? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Зарегистрироваться</Link>
                    </p>
                </form>

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

export default Login;