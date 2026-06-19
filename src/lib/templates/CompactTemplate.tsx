import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 28, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.3 },
    header: { marginBottom: 10 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    name: { fontSize: 18, fontFamily: "Helvetica-Bold" },
    contact: { fontSize: 8.5, color: "#666", textAlign: "right" },
    divider: { borderTop: `0.5pt solid ${accent}`, marginVertical: 5 },
    sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3, color: accent, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    company: { fontFamily: "Helvetica-Bold", fontSize: 9 },
    date: { fontSize: 8, color: "#888" },
    bulletList: { marginLeft: 12, marginBottom: 4 },
    bullet: { fontSize: 8.5, marginBottom: 0.5, lineHeight: 1.3 },
    skillsLine: { fontSize: 8.5, color: "#444", marginBottom: 2 },
    educationRow: { marginBottom: 3 },
  });

export function CompactTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <Text style={s.name}>{b.name}</Text>
            <Text style={s.contact}>{[b.email, b.phone, b.location].filter(Boolean).join(" | ")}</Text>
          </View>
          {b.headline && <Text style={[s.date, { marginTop: 2 }]}>{b.headline}</Text>}
        </View>

        {/* Summary */}
        {b.summary && (
          <Text style={[s.bullet, { marginBottom: 4, fontFamily: "Helvetica-Oblique" }]}>{b.summary}</Text>
        )}

        {/* Experience */}
        {resume.work.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Experience</Text>
            {resume.work.map((w, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={s.row}>
                  <Text style={s.company}>{w.position} at {w.company}</Text>
                  <Text style={s.date}>{w.startDate} — {w.endDate || "Present"}</Text>
                </View>
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
                  <Text style={s.company}>{e.studyType} in {e.area}, {e.institution}</Text>
                  <Text style={s.date}>{e.startDate} — {e.endDate || "Present"}</Text>
                </View>
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
              <Text key={i} style={s.skillsLine}>
                <Text style={[s.company, { fontSize: 8.5 }]}>{sk.name}: </Text>
                {sk.keywords.join(", ")}
              </Text>
            ))}
          </>
        )}

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Certifications</Text>
            <Text style={s.skillsLine}>{resume.certifications.map((c) => c.name).join(", ")}</Text>
          </>
        )}
      </Page>
    </Document>
  );
}
