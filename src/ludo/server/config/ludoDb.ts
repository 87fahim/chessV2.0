import mongoose from 'mongoose'
import { ludoEnv, validateLudoEnv } from './ludoEnv.js'

let isConnected = false

export async function connectLudoDb(): Promise<void> {
  if (isConnected) {
    return
  }

  validateLudoEnv()

  await mongoose.connect(ludoEnv.mongoUri, {
    dbName: ludoEnv.mongoDbName,
  })

  isConnected = true

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
    isConnected = false
  })

  console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`)
}

export function isLudoDbConnected(): boolean {
  return mongoose.connection.readyState === 1
}
