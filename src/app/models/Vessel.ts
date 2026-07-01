/*

Mongoose schema and model for the `vessels` collection.

Indexes: `{ mmsi: 1 }` unique. 

*/

import {
  Schema,
  model,
  type Model,
  type InferSchemaType,
  type Types,
} from 'mongoose';

const vesselSchema = new Schema(
{
mmsi: { type: Number, required: true, unique: true },
vesselName: { type: String, required: true, default: 'Unknown' },
latitude: { type: Number },
longitude: { type: Number },
sog: { type: Number, required: true, default: 0 },
cog: { type: Number, required: true, default: 0 },
heading: { type: Number, required: true, default: 0 },
vesselType: { type: String, required: true, default: 'Unknown' },
updatedAt: { type: Date, required: true, default: () => new Date() },
},
{
collection: 'vessels',
strict: 'throw',
strictQuery: true,
versionKey: false,
timestamps: false,
},
);

vesselSchema.index({ mmsi: 1 }, { unique: true });

export type VesselDoc = InferSchemaType<typeof vesselSchema> & {
_id: Types.ObjectId;
};

export const Vessel: Model<VesselDoc> = model<VesselDoc>(
'Vessel',
vesselSchema,
);
