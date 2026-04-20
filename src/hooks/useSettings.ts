import { useState, useEffect } from 'react'

export interface SystemSettings {
  taxa_produto: number
  comissao_bruta: number
  imposto_comissao: number
  meta_anual_credito: number
  meta_anual_clientes: number
  tiquete_medio: number
  meta_receita_mensal: number
  conv_lead_qualificado: number
  conv_qualificado_oportunidade: number
  conv_oportunidade_cliente: number
  conv_cliente_doc: number
  conv_doc_credito: number
  app_pin: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  taxa_produto: 0.06,
  comissao_bruta: 0.0141516,
  imposto_comissao: 0.2138,
  meta_anual_credito: 10000000,
  meta_anual_clientes: 12,
  tiquete_medio: 800000,
  meta_receita_mensal: 20000,
  conv_lead_qualificado: 0.60,
  conv_qualificado_oportunidade: 0.50,
  conv_oportunidade_cliente: 0.65,
  conv_cliente_doc: 0.80,
  conv_doc_credito: 0.85,
  app_pin: '1234'
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('rpi_system_settings')
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } catch (e) {
        console.error('Error parsing settings:', e)
      }
    }
    setLoading(false)
  }, [])

  const saveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings)
    localStorage.setItem('rpi_system_settings', JSON.stringify(newSettings))
  }

  return { settings, saveSettings, loading }
}
