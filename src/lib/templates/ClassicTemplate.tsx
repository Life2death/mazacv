import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 36, fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.4 },
    header: { marginBottom: 16, textAlign: "center" },
    name: { fontSize: 22, fontFamily: "Times-Bold", marginBottom: 2 },
    subtitle: { fontSize: 10, color: "#666", marginBottom: 2 },
    divider: { borderTop: `1pt solid ${accent}`, marginVertical: 8, opacity: 0.6 },
    sectionTitle: { fontSize: 12, fontFamily: "Times-Bold", marginBottom: 6, color: accent },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    company: { fontFamily: "Times-Bold", fontSize: 10 },
    date: { fontSize: 9, color: "#666" },
    bulletList: { marginLeft: 14, marginBottom: 8 },
    bullet: { fontSize: 9.5, marginBottom: 1, lineHeight: 1.35 },
    skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
    skillChip: { fontSize: 9, color: "#333" },
    educationRow: { marginBottom: 4 },
  });

export function ClassicTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.name}>{b.name}</Text>
          {b.headline && <Text style={[s.subtitle, { fontFamily: "Times-Italic" }]}>{b.headline}</Text>}
          <Text style={s.subtitle}>{[b.email, b.phone, b.location].filter(Boolean).join(" · ")}</Text>
        </View>

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
                <View style={s.skillsRow}>
                  {sk.keywords.map((kw, j) => (
                    <Text key={j} style={s.skillChip}>{kw}{j < sk.keywords.length - 1 ? ", " : ""}</Text>
                  ))}
                </View>
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
      </Page>
    </Document>
  );
}
