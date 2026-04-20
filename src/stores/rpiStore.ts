import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lead, FunilVendasSnapshot } from '../types/database'

interface RPIStoreState {
  // Session Status
  isRunning: boolean
  parceiroId: string | null
  startTime: number | null
  currentBlockId: string
  rpiId: string | null
  rpiNum: number | null
  maxVisitedBlockIndex: number

  // Funnel Data
  funilRitmo: number
  funilSnapshot: FunilVendasSnapshot | null

  // Blocks Data
  duvidas: Record<string, { checked: boolean; notes: string; resolved: boolean }>
  duvidasOutras: string
  andamentoNotes: string
  indicacoesCompromisso: string
  newLeads: Lead[]
  
  // Action Plan
  previousAcoesStatus: Record<string, string>
  newAcoes: Array<{
    descricao: string; 
    responsavel: 'Parceiro' | 'Loara'; 
    prazo: string; 
    prioridade: 'baixa' | 'média' | 'alta'; 
    categoria: string 
  }>

  // Finalization
  notasGerais: string
  proximaRPI: string

  // Actions
  startSession: (pId: string, rpiId: string, rpiNum: number) => void
  updateData: (data: Partial<Omit<RPIStoreState, 'startSession' | 'completeSession' | 'updateData' | 'setCurrentBlock'>>) => void
  setCurrentBlock: (id: string, index: number) => void
  completeSession: () => void
}

export const useRPIStore = create<RPIStoreState>()(
  persist(
    (set) => ({
      isRunning: false,
      parceiroId: null,
      startTime: null,
      currentBlockId: 'prep',
      rpiId: null,
      rpiNum: null,
      maxVisitedBlockIndex: 0,

      funilRitmo: 1,
      funilSnapshot: null,

      duvidas: {},
      duvidasOutras: '',
      andamentoNotes: '',
      indicacoesCompromisso: '',
      newLeads: [],

      previousAcoesStatus: {},
      newAcoes: [],

      notasGerais: '',
      proximaRPI: '',

      startSession: (pId, rpiId, rpiNum) => set({
        isRunning: true,
        parceiroId: pId,
        rpiId,
        rpiNum,
        startTime: Date.now(),
        currentBlockId: 'duvidas', // Move to first real block after start
        maxVisitedBlockIndex: 1, // 'duvidas' is index 1
      }),

      updateData: (data) => set((state) => ({ ...state, ...data })),

      setCurrentBlock: (id, index) => set((state) => ({ 
        currentBlockId: id,
        maxVisitedBlockIndex: Math.max(state.maxVisitedBlockIndex, index)
      })),

      completeSession: () => set({
        isRunning: false,
        parceiroId: null,
        startTime: null,
        currentBlockId: 'prep',
        rpiId: null,
        rpiNum: null,
        maxVisitedBlockIndex: 0,
        funilRitmo: 1,
        funilSnapshot: null,
        duvidas: {},
        duvidasOutras: '',
        andamentoNotes: '',
        indicacoesCompromisso: '',
        newLeads: [],
        previousAcoesStatus: {},
        newAcoes: [],
        notasGerais: '',
        proximaRPI: '',
      }),
    }),
    {
      name: 'rpi-session-storage',
    }
  )
)
