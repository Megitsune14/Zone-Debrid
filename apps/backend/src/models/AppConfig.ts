import mongoose, { Document, Schema } from 'mongoose'

export interface IAppConfig extends Document {
  maintenanceEnabled: boolean
  maintenanceMessage: string
  updatedAt: Date
  createdAt: Date
}

const appConfigSchema = new Schema<IAppConfig>({
  maintenanceEnabled: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'Le site est actuellement en maintenance. Merci de revenir un peu plus tard.'
  }
}, {
  timestamps: true
})

export default mongoose.model<IAppConfig>('AppConfig', appConfigSchema)

