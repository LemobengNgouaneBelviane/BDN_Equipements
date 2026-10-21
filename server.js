import cors from 'cors'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import helmet from 'helmet'

dotenv.config()

const { Pool } = pg
const app = express()
const port = Number(process.env.PORT ?? 4000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})

const memoryStore = []
const userStore = []
const pendingVerificationCodes = new Map()

const statusOptions = ['Bon état', 'À vérifier', 'En panne', 'Hors service']

const sanitizeText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim() || fallback
}

const normalizeEmail = (value) => sanitizeText(value, '').toLowerCase()

const generateVerificationCode = () => String(crypto.randomInt(100000, 999999))

const sendVerificationEmail = async (email, code, firstName, lastName) => {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[EMAIL DEV TEST] Code de vérification pour ${email}: ${code}`)
    return { delivered: false, mode: 'test' }
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? smtpUser,
    to: email,
    subject: 'Code de vérification - BND Parc IT',
    html: `
      <p>Bonjour ${firstName} ${lastName},</p>
      <p>Votre code de vérification est : <strong>${code}</strong></p>
      <p>Ce code expire dans 15 minutes.</p>
      <p>Merci de l’utiliser pour finaliser votre inscription au système BND.</p>
    `,
  })

  return { delivered: true, mode: 'smtp' }
}

const normalizeCode = (value) => {
  const next = sanitizeText(value, `BND-${Date.now()}`)
  return next.toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-')
}

const normalizeStatus = (value) => {
  if (!statusOptions.includes(value)) {
    return 'Bon état'
  }

  return value
}

const buildRecord = (payload, existing = null) => {
  const now = new Date().toISOString()
  const data = {
    id: existing?.id ?? `eq-${Date.now()}`,
    code: normalizeCode(payload.code ?? existing?.code ?? `BND-${Date.now()}`),
    category: sanitizeText(payload.category, existing?.category ?? 'Ordinateur portable'),
    manufacturer: sanitizeText(payload.manufacturer, existing?.manufacturer ?? 'Inconnu'),
    model: sanitizeText(payload.model, existing?.model ?? 'Modèle non renseigné'),
    serialNumber: sanitizeText(payload.serialNumber, existing?.serialNumber ?? ''),
    bureau: sanitizeText(payload.bureau, existing?.bureau ?? 'Non affecté'),
    department: sanitizeText(payload.department, existing?.department ?? 'Service Informatique'),
    user: sanitizeText(payload.user, existing?.user ?? 'Non affecté'),
    status: normalizeStatus(sanitizeText(payload.status, existing?.status ?? 'Bon état')),
    os: sanitizeText(payload.os, existing?.os ?? 'N/A'),
    ip: sanitizeText(payload.ip, existing?.ip ?? 'Non assignée'),
    acquisitionValue: sanitizeText(payload.acquisitionValue, existing?.acquisitionValue ?? '0 FCFA'),
    dateAffectation: sanitizeText(payload.dateAffectation, existing?.dateAffectation ?? new Date().toISOString().slice(0, 10)),
    lastAudit: sanitizeText(payload.lastAudit, existing?.lastAudit ?? new Date().toISOString().slice(0, 10)),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  return data
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
const connectionConfig = databaseUrl ? {
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
} : null

const pool = connectionConfig ? new Pool(connectionConfig) : null

const initializeDatabase = async () => {
  if (!pool) {
    return 'memory'
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(150) NOT NULL,
        manufacturer VARCHAR(150) NOT NULL,
        model VARCHAR(200) NOT NULL,
        serial_number VARCHAR(200),
        bureau VARCHAR(200) NOT NULL,
        department VARCHAR(200) NOT NULL,
        user_name VARCHAR(200) NOT NULL,
        status VARCHAR(40) NOT NULL,
        os_name VARCHAR(150),
        ip_address VARCHAR(50),
        acquisition_value VARCHAR(80),
        date_affectation DATE,
        last_audit DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    return 'postgres'
  } catch (error) {
    console.warn('Database unavailable, using in-memory fallback:', error.message)
    return 'memory'
  }
}

const dbMode = await initializeDatabase()

const listFromDatabase = async () => {
  if (!pool) return memoryStore

  const result = await pool.query(`
    SELECT
      id,
      code,
      category,
      manufacturer,
      model,
      serial_number AS "serialNumber",
      bureau,
      department,
      user_name AS "user",
      status,
      os_name AS os,
      ip_address AS ip,
      acquisition_value AS "acquisitionValue",
      to_char(date_affectation, 'YYYY-MM-DD') AS "dateAffectation",
      to_char(last_audit, 'YYYY-MM-DD') AS "lastAudit",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM equipments
    ORDER BY updated_at DESC
  `)

  return result.rows.map((row) => ({
    ...row,
    serialNumber: row.serialNumber ?? '',
    acquisitionValue: row.acquisitionValue ?? '',
    id: row.id,
  }))
}

const saveInDatabase = async (record) => {
  if (!pool) {
    const index = memoryStore.findIndex((item) => item.code.toLowerCase() === record.code.toLowerCase())
    if (index >= 0) {
      memoryStore[index] = record
      return record
    }

    memoryStore.unshift(record)
    return record
  }

  const values = [
    record.code,
    record.category,
    record.manufacturer,
    record.model,
    record.serialNumber,
    record.bureau,
    record.department,
    record.user,
    record.status,
    record.os,
    record.ip,
    record.acquisitionValue,
    record.dateAffectation,
    record.lastAudit,
  ]

  const result = await pool.query(
    `
      INSERT INTO equipments (
        code, category, manufacturer, model, serial_number, bureau, department,
        user_name, status, os_name, ip_address, acquisition_value,
        date_affectation, last_audit, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (code)
      DO UPDATE SET
        category = EXCLUDED.category,
        manufacturer = EXCLUDED.manufacturer,
        model = EXCLUDED.model,
        serial_number = EXCLUDED.serial_number,
        bureau = EXCLUDED.bureau,
        department = EXCLUDED.department,
        user_name = EXCLUDED.user_name,
        status = EXCLUDED.status,
        os_name = EXCLUDED.os_name,
        ip_address = EXCLUDED.ip_address,
        acquisition_value = EXCLUDED.acquisition_value,
        date_affectation = EXCLUDED.date_affectation,
        last_audit = EXCLUDED.last_audit,
        updated_at = NOW()
      RETURNING
        id,
        code,
        category,
        manufacturer,
        model,
        serial_number AS "serialNumber",
        bureau,
        department,
        user_name AS "user",
        status,
        os_name AS os,
        ip_address AS ip,
        acquisition_value AS "acquisitionValue",
        to_char(date_affectation, 'YYYY-MM-DD') AS "dateAffectation",
        to_char(last_audit, 'YYYY-MM-DD') AS "lastAudit",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    values,
  )

  return result.rows[0]
}

const deleteFromDatabase = async (code) => {
  if (!pool) {
    const filtered = memoryStore.filter((item) => item.code.toLowerCase() !== code.toLowerCase())
    memoryStore.length = 0
    memoryStore.push(...filtered)
    return filtered
  }

  const result = await pool.query(
    `DELETE FROM equipments WHERE code = $1 RETURNING code`,
    [normalizeCode(code)],
  )

  return result.rows
}

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use('/api', apiLimiter)

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: dbMode })
})

app.post('/api/auth/register', async (req, res) => {
  const payload = req.body ?? {}
  const firstName = sanitizeText(payload.firstName)
  const lastName = sanitizeText(payload.lastName)
  const email = normalizeEmail(payload.email)
  const post = sanitizeText(payload.post)
  const password = sanitizeText(payload.password)

  if (!firstName || !lastName || !email || !post || !password) {
    return res.status(400).json({ message: 'Tous les champs sont requis pour l’inscription.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' })
  }

  const existingUser = userStore.find((user) => user.email === email)
  if (existingUser) {
    return res.status(409).json({ message: 'Un compte existe déjà pour cet e-mail.' })
  }

  const verificationCode = generateVerificationCode()
  pendingVerificationCodes.set(email, {
    firstName,
    lastName,
    email,
    post,
    password: crypto.createHash('sha256').update(password).digest('hex'),
    code: verificationCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
  })

  await sendVerificationEmail(email, verificationCode, firstName, lastName)

  return res.status(200).json({
    email,
    message: 'Un code de vérification a été envoyé à votre adresse e-mail.',
  })
})

app.post('/api/auth/resend-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const pending = pendingVerificationCodes.get(email)

  if (!pending) {
    return res.status(404).json({ message: 'Aucune inscription en attente pour cet e-mail.' })
  }

  const verificationCode = generateVerificationCode()
  pendingVerificationCodes.set(email, {
    ...pending,
    code: verificationCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
  })

  await sendVerificationEmail(email, verificationCode, pending.firstName, pending.lastName)

  return res.json({ message: 'Un nouveau code a été envoyé à votre adresse e-mail.' })
})

app.post('/api/auth/verify-email', (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const code = sanitizeText(req.body?.code, '')
  const pending = pendingVerificationCodes.get(email)

  if (!pending) {
    return res.status(404).json({ message: 'Aucune demande de vérification trouvée pour cet e-mail.' })
  }

  if (Date.now() > pending.expiresAt) {
    pendingVerificationCodes.delete(email)
    return res.status(410).json({ message: 'Le code de vérification a expiré. Demandez un nouveau code.' })
  }

  if (pending.code !== code) {
    return res.status(400).json({ message: 'Le code de vérification est incorrect.' })
  }

  const user = {
    id: `u-${Date.now()}`,
    firstName: pending.firstName,
    lastName: pending.lastName,
    email: pending.email,
    post: pending.post,
    password: pending.password,
    createdAt: new Date().toISOString(),
  }

  userStore.push(user)
  pendingVerificationCodes.delete(email)

  const { password: _password, ...safeUser } = user
  return res.status(201).json({ user: safeUser, message: 'Compte vérifié et créé avec succès.' })
})

app.post('/api/auth/login', (req, res) => {
  const payload = req.body ?? {}
  const email = sanitizeText(payload.email).toLowerCase()
  const password = sanitizeText(payload.password)

  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail et mot de passe obligatoires.' })
  }

  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
  const user = userStore.find((account) => account.email === email && account.password === hashedPassword)

  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.' })
  }

  const { password: _password, ...safeUser } = user
  return res.json({
    user: safeUser,
    token: `bnd-token-${user.id}`,
    message: 'Connexion réussie.',
  })
})

app.get('/api/equipments', async (req, res) => {
  try {
    const items = dbMode === 'postgres' ? await listFromDatabase() : memoryStore
    res.json({ items })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/equipments/:code', async (req, res) => {
  try {
    const items = dbMode === 'postgres' ? await listFromDatabase() : memoryStore
    const item = items.find((equipment) => equipment.code.toLowerCase() === req.params.code.toLowerCase())

    if (!item) {
      return res.status(404).json({ message: 'Équipement introuvable' })
    }

    return res.json({ item })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.post('/api/equipments', async (req, res) => {
  try {
    const payload = req.body ?? {}
    const record = buildRecord(payload)

    if (!record.code || !record.category || !record.manufacturer || !record.model) {
      return res.status(400).json({ message: 'Les champs minimaux sont requis' })
    }

    const saved = dbMode === 'postgres' ? await saveInDatabase(record) : saveInDatabase(record)
    return res.status(201).json({ item: saved })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.put('/api/equipments/:code', async (req, res) => {
  try {
    const current = await listFromDatabase()
    const existing = current.find((equipment) => equipment.code.toLowerCase() === req.params.code.toLowerCase())

    if (!existing) {
      return res.status(404).json({ message: 'Équipement introuvable' })
    }

    const record = buildRecord(req.body ?? {}, existing)
    const updated = dbMode === 'postgres' ? await saveInDatabase(record) : saveInDatabase(record)
    return res.json({ item: updated })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.delete('/api/equipments/:code', async (req, res) => {
  try {
    const code = req.params.code
    const items = dbMode === 'postgres' ? await deleteFromDatabase(code) : deleteFromDatabase(code)
    return res.json({ items })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`BND API running on http://localhost:${port}`)
  console.log(`Database mode: ${dbMode}`)
})
