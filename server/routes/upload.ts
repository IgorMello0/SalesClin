import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
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

type MediaConfig = {
  extension: string
  mediaType: 'image' | 'video' | 'audio'
  maxBytes: number
  maxSourceBytes?: number
}

const MB = 1024 * 1024
const MAX_MEDIA_SOURCE_BYTES = 32 * MB

const ALLOWED_MEDIA_TYPES = new Map<string, MediaConfig>([
  ['image/jpeg', { extension: 'jpg', mediaType: 'image', maxBytes: 5 * MB }],
  ['image/png', { extension: 'png', mediaType: 'image', maxBytes: 5 * MB }],
  ['image/webp', { extension: 'webp', mediaType: 'image', maxBytes: 5 * MB }],
  ['image/gif', { extension: 'gif', mediaType: 'image', maxBytes: 5 * MB }],
  ['video/mp4', { extension: 'mp4', mediaType: 'video', maxBytes: 16 * MB }],
  ['video/3gpp', { extension: '3gp', mediaType: 'video', maxBytes: 16 * MB }],
  ['audio/mpeg', { extension: 'mp3', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/mp4', { extension: 'm4a', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/x-m4a', { extension: 'm4a', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/aac', { extension: 'aac', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/ogg', { extension: 'ogg', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/opus', { extension: 'opus', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/webm', { extension: 'webm', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/wav', { extension: 'wav', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
  ['audio/x-wav', { extension: 'wav', mediaType: 'audio', maxBytes: 16 * MB, maxSourceBytes: 32 * MB }],
])

function normalizeMimeType(mimetype: string) {
  return mimetype.toLowerCase().split(';', 1)[0].trim()
}

const mediaUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ALLOWED_MEDIA_TYPES.has(normalizeMimeType(file.mimetype))
    if (allowed) cb(null, true)
    else cb(new Error('Formato nao suportado. Envie imagem, video ou audio compativel.'))
  },
  // Audio from the browser can be large before FFmpeg converts it to a WhatsApp-friendly MP3.
  limits: { fileSize: MAX_MEDIA_SOURCE_BYTES },
})

function runMediaUpload(req: any, res: any, next: any) {
  mediaUpload.single('file')(req, res, (error: unknown) => {
    if (!error) return next()

    const isSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    const message = isSizeError
      ? 'O arquivo de origem excede o limite de 32 MB.'
      : error instanceof Error ? error.message : 'Nao foi possivel ler o arquivo enviado.'
    return res.status(isSizeError ? 413 : 400).json(createErrorResponse(message, isSizeError ? 413 : 400))
  })
}

function getPublicAppUrl(req: any) {
  const configuredUrl = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
  return configuredUrl || `${req.protocol}://${req.get('host')}`
}

function convertAudioForWhatsApp(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-vn', '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', '44100',
      '-f', 'mp3',
      outputPath,
    ])
    let errorOutput = ''
    process.stderr.on('data', (chunk) => { errorOutput += String(chunk) })
    process.on('error', reject)
    process.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(errorOutput.trim() || `ffmpeg encerrou com codigo ${code}`))
    })
  })
}

function convertVideoForWhatsApp(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-vf', 'scale=w=1280:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1',
      '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ])
    let errorOutput = ''
    process.stderr.on('data', (chunk) => { errorOutput += String(chunk) })
    process.on('error', reject)
    process.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(errorOutput.trim() || `ffmpeg encerrou com codigo ${code}`))
    })
  })
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

    const mediaConfig = ALLOWED_MEDIA_TYPES.get(normalizeMimeType(req.file.mimetype))
    if (!mediaConfig) {
      return res.status(400).json(createErrorResponse('Formato de arquivo nao suportado', 400))
    }
    const maxSourceBytes = mediaConfig.maxSourceBytes || mediaConfig.maxBytes
    if (req.file.size > maxSourceBytes) {
      const maxMb = Math.floor(maxSourceBytes / MB)
      return res.status(413).json(createErrorResponse(`Arquivos do tipo ${mediaConfig.mediaType} devem ter no maximo ${maxMb} MB.`, 413))
    }

    const relativeDirectory = path.posix.join('media', String(companyId))
    const uploadDirectory = path.join(process.cwd(), 'uploads', ...relativeDirectory.split('/'))
    const mediaId = randomUUID()
    const needsAudioConversion = mediaConfig.mediaType === 'audio'
    const needsVideoConversion = mediaConfig.mediaType === 'video'
    let storedFilename = needsAudioConversion || needsVideoConversion
      ? `${mediaId}.source.${mediaConfig.extension}`
      : `${mediaId}.${mediaConfig.extension}`
    let storedMimetype = req.file.mimetype
    let storedSize = req.file.size
    await fs.mkdir(uploadDirectory, { recursive: true })
    const initialPath = path.join(uploadDirectory, storedFilename)
    await fs.writeFile(initialPath, req.file.buffer, { flag: 'wx' })

    if (needsAudioConversion) {
      const convertedFilename = `${mediaId}.mp3`
      const convertedPath = path.join(uploadDirectory, convertedFilename)
      try {
        await convertAudioForWhatsApp(initialPath, convertedPath)
        const converted = await fs.stat(convertedPath)
        await fs.unlink(initialPath)
        if (converted.size > mediaConfig.maxBytes) {
          await fs.unlink(convertedPath).catch(() => undefined)
          const maxMb = Math.floor(mediaConfig.maxBytes / MB)
          return res.status(413).json(createErrorResponse(`O audio compactado excede o limite final de ${maxMb} MB. Grave uma mensagem menor.`, 413))
        }
        storedFilename = convertedFilename
        storedMimetype = 'audio/mpeg'
        storedSize = converted.size
      } catch (error) {
        await fs.unlink(initialPath).catch(() => undefined)
        await fs.unlink(convertedPath).catch(() => undefined)
        throw new Error(`Nao foi possivel preparar o audio: ${error instanceof Error ? error.message : 'falha na conversao'}`)
      }
    }

    if (needsVideoConversion) {
      const convertedFilename = `${mediaId}.mp4`
      const convertedPath = path.join(uploadDirectory, convertedFilename)
      try {
        await convertVideoForWhatsApp(initialPath, convertedPath)
        const converted = await fs.stat(convertedPath)
        await fs.unlink(initialPath)
        if (converted.size > mediaConfig.maxBytes) {
          await fs.unlink(convertedPath).catch(() => undefined)
          const maxMb = Math.floor(mediaConfig.maxBytes / MB)
          return res.status(413).json(createErrorResponse(`O video compactado excede o limite final de ${maxMb} MB. Envie um video menor.`, 413))
        }
        storedFilename = convertedFilename
        storedMimetype = 'video/mp4'
        storedSize = converted.size
      } catch (error) {
        await fs.unlink(initialPath).catch(() => undefined)
        await fs.unlink(convertedPath).catch(() => undefined)
        throw new Error(`Nao foi possivel preparar o video: ${error instanceof Error ? error.message : 'falha na conversao'}`)
      }
    }

    const publicPath = `/uploads/${relativeDirectory}/${storedFilename}`
    const publicUrl = `${getPublicAppUrl(req)}${publicPath}`
    console.info('[upload-media] Arquivo salvo', {
      companyId,
      mediaType: mediaConfig.mediaType,
      size: storedSize,
      publicPath,
    })

    return res.json(createSuccessResponse({
      url: publicUrl,
      publicPath,
      filename: storedFilename,
      originalName: req.file.originalname,
      size: storedSize,
      mimetype: storedMimetype,
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
