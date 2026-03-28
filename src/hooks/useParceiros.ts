import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Parceiro, Categoria } from '../types/database'

type ParceirInsert = Partial<Parceiro> & { nome: string; categoria: Categoria }
type ParceirUpdate = Partial<Parceiro>

export function useParceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParceiros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('parceiros')
        .select('*')
        .order('nome', { ascending: true })

      if (err) throw err
      setParceiros((data as Parceiro[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar parceiros'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createParceiro = useCallback(async (data: ParceirInsert): Promise<Parceiro | null> => {
    try {
      const { data: created, error: err } = await supabase
        .from('parceiros')
        .insert(data as Record<string, unknown>)
        .select()
        .single()

      if (err) throw err
      const parceiro = created as Parceiro
      setParceiros((prev) => [...prev, parceiro].sort((a, b) => a.nome.localeCompare(b.nome)))
      return parceiro
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar parceiro'
      setError(message)
      return null
    }
  }, [])

  const updateParceiro = useCallback(async (id: string, data: ParceirUpdate): Promise<Parceiro | null> => {
    try {
      const { data: updated, error: err } = await supabase
        .from('parceiros')
        .update({ ...data, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      const parceiro = updated as Parceiro
      setParceiros((prev) =>
        prev.map((p) => (p.id === id ? parceiro : p)).sort((a, b) => a.nome.localeCompare(b.nome))
      )
      return parceiro
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar parceiro'
      setError(message)
      return null
    }
  }, [])

  const deleteParceiro = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('parceiros')
        .delete()
        .eq('id', id)

      if (err) throw err
      setParceiros((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar parceiro'
      setError(message)
      return false
    }
  }, [])

  const getParceiro = useCallback(async (id: string): Promise<Parceiro | null> => {
    try {
      const { data, error: err } = await supabase
        .from('parceiros')
        .select('*')
        .eq('id', id)
        .single()

      if (err) throw err
      return data as Parceiro
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar parceiro'
      setError(message)
      return null
    }
  }, [])

  useEffect(() => {
    fetchParceiros()
  }, [fetchParceiros])

  return {
    parceiros,
    loading,
    error,
    fetchParceiros,
    createParceiro,
    updateParceiro,
    deleteParceiro,
    getParceiro,
  }
}
