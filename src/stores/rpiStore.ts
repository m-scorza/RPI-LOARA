import { create } from 'zustand'
import type { RPI } from '../types/database'

interface RPIStoreState {
  currentRPI: Partial<RPI> | null
  currentBlock: number
  startTime: number | null
  isRunning: boolean

  setBlock: (n: number) => void
  startMeeting: () => void
  updateBlock: (blockName: string, data: Record<string, unknown>) => void
  setNotasGerais: (text: string) => void
  setProximaRPI: (date: string) => void
  reset: () => void
}

export const useRPIStore = create<RPIStoreState>()((set) => ({
  currentRPI: null,
  currentBlock: 0,
  startTime: null,
  isRunning: false,

  setBlock: (n: number) => {
    if (n < 0 || n > 6) return
    set({ currentBlock: n })
  },

  startMeeting: () => {
    set({ startTime: Date.now(), isRunning: true, currentBlock: 1 })
  },

  updateBlock: (blockName: string, data: Record<string, unknown>) => {
    set((state) => ({
      currentRPI: {
        ...state.currentRPI,
        [blockName]: {
          ...((state.currentRPI?.[blockName as keyof RPI] as Record<string, unknown>) || {}),
          ...data,
        },
      },
    }))
  },

  setNotasGerais: (text: string) => {
    set((state) => ({
      currentRPI: {
        ...state.currentRPI,
        notas_gerais: text,
      },
    }))
  },

  setProximaRPI: (date: string) => {
    set((state) => ({
      currentRPI: {
        ...state.currentRPI,
        proxima_rpi_prevista: date,
      },
    }))
  },

  reset: () => {
    set({
      currentRPI: null,
      currentBlock: 0,
      startTime: null,
      isRunning: false,
    })
  },
}))
