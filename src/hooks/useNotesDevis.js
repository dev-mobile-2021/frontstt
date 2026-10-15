import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.VITE_API_BASE + "/api";
function auth() {
  const t = localStorage.getItem("stt_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function useNotesDevisPaginated(filters = {}) {
  return useQuery({
    queryKey: ["notes-devis", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.set(k, v);
      });
      const r = await fetch(`${BASE}/notes-devis?${params}`, { headers: auth() });
      return r.json();
    },
  });
}

export function useNoteDevis(id) {
  return useQuery({
    queryKey: ["note-devis", id],
    queryFn: async () => {
      const r = await fetch(`${BASE}/notes-devis/${id}`, { headers: auth() });
      return r.json();
    },
    enabled: !!id,
  });
}

export function useCreateNoteDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const r = await fetch(`${BASE}/notes-devis`, {
        method: "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await r.json();
      if (!r.ok) throw json;
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes-devis"] }),
  });
}

export function useDeleteNoteDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`${BASE}/notes-devis/${id}`, {
        method: "DELETE",
        headers: auth(),
      });
      const json = await r.json();
      if (!r.ok) throw json;
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes-devis"] }),
  });
}
