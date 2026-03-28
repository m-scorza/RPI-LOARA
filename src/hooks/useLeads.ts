import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, EtapaFunil } from '../types/database'

const ETAPA_DATE_FIELD: Record<EtapaFunil, keyof Lead | null> = {
  'Lead': 'data_lead',
  'Lead Qualificado': 'data_qualificado',
  'Oportunidade': 'data_oportunidade',
  'Cliente': 'data_cliente',
  'Doc. Consolidada': 'data_doc_consolidada',
  'Crédito Tomado': 'data_credito_tomado',
}

const ETAPA_ORDER: Record<EtapaFunil, number> = {
  'Lead': 0,
  'Lead Qualificado': 1,
  'Oportunidade': 2,
  'Cliente': 3,
  'Doc. Consolidada': 4,
  'Crédito Tomado': 5,
}

function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const etapaDiff = ETAPA_ORDER[a.etapa] - ETAPA_ORDER[b.etapa]
    if (etapaDiff !== 0) return etapaDiff
    return a.nome_empresa.localeCompare(b.nome_empresa)
  })
}

export function useLeads(parceiroId: string) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('parceiro_id', parceiroId)
        .order('etapa', { ascending: true })
        .order('nome_empresa', { ascending: true })

      if (error) throw error
      setLeads(data || [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [parceiroId])

  const createLead = useCallback(async (data: Partial<Lead> & { nome_empresa: string }): Promise<Lead | null> => {
    try {
      const { data: created, error } = await supabase
        .from('leads')
        .insert({ ...data, parceiro_id: parceiroId })
        .select()
        .single()

      if (error) throw error
      setLeads((prev) => sortLeads([...prev, created]))
      return created
    } catch {
      return null
    }
  }, [parceiroId])

  const updateLead = useCallback(async (id: string, data: Partial<Lead>): Promise<Lead | null> => {
    try {
      const { data: updated, error } = await supabase
        .from('leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setLeads((prev) => sortLeads(prev.map((l) => (l.id === id ? updated : l))))
      return updated
    } catch {
      return null
    }
  }, [])

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLeads((prev) => prev.filter((l) => l.id !== id))
      return true
    } catch {
      return false
    }
  }, [])

  const moveLead = useCallback(async (id: string, newEtapa: EtapaFunil): Promise<Lead | null> => {
    try {
      const dateField = ETAPA_DATE_FIELD[newEtapa]
      const updateData: Partial<Lead> = {
        etapa: newEtapa,
        updated_at: new Date().toISOString(),
      }

      if (dateField && dateField !== 'data_lead') {
        ;(updateData as Record<string, unknown>)[dateField] = new Date().toISOString().split('T')[0]
      }

      const { data: updated, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setLeads((prev) => sortLeads(prev.map((l) => (l.id === id ? updated : l))))
      return updated
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (parceiroId) {
      fetchLeads()
    }
  }, [parceiroId, fetchLeads])

  return {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    moveLead,
  }
}
