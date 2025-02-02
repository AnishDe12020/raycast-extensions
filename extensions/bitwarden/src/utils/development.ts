/* eslint-disable @typescript-eslint/no-explicit-any */
import { environment } from "@raycast/api";

export const captureException = (description: string, error: any) => {
  if (!environment.isDevelopment) return;
  console.error(description, error);
};
