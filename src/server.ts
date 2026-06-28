import { createServer, type Server } from 'http';
import mongoose from 'mongoose';
import { Server as IOServer } from 'socket.io';

import app from './app.js';
import { envVars } from './app/config/env.js';
import { startAisStreamWorker } from './app/services/aisStreamWorker.js';


const httpServer = createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: true }, // allow all origins for now; tighten later when frontend ready.
});

let server: Server;

(async () => {
  try {
    await mongoose.connect(envVars.MONGODB_URI);

    console.log('Connected to DB!!');

    server = httpServer.listen(envVars.PORT, () => {
      console.log(`Server is listening to port ${envVars.PORT}`);
    });

    startAisStreamWorker(io);
  } catch (error) {
    console.log(error);
  }
})();

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received... Server shutting down..');

  io.close();
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received... Server shutting down..');

  io.close();
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection detected... Server shutting down..', err);

  io.close();
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception detected... Server shutting down..', err);

  io.close();
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});
