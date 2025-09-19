import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { encrypt, decrypt, isEncrypted } from '@/utils/encryption'

export interface IUser extends Document {
  username: string
  password: string
  allDebridApiKey: string
  masterPassword?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  compareMasterPassword(candidatePassword: string): Promise<boolean>
  getDecryptedAllDebridApiKey(): string
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Le nom d\'utilisateur est requis'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
    maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  allDebridApiKey: {
    type: String,
    required: [true, 'La clé API AllDebrid est requise'],
    trim: true
  },
  masterPassword: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

// Middleware pour hasher le mot de passe et chiffrer la clé API avant sauvegarde
userSchema.pre('save', async function(next) {
  try {
    // Hasher le mot de passe si il a été modifié
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12)
      this.password = await bcrypt.hash(this.password, salt)
    }
    
    // Hasher le mot de passe maître si il a été modifié
    if (this.isModified('masterPassword') && this.masterPassword) {
      const salt = await bcrypt.genSalt(12)
      this.masterPassword = await bcrypt.hash(this.masterPassword, salt)
    }
    
    // Chiffrer la clé API AllDebrid si elle a été modifiée et n'est pas déjà chiffrée
    if (this.isModified('allDebridApiKey') && !isEncrypted(this.allDebridApiKey)) {
      this.allDebridApiKey = encrypt(this.allDebridApiKey)
    }
    
    next()
  } catch (error: any) {
    next(error)
  }
})

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    return false
  }
}

// Méthode pour comparer le mot de passe maître
userSchema.methods.compareMasterPassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.masterPassword) {
      return false
    }
    return await bcrypt.compare(candidatePassword, this.masterPassword)
  } catch (error) {
    return false
  }
}

// Méthode pour obtenir la clé API AllDebrid déchiffrée
userSchema.methods.getDecryptedAllDebridApiKey = function(): string {
  try {
    if (isEncrypted(this.allDebridApiKey)) {
      return decrypt(this.allDebridApiKey)
    }
    return this.allDebridApiKey
  } catch (error) {
    throw new Error('Failed to decrypt AllDebrid API key')
  }
}

// Méthode pour exclure les mots de passe lors de la sérialisation
userSchema.methods.toJSON = function() {
  const userObject = this.toObject()
  delete userObject.password
  delete userObject.masterPassword
  // Ne pas exposer la clé API chiffrée dans les réponses JSON
  delete userObject.allDebridApiKey
  return userObject
}

export default mongoose.model<IUser>('User', userSchema)
