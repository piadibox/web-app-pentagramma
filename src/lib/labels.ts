// Italian display labels for enum values coming from the API.

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Amministrazione",
  TEACHER: "Docente",
  STUDENT: "Studente",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programmata",
  CANCELLED: "Annullata",
  DONE: "Svolta",
  MOVED: "Spostata",
};

export const DAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function roleLabel(role: string | null | undefined) {
  return (role && ROLE_LABELS[role]) ?? role ?? "";
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function personName(p: { fullName?: string | null; username?: string | null } | null | undefined) {
  return p?.fullName || p?.username || "—";
}

const API_ERRORS: Record<string, string> = {
  "invalid credentials": "Nome utente o password non corretti.",
  "username and password are required": "Inserisci nome utente e password.",
  "server error": "Errore del server. Riprova tra poco.",
  forbidden: "Non hai i permessi per questa operazione.",
  "not found": "Elemento non trovato: forse è già stato rimosso.",
  "not authenticated": "Sessione scaduta. Accedi di nuovo.",
  "missing/invalid fields": "Alcuni campi mancano o non sono validi.",
  "teacherId is required": "Seleziona un docente.",
  "startTime must be before endTime": "L'orario di fine deve essere successivo a quello di inizio.",
  "availability slot overlaps an existing slot": "Questa fascia si sovrappone a una già esistente.",
  "endsAt must be after startsAt": "L'orario di fine deve essere successivo a quello di inizio.",
  "teacher already busy in this time range": "Il docente ha già una lezione in questo orario.",
  "student already busy in this time range": "Lo studente ha già una lezione in questo orario.",
  "invalid duration": "Durata non consentita.",
  "weekStart mismatch with startsAt": "La data non appartiene alla settimana selezionata.",
  "nothing to update": "Nessuna modifica da salvare.",
};

// Turns an API error payload into an Italian sentence for toasts and alerts.
export function apiError(data: { error?: unknown } | null | undefined, status?: number) {
  const raw = typeof data?.error === "string" ? data.error : "";
  if (raw && API_ERRORS[raw]) return API_ERRORS[raw];
  if (raw) return raw;
  return status ? `Errore imprevisto (${status}). Riprova.` : "Errore imprevisto. Riprova.";
}
