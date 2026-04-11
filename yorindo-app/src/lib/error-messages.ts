/**
 * User-friendly error message mapper.
 *
 * Transforms technical API error responses into human-readable Indonesian messages.
 * Never expose raw error.message, Zod details, or stack traces to end users.
 *
 * Usage:
 *   toast.error(getUserFriendlyError(errorData))
 */

interface ApiError {
  error?: {
    code?: string
    message?: string
    details?: unknown[]
  }
}

/** Map of known error codes to friendly Indonesian messages */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Data yang Anda masukkan tidak valid. Periksa kembali form dan coba lagi.',
  NOT_FOUND: 'Data tidak ditemukan.',
  UNAUTHORIZED: 'Anda perlu login terlebih dahulu.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  CONFLICT: 'Data ini sudah ada atau sedang diproses.',
  INTERNAL_ERROR: 'Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.',
  INVALID_TOKEN: 'Token tidak valid atau sudah kadaluarsa.',
  DUPLICATE_ENTRY: 'Data ini sudah terdaftar.',
  FOREIGN_KEY_VIOLATION: 'Data ini masih terhubung ke data lain.',
}

/** Map of known technical message patterns to friendly replacements */
const MESSAGE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /must be after/i, replacement: 'Tanggal harus setelah' },
  { pattern: /must be before/i, replacement: 'Tanggal harus sebelum' },
  { pattern: /required/i, replacement: 'Wajib diisi' },
  { pattern: /invalid.*email/i, replacement: 'Format email tidak valid' },
  { pattern: /invalid.*url/i, replacement: 'Format URL tidak valid' },
  { pattern: /too small/i, replacement: 'Nilai terlalu kecil' },
  { pattern: /too big/i, replacement: 'Nilai terlalu besar' },
  { pattern: /expected.*received/i, replacement: 'Format data tidak sesuai' },
]

/**
 * Convert a technical API error into a user-friendly Indonesian message.
 *
 * @param error - The raw error object from the API (or an Error instance)
 * @returns A human-readable message suitable for toast/alert display
 */
export function getUserFriendlyError(error: unknown): string {
  // Handle plain Error objects
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    // Network errors
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection')) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
    }

    // Check known patterns
    for (const { pattern, replacement } of MESSAGE_PATTERNS) {
      if (pattern.test(error.message)) {
        return error.message.replace(pattern, replacement)
      }
    }

    // Fallback for unknown Error messages
    return 'Terjadi kesalahan. Silakan coba lagi.'
  }

  // Handle API error response objects
  if (error && typeof error === 'object') {
    const apiError = error as ApiError
    const code = apiError.error?.code
    const message = apiError.error?.message ?? ''

    // 1. Try mapping by error code first
    if (code && ERROR_CODE_MESSAGES[code]) {
      return ERROR_CODE_MESSAGES[code]
    }

    // 2. Try matching known message patterns
    const msgLower = message.toLowerCase()
    for (const { pattern, replacement } of MESSAGE_PATTERNS) {
      if (pattern.test(message)) {
        return message.replace(pattern, replacement)
      }
    }

    // 3. Handle common technical messages
    if (msgLower.includes('json') || msgLower.includes('parse')) {
      return 'Format data tidak sesuai. Silakan coba lagi.'
    }

    if (msgLower.includes('duplicate') || msgLower.includes('unique')) {
      return 'Data ini sudah terdaftar.'
    }

    if (msgLower.includes('foreign key') || msgLower.includes('constraint')) {
      return 'Data ini masih terhubung ke data lain dan tidak dapat dihapus.'
    }

    // 4. If message is already reasonably short and non-technical, use it
    if (message && message.length < 100 && !msgLower.includes('zod') && !msgLower.includes('validation') && !msgLower.includes('schema')) {
      return message
    }
  }

  // 5. Ultimate fallback
  return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.'
}

/**
 * Get a short error title for toast headings.
 * Returns a brief label, not a full sentence.
 */
export function getErrorTitle(error: unknown): string {
  if (error instanceof Error) return 'Terjadi Kesalahan'

  if (error && typeof error === 'object') {
    const apiError = error as ApiError
    const code = apiError.error?.code

    switch (code) {
      case 'VALIDATION_ERROR': return 'Data Tidak Valid'
      case 'NOT_FOUND': return 'Tidak Ditemukan'
      case 'UNAUTHORIZED': return 'Belum Login'
      case 'FORBIDDEN': return 'Akses Ditolak'
      case 'CONFLICT': return 'Data Sudah Ada'
      case 'RATE_LIMIT_EXCEEDED': return 'Terlalu Banyak Permintaan'
      case 'INVALID_TOKEN': return 'Token Tidak Valid'
      default: return 'Terjadi Kesalahan'
    }
  }

  return 'Terjadi Kesalahan'
}
