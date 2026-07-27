import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface PinAuthProps {
  onAuthenticate: () => void
}

export default function PinAuth({ onAuthenticate }: PinAuthProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    setError(false)

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (value && index === 3) {
      const pin = newDigits.join('')
      const correctPin = import.meta.env.VITE_APP_PIN || '1234'

      if (pin === correctPin) {
        onAuthenticate()
      } else {
        setError(true)
        setShaking(true)
        setTimeout(() => {
          setShaking(false)
          setDigits(['', '', '', ''])
          inputRefs.current[0]?.focus()
        }, 600)
      }
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0F1B2D' }}>
      <div
        className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 w-full max-w-sm text-center ${
          shaking ? 'animate-shake' : ''
        }`}
      >
        <h1 className="text-3xl font-bold text-teal-500 mb-1">LOARA</h1>
        <p className="text-slate-400 text-sm mb-8">Condutor de RPI</p>

        <div className="flex justify-center gap-3 mb-6">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white outline-none transition-colors ${
                error
                  ? 'border-rose-500'
                  : 'border-white/20 focus:border-teal-500'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-rose-400 text-sm">PIN incorreto. Tente novamente.</p>
        )}

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
            20%, 40%, 60%, 80% { transform: translateX(6px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </div>
    </div>
  )
}
