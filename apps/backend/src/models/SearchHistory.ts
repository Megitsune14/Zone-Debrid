import mongoose, { Schema, Document } from 'mongoose'

export interface ISearchHistory extends Document {
  userId: mongoose.Types.ObjectId
  query: string
  type?: 'films' | 'series' | 'mangas'
  year?: number
  createdAt: Date
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['films', 'series', 'mangas']
    },
    year: {
      type: Number
    }
  },
  { timestamps: true }
)

searchHistorySchema.index({ userId: 1, createdAt: -1 })
searchHistorySchema.index({ createdAt: -1 })

export default mongoose.model<ISearchHistory>('SearchHistory', searchHistorySchema)
