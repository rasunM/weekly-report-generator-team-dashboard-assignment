import request from "supertest";
import { Express } from "express";

export async function registerAndLogin(
  app: Express,
  overrides: { name: string; email: string; role: "MEMBER" | "MANAGER" }
) {
  const password = "Password123!";
  const res = await request(app).post("/api/auth/register").send({ ...overrides, password });
  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${JSON.stringify(res.body)}`);
  }
  return {
    userId: res.body.user.id as string,
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
  };
}

export function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
