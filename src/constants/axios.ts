import axios from "axios";

export const workflowApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WORKFLOW_API_URL ?? "https://workflow-backend-api.kitelabs.io",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const userServiceApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? "https://workflow-user-service-api.kitelabs.io",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
