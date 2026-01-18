import { headers } from "next/headers";
import CreateLessonButton from "./CreateLessonButton";

type LessonRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  student?: { fullName?: string; username?: string };
  teacher?: { fullName?: string; username?: string };
  instrument?: { name?: string };
};

export default async function LessonsPage() {
  const weekStart = "2026-01-12T00:00:00.000Z";

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const cookie = headersList.get("cookie") ?? "";

  const res = await fetch(
    `${protocol}://${host}/api/lessons?weekStart=${encodeURIComponent(weekStart)}`,
    {
      cache: "no-store",
      headers: { cookie },
    }
  );

  const json = await res.json();
  const lessons: LessonRow[] = json?.lessons ?? [];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Lezioni</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        Settimana che inizia: <code>{weekStart}</code> — status API:{" "}
        <strong>{res.status}</strong>
      </div>

      {res.status !== 200 ? (
        <div style={{ padding: 12, border: "1px solid #f0c", borderRadius: 8 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(json, null, 2)}
          </pre>
        </div>
      ) : lessons.length === 0 ? (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          Nessuna lezione trovata.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Quando", "Studente", "Insegnante", "Strumento", "Stato", "Sorgente", "ID"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderBottom: "1px solid #ddd",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                    {new Date(l.startsAt).toLocaleString("it-IT")} →{" "}
                    {new Date(l.endsAt).toLocaleTimeString("it-IT")}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    {l.student?.fullName ?? l.student?.username ?? "-"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    {l.teacher?.fullName ?? l.teacher?.username ?? "-"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    {l.instrument?.name ?? "-"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{l.status}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{l.source}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                    <code>{l.id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateLessonButton />
    </main>
  );
}
