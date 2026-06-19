import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4, flexDirection: "row" },
    sidebar: { width: "30%", backgroundColor: accent, padding: 16, paddingTop: 32, minHeight: "100%" },
    main: { width: "70%", padding: 16, paddingTop: 32 },
    name: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff", marginBottom: 4 },
    subtitle: { fontSize: 9, color: "rgba(255,255,255,0.85)", marginBottom: 2 },
    sidebarLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", marginBottom: 4, marginTop: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    sidebarText: { fontSize: 8.5, color: "rgba(255,255,255,0.9)", marginBottom: 2 },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: accent, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    divider: { borderTop: `0.5pt solid #ddd`, marginVertical: 6 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    company: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    date: { fontSize: 9, color: "#888" },
    bulletList: { marginLeft: 14, marginBottom: 6 },
    bullet: { fontSize: 9.5, marginBottom: 1, lineHeight: 1.35 },
    educationRow: { marginBottom: 4 },
  });

export function SplitTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Sidebar */}
        <View style={s.sidebar}>
          <Text style={s.name}>{b.name}</Text>
          <Text style={s.subtitle}>{b.headline || ""}</Text>
          <View style={{ marginTop: 16 }} />

          <Text style={s.sidebarLabel}>Contact</Text>
          {b.email && <Text style={s.sidebarText}>✉ {b.email}</Text>}
          {b.phone && <Text style={s.sidebarText}>📞 {b.phone}</Text>}
          {b.location && <Text style={s.sidebarText}>📍 {b.location}</Text>}

          {resume.skills.length > 0 && (
            <>
              <Text style={s.sidebarLabel}>Skills</Text>
              {resume.skills.map((sk, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={[s.sidebarText, { fontFamily: "Helvetica-Bold" }]}>{sk.name}</Text>
                  <Text style={[s.sidebarText, { fontSize: 8 }]}>{sk.keywords.join(", ")}</Text>
                </View>
              ))}
            </>
          )}

          {resume.certifications && resume.certifications.length > 0 && (
            <>
              <Text style={s.sidebarLabel}>Certifications</Text>
              {resume.certifications.map((c, i) => (
                <Text key={i} style={s.sidebarText}>• {c.name}</Text>
              ))}
            </>
          )}

          {resume.languages && resume.languages.length > 0 && (
            <>
              <Text style={s.sidebarLabel}>Languages</Text>
              {resume.languages.map((l, i) => (
                <Text key={i} style={s.sidebarText}>{l.language} ({l.fluency})</Text>
              ))}
            </>
          )}
        </View>

        {/* Main Content */}
        <View style={s.main}>
          {/* Summary */}
          {b.summary && (
            <Text style={{ fontSize: 9.5, marginBottom: 10, color: "#555" }}>{b.summary}</Text>
          )}

          {/* Experience */}
          {resume.work.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Experience</Text>
              {resume.work.map((w, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <View style={s.row}>
                    <Text style={s.company}>{w.position}</Text>
                    <Text style={s.date}>{w.startDate} — {w.endDate || "Present"}</Text>
                  </View>
                  <Text style={[s.date, { marginBottom: 2 }]}>{w.company}</Text>
                  <View style={s.bulletList}>
                    {w.highlights.map((h, j) => (
                      <Text key={j} style={s.bullet}>• {h}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Education</Text>
              {resume.education.map((e, i) => (
                <View key={i} style={s.educationRow}>
                  <View style={s.row}>
                    <Text style={s.company}>{e.studyType} in {e.area}</Text>
                    <Text style={s.date}>{e.startDate} — {e.endDate || "Present"}</Text>
                  </View>
                  <Text style={s.date}>{e.institution}</Text>
                </View>
              ))}
            </>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Projects</Text>
              {resume.projects.map((p, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={s.company}>{p.name}</Text>
                  <Text style={[s.bullet, { marginTop: 1 }]}>{p.description}</Text>
                  {p.highlights.length > 0 && (
                    <View style={s.bulletList}>
                      {p.highlights.map((h, j) => (
                        <Text key={j} style={s.bullet}>• {h}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}
