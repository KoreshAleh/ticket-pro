import React, { useState } from 'react';
import { usePreferences } from '../../context/preferences-context';

const MAX_TOP_UP_AMOUNT = 10_000;

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = usePreferences();
  const [customAmount, setCustomAmount] = useState<string>('50'); // По умолчанию ставим 50
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const presetAmounts = [50, 100, 200, 500];
  const numericAmount = Number(customAmount);
  const exceedsMaximum = Number.isFinite(numericAmount) && numericAmount > MAX_TOP_UP_AMOUNT;

  // Валидатор ввода суммы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Разрешаем только цифры и одну точку
    val = val.replace(/[^0-9.]/g, '');

    // Если точек больше одной — оставляем только первую
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }

    // Ограничиваем количество знаков после запятой (максимум 2 для центов)
    if (parts[1] && parts[1].length > 2) {
      val = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }

    // Убираем ведущие нули (например: "01203" -> "1203", но оставляем "0." или одиночный "0")
    if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
      val = val.replace(/^0+/, '');
      if (val === '') val = '0';
    }

    setCustomAmount(val);
    if (error) setError(null);
  };

  // Выбор готовой суммы (синхронизирует инпут)
  const handlePresetSelect = (preset: number) => {
    setCustomAmount(preset.toString());
    if (error) setError(null);
  };

  const handleTopUp = async () => {
    if (!Number.isFinite(numericAmount) || numericAmount < 0.5) {
      setError(t('Please enter an amount of at least $0.50.'));
      return;
    }
    if (numericAmount > MAX_TOP_UP_AMOUNT) {
      setError(t('The maximum top-up is $10,000 per transaction.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Переводим в центы для Stripe (например, 20.50$ -> 2050 cents)
      const amountInCents = Math.round(numericAmount * 100);

      const response = await fetch('/api/payment/checkout-balance', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amountInCents,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t(data.message || data.error || 'Failed to initiate payment session'));
      }
    } catch (err: any) {
      setError(t(err.message || 'Payment gateway connection failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Заголовок */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400 font-bold">
            💳
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('Top Up Balance')}</h2>
            <p className="text-xs text-gray-400">{t('Add funds instantly via Stripe')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Выбор готовых сумм */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              {t('Select Preset Amount')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((preset) => {
                const isSelected = customAmount === preset.toString();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    ${preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ввод произвольной суммы */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              {t('Amount ($)')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.50"
                value={customAmount}
                onChange={handleInputChange}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-8 pr-4 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">{t('Minimum $0.50 · Maximum $10,000 per transaction')}</p>
          </div>

          {(error || exceedsMaximum) && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-3 rounded-xl">
              {error || t('The maximum top-up is $10,000 per transaction.')}
            </div>
          )}

          {/* Итоговая кнопка */}
          <button
            onClick={handleTopUp}
            disabled={loading || !customAmount || !Number.isFinite(numericAmount) || numericAmount < 0.5 || exceedsMaximum}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? t('Connecting to Gateway...') : `${t('Proceed with')} $${customAmount || '0'}`}
          </button>
        </div>

        <p className="text-[10px] text-gray-600 text-center mt-4">
          🔒 {t('Payments are securely processed using 256-bit Stripe SSL Encryption.')}
        </p>
      </div>
    </div>
  );
};