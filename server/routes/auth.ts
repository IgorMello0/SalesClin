import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { prisma } from '../prisma.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import { ensureCompanyDefaults } from '../bootstrap/defaults.js'

export const router = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

function resolveGooglePhoto(currentPhotoUrl?: string | null, googlePicture?: string | null) {
  if (currentPhotoUrl?.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), currentPhotoUrl)
    return fs.existsSync(fullPath) ? currentPhotoUrl : googlePicture || null
  }

  return currentPhotoUrl || googlePicture || null
}

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json(createErrorResponse('Token do Google nao fornecido', 400))
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json(createErrorResponse('GOOGLE_CLIENT_ID nao configurado no servidor', 500))
    }

    let payload: any
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch (err: any) {
      console.error('[Auth Google] Token invalido:', err.message)
      return res.status(401).json(createErrorResponse('Token do Google invalido ou expirado', 401))
    }

    if (!payload?.email) {
      return res.status(401).json(createErrorResponse('Nao foi possivel obter o e-mail da conta Google', 401))
    }

    const { email, name, sub: googleId, picture } = payload
    console.log('[Auth Google] Login attempt:', email)

    let professional = await prisma.professional.findFirst({
      where: { googleId },
      include: { company: true, ownedCompanies: true },
    })

    if (professional) {
      const photoUrl = resolveGooglePhoto(professional.photoUrl, picture)
      if (photoUrl !== professional.photoUrl) {
        professional = await prisma.professional.update({
          where: { id: professional.id },
          data: { photoUrl },
          include: { company: true, ownedCompanies: true },
        })
      }
    }

    if (!professional) {
      professional = await prisma.professional.findUnique({
        where: { email },
        include: { company: true, ownedCompanies: true },
      })

      if (professional) {
        professional = await prisma.professional.update({
          where: { id: professional.id },
          data: {
            googleId,
            authProvider: professional.authProvider || 'local',
            photoUrl: resolveGooglePhoto(professional.photoUrl, picture),
          },
          include: { company: true, ownedCompanies: true },
        })
      }
    }

    if (!professional) {
      return res.status(403).json(createErrorResponse('Cadastro com Google exige checkout. Escolha um plano antes de criar a conta.', 403))
    }

    if (!professional.companyId) {
      const companyName = `Empresa de ${professional.name || name || email.split('@')[0]}`
      const company = await prisma.empresa.create({
        data: {
          name: companyName,
          ownerId: professional.id,
          isActive: true,
        },
      })

      professional = await prisma.professional.update({
        where: { id: professional.id },
        data: {
          companyId: company.id,
          companyName,
        },
        include: { company: true, ownedCompanies: true },
      })

      await ensureCompanyDefaults(prisma, company.id, professional.id)
    } else {
      await ensureCompanyDefaults(prisma, professional.companyId, professional.id)
    }

    const availableCompanies = professional.ownedCompanies.length > 0
      ? professional.ownedCompanies.map(c => ({ id: c.id, name: c.name }))
      : (professional.company ? [{ id: professional.company.id, name: professional.company.name }] : [])

    const allowedCompanies = availableCompanies.map(c => c.id)

    const token = jwt.sign({
      id: professional.id,
      companyId: professional.companyId,
      type: 'profissional',
      allowedCompanies,
    }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' })

    console.log('[Auth Google] Login bem-sucedido:', email)

    res.json(createSuccessResponse({
      token,
      professional: {
        id: professional.id.toString(),
        name: professional.name,
        email: professional.email,
        phone: professional.phone || '',
        specialization: professional.specialization || '',
        photoUrl: professional.photoUrl || picture || undefined,
        onboardingCompleted: professional.onboardingCompleted,
        company: professional.company ? {
          id: professional.company.id,
          name: professional.company.name,
        } : null,
        companies: availableCompanies,
      },
    }))
  } catch (error: any) {
    console.error('[Auth Google] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno ao processar login com Google', 500))
  }
})
