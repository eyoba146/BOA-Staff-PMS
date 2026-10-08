import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

interface VerificationCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  isExpired?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  length?: number;
}

/**
 * 6-digit segmented code input with auto-advance, backspace navigation,
 * clipboard paste distribution, and Bank of Abyssinia brand focus styling.
 */
export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  isExpired = false,
  hasError = false,
  autoFocus = true,
  length = 6,
}: VerificationCodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Array of single digit characters padded to specified length
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus && !disabled && !isExpired && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled, isExpired]);

  const setDigitAt = (index: number, char: string) => {
    const chars = [...digits];
    chars[index] = char;
    const nextVal = chars.join('').slice(0, length);
    onChange(nextVal);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isExpired) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current
        setDigitAt(index, '');
      } else if (index > 0) {
        // Move to previous and clear it
        setDigitAt(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
      return;
    }

    // Single digit input
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setDigitAt(index, e.key);
      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || isExpired) return;

    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit verification code">
      {Array.from({ length }).map((_, index) => {
        const val = digits[index];
        const isMiddle = index === Math.floor(length / 2) - 1;

        return (
          <div key={index} className="flex items-center gap-2 sm:gap-3">
            <input
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              value={val}
              disabled={disabled || isExpired}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onChange={() => {
                // Handled in onKeyDown/onPaste
              }}
              onFocus={(e) => e.target.select()}
              aria-label={`Digit ${index + 1} of ${length}`}
              className={cn(
                'size-11 sm:size-13 rounded-xl border text-center font-mono text-xl sm:text-2xl font-bold transition-all outline-none',
                isExpired
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : hasError
                  ? 'border-red-400 bg-red-50/40 text-red-950 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : val
                  ? 'border-zinc-300 bg-white text-zinc-950 shadow-xs focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20'
                  : 'border-zinc-200 bg-zinc-50/80 text-zinc-900 focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20',
              )}
            />
            {isMiddle && (
              <span className="hidden sm:inline-block h-1 w-2 rounded-full bg-zinc-300" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
