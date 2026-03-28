import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
      let query = supabase.from('acoes').select('*')

      if (rpiId) {
        query = query.eq('rpi_id', rpiId)
      } else if (parceiroId) {
        query = query.eq('parceiro_id', parceiroId)
      } else {
        setAcoes([])
        setLoading(false)
        return
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setAcoes(data || [])
    } catch {
      setAcoes([])
    } finally {
      setLoading(false)
    }
  }, [rpiId, parceiroId])

  const createAcao = useCallback(async (data: Partial<Acao> & { rpi_id: string; parceiro_id: string; descricao: string; responsavel: string }): Promise<Acao | null> => {
    try {
      const { data: created, error } = await supabase
        .from('acoes')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      setAcoes((prev) => [created, ...prev])
      return created
    } catch {
      return null
    }
  }, [])

  const updateAcao = useCallback(async (id: string, data: Partial<Acao>): Promise<Acao | null> => {
    try {
      const { data: updated, error } = await supabase
        .from('acoes')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setAcoes((prev) => prev.map((a) => (a.id === id ? updated : a)))
      return updated
    } catch {
      return null
    }
  }, [])

  const deleteAcao = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('acoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAcoes((prev) => prev.filter((a) => a.id !== id))
      return true
    } catch {
      return false
    }
  }, [])

  const getPendingAcoes = useCallback(async (targetParceiroId: string): Promise<Acao[]> => {
    try {
      const { data, error } = await supabase
        .from('acoes')
        .select('*')
        .eq('parceiro_id', targetParceiroId)
        .in('status', ['pendente', 'atrasada', 'em_andamento'])
        .order('prazo', { ascending: true })

      if (error) throw error
      return data || []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (rpiId || parceiroId) {
      fetchAcoes()
    }
  }, [rpiId, parceiroId, fetchAcoes])

  return {
    acoes,
    loading,
    fetchAcoes,
    createAcao,
    updateAcao,
    deleteAcao,
    getPendingAcoes,
  }
}
