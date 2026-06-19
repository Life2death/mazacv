import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.3 },
  header: { marginBottom: 10 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  subtitle: { fontSize: 8, color: "#666", marginBottom: 1 },
  rule: { borderTop: "0.5pt solid #ccc", marginVertical: 5 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  date: { fontSize: 8, color: "#888" },
  companyLine: { fontSize: 8.5, color: "#444", marginBottom: 1 },
  bulletList: { marginLeft: 12, marginBottom: 4 },
  bullet: { fontSize: 8.5, marginBottom: 0.5 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 3 },
  skillText: { fontSize: 8.5, color: "#333" },
});

export function MinimalTemplate({ resume, accentColor }: Props) {
  const b = resume.basics;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{b.name}</Text>
          {b.headline && <Text style={[styles.subtitle, { color: accentColor }]}>{b.headline}</Text>}
          <Text style={styles.subtitle}>{[b.email, b.phone, b.location].filter(Boolean).join(" · ")}</Text>
        </View>

        {b.summary && <Text style={{ fontSize: 8.5, marginBottom: 6 }}>{b.summary}</Text>}

        {resume.work.length > 0 && (
          <>
            <View style={styles.rule} />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Experience</Text>
            {resume.work.map((w, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={styles.row}>
                  <Text style={styles.entryTitle}>{w.position}</Text>
                  <Text style={styles.date}>{w.startDate} — {w.endDate || "Present"}</Text>
                </View>
                <Text style={styles.companyLine}>{w.company}</Text>
                <View style={styles.bulletList}>
                  {w.highlights.map((h, j) => (
                    <Text key={j} style={styles.bullet}>• {h}</Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {resume.education.length > 0 && (
          <>
            <View style={styles.rule} />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 3 }}>
                <View style={styles.row}>
                  <Text style={styles.entryTitle}>{e.studyType} in {e.area}</Text>
                  <Text style={styles.date}>{e.startDate} — {e.endDate || "Present"}</Text>
                </View>
                <Text style={styles.companyLine}>{e.institution}</Text>
              </View>
            ))}
          </>
        )}

        {resume.skills.length > 0 && (
          <>
            <View style={styles.rule} />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Skills</Text>
            {resume.skills.map((sk, i) => (
              <View key={i} style={styles.skillsRow}>
                <Text style={[styles.entryTitle, { marginRight: 3 }]}>{sk.name}: </Text>
                <Text style={styles.skillText}>{sk.keywords.join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        {resume.certifications && resume.certifications.length > 0 && (
          <>
            <View style={styles.rule} />
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Certifications</Text>
            {resume.certifications.map((c, i) => (
              <Text key={i} style={styles.bullet}>• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}</Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
