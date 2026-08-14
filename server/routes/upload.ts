import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse } from '../utils/response.js'

export const router = Router()

const storage = multer.memoryStorage()

const imageUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('image/')
    if (allowed) cb(null, true)
    else cb(new Error('Apenas arquivos de imagem sao permitidos'))
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

router.post('/', auth(), imageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('Nenhuma imagem foi enviada', 400))
    }

    const b64 = req.file.buffer.toString('base64')
    const imageUrl = `data:${req.file.mimetype};base64,${b64}`

    res.json(createSuccessResponse({
      url: imageUrl,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
    }))
  } catch (error) {
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Erro ao fazer upload da imagem',
      500,
    ))
  }
})

const ALLOWED_MEDIA_TYPES = new Map<string, { extension: string; mediaType: 'image' | 'video' | 'audio'; maxBytes: number }>([
  ['image/jpeg', { extension: 'jpg', mediaType: 'image', maxBytes: 5 * 1024 * 1024 }],
  ['image/png', { extension: 'png', mediaType: 'image', maxBytes: 5 * 1024 * 1024 }],
  ['image/webp', { extension: 'webp', mediaType: 'image', maxBytes: 5 * 1024 * 1024 }],
  ['image/gif', { extension: 'gif', mediaType: 'image', maxBytes: 5 * 1024 * 1024 }],
  ['video/mp4', { extension: 'mp4', mediaType: 'video', maxBytes: 16 * 1024 * 1024 }],
  ['video/3gpp', { extension: '3gp', mediaType: 'video', maxBytes: 16 * 1024 * 1024 }],
  ['audio/mpeg', { extension: 'mp3', mediaType: 'audio', maxBytes: 16 * 1024 * 1024 }],
  ['audio/mp4', { extension: 'm4a', mediaType: 'audio', maxBytes: 16 * 1024 * 1024 }],
  ['audio/ogg', { extension: 'ogg', mediaType: 'audio', maxBytes: 16 * 1024 * 1024 }],
  ['audio/opus', { extension: 'opus', mediaType: 'audio', maxBytes: 16 * 1024 * 1024 }],
])

const mediaUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MEDIA_TYPES.has(file.mimetype)
    if (allowed) cb(null, true)
    else cb(new Error('Formato nao suportado. Envie JPG, PNG, WEBP, GIF, MP4, MP3, M4A, OGG ou OPUS.'))
  },
  limits: { fileSize: 16 * 1024 * 1024 },
})

function runMediaUpload(req: any, res: any, next: any) {
  mediaUpload.single('file')(req, res, (error: unknown) => {
    if (!error) return next()

    const isSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    const message = isSizeError
      ? 'O arquivo excede o limite de 16 MB.'
      : error instanceof Error ? error.message : 'Nao foi possivel ler o arquivo enviado.'
    return res.status(isSizeError ? 413 : 400).json(createErrorResponse(message, isSizeError ? 413 : 400))
  })
}

function getPublicAppUrl(req: any) {
  const configuredUrl = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
  return configuredUrl || `${req.protocol}://${req.get('host')}`
}

async function persistMedia(req: any, res: any) {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse('Nenhum arquivo foi enviado', 400))
    }

    const companyId = Number(req.user?.companyId)
    if (!Number.isInteger(companyId) || companyId <= 0) {
      return res.status(400).json(createErrorResponse('Selecione uma clinica antes de enviar a midia', 400))
    }

    const mediaConfig = ALLOWED_MEDIA_TYPES.get(req.file.mimetype)
    if (!mediaConfig) {
      return res.status(400).json(createErrorResponse('Formato de arquivo nao suportado', 400))
    }
    if (req.file.size > mediaConfig.maxBytes) {
      const maxMb = Math.floor(mediaConfig.maxBytes / 1024 / 1024)
      return res.status(413).json(createErrorResponse(`Arquivos do tipo ${mediaConfig.mediaType} devem ter no maximo ${maxMb} MB.`, 413))
    }

    const relativeDirectory = path.posix.join('media', String(companyId))
    const uploadDirectory = path.join(process.cwd(), 'uploads', ...relativeDirectory.split('/'))
    const storedFilename = `${randomUUID()}.${mediaConfig.extension}`
    await fs.mkdir(uploadDirectory, { recursive: true })
    await fs.writeFile(path.join(uploadDirectory, storedFilename), req.file.buffer, { flag: 'wx' })

    const publicPath = `/uploads/${relativeDirectory}/${storedFilename}`
    const publicUrl = `${getPublicAppUrl(req)}${publicPath}`
    console.info('[upload-media] Arquivo salvo', {
      companyId,
      mediaType: mediaConfig.mediaType,
      size: req.file.size,
      publicPath,
    })

    return res.json(createSuccessResponse({
      url: publicUrl,
      publicPath,
      filename: storedFilename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      mediaType: mediaConfig.mediaType,
    }))
  } catch (error) {
    console.error('[upload-media] Falha ao persistir arquivo:', error)
    return res.status(500).json(createErrorResponse(
      error instanceof Error ? `Falha ao salvar a midia: ${error.message}` : 'Falha ao salvar a midia',
      500,
    ))
  }
}

// Shared by conversations and campaigns. The sending routes enforce their own module permissions.
router.post('/media', auth(), runMediaUpload, persistMedia)

// Backward-compatible alias for clients deployed before the shared endpoint.
router.post('/campaign-media', auth(), runMediaUpload, persistMedia)
