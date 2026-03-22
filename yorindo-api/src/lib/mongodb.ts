/**
 * MongoDB client — Phase 2 only.
 * NOT imported at startup. Imported only by src/repositories/mongo/*.ts
 * when REPOSITORY_IMPL=mongo.
 */
import { MongoClient, type Db } from 'mongodb'
import { config } from '../config/index.js'

let _client: MongoClient | undefined

export function getMongoClient(): MongoClient {
  if (!config.mongodbUrl) {
    throw new Error('MONGODB_URL is required for MongoDB repositories')
  }
  if (!_client) {
    _client = new MongoClient(config.mongodbUrl, {
      serverSelectionTimeoutMS: 5000,
    })
  }
  return _client
}

export function getMongoDb(dbName = 'yorindo'): Db {
  return getMongoClient().db(dbName)
}

export async function connectMongo(): Promise<void> {
  await getMongoClient().connect()
}

export async function closeMongo(): Promise<void> {
  await _client?.close()
}
