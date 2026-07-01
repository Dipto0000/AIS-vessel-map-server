/**

Repository for the vessels collection. 

Performance note on writes:
The AIS feed emits multiple messages per second. Per-vessel
`findOneAndUpdate` would be one round-trip per message and saturate
the connection pool. `Model.bulkWrite` with one
`updateOne({ upsert: true })` per vessel folds the entire batch into
ONE network round-trip. `ordered: false` lets Mongo run the upserts
in parallel server-side; if one fails it does not abort the rest.

*/

import type { IVessel } from '../interfaces/vessel.interface.js';

import { Vessel } from '../models/Vessel.js';

export interface UpsertBatchResult {
  matched: number;
  upserted: number;
  modified: number;
}

/**

Upsert a batch of vessels into Mongo. Each payload's MMSI is the
filter; the rest of the fields are `$set`. New MMSIs are inserted;
existing ones are updated in place; `updatedAt` is stamped with the
moment of this call.

returns counts of matched / upserted / modified documents for log
aggregation.

*/
export async function upsertVesselsBatch(
  payloads: IVessel[],
): Promise<UpsertBatchResult> {
  if (payloads.length === 0) {
    return { matched: 0, upserted: 0, modified: 0 };
  }

  const now = new Date();
  const ops = payloads.map((p) => {    // `mmsi` is intentionally NOT in `$set`: it's the filter key, so writing it again in the update would be redundant and would risk silently overwriting the natural key if the source payload ever carried a corrupted MMSI value. The filter alone enforces identity.

    const set: Record<string, string | number | Date> = {
      vesselName: p.vesselName,
      sog: p.sog,
      cog: p.cog,
      heading: p.heading,
      vesselType: p.vesselType,
      updatedAt: now,
    };
    if (p.latitude !== undefined) set.latitude = p.latitude;
    if (p.longitude !== undefined) set.longitude = p.longitude;

    return {
      updateOne: {
        filter: { mmsi: p.mmsi },
        update: { $set: set },
        upsert: true,
      },
    };
  });

  const result = await Vessel.bulkWrite(ops, { ordered: false });
  return {
    matched: result.matchedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
    modified: result.modifiedCount ?? 0,
  };
}


// Return all vessels as wire-shape objects Suitable for `GET /api/vessels`.

export async function findAllVessels(): Promise<IVessel[]> {
  const docs = await Vessel.find({}).select('-_id').lean().exec();
  return docs as unknown as IVessel[];
}

// Return a single vessel by MMSI or `null` if not found. Suitable for `GET /api/vessels :mmsi`.

export async function findVesselByMmsi(
  mmsi: number,
): Promise<IVessel | null> {
  const doc = await Vessel.findOne({ mmsi }).select('-_id').lean().exec();
  return doc as unknown as IVessel | null;
}
