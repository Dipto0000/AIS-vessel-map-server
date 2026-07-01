/**
 * AIS data is sparse: vesselName/vesselType are populated by AIS message
 * type 5 (static/voyage) and may be `Unknown`/`N/A` until the vessel
 * transmits that report.
 */
export interface IVessel {
  mmsi: number;
  vesselName: string;
  latitude?: number;   // Latitude in degrees. Absent on static-only messages (AIS types 5/24).

  longitude?: number;   // Longitude in degrees. Absent on static-only messages (AIS types 5/24).

  sog: number;  // Speed Over Ground, in knots.

  cog: number;  // Course Over Ground, in degrees (0-359.9).

  heading: number;  // True heading, in degrees (0-359).

  vesselType: string;
  updatedAt?: Date;
}
