import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RPI } from '../types/database'

export function useRPIs(parceiroId: string) {
  const [rpis, setRpis] = useState<RPI[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRPIs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rpis')
        .select('*')
        .eq('parceiro_id', parceiroId)
        .order('data_reuniao', { ascending: false })

      if (error) throw error
      setRpis(data || [])
    } catch {
      setRpis([])
    } finally {
      setLoading(false)
    }
  }, [parceiroId])

  const createRPI = useCallback(async (data: Partial<RPI> & { parceiro_id: string }): Promise<RPI | null> => {
    try {
      // Calculate next numero_sequencial
      const { data: maxRow, error: maxErr } = await supabase
        .from('rpis')
        .select('numero_sequencial')
        .eq('parceiro_id', parceiroId)
        .order('numero_sequencial', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (maxErr) throw maxErr

      const nextNum = (maxRow?.numero_sequencial ?? 0) + 1

      const { data: created, error } = await supabase
        .from('rpis')
        .insert({
          ...data,
          parceiro_id: parceiroId,
          numero_sequencial: nextNum,
        })
        .select()
        .single()

      if (error) throw error
      setRpis((prev) => [created, ...prev])
      return created
    } catch {
      return null
    }
  }, [parceiroId])

  const updateRPI = useCallback(async (id: string, data: Partial<RPI>): Promise<RPI | null> => {
    try {
      const { data: updated, error } = await supabase
        .from('rpis')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setRpis((prev) => prev.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch {
      return null
    }
  }, [])

  const getLastRPI = useCallback(async (): Promise<RPI | null> => {
    try {
      const { data, error } = await supabase
        .from('rpis')
        .select('*')
        .eq('parceiro_id', parceiroId)
        .eq('status', 'finalizada')
        .order('data_reuniao', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    } catch {
      return null
    }
  }, [parceiroId])

  useEffect(() => {
    if (parceiroId) {
      fetchRPIs()
    }
  }, [parceiroId, fetchRPIs])

  return {
    rpis,
    loading,
    fetchRPIs,
    createRPI,
    updateRPI,
    getLastRPI,
  }
}
