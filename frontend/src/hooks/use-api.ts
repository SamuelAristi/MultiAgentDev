"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.health,
  });
}
