import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import multer from 'multer'

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

