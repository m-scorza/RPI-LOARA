import { useState } from 'react'
import { Clipboard, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CopyButtonProps {
  text: string
  label?: string
}

export default function CopyButton({ text, label = 'Copiar' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Falha ao copiar. Tente novamente.')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 active:bg-teal-700 transition-colors"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Clipboard className="w-4 h-4" />
      )}
      {copied ? 'Copiado!' : label}
    </button>
  )
}
