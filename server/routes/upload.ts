import { Router } from 'express'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

export const router = Router()

// Configurar storage na memória do multer (essencial para ambientes serverless como Vercel que são Read-Only)
const storage = multer.memoryStorage()

// Filtro para aceitar apenas imagens
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limitar a 10MB para Base64 eficiente
  }
})

router.post('/', auth(), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('Nenhuma imagem foi enviada', 400))
    }

    // Converter buffer da imagem para Base64 Data URL
    const b64 = req.file.buffer.toString('base64')
    const mimeType = req.file.mimetype
    const imageUrl = `data:${mimeType};base64,${b64}`
    
    res.json(createSuccessResponse({
      url: imageUrl,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size
    }))
  } catch (error) {
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Erro ao fazer upload da imagem',
      500
    ))
  }
})

// --- Upload de Mídias para Campanhas (Em memória, suportando Base64 para Vercel) ---
const campaignUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'audio/', 'video/']
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens, áudios e vídeos são permitidos'))
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
})

async function uploadToCatbox(buffer: Buffer, originalName: string): Promise<string> {
  const url = 'https://catbox.moe/user/api.php'
  const formData = new FormData()
  formData.append('reqtype', 'fileupload')
  
  const blob = new globalThis.Blob([buffer])
  formData.append('fileToUpload', blob, originalName)

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Catbox upload failed with status ${response.status}`)
  }

  const fileUrl = await response.text()
  if (!fileUrl.startsWith('http')) {
    throw new Error(`Catbox upload returned invalid response: ${fileUrl}`)
  }

  return fileUrl.trim()
}

router.post('/campaign-media', auth(), requireModule('campanhas'), campaignUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('Nenhum arquivo enviado', 400))
    }

    let fileUrl = ''
    try {
      console.log(`[upload-campaign-media] Enviando arquivo (${req.file.size} bytes, ${req.file.mimetype}) para o Catbox...`)
      fileUrl = await uploadToCatbox(req.file.buffer, req.file.originalname)
      console.log(`[upload-campaign-media] Enviado para Catbox com sucesso: ${fileUrl}`)
    } catch (err: any) {
      console.error('[upload-campaign-media] Erro ao enviar para Catbox, usando fallback Base64:', err)
      const b64 = req.file.buffer.toString('base64')
      const mimeType = req.file.mimetype
      fileUrl = `data:${mimeType};base64,${b64}`
    }
    
    res.json(createSuccessResponse({
      url: fileUrl,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    }))
  } catch (error: any) {
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo',
      500
    ))
  }
})
