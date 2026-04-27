import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { json, urlencoded } from 'express'
import { router as professionalsRouter } from './routes/professionals'
import { router as clientsRouter } from './routes/clients'
import { router as categoriesRouter } from './routes/categories'
import { router as catalogItemsRouter } from './routes/catalog-items'
import { router as appointmentsRouter } from './routes/appointments'
import { router as paymentsRouter } from './routes/payments'
import { router as fichaTemplatesRouter } from './routes/ficha-templates'
import { router as fichasRouter } from './routes/fichas'
import { router as empresasRouter } from './routes/empresas'
import { router as usuariosRouter } from './routes/usuarios'
import { router as agentesIaRouter } from './routes/agentes-ia'
import { router as conversasRouter } from './routes/conversas'
import { router as mensagensRouter } from './routes/mensagens'
import { router as uploadRouter } from './routes/upload'
import { router as modulesRouter } from './routes/modules'
import { router as permissionsRouter } from './routes/permissions'
import { router as dashboardRouter } from './routes/dashboard'
import { router as leadsRouter } from './routes/leads'
import { router as webhooksRouter } from './routes/webhooks'
import { createErrorResponse } from './utils/response'
import path from 'path'

dotenv.config()

const app = express()
app.use(cors())
app.use(json({ limit: '2mb' }))
app.use(urlencoded({ extended: true }))

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

app.use('/api/profissionais', professionalsRouter)
app.use('/api/clientes', clientsRouter)
app.use('/api/categorias', categoriesRouter)
app.use('/api/catalogo', catalogItemsRouter)
app.use('/api/agendamentos', appointmentsRouter)
app.use('/api/pagamentos', paymentsRouter)
app.use('/api/ficha-templates', fichaTemplatesRouter)
app.use('/api/fichas', fichasRouter)
app.use('/api/empresas', empresasRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/agentes-ia', agentesIaRouter)
app.use('/api/conversas', conversasRouter)
app.use('/api/mensagens', mensagensRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/modules', modulesRouter)
app.use('/api/permissions', permissionsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/webhooks', webhooksRouter)

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status || 500
  res.status(status).json(createErrorResponse(err?.message || 'Erro interno', status))
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`)
})


