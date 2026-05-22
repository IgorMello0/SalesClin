import { Router } from 'express'
import { prisma } from '../prisma.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

export const router = Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// ─── Login com Google para Profissionais ───
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json(createErrorResponse('Token do Google não fornecido', 400))
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json(createErrorResponse('GOOGLE_CLIENT_ID não configurado no servidor', 500))
    }

    // Verificar o token do Google
    let payload: any
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch (err: any) {
      console.error('[Auth Google] Token inválido:', err.message)
      return res.status(401).json(createErrorResponse('Token do Google inválido ou expirado', 401))
    }

    if (!payload?.email) {
      return res.status(401).json(createErrorResponse('Não foi possível obter o e-mail da conta Google', 401))
    }

    const { email, name, sub: googleId, picture } = payload

    console.log('[Auth Google] Login attempt:', email)

    // ── 1. Tentar achar profissional pelo googleId ──
    let professional = await prisma.professional.findFirst({
      where: { googleId },
      include: { company: true, ownedCompanies: true }
    })

    // ── 2. Se não achou pelo googleId, tentar pelo e-mail ──
    if (!professional) {
      professional = await prisma.professional.findUnique({
        where: { email },
        include: { company: true, ownedCompanies: true }
      })

      // Se achou pelo e-mail, vincular o googleId
      if (professional) {
        await prisma.professional.update({
          where: { id: professional.id },
          data: { googleId, authProvider: professional.authProvider || 'local' }
        })
      }
    }

    // ── 3. Se ainda não existe, criar conta nova ──
    if (!professional) {
      professional = await prisma.professional.create({
        data: {
          name: name || email.split('@')[0],
          email,
          passwordHash: '', // Sem senha — login é via Google
          googleId,
          authProvider: 'google',
          photoUrl: picture || null,
          onboardingCompleted: false,
        },
        include: { company: true, ownedCompanies: true }
      })
      console.log('[Auth Google] Novo profissional criado:', email)
    }

    // ── 4. Montar resposta (mesma estrutura do login normal) ──
    const availableCompanies = professional.ownedCompanies.length > 0
      ? professional.ownedCompanies.map(c => ({ id: c.id, name: c.name }))
      : (professional.company ? [{ id: professional.company.id, name: professional.company.name }] : [])

    const allowedCompanies = availableCompanies.map(c => c.id)

    const token = jwt.sign({
      id: professional.id,
      companyId: professional.companyId,
      type: 'profissional',
      allowedCompanies
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
          name: professional.company.name
        } : null,
        companies: availableCompanies
      }
    }))
  } catch (error: any) {
    console.error('[Auth Google] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno ao processar login com Google', 500))
  }
})
