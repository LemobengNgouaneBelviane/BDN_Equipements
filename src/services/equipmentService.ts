export type EquipmentStatus = 'Bon état' | 'À vérifier' | 'En panne' | 'Hors service'

export type Equipment = {
  id: string
  code: string
  category: string
  manufacturer: string
  model: string
  serialNumber: string
  bureau: string
  department: string
  user: string
  status: EquipmentStatus
  os: string
  ip: string
  acquisitionValue: string
  dateAffectation: string
  lastAudit: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'bnd-equipment-collection-v1'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export const emptyEquipmentForm = (): Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'> => ({
  code: '',
  category: 'Ordinateur portable',
  manufacturer: 'HP',
  model: '',
  serialNumber: '',
  bureau: '',
  department: 'Service Informatique',
  user: '',
  status: 'Bon état',
  os: 'Windows 11 Professionnel',
  ip: '',
  acquisitionValue: '',
  dateAffectation: new Date().toISOString().slice(0, 10),
  lastAudit: new Date().toISOString().slice(0, 10),
})

const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-')

const mapApiResponse = (data: unknown): Equipment[] => {
  if (!Array.isArray(data)) return []

  return data.map((item) => ({
    id: String((item as Record<string, unknown>).id ?? ''),
    code: String((item as Record<string, unknown>).code ?? ''),
    category: String((item as Record<string, unknown>).category ?? ''),
    manufacturer: String((item as Record<string, unknown>).manufacturer ?? ''),
    model: String((item as Record<string, unknown>).model ?? ''),
    serialNumber: String((item as Record<string, unknown>).serialNumber ?? ''),
    bureau: String((item as Record<string, unknown>).bureau ?? ''),
    department: String((item as Record<string, unknown>).department ?? ''),
    user: String((item as Record<string, unknown>).user ?? ''),
    status: ((item as Record<string, unknown>).status as EquipmentStatus) ?? 'Bon état',
    os: String((item as Record<string, unknown>).os ?? ''),
    ip: String((item as Record<string, unknown>).ip ?? ''),
    acquisitionValue: String((item as Record<string, unknown>).acquisitionValue ?? ''),
    dateAffectation: String((item as Record<string, unknown>).dateAffectation ?? ''),
    lastAudit: String((item as Record<string, unknown>).lastAudit ?? ''),
    createdAt: String((item as Record<string, unknown>).createdAt ?? new Date().toISOString()),
    updatedAt: String((item as Record<string, unknown>).updatedAt ?? new Date().toISOString()),
  }))
}

const readStorage = (): Equipment[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Equipment[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    return []
  }
}

const writeStorage = (items: Equipment[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const request = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  if (!API_URL) {
    throw new Error('NO_API_URL')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error((payload as { message?: string }).message ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

export const listEquipments = async (): Promise<Equipment[]> => {
  if (API_URL) {
    try {
      const payload = await request<{ items: unknown[] }>('/api/equipments')
      return mapApiResponse(payload.items)
    } catch {
      const fallback = readStorage()
      return fallback
    }
  }

  return readStorage()
}

export const getEquipmentByCode = async (code: string): Promise<Equipment | null> => {
  if (API_URL) {
    try {
      const payload = await request<{ item: unknown }>('/api/equipments/' + encodeURIComponent(code))
      return payload.item ? mapApiResponse([payload.item])[0] ?? null : null
    } catch {
      const items = readStorage()
      return items.find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? null
    }
  }

  const items = readStorage()
  return items.find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? null
}

export const createEquipment = async (payload: Partial<Equipment>): Promise<Equipment> => {
  const normalizedCode = normalizeCode(payload.code ?? `BND-${Date.now()}`)

  if (API_URL) {
    try {
      const created = await request<{ item: unknown }>('/api/equipments', {
        method: 'POST',
        body: JSON.stringify({ ...payload, code: normalizedCode }),
      })
      return mapApiResponse([created.item])[0] as Equipment
    } catch {
      // fallback local data if backend unavailable
    }
  }

  const items = readStorage()
  const now = new Date().toISOString()
  const equipment: Equipment = {
    id: payload.id ?? `eq-${Date.now()}`,
    code: normalizedCode,
    category: payload.category ?? 'Ordinateur portable',
    manufacturer: payload.manufacturer ?? 'Inconnu',
    model: payload.model ?? 'Modèle non renseigné',
    serialNumber: payload.serialNumber ?? '',
    bureau: payload.bureau ?? 'Non affecté',
    department: payload.department ?? 'Service Informatique',
    user: payload.user ?? 'Non affecté',
    status: payload.status ?? 'Bon état',
    os: payload.os ?? 'N/A',
    ip: payload.ip ?? 'Non assignée',
    acquisitionValue: payload.acquisitionValue ?? '0 FCFA',
    dateAffectation: payload.dateAffectation ?? new Date().toISOString().slice(0, 10),
    lastAudit: payload.lastAudit ?? new Date().toISOString().slice(0, 10),
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  }

  const next = [equipment, ...items]
  writeStorage(next)
  return equipment
}

export const updateEquipment = async (code: string, payload: Partial<Equipment>): Promise<Equipment> => {
  const normalizedCode = normalizeCode(payload.code ?? code)

  if (API_URL) {
    try {
      const updated = await request<{ item: unknown }>(`/api/equipments/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, code: normalizedCode }),
      })
      return mapApiResponse([updated.item])[0] as Equipment
    } catch {
      // fallback local data if backend unavailable
    }
  }

  const items = readStorage()
  const index = items.findIndex((item) => item.code.toLowerCase() === code.toLowerCase())

  if (index === -1) {
    return createEquipment({ ...payload, code })
  }

  const current = items[index]
  const nextEquipment: Equipment = {
    ...current,
    ...payload,
    code: normalizedCode,
    updatedAt: new Date().toISOString(),
  }

  const next = [...items]
  next[index] = nextEquipment
  writeStorage(next)
  return nextEquipment
}

export const deleteEquipment = async (code: string): Promise<Equipment[]> => {
  if (API_URL) {
    try {
      const payload = await request<{ items: unknown[] }>(`/api/equipments/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      })
      return mapApiResponse(payload.items)
    } catch {
      // fallback local data if backend unavailable
    }
  }

  const items = readStorage().filter((item) => item.code.toLowerCase() !== code.toLowerCase())
  writeStorage(items)
  return items
}
