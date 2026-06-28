import net from 'node:net';
import { createInterface } from 'node:readline';
import type { Server as IOServer } from 'socket.io';

import { envVars } from '../config/env.js';
import type { IVessel } from '../interfaces/vessel.interface.js';
import AisDecoder from './aisDecoder.js';

/**
 * Connects to the AIS TCP stream, splits each incoming NMEA sentence
 * into individual lines via `node:readline`, feeds each line to
 * `ais-stream-decoder` via `.write(line)`, and broadcasts each
 * decoded vessel to connected clients as a 'vessel' Socket.IO event.
 *
 * The decoder emits one object per NMEA sentence whose shape depends
 * on AIS message type: position reports (1, 2, 3, 18, 19) carry
 * lat/lon/sog/cog/heading; static reports (5, 24) carry name and
 * shipType. Neither kind carries both, so the local toVessel mapper
 * merges them into one IVessel, defaulting missing static fields to
 * 'Unknown' until the vessel transmits that report.
 *
 * Multi-part AIS broadcasts (sentences that span several NMEA frames)
 * are reassembled internally by the decoder. We don't need a custom
 * line-buffering transform here. Readline's job is just to slice the
 * TCP byte stream into discrete sentences.
 *
 * Reconnect strategy: 5s → 10s → 20s → 30s cap, doubling on each
 * disconnect, reset on successful connect.
 */
export function startAisStreamWorker(io: IOServer): void {
  let reconnectAttempt = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let stopped = false;

  const cancelPendingReconnect = (): void => {
    stopped = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  // Shape of the object ais-stream-decoder emits per NMEA sentence.
  // Position-only fields (lat/lon/sog/cog/heading/status) come from
  // AIS message types 1, 2, 3, 18, 19. Static fields (name/callsign/
  // shipType/destination) come from types 5 and 24. Neither kind
  // carries both, so the union of optional fields is the full shape
  // we observe on the wire.
  type DecodedAis = {
    type?: number;
    mmsi?: number;
    lat?: number;
    lon?: number;
    sog?: number;
    cog?: number;
    heading?: number;
    status?: number;
    name?: string;
    callsign?: string;
    shipType?: number;
    destination?: string;
  };

  // Merge a decoded AIS message into one IVessel that the browser
  // consumes. Missing static fields default to 'Unknown' on
  // position-only messages; missing position fields are spread
  // conditionally so that, under exactOptionalPropertyTypes, the
  // key is omitted from the emitted JSON when no position is
  // available instead of plotting a phantom vessel at lat 0 / lon 0
  // off West Africa. updatedAt is set at emit time so the browser
  // can check freshness.
  const toVessel = (raw: DecodedAis): IVessel => ({
    mmsi: raw.mmsi ?? 0,
    vesselName: raw.name ?? 'Unknown',
    ...(raw.lat !== undefined && { latitude: raw.lat }),
    ...(raw.lon !== undefined && { longitude: raw.lon }),
    sog: raw.sog ?? 0,
    cog: raw.cog ?? 0,
    heading: raw.heading ?? 0,
    vesselType: raw.shipType === undefined ? 'Unknown' : String(raw.shipType),
    updatedAt: new Date(),
  });

  const connect = (): void => {
    if (stopped) return;

    const socket = net.createConnection(
      { host: envVars.AIS_HOST, port: envVars.AIS_PORT },
      () => {
        reconnectAttempt = 0;
        console.log(
          `[ais] connected to ${envVars.AIS_HOST}:${envVars.AIS_PORT}`,
        );
      },
    );

    const decoder = new AisDecoder();
    decoder.on('data', (raw: unknown) => {
      io.emit('vessel', toVessel(raw as DecodedAis));
    });
    decoder.on('error', (err: Error) => {
      console.error('[ais] decoder error', err.message);
    });

    const lines = createInterface({ input: socket, crlfDelay: Infinity });
    lines.on('line', (line) => decoder.write(line));

    socket.on('error', (err) => {
      console.error('[ais] socket error', err.message);
    });

    socket.on('close', () => {
      // Skip if a reconnect is already queued (guard against rapid
      // close events) or if shutdown was requested.
      if (stopped || reconnectTimer !== null) return;

      const delay = Math.min(30_000, 5_000 * Math.pow(2, reconnectAttempt));
      reconnectAttempt++;
      console.log(
        `[ais] disconnected; reconnecting in ${delay}ms (attempt ${reconnectAttempt})`,
      );
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    });
  };

  connect();

  // Cooperative signal hooks: cancel any pending reconnect timer
  // before server.ts's process.exit(1) tears down the process.
  process.once('SIGTERM', cancelPendingReconnect);
  process.once('SIGINT', cancelPendingReconnect);
}
