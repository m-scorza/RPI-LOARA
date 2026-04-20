import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured, localAcompanhamento } from '../lib/localStore'
import type { AcompanhamentoMensal } from '../types/database'

export function useAcompanhamento(parceiroId: string) {
  const [historico, setHistorico] = useState<AcompanhamentoMensal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistorico = useCallback(async () => {
    if (!parceiroId) return
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        // Fetch last 6 months using the view or direct query
        const { data, error } = await supabase
          .from('acompanhamento_mensal')
          .select('*')
          .eq('parceiro_id', parceiroId)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
          .limit(6)
        
        if (error) throw error
        setHistorico(data || [])
      } else {
        const all = localAcompanhamento.selectWhere({ parceiro_id: parceiroId } as Partial<AcompanhamentoMensal>)
        const sorted = all.sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano
          return b.mes - a.mes
        }).slice(0, 6)
        setHistorico(sorted)
      }
    } catch (error) {
      console.error('Error fetching acompanhamento:', error)
      setHistorico([])
    } finally {
      setLoading(false)
    }
  }, [parceiroId])

  const saveAcompanhamento = useCallback(async (data: Partial<AcompanhamentoMensal>) => {
    try {
      if (isSupabaseConfigured) {
        const { data: saved, error } = await supabase
          .from('acompanhamento_mensal')
          .upsert({ ...data, parceiro_id: parceiroId })
          .select()
          .single()
        
        if (error) throw error
        setHistorico(prev => {
          const exists = prev.findIndex(item => item.ano === saved.ano && item.mes === saved.mes)
          if (exists >= 0) {
            const next = [...prev]
            next[exists] = saved
            return next
          }
          return [saved, ...prev].sort((a, b) => (b.ano * 100 + b.mes) - (a.ano * 100 + a.mes)).slice(0, 6)
        })
        return saved
      } else {
        const existing = localAcompanhamento.selectWhere({ 
          parceiro_id: parceiroId, 
          ano: data.ano, 
          mes: data.mes 
        } as Partial<AcompanhamentoMensal>)
        
        let result
        if (existing.length > 0) {
          result = localAcompanhamento.update(existing[0].id, data)
        } else {
          result = localAcompanhamento.insert({ ...data, parceiro_id: parceiroId })
        }
        
        fetchHistorico()
        return result
      }
    } catch (error) {
      console.error('Error saving acompanhamento:', error)
      return null
    }
  }, [parceiroId, fetchHistorico])

  useEffect(() => {
    fetchHistorico()
  }, [fetchHistorico])

  return { historico, loading, fetchHistorico, saveAcompanhamento }
}
