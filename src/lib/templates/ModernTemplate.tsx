import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4, flexDirection: "row" },
    accentBar: { width: 4, backgroundColor: accent, marginRight: 24 },
    content: { flex: 1, paddingTop: 32, paddingRight: 32, paddingBottom: 32 },
    name: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    subtitle: { fontSize: 10, color: "#666", marginBottom: 2 },
    divider: { borderTop: `0.5pt solid #ccc`, marginVertical: 8 },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: accent, letterSpacing: 1, textTransform: "uppercase" as const },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    company: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    date: { fontSize: 9, color: "#888" },
    bulletList: { marginLeft: 14, marginBottom: 8 },
    bullet: { fontSize: 9.5, marginBottom: 1, lineHeight: 1.35 },
    skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
    skillChip: { fontSize: 9, color: "#555" },
    educationRow: { marginBottom: 4 },
  });

export function ModernTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <View style={s.content}>
          {/* Header */}
          <Text style={s.name}>{b.name}</Text>
          {b.headline && <Text style={[s.subtitle, { fontFamily: "Helvetica", color: accentColor, marginBottom: 2 }]}>{b.headline}</Text>}
          <Text style={s.subtitle}>{[b.email, b.phone, b.location].filter(Boolean).join(" · ")}</Text>

          {/* Summary */}
          {b.summary && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Summary</Text>
              <Text style={{ fontSize: 9.5, marginBottom: 6 }}>{b.summary}</Text>
            </>
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

          {/* Skills */}
          {resume.skills.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Skills</Text>
              {resume.skills.map((sk, i) => (
                <View key={i} style={{ marginBottom: 3 }}>
                  <Text style={[s.company, { fontSize: 9.5 }]}>{sk.name}: </Text>
                  <Text style={s.skillChip}>{sk.keywords.join(", ")}</Text>
                </View>
              ))}
            </>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.sectionTitle}>Certifications</Text>
              {resume.certifications.map((c, i) => (
                <Text key={i} style={s.bullet}>• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}</Text>
              ))}
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}
