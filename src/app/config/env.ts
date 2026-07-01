import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: string;
  MONGODB_URI: string;
  NODE_ENV: "development" | "production" | "test";
  AIS_HOST: string;
  AIS_PORT: number;
}

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVariables: string[] = ["PORT", "MONGODB_URI", "NODE_ENV"];

  requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });

  return {
    PORT: process.env.PORT as string,
    MONGODB_URI: process.env.MONGODB_URI as string,
    NODE_ENV: process.env.NODE_ENV as "development" | "production" | "test",
    AIS_HOST: process.env.AIS_HOST ?? "ais.portvision.com",
    AIS_PORT: Number(process.env.AIS_PORT ?? "56524"),
  };
};

export const envVars = loadEnvVariables();

export const isProduction = envVars.NODE_ENV === "production";

/**
 * Returns the MONGODB_URI with the user:password portion redacted.
 * Safe to print to logs.
 */
export function getRedactedMongoUri(): string {
  return envVars.MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@");
}
