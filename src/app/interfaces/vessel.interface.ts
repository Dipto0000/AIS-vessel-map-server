/**
 * AIS data is sparse: vesselName/vesselType are populated by AIS message
 * type 5 (static/voyage) and may be `Unknown`/`N/A` until the vessel
 * transmits that report.
 */
export interface IVessel {
  mmsi: number;
  vesselName: string;
  /** Latitude in degrees. Absent on static-only messages (AIS types 5/24). */
  latitude?: number;
  /** Longitude in degrees. Absent on static-only messages (AIS types 5/24). */
  longitude?: number;
  /** Speed Over Ground, in knots. */
  sog: number;
  /** Course Over Ground, in degrees (0-359.9). */
  cog: number;
  /** True heading, in degrees (0-359). */
  heading: number;
  vesselType: string;
  updatedAt?: Date;
}
