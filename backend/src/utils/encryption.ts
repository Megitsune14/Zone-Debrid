import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16
const SALT_LENGTH = 64

/**
 * Génère une clé de dérivation à partir de la clé principale et d'un salt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512')
}

/**
 * Chiffre une chaîne de caractères
 */
export function encrypt(text: string): string {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables')
    }

    // Générer un salt aléatoire
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    // Dériver la clé
    const key = deriveKey(encryptionKey, salt)
    
    // Générer un IV aléatoire
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    // Chiffrer le texte
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combiner salt + iv + encrypted
    const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, 'hex')])
    
    return combined.toString('base64')
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Déchiffre une chaîne de caractères
 */
export function decrypt(encryptedData: string): string {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables')
    }

    // Décoder la base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extraire les composants
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH)
    
    // Dériver la clé
    const key = deriveKey(encryptionKey, salt)
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    // Déchiffrer
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Vérifie si une chaîne est chiffrée (format base64 avec la bonne longueur)
 */
export function isEncrypted(text: string): boolean {
  try {
    const combined = Buffer.from(text, 'base64')
    return combined.length >= SALT_LENGTH + IV_LENGTH + 1
  } catch {
    return false
  }
}
