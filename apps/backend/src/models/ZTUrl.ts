import mongoose, { Document, Schema } from 'mongoose'

export interface IZTUrl extends Document {
    currentUrl: string
    urlHistory: string[]
    lastChecked: Date
    responseTime: number
    createdAt: Date
    updatedAt: Date
}

const ztUrlSchema = new Schema<IZTUrl>({
    currentUrl: {
        type: String,
        required: true,
        default: 'https://zone-telechargement.diy/'
    },
    urlHistory: {
        type: [String],
        default: []
    },
    lastChecked: {
        type: Date,
        default: Date.now
    },
    responseTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

// Index pour améliorer les performances
ztUrlSchema.index({ currentUrl: 1 })
ztUrlSchema.index({ lastChecked: -1 })

export default mongoose.model<IZTUrl>('ZTUrl', ztUrlSchema)
