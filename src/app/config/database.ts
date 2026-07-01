/**

Centralises the Mongo connection lifecycle so every log line about DB
state, every retry / pool / timeout knob, and the index-sync step live
in one place.

*/

import mongoose from 'mongoose';

import { Vessel } from '../models/Vessel.js';

import { envVars, getRedactedMongoUri, isProduction } from './env.js';

let lifecycleHooksInstalled = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (!lifecycleHooksInstalled) {
    installLifecycleHooks();
    lifecycleHooksInstalled = true;
  }

  await mongoose.connect(envVars.MONGODB_URI, {
    autoIndex: !isProduction,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
  });

  // Ensure the unique `mmsi` index exists in prod, where `autoIndex` is off. Idempotent in dev (autoIndex already did it).

  try {
    await Vessel.syncIndexes();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[db] syncIndexes failed: ${message}`);
  }

  return mongoose;
}


export async function closeDatabase(): Promise<void> {
  await mongoose.disconnect();
}

function installLifecycleHooks(): void {
  mongoose.connection.on('connected', () => {
    console.log(`[db] connected to ${getRedactedMongoUri()}`);
  });
  mongoose.connection.on('reconnected', () => {
    console.log(`[db] reconnected to ${getRedactedMongoUri()}`);
  });
  mongoose.connection.on('disconnected', () => {
    console.log('[db] disconnected');
  });
  mongoose.connection.on('error', (err: Error) => {
    console.error(`[db] connection error: ${err.message}`);
  });
}
