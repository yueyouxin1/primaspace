import createClient from "openapi-fetch";
import type { paths } from "@/api/schema";
import { fetchWithGuards } from "@/api/fetch";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const api = createClient<paths>({
  baseUrl,
  fetch: fetchWithGuards,
});
