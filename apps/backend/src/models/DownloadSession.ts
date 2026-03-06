import mongoose, { Schema, Document } from 'mongoose'

export interface IZipFileEntry {
  url: string
  filename: string
  fileSize?: number
}

export interface IDownloadSession extends Document {
  userId: mongoose.Types.ObjectId
  filename: string
  totalBytes: number | null
  bytesSent: number
  status: 'started' | 'completed' | 'aborted' | 'error' | 'cancelled' | 'queued'
  startedAt: Date
  finishedAt?: Date
  errorMessage?: string
  /** 'file' = single file via sourceUrl; 'zip' = stream zip from zipFiles; 'aria2' = sent to Aria2 */
  type: 'file' | 'zip' | 'aria2'
  /** AllDebrid URL for single-file download */
  sourceUrl?: string
  /** For type=zip */
  zipFilename?: string
  zipFiles?: IZipFileEntry[]
  /** Optional link to download history for updating status when session ends */
  historyId?: string
  /** For type=aria2: Aria2 GID */
  aria2Gid?: string
  /** For type=aria2: current download speed in bytes/sec (updated by polling) */
  downloadSpeed?: number
  createdAt: Date
  updatedAt: Date
}

const ZipFileEntrySchema = new Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  fileSize: { type: Number }
}, { _id: false })

const DownloadSessionSchema = new Schema<IDownloadSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: { type: String, required: true },
  totalBytes: { type: Number, default: null },
  bytesSent: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['started', 'completed', 'aborted', 'error', 'cancelled', 'queued'],
    default: 'started',
    index: true
  },
  startedAt: { type: Date, required: true, default: Date.now },
  finishedAt: { type: Date },
  errorMessage: { type: String },
  type: { type: String, enum: ['file', 'zip', 'aria2'], required: true },
  sourceUrl: { type: String },
  zipFilename: { type: String },
  zipFiles: [ZipFileEntrySchema],
  historyId: { type: String },
  aria2Gid: { type: String },
  downloadSpeed: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

DownloadSessionSchema.index({ userId: 1, status: 1 })

export default mongoose.model<IDownloadSession>('DownloadSession', DownloadSessionSchema)
