export type UploadMediaType = 'image' | 'video' | 'audio';

const MB = 1024 * 1024;

const ALLOWED_MEDIA_TYPES = new Map<string, { type: UploadMediaType; maxBytes: number }>([
  ['image/jpeg', { type: 'image', maxBytes: 5 * MB }],
  ['image/png', { type: 'image', maxBytes: 5 * MB }],
  ['image/webp', { type: 'image', maxBytes: 5 * MB }],
  ['image/gif', { type: 'image', maxBytes: 5 * MB }],
  ['video/mp4', { type: 'video', maxBytes: 16 * MB }],
  ['video/3gpp', { type: 'video', maxBytes: 16 * MB }],
  ['audio/mpeg', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/mp4', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/x-m4a', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/aac', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/ogg', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/opus', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/webm', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/wav', { type: 'audio', maxBytes: 32 * MB }],
  ['audio/x-wav', { type: 'audio', maxBytes: 32 * MB }],
]);

export function validateMediaUpload(file: File) {
  const normalizedType = file.type.toLowerCase().split(';', 1)[0].trim();
  const config = ALLOWED_MEDIA_TYPES.get(normalizedType);
  if (!config) {
    return { type: null, error: 'Formato nao suportado. Selecione uma imagem, video ou audio compativel.' } as const;
  }

  if (file.size > config.maxBytes) {
    const maxMb = Math.floor(config.maxBytes / MB);
    return { type: null, error: `O arquivo excede o limite de ${maxMb} MB para ${config.type}.` } as const;
  }

  return { type: config.type, error: null } as const;
}
