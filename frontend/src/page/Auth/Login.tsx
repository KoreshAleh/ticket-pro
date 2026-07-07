import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || 'Wrong email or password');
      } else {
        setIsError(false);
        setMessage('Успешный вход! Перенаправление...');

        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('isAuthenticated', 'true');


        setTimeout(() => {
          if (data.user.role === 'admin') {
            navigate('/adminpage');
          } else {
            navigate('/userpage');
          }
        }, 1000);

        setTimeout(() => {
          setEmail('');
          setPassword('');
          onClose();
        }, 1100);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage('Connection error with server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full relative z-10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Вход в аккаунт</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Электронная почта</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Пароль</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition text-sm"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full font-medium py-3 rounded-xl transition mt-2 active:scale-95 ${
              loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {loading ? 'Проверка...' : 'Войти'}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="mx-4 text-xs text-gray-500 uppercase">или</span>
            <div className="flex-grow border-t border-gray-800"></div>
          </div>

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full bg-transparent border border-gray-800 hover:border-gray-700 hover:bg-gray-850 text-gray-200 font-medium py-3 rounded-xl transition text-sm text-center"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
            Войти через Google
          </a>
        </form>

        {message && (
          <p className={`mt-4 text-center text-sm font-semibold ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <div className="text-center mt-6 text-xs text-gray-500">
          Еще нет аккаунта?{' '}
          <button onClick={onSwitchToRegister} className="text-purple-400 hover:underline bg-transparent border-none cursor-pointer">
            Зарегистрироваться
          </button>
        </div>
      </div>
    </div>
  );
};