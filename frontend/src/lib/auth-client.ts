"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// Same-origin: talks to /api/auth/*
export const authClient = createAuthClient({ plugins: [adminClient()] });
