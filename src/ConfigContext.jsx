import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const ConfigContext = createContext({ backend: 'manual', handle: '@fitkarta', geminiConfigured: false, loaded: false })

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ backend: 'manual', handle: '@fitkarta', geminiConfigured: false, loaded: false })
  useEffect(() => {
    api.config().then((c) => setConfig({ ...c, loaded: true })).catch(() => {})
  }, [])
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  return useContext(ConfigContext)
}
