import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured, localPlaybooks, seedPlaybooks } from '../lib/localStore'
import type { Playbook } from '../types/database'

export function usePlaybooks() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('playbooks')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true })
        if (error) throw error
        setPlaybooks(data || [])
      } else {
        seedPlaybooks()
        const all = localPlaybooks.selectAll()
        setPlaybooks(all.filter((p) => p.ativo).sort((a, b) => a.ordem - b.ordem))
      }
    } catch {
      setPlaybooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getPlaybookBySlug = useCallback((slug: string): Playbook | null => {
    return playbooks.find((p) => p.slug === slug) || null
  }, [playbooks])

  useEffect(() => {
    fetchPlaybooks()
  }, [fetchPlaybooks])

  return { playbooks, loading, fetchPlaybooks, getPlaybookBySlug }
}
