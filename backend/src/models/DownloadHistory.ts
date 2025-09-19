import mongoose, { Schema, Document } from 'mongoose'

export interface IDownloadHistory extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  type: 'films' | 'series' | 'mangas'
  status: 'downloading' | 'completed' | 'error' | 'cancelled' | 'paused'
  cleared: boolean
  startTime: Date
  endTime?: Date
  errorMessage?: string
  zipFilename?: string
  fileSize?: number
  language?: string
  quality?: string
  season?: string
  episodes?: string[]
  downloadUrl?: string
  createdAt: Date
  updatedAt: Date
}

const DownloadHistorySchema = new Schema<IDownloadHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['films', 'series', 'mangas'],
    required: true
  },
  status: {
    type: String,
    enum: ['downloading', 'completed', 'error', 'cancelled', 'paused'],
    required: true,
    default: 'downloading'
  },
  cleared: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  zipFilename: {
    type: String
  },
  fileSize: {
    type: Number
  },
  language: {
    type: String
  },
  quality: {
    type: String
  },
  season: {
    type: String
  },
  episodes: [{
    type: String
  }],
  downloadUrl: {
    type: String
  }
}, {
  timestamps: true
})

// Index pour optimiser les requêtes
DownloadHistorySchema.index({ userId: 1, createdAt: -1 })
DownloadHistorySchema.index({ userId: 1, status: 1 })
DownloadHistorySchema.index({ userId: 1, cleared: 1 })

export default mongoose.model<IDownloadHistory>('DownloadHistory', DownloadHistorySchema)
