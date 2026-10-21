import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  createEquipment,
  deleteEquipment,
  emptyEquipmentForm,
  listEquipments,
  updateEquipment,
  type Equipment,
  type EquipmentStatus,
} from './services/equipmentService'

type Screen = 'login' | 'register' | 'dashboard' | 'bureaux' | 'inventaire' | 'detail'

type NavItem = {
  label: string
  target: Screen
}

type EquipmentForm = Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>

type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  post: string
}

type LoginForm = {
  email: string
  password: string
}

type RegisterForm = {
  firstName: string
  lastName: string
  email: string
  post: string
  password: string
  confirmPassword: string
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', target: 'dashboard' },
  { label: 'Bureaux', target: 'bureaux' },
  { label: 'Inventaire des équipements', target: 'inventaire' },
  { label: 'Fiche équipement', target: 'detail' },
]

const postOptions = [
  'Directeur général',
  'Directeur général adjoint',
  'Responsable de l’environnement',
  'Responsable informatique',
  'Secrétaire',
]

const API_URL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')

const requestJson = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((payload as { message?: string }).message ?? 'Une erreur est survenue')
  }

  return payload as T
}

const formatDate = (value: string) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR').format(date)
}

const getStateClass = (status: EquipmentStatus) => {
  if (status === 'Bon état') return 'good'
  if (status === 'À vérifier') return 'warning'
  if (status === 'En panne') return 'bad'
  return 'bad'
}

const toFormData = (equipment: Equipment | null): EquipmentForm => {
  if (!equipment) return emptyEquipmentForm()

  return {
    code: equipment.code,
    category: equipment.category,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    bureau: equipment.bureau,
    department: equipment.department,
    user: equipment.user,
    status: equipment.status,
    os: equipment.os,
    ip: equipment.ip,
    acquisitionValue: equipment.acquisitionValue,
    dateAffectation: equipment.dateAffectation,
    lastAudit: equipment.lastAudit,
  }
}

function BrandLogo({ className = 'brand-logo' }: { className?: string }) {
  return <img src="/image001.jpg" alt="BND" className={className} />
}

function BackButton({ label = 'Retour', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" className="back-button" onClick={onClick}>
      ← {label}
    </button>
  )
}

function LoginPage({
  onLogin,
  onOpenRegister,
}: {
  onLogin: (payload: LoginForm) => Promise<void>
  onOpenRegister: () => void
}) {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Veuillez renseigner votre e-mail et votre mot de passe.')
      return
    }

    setIsSubmitting(true)
    try {
      await onLogin(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-center">
        <div className="top-tag">RÉPUBLIQUE DU CAMEROUN • DIRECTION DES SYSTÈMES D’INFORMATION</div>
        <div className="login-card">
          <div className="brand-box">
            <BrandLogo className="brand-logo-lockup" />
          </div>

          <h1>Connexion au Système du Parc IT</h1>
          <p className="subtext">Bourse Nationale des Déchets – République du Cameroun</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-label">
              E-mail professionnel
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="e.nganga@bnd.cm"
                />
              </div>
            </label>

            <label className="field-label">
              Mot de passe
              <div className="input-wrap">
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="••••••••••••"
                />
                <span className="input-eye">◉</span>
              </div>
            </label>

            <div className="remember-row">
              <label className="check-wrap"><input type="checkbox" defaultChecked /> Se souvenir de ce poste</label>
              <span className="secure-tag">● PORTAIL SÉCURISÉ</span>
            </div>

            {error ? <div className="form-error">{error}</div> : null}

            <button className="login-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <div className="auth-switch-row">
            <span>Pas encore inscrit ?</span>
            <button type="button" className="text-link" onClick={onOpenRegister}>Créer un compte</button>
          </div>

          <div className="system-note">
            Accès réservé au personnel autorisé de la BND. Toute connexion est journalièrement confirmée et la charte informatique de l’administration.
          </div>

          <div className="login-footer">
            <span>Français (FR)</span>
            <span>BND v2.4</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function RegisterPage({
  onRegister,
  onVerifyRegistration,
  onResendCode,
  onBackToLogin,
}: {
  onRegister: (payload: RegisterForm) => Promise<{ email: string }>
  onVerifyRegistration: (email: string, code: string) => Promise<void>
  onResendCode: (email: string) => Promise<void>
  onBackToLogin: () => void
}) {
  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    post: postOptions[0],
    password: '',
    confirmPassword: '',
  })
  const [verificationCode, setVerificationCode] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword) {
      setError('Veuillez remplir tous les champs de l’inscription.')
      return
    }

    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await onRegister(form)
      setRegisteredEmail(response.email)
      setSuccess('Un code de vérification a été envoyé à votre adresse e-mail.')
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’inscription')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!registeredEmail || verificationCode.trim().length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres reçu par e-mail.')
      return
    }

    setIsSubmitting(true)
    try {
      await onVerifyRegistration(registeredEmail, verificationCode.trim())
      setSuccess('Votre compte a été vérifié avec succès.')
      setStep('form')
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        post: postOptions[0],
        password: '',
        confirmPassword: '',
      })
      setVerificationCode('')
      setRegisteredEmail('')
      onBackToLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la vérification')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!registeredEmail) return

    setError('')
    setSuccess('')
    try {
      await onResendCode(registeredEmail)
      setSuccess('Un nouveau code a été envoyé à votre adresse e-mail.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de renvoyer le code.')
    }
  }

  if (step === 'verify') {
    return (
      <div className="login-page">
        <div className="login-center register-center">
          <div className="top-tag">RÉPUBLIQUE DU CAMEROUN • VÉRIFICATION DE COMPTE</div>
          <div className="login-card register-card">
            <div className="brand-box">
              <BrandLogo className="brand-logo-lockup" />
            </div>

            <h1>Vérification du compte</h1>
            <p className="subtext">Nous avons envoyé un code de vérification à {registeredEmail}.</p>

            <form onSubmit={handleVerify} className="auth-form">
              <label className="field-label">
                Code de vérification
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                />
              </label>

              {error ? <div className="form-error">{error}</div> : null}
              {success ? <div className="form-success">{success}</div> : null}

              <button className="login-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Vérification...' : 'Valider le code'}
              </button>
            </form>

            <div className="auth-switch-row">
              <button type="button" className="text-link" onClick={handleResend}>Renvoyer le code</button>
              <button type="button" className="text-link" onClick={onBackToLogin}>Retour à la connexion</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-center register-center">
        <div className="top-tag">RÉPUBLIQUE DU CAMEROUN • CRÉATION DE COMPTE PERSONNEL</div>
        <div className="login-card register-card">
          <div className="brand-box">
            <BrandLogo className="brand-logo-lockup" />
          </div>

          <h1>Inscription du personnel BND</h1>
          <p className="subtext">Créer votre accès sécurisé au système de gestion du parc informatique.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="two-cols register-grid">
              <label className="field-label">
                Nom
                <input value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} placeholder="Nganga" />
              </label>
              <label className="field-label">
                Prénom
                <input value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} placeholder="Émile" />
              </label>
            </div>

            <label className="field-label">
              Adresse e-mail professionnelle
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="prenom.nom@bnd.cm" />
              </div>
            </label>

            <div className="field-label">
              Poste occupé
              <div className="post-grid">
                {postOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`post-option ${form.post === option ? 'selected' : ''}`}
                    onClick={() => updateField('post', option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="two-cols register-grid">
              <label className="field-label">
                Mot de passe
                <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Minimum 6 caractères" />
              </label>
              <label className="field-label">
                Confirmer le mot de passe
                <input type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Répétez le mot de passe" />
              </label>
            </div>

            {error ? <div className="form-error">{error}</div> : null}
            {success ? <div className="form-success">{success}</div> : null}

            <button className="login-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="auth-switch-row">
            <span>Déjà inscrit ?</span>
            <button type="button" className="text-link" onClick={onBackToLogin}>Retour à la connexion</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({
  equipment,
  onOpenDetail,
  onExportInventory,
  setScreen,
  currentUser,
  onLogout,
}: {
  equipment: Equipment[]
  onOpenDetail: (code?: string) => void
  onExportInventory: () => void
  setScreen: (screen: Screen) => void
  currentUser: AuthUser | null
  onLogout: () => void
}) {
  const stats = useMemo(() => {
    const total = equipment.length
    const good = equipment.filter((item) => item.status === 'Bon état').length
    const warnings = equipment.filter((item) => item.status === 'À vérifier').length
    const outages = equipment.filter((item) => item.status === 'En panne').length
    const departments = new Set(equipment.map((item) => item.department)).size

    return { total, good, warnings, outages, departments }
  }, [equipment])

  const recent = equipment.slice(0, 5)
  const chartEntries = [
    {
      label: 'PC Fixes',
      value: Math.min(45, Math.max(12, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('pc')).length / Math.max(equipment.length, 1)) * 100))),
    },
    {
      label: 'PC Portables',
      value: Math.min(32, Math.max(10, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('portable')).length / Math.max(equipment.length, 1)) * 100))),
    },
    {
      label: 'Écrans',
      value: Math.min(28, Math.max(8, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('écran')).length / Math.max(equipment.length, 1)) * 100))),
    },
    {
      label: 'Imprimantes / Scanners',
      value: Math.min(16, Math.max(6, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('imprimante')).length / Math.max(equipment.length, 1)) * 100))),
    },
    {
      label: 'Équipements Réseau',
      value: Math.min(12, Math.max(5, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('réseau') || item.category.toLowerCase().includes('switch')).length / Math.max(equipment.length, 1)) * 100))),
    },
    {
      label: 'Onduleurs & Alarmes',
      value: Math.min(6, Math.max(3, Math.round((equipment.filter((item) => item.category.toLowerCase().includes('onduleur')).length / Math.max(equipment.length, 1)) * 100))),
    },
  ]

  return (
    <div className="shell-app">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-block">
            <BrandLogo className="brand-mini-logo" />
          </div>
          <div className="brand-text">
            <strong>BND • Parc IT</strong>
            <span>République du Cameroun</span>
          </div>
        </div>

        <div className="search-mini">
          <span>🔎 Rechercher actif, IP, agent...</span>
        </div>

        <div className="nav-block">
          <div className="nav-title">NAVIGATION PRINCIPALE</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-button ${item.target === 'dashboard' ? 'active' : ''}`}
              onClick={() => setScreen(item.target)}
            >
              <span className="nav-icon">▣</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="bottom-node">
          <div className="node-pill">Nœud Central</div>
          <div className="node-name">BND-HQ-YDE</div>
          <span className="security-tag">Sécurisé</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="main-topbar">
          <div className="top-left">BND • Parc IT</div>
          <div className="top-right">
            <span className="status-online">● Réseau BND Opérationnel</span>
            <div className="user-box">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'E. Nganga'}
            </div>
            <button type="button" className="text-link logout-link" onClick={onLogout}>Déconnexion</button>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-intro">
            <div className="dashboard-title-wrap">
              <div className="page-kicker">SUPERVISION • DIRECTION GÉNÉRALE • YAOUNDÉ, SIÈGE BND</div>
              <h2>
                {currentUser ? `Bienvenue ${currentUser.firstName} ${currentUser.lastName}` : 'Bienvenue sur le portail du parc informatique BND'},
                {' '}voici l’état actuel du parc informatique de la BND.
              </h2>
              <div className="sync-line">
                <span className="mini-clock">◔</span>
                {new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date())} • Dernière synchronisation : {new Intl.DateTimeFormat('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date())}
              </div>
            </div>
            <button type="button" className="primary-action" onClick={() => onOpenDetail()}>
              Recenser un nouvel équipement
            </button>
          </div>

          <div className="dashboard-metrics">
            <div className="metric-card">
              <span className="metric-head">TOTAL ÉQUIPEMENTS</span>
              <strong>{stats.total}</strong>
              <small>enregistrés ce mois</small>
            </div>
            <div className="metric-card coverage">
              <span className="metric-head">COUVERTURE LOCAUX</span>
              <strong>{stats.departments}</strong>
              <small>directions couvertes</small>
            </div>
            <div className="metric-card good">
              <span className="metric-head">EN BON ÉTAT</span>
              <strong>{stats.good}</strong>
              <small>opérationnels</small>
            </div>
            <div className="metric-card alerts">
              <span className="metric-head">INCIDENTS & AUDITS</span>
              <strong>{stats.warnings + stats.outages}</strong>
              <small>{stats.warnings} à vérifier • {stats.outages} en panne</small>
            </div>
          </div>

          <div className="dashboard-lower">
            <div className="panel-box table-box">
              <div className="panel-head">
                <h3>Derniers équipements enregistrés ou modifiés</h3>
                <button type="button" onClick={() => setScreen('inventaire')}>Afficher l’inventaire</button>
              </div>

              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type & Modèle</th>
                    <th>Bureau</th>
                    <th>Utilisateur</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((item) => (
                    <tr key={item.id}>
                      <td className="row-code">{item.code}</td>
                      <td>
                        <div className="table-model">
                          <strong>{item.category}</strong>
                          <span>{item.model}</span>
                        </div>
                      </td>
                      <td>{item.bureau}</td>
                      <td>{item.user}</td>
                      <td><span className={`state ${getStateClass(item.status)}`}>{item.status}</span></td>
                      <td>{new Date(item.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel-box chart-box">
              <div className="panel-head">
                <h3>Répartition du Parc</h3>
                <span className="panel-tag">Par catégorie d’équipement</span>
              </div>

              <div className="bars">
                {chartEntries.map((entry) => (
                  <div key={entry.label} className="bar-row">
                    <span className="bar-label">{entry.label}</span>
                    <div className="bar"><i style={{ width: `${entry.value}%` }} /></div>
                    <em>{entry.value}%</em>
                  </div>
                ))}
              </div>

              <div className="quick-actions">
                <div className="action-title">Accès rapide & Éditions</div>
                <button type="button" onClick={onExportInventory}>Exporter l’inventaire complet</button>
                <button type="button" onClick={() => onOpenDetail()}>Fiche de recensement vierge</button>
                <button type="button" onClick={() => setScreen('inventaire')}>Audit rapide des pannes</button>
                <button type="button" className="note-action">La campagne d’inventaire physique trimestrielle Q4 est fixée au 15 Novembre 2024.</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function BureauPage({
  equipment,
  onCreateBureau,
  setScreen,
  currentUser,
  onLogout,
}: {
  equipment: Equipment[]
  onCreateBureau: () => void
  setScreen: (screen: Screen) => void
  currentUser: AuthUser | null
  onLogout: () => void
}) {
  const bureaux = useMemo(() => {
    const map = new Map<string, { name: string; code: string; floor: string; role: string; equipments: number; good: number; warning: number; bad: number }>()

    equipment.forEach((item) => {
      const current = map.get(item.department) ?? {
        name: item.department,
        code: item.bureau.split('-')[0]?.trim() || 'Bureau',
        floor: 'Etage 1',
        role: `Responsable : ${item.user}`,
        equipments: 0,
        good: 0,
        warning: 0,
        bad: 0,
      }

      current.equipments += 1
      if (item.status === 'Bon état') current.good += 1
      if (item.status === 'À vérifier') current.warning += 1
      if (item.status === 'En panne') current.bad += 1

      map.set(item.department, current)
    })

    return Array.from(map.values()).map((bureau) => ({
      name: bureau.name,
      code: bureau.code,
      floor: bureau.floor,
      role: bureau.role,
      equipments: bureau.equipments,
      good: bureau.good,
      warning: bureau.warning,
      bad: bureau.bad,
    }))
  }, [equipment])

  return (
    <div className="shell-app">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-block">
            <BrandLogo className="brand-mini-logo" />
          </div>
          <div className="brand-text">
            <strong>BND • Parc IT</strong>
            <span>République du Cameroun</span>
          </div>
        </div>

        <div className="search-mini"><span>🔎 Rechercher actif, IP, agent...</span></div>

        <div className="nav-block">
          <div className="nav-title">NAVIGATION PRINCIPALE</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-button ${item.target === 'bureaux' ? 'active' : ''}`}
              onClick={() => setScreen(item.target)}
            >
              <span className="nav-icon">▣</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="bottom-node">
          <div className="node-pill">Nœud Central</div>
          <div className="node-name">BND-HQ-YDE</div>
          <span className="security-tag">Sécurisé</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="main-topbar">
          <div className="top-left">BND • Parc IT</div>
          <div className="top-right">
            <span className="status-online">● Réseau BND Opérationnel</span>
            <div className="user-box">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'E. Nganga'}
            </div>
            <button type="button" className="text-link logout-link" onClick={onLogout}>Déconnexion</button>
          </div>
        </header>

        <section className="bureau-content">
          <div className="page-header-row">
            <div>
              <div className="prefix">PATRIMOINE IMMOBILIER & AFFECTATIONS IT</div>
              <h2>Gestion des Bureaux</h2>
            </div>
            <div className="header-actions">
              <BackButton label="Retour" onClick={() => setScreen('dashboard')} />
              <button className="glass-btn">Imprimer la liste</button>
              <button type="button" className="add-btn" onClick={onCreateBureau}>+ Nouveau bureau</button>
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-box">
              <span className="metric-label">Bureaux enregistrés</span>
              <strong>{bureaux.length}</strong>
              <small>locaux actifs</small>
            </div>
            <div className="metric-box">
              <span className="metric-label">Équipements répartis</span>
              <strong>{equipment.length}</strong>
              <small>100% audités</small>
            </div>
            <div className="metric-box">
              <span className="metric-label">Bureaux sans matériel</span>
              <strong>{0}</strong>
              <small>couverte intégrale</small>
            </div>
          </div>

          <div className="filter-bar">
            <div className="search-field">🔎 Rechercher par bureau, porte ou responsable...</div>
            <div className="select-field">Département: Tous les départements</div>
            <div className="select-field">Affichage: S / {bureaux.length}</div>
          </div>

          <div className="bureau-list">
            {bureaux.map((bureau) => (
              <div key={bureau.name} className="bureau-card">
                <div className="bureau-main">
                  <div className="bureau-icon">◫</div>
                  <div className="bureau-copy">
                    <h3>{bureau.name}</h3>
                    <div className="meta-line">
                      <span>{bureau.code}</span>
                      <span>{bureau.floor}</span>
                    </div>
                    <div className="responsable">Responsable : {bureau.role}</div>
                  </div>
                </div>

                <div className="bureau-right">
                  <div className="badges">
                    <span className="mini-pill green">● {bureau.good} opérationnels</span>
                    <span className="mini-pill orange">● {bureau.warning} à vérifier</span>
                    <span className="mini-pill red">● {bureau.bad} en panne</span>
                  </div>
                  <div className="equip-count">{bureau.equipments} équipements</div>
                  <button type="button" className="view-btn" onClick={() => setScreen('inventaire')}>Voir les équipements</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bottom-panel">
            <div className="bottom-legend">
              <span className="legend-icon">◫</span>
              <span>Procédure de Traçabilité des Locaux (Norme BND)</span>
            </div>
            <div className="legend-side">Démarche de recensement sur 3 000 actifs</div>
          </div>
        </section>
      </main>
    </div>
  )
}

function InventoryPage({
  equipment,
  onOpenDetail,
  onDeleteEquipment,
  onExportInventory,
  setScreen,
  currentUser,
  onLogout,
}: {
  equipment: Equipment[]
  onOpenDetail: (code?: string) => void
  onDeleteEquipment: (code: string) => void
  onExportInventory: () => void
  setScreen: (screen: Screen) => void
  currentUser: AuthUser | null
  onLogout: () => void
}) {
  return (
    <div className="shell-app">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-block">
            <BrandLogo className="brand-mini-logo" />
          </div>
          <div className="brand-text">
            <strong>BND • Parc IT</strong>
            <span>République du Cameroun</span>
          </div>
        </div>

        <div className="search-mini"><span>🔎 Rechercher actif, IP, agent...</span></div>

        <div className="nav-block">
          <div className="nav-title">NAVIGATION PRINCIPALE</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-button ${item.target === 'inventaire' ? 'active' : ''}`}
              onClick={() => setScreen(item.target)}
            >
              <span className="nav-icon">▣</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="bottom-node">
          <div className="node-pill">Nœud Central</div>
          <div className="node-name">BND-HQ-YDE</div>
          <span className="security-tag">Sécurisé</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="main-topbar">
          <div className="top-left">BND • Parc IT</div>
          <div className="top-right">
            <span className="status-online">● Réseau BND Opérationnel</span>
            <div className="user-box">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'E. Nganga'}
            </div>
            <button type="button" className="text-link logout-link" onClick={onLogout}>Déconnexion</button>
          </div>
        </header>

        <section className="inventory-content">
          <div className="inventory-header">
            <div className="inventory-title-group">
              <div className="prefix">BND / GESTION DU PARC / REGISTRE NATIONAL</div>
              <h2>Inventaire Général des Équipements</h2>
            </div>
            <div className="inventory-counters">
              <BackButton label="Retour" onClick={() => setScreen('dashboard')} />
              <span className="counter green">Opérationnels: {equipment.filter((item) => item.status === 'Bon état').length}</span>
              <span className="counter red">En panne: {equipment.filter((item) => item.status === 'En panne').length}</span>
            </div>
          </div>

          <div className="toolbar-line">
            <div className="search-box-line">🔎 Rechercher</div>
            <div className="select-box">Tous les types ▾</div>
            <div className="select-box">Tous les bureaux ▾</div>
            <div className="select-box">Tous les états ▾</div>
            <button type="button" className="mini-btn">Importer</button>
            <button type="button" className="mini-btn accent" onClick={onExportInventory}>Exporter Excel</button>
            <button type="button" className="mini-btn strong" onClick={() => onOpenDetail()}>+ Ajouter un équipement</button>
          </div>

          <table className="inventory-table">
            <thead>
              <tr>
                <th>Code inventaire</th>
                <th>Type</th>
                <th>Marque & Modèle</th>
                <th>Bureau / Emplacement</th>
                <th>Utilisateur responsable</th>
                <th>État</th>
                <th>Actions rapides</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr key={item.id}>
                  <td className="row-code">{item.code}</td>
                  <td>{item.category}</td>
                  <td>{item.manufacturer} {item.model}</td>
                  <td>{item.bureau}</td>
                  <td>{item.user}</td>
                  <td><span className={`state ${getStateClass(item.status)}`}>{item.status}</span></td>
                  <td className="actions-box">
                    <button type="button" className="small-action" onClick={() => onOpenDetail(item.code)}>Voir</button>
                    <button type="button" className="small-action" onClick={() => onOpenDetail(item.code)}>Modifier</button>
                    <button type="button" className="small-action danger" onClick={() => onDeleteEquipment(item.code)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bottom-status-row">
            <span>{equipment.length} équipements enregistrés</span>
            <div className="pager">1 2 3</div>
          </div>
        </section>
      </main>
    </div>
  )
}

function DetailPage({
  equipment,
  selectedCode,
  onSaveEquipment,
  onDeleteEquipment,
  draftDefaults,
  setScreen,
  currentUser,
  onLogout,
}: {
  equipment: Equipment[]
  selectedCode: string
  onSaveEquipment: (payload: EquipmentForm) => void
  onDeleteEquipment: (code: string) => void
  draftDefaults: EquipmentForm | null
  setScreen: (screen: Screen) => void
  currentUser: AuthUser | null
  onLogout: () => void
}) {
  const selectedEquipment = equipment.find((item) => item.code === selectedCode) ?? null

  const [form, setForm] = useState<EquipmentForm>(draftDefaults ?? toFormData(selectedEquipment))

  useEffect(() => {
    setForm(draftDefaults ?? toFormData(selectedEquipment))
  }, [selectedEquipment, draftDefaults])

  const updateField = (field: keyof EquipmentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSaveEquipment(form)
  }

  return (
    <div className="shell-app">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-block">
            <BrandLogo className="brand-mini-logo" />
          </div>
          <div className="brand-text">
            <strong>BND • Parc IT</strong>
            <span>République du Cameroun</span>
          </div>
        </div>

        <div className="search-mini"><span>🔎 Rechercher actif, IP, agent...</span></div>

        <div className="nav-block">
          <div className="nav-title">NAVIGATION PRINCIPALE</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-button ${item.target === 'detail' ? 'active' : ''}`}
              onClick={() => setScreen(item.target)}
            >
              <span className="nav-icon">▣</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="bottom-node">
          <div className="node-pill">Nœud Central</div>
          <div className="node-name">BND-HQ-YDE</div>
          <span className="security-tag">Sécurisé</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="main-topbar">
          <div className="top-left">BND • Parc IT</div>
          <div className="top-right">
            <span className="status-online">● Réseau BND Opérationnel</span>
            <div className="user-box">
              {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'E. Nganga'}
            </div>
            <button type="button" className="text-link logout-link" onClick={onLogout}>Déconnexion</button>
          </div>
        </header>

        <section className="detail-content">
          <form onSubmit={handleSubmit}>
            <div className="detail-headline">
              <div className="headline-left">
                <div className="route-line">BND / Inventaire du parc / Fiche technique d’équipement</div>
                <h2>{form.code || 'Nouvel équipement'} — {form.model || 'Nouveau matériel'}</h2>
              </div>
              <div className="detail-actions">
                <BackButton label="Retour" onClick={() => setScreen('inventaire')} />
                <button type="button" className="glass-btn dark">Imprimer / Fiche</button>
                <button type="submit" className="glass-btn">Enregistrer</button>
                {selectedEquipment ? (
                  <button type="button" className="glass-btn danger" onClick={() => onDeleteEquipment(selectedEquipment.code)}>Supprimer</button>
                ) : null}
              </div>
            </div>

            <div className="detail-layout">
              <div className="detail-main">
                <div className="section-card form-card">
                  <div className="section-head">1. Identification de l’Équipement</div>
                  <div className="form-grid">
                    <label>
                      Code inventaire
                      <input value={form.code} onChange={(event) => updateField('code', event.target.value)} />
                    </label>
                    <label>
                      Catégorie matériel
                      <input value={form.category} onChange={(event) => updateField('category', event.target.value)} />
                    </label>
                    <label>
                      Marque / Fabricant
                      <input value={form.manufacturer} onChange={(event) => updateField('manufacturer', event.target.value)} />
                    </label>
                    <label>
                      Modèle / Série
                      <input value={form.model} onChange={(event) => updateField('model', event.target.value)} />
                    </label>
                    <label>
                      Numéro de série constructeur
                      <input value={form.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} />
                    </label>
                    <label>
                      État
                      <select value={form.status} onChange={(event) => updateField('status', event.target.value as EquipmentStatus)}>
                        <option value="Bon état">Bon état</option>
                        <option value="À vérifier">À vérifier</option>
                        <option value="En panne">En panne</option>
                        <option value="Hors service">Hors service</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="section-card form-card">
                  <div className="section-head">2. Spécifications Techniques Dynamiques</div>
                  <div className="spec-grid">
                    <label>
                      Système d’exploitation
                      <input value={form.os} onChange={(event) => updateField('os', event.target.value)} />
                    </label>
                    <label>
                      Adresse IP
                      <input value={form.ip} onChange={(event) => updateField('ip', event.target.value)} />
                    </label>
                    <label>
                      Valeur d’acquisition
                      <input value={form.acquisitionValue} onChange={(event) => updateField('acquisitionValue', event.target.value)} />
                    </label>
                    <label>
                      Date d’affectation
                      <input type="date" value={form.dateAffectation} onChange={(event) => updateField('dateAffectation', event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="section-card form-card">
                  <div className="section-head">3. Localisation & Dépôt BND</div>
                  <div className="location-grid">
                    <label>
                      Bureau physique
                      <input value={form.bureau} onChange={(event) => updateField('bureau', event.target.value)} />
                    </label>
                    <label>
                      Département
                      <input value={form.department} onChange={(event) => updateField('department', event.target.value)} />
                    </label>
                    <label>
                      Agent bénéficiaire / Dépositaire
                      <input value={form.user} onChange={(event) => updateField('user', event.target.value)} />
                    </label>
                    <label>
                      Dernier audit
                      <input type="date" value={form.lastAudit} onChange={(event) => updateField('lastAudit', event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="action-row">
                  <button type="submit" className="save-btn">✓ Enregistrer les modifications</button>
                  <button type="button" className="ghost-btn" onClick={() => setScreen('inventaire')}>Retour à l’inventaire</button>
                  {selectedEquipment ? (
                    <button type="button" className="ghost-btn" onClick={() => onDeleteEquipment(selectedEquipment.code)}>Supprimer cet équipement</button>
                  ) : null}
                </div>
              </div>

              <aside className="detail-sidebar">
                <div className="side-photo">
                  <div className="photo-placeholder">ordinateur</div>
                  <div className="photo-label">{form.manufacturer} {form.model}</div>
                  <div className="photo-meta">S/N: {form.serialNumber || 'Non renseigné'}</div>
                </div>

                <div className="info-card">
                  <div className="info-head">Fiche Signalétique d’Audit</div>
                  <div className="info-row"><span>Conformité</span><strong>{form.status}</strong></div>
                  <div className="info-row"><span>Valeur d’acquisition</span><strong>{form.acquisitionValue || 'Non renseignée'}</strong></div>
                  <div className="info-row"><span>Dernier audit</span><strong>{formatDate(form.lastAudit)}</strong></div>
                  <div className="info-row"><span>Adresse IP</span><strong>{form.ip || 'Non assignée'}</strong></div>
                  <div className="info-row"><span>Département</span><strong>{form.department || 'Non renseigné'}</strong></div>
                  <div className="info-row"><span>Bureau</span><strong>{form.bureau || 'Non affecté'}</strong></div>
                </div>
              </aside>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedCode, setSelectedCode] = useState<string>('')
  const [detailDraft, setDetailDraft] = useState<EquipmentForm | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  const refreshEquipment = async () => {
    setEquipment(await listEquipments())
  }

  const handleExportInventory = () => {
    const rows = [
      ['Code', 'Catégorie', 'Marque', 'Modèle', 'Bureau', 'Département', 'Utilisateur', 'Statut', 'IP', 'Date affectation'],
      ...equipment.map((item) => [
        item.code,
        item.category,
        item.manufacturer,
        item.model,
        item.bureau,
        item.department,
        item.user,
        item.status,
        item.ip,
        item.dateAffectation,
      ]),
    ]

    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventaire-bnd.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('bnd-user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser
        setCurrentUser(parsed)
        setScreen('dashboard')
      } catch {
        localStorage.removeItem('bnd-user')
      }
    }

    void refreshEquipment()
  }, [])

  const handleOpenDetail = (code = '') => {
    setSelectedCode(code)
    setDetailDraft(null)
    setScreen('detail')
  }

  const handleCreateBureau = () => {
    setSelectedCode('')
    setDetailDraft({
      ...emptyEquipmentForm(),
      bureau: 'Nouveau bureau',
      department: 'Service Informatique',
    })
    setScreen('detail')
  }

  const handleSaveEquipment = async (payload: EquipmentForm) => {
    const normalizedCode = payload.code.trim() || `BND-${Date.now()}`
    const nextPayload = { ...payload, code: normalizedCode }

    if (selectedCode) {
      const nextEquipment = await updateEquipment(selectedCode, nextPayload)
      setSelectedCode(nextEquipment.code)
    } else {
      const nextEquipment = await createEquipment(nextPayload)
      setSelectedCode(nextEquipment.code)
    }

    await refreshEquipment()
    setDetailDraft(null)
    setScreen('inventaire')
  }

  const handleDeleteEquipment = async (code: string) => {
    await deleteEquipment(code)
    await refreshEquipment()
    if (selectedCode === code) {
      setSelectedCode('')
    }
    setScreen('inventaire')
  }

  const handleLogin = async (payload: LoginForm) => {
    const response = await requestJson<{ user: AuthUser; token: string }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    localStorage.setItem('bnd-user', JSON.stringify(response.user))
    localStorage.setItem('bnd-token', response.token)
    setCurrentUser(response.user)
    setScreen('dashboard')
  }

  const handleRegister = async (payload: RegisterForm) => {
    const response = await requestJson<{ email: string; message: string }>(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        post: payload.post,
        password: payload.password,
      }),
    })

    return response
  }

  const handleVerifyRegistration = async (email: string, code: string) => {
    await requestJson<{ user: AuthUser; message: string }>(`/api/auth/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })

    setScreen('login')
  }

  const handleResendCode = async (email: string) => {
    await requestJson<{ message: string }>(`/api/auth/resend-code`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('bnd-user')
    localStorage.removeItem('bnd-token')
    setScreen('login')
  }

  if (screen === 'login') {
    return <LoginPage onLogin={handleLogin} onOpenRegister={() => setScreen('register')} />
  }

  if (screen === 'register') {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onVerifyRegistration={handleVerifyRegistration}
        onResendCode={handleResendCode}
        onBackToLogin={() => setScreen('login')}
      />
    )
  }

  if (screen === 'dashboard') {
    return (
      <DashboardPage
        equipment={equipment}
        onOpenDetail={handleOpenDetail}
        onExportInventory={handleExportInventory}
        setScreen={setScreen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'bureaux') {
    return <BureauPage equipment={equipment} onCreateBureau={handleCreateBureau} setScreen={setScreen} currentUser={currentUser} onLogout={handleLogout} />
  }

  if (screen === 'inventaire') {
    return (
      <InventoryPage
        equipment={equipment}
        onOpenDetail={handleOpenDetail}
        onDeleteEquipment={handleDeleteEquipment}
        onExportInventory={handleExportInventory}
        setScreen={setScreen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <DetailPage
      equipment={equipment}
      selectedCode={selectedCode}
      onSaveEquipment={handleSaveEquipment}
      onDeleteEquipment={handleDeleteEquipment}
      draftDefaults={detailDraft}
      setScreen={setScreen}
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  )
}

export default App
