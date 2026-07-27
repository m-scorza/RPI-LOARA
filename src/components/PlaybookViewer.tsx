import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Check } from 'lucide-react'
import type { Playbook, PlaybookStep } from '../types/database'

interface PlaybookViewerProps {
  playbook: Playbook
  onComplete: () => void
}

function StepTexto({ step }: { step: PlaybookStep }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800">{step.titulo}</h3>
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
        {step.corpo?.split(/(\*\*.*?\*\*)/).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
          }
          return part
        })}
      </div>
    </div>
  )
}

function StepChecklist({ step }: { step: PlaybookStep }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800">{step.titulo}</h3>
      <div className="space-y-2">
        {step.items?.map((item, i) => (
          <button
            key={i}
            onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
            className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              checked[i] ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
            }`}>
              {checked[i] && <Check size={12} className="text-white" />}
            </div>
            <span className={`text-sm ${checked[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {item}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepPassoAPasso({ step }: { step: PlaybookStep }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800">{step.titulo}</h3>
      <div className="space-y-3">
        {step.passos?.map((passo) => (
          <div key={passo.numero} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {passo.numero}
              </div>
              {passo.numero !== step.passos!.length && (
                <div className="w-0.5 flex-1 bg-teal-200 mt-1" />
              )}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-slate-800">{passo.titulo}</p>
              <p className="text-sm text-slate-600 mt-0.5">{passo.descricao}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepAlerta({ step }: { step: PlaybookStep }) {
  return (
    <div className="space-y-3">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="text-lg font-bold text-rose-700">{step.titulo}</h3>
        </div>
        <p className="text-sm text-rose-700 leading-relaxed">{step.corpo}</p>
      </div>
    </div>
  )
}

function renderStep(step: PlaybookStep) {
  switch (step.tipo) {
    case 'texto': return <StepTexto step={step} />
    case 'checklist': return <StepChecklist step={step} />
    case 'passo_a_passo': return <StepPassoAPasso step={step} />
    case 'alerta': return <StepAlerta step={step} />
    default: return null
  }
}

export default function PlaybookViewer({ playbook, onComplete }: PlaybookViewerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const steps = playbook.conteudo
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">Playbook</p>
          <h2 className="text-xl font-bold text-slate-800">{playbook.titulo}</h2>
        </div>
        <span className="text-sm text-slate-500">
          Passo {currentStep + 1} de {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[250px]">
        {renderStep(steps[currentStep])}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={isFirst}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-30"
        >
          <ArrowLeft size={16} />
          Anterior
        </button>

        {isLast ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
          >
            <CheckCircle2 size={16} />
            Concluir Playbook
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Próximo
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
