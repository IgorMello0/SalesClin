import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

export const router = Router()

// Configurar storage do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads')
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `image-${uniqueSuffix}${ext}`)
  }
})

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
    fileSize: 15 * 1024 * 1024 // 15MB
  }
})

router.post('/', auth(), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('Nenhuma imagem foi enviada', 400))
    }

    // Retornar URL da imagem
    const imageUrl = `/uploads/${req.file.filename}`
    
    res.json(createSuccessResponse({
      url: imageUrl,
      filename: req.file.filename,
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

