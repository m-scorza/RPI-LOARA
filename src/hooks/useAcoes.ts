import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured, localAcoes, ACAO_DEFAULTS } from '../lib/localStore'
import type { Acao } from '../types/database'

interface UseAcoesOptions {
  rpiId?: string
  parceiroId?: string
}

export function useAcoes({ rpiId, parceiroId }: UseAcoesOptions) {
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAcoes = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        let query = supabase.from('acoes').select('*')
        if (rpiId) query = query.eq('rpi_id', rpiId)
        else if (parceiroId) query = query.eq('parceiro_id', parceiroId)
        else { setAcoes([]); setLoading(false); return }
        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error
        setAcoes(data || [])
      } else {
        let all: Acao[]
        if (rpiId) all = localAcoes.selectWhere({ rpi_id: rpiId } as Partial<Acao>)
        else if (parceiroId) all = localAcoes.selectWhere({ parceiro_id: parceiroId } as Partial<Acao>)
        else { setAcoes([]); setLoading(false); return }
        setAcoes(all.sort((a, b) => b.created_at.localeCompare(a.created_at)))
      }
    } catch {
      setAcoes([])
    } finally {
      setLoading(false)
    }
  }, [rpiId, parceiroId])

  const createAcao = useCallback(async (data: Partial<Acao> & { rpi_id: string; parceiro_id: string; descricao: string; responsavel: string }): Promise<Acao | null> => {
    try {
      if (isSupabaseConfigured) {
        const { data: created, error } = await supabase.from('acoes').insert(data).select().single()
        if (error) throw error
        setAcoes((prev) => [created, ...prev])
        return created
      } else {
        const acao = localAcoes.insert({ ...ACAO_DEFAULTS, ...data })
        setAcoes((prev) => [acao, ...prev])
        return acao
      }
    } catch {
      return null
    }
  }, [])

  const updateAcao = useCallback(async (id: string, data: Partial<Acao>): Promise<Acao | null> => {
    try {
      if (isSupabaseConfigured) {
        const { data: updated, error } = await supabase
          .from('acoes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        setAcoes((prev) => prev.map((a) => (a.id === id ? updated : a)))
        return updated
      } else {
        const updated = localAcoes.update(id, data)
        if (updated) setAcoes((prev) => prev.map((a) => (a.id === id ? updated : a)))
        return updated
      }
    } catch {
      return null
    }
  }, [])

  const deleteAcao = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('acoes').delete().eq('id', id)
        if (error) throw error
      } else {
        localAcoes.delete(id)
      }
      setAcoes((prev) => prev.filter((a) => a.id !== id))
      return true
    } catch {
      return false
    }
  }, [])

  const getPendingAcoes = useCallback(async (targetParceiroId: string): Promise<Acao[]> => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('acoes').select('*').eq('parceiro_id', targetParceiroId)
          .in('status', ['pendente', 'atrasada', 'em_andamento']).order('prazo', { ascending: true })
        if (error) throw error
        return data || []
      } else {
        const all = localAcoes.selectWhere({ parceiro_id: targetParceiroId } as Partial<Acao>)
        return all
          .filter((a) => ['pendente', 'atrasada', 'em_andamento'].includes(a.status))
          .sort((a, b) => (a.prazo || '').localeCompare(b.prazo || ''))
      }
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (rpiId || parceiroId) fetchAcoes()
  }, [rpiId, parceiroId, fetchAcoes])

  return { acoes, loading, fetchAcoes, createAcao, updateAcao, deleteAcao, getPendingAcoes }
}
