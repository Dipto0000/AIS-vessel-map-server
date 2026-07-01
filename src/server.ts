import { createServer, type Server } from 'http';
import { Server as IOServer } from 'socket.io';

import app from './app.js';
import { closeDatabase, connectDatabase } from './app/config/database.js';
import { envVars } from './app/config/env.js';
import { startAisStreamWorker } from './app/services/aisStreamWorker.js';

/**

Application bootstrap. Connects to Mongo, then opens the HTTP
server, then mounts the AIS stream worker.

Exit codes:
- 0 = orderly shutdown (signal received).
- 1 = fatal (uncaughtException / unhandledRejection / startup failure).

*/

const httpServer = createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: true }, // allow all origins for now; tighten later when frontend ready.
});

let server: Server | undefined;

(async (): Promise<void> => {
  try {
    await connectDatabase();

    server = httpServer.listen(envVars.PORT, () => {
      console.log(`Server is listening to port ${envVars.PORT}`);
    });

    startAisStreamWorker(io);
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
})();

const SHUTDOWN_TIMEOUT_MS = 5_000;
let isShuttingDown = false;

/**

Async teardown shared by every shutdown path: close Mongo, then
close the HTTP server (waiting for in-flight keep-alive sockets to
drain), then exit. A safety-net `setTimeout(...).unref()` guarantees
we never hang if `server.close()` callback never fires (no open
connections).

*/

const runTeardown = (exitCode: 0 | 1, timeoutMs: number): void => {
  void (async (): Promise<void> => {
    try {
      await closeDatabase();
    } catch (err) {
      console.error('Error closing database:', err);
    }

    if (server) {
      server.close(() => {
        process.exit(exitCode);
      });
      setTimeout(
        () => process.exit(exitCode),
        timeoutMs,
      ).unref();
    } else {
      process.exit(exitCode);
    }
  })();
};

const beginShutdown = (exitCode: 0 | 1, timeoutMs: number): boolean => {
  if (isShuttingDown) return false;
  isShuttingDown = true;
  io.close();
  runTeardown(exitCode, timeoutMs);
  return true;
};

const gracefulShutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} signal received... Server shutting down..`);
  beginShutdown(0, SHUTDOWN_TIMEOUT_MS);
};


const FATAL_TEARDOWN_TIMEOUT_MS = 1_000;

const fatalShutdown = (
  reason: string,
  exitCode: 0 | 1,
  err: unknown,
): void => {
  console.log(`${reason}... Server shutting down..`, err);
  if (!beginShutdown(exitCode, FATAL_TEARDOWN_TIMEOUT_MS)) {
    console.error(
      'Shutdown already in progress; not re-triggering teardown.',
    );
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err: unknown) =>
  fatalShutdown('Unhandled Rejection', 1, err),
);
process.on('uncaughtException', (err: Error) =>
  fatalShutdown('Uncaught Exception', 1, err),
);
