import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 30, fontFamily: "Helvetica", fontSize: 9, lineHeight: 1.35 },
    header: { marginBottom: 12, textAlign: "center" },
    name: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    subtitle: { fontSize: 9, color: "#555", marginBottom: 1 },
    divider: { borderTop: `1pt solid ${accent}`, marginVertical: 6, opacity: 0.5 },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 5, color: accent, textTransform: "uppercase", letterSpacing: 0.8 },
    entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
    date: { fontSize: 8, color: "#888" },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    companyLine: { fontSize: 8.5, color: "#444", marginBottom: 1 },
    bulletList: { marginLeft: 14, marginBottom: 5 },
    bullet: { fontSize: 8.5, marginBottom: 0.8 },
    skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 3 },
    skillChip: { fontSize: 8, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 },
  });

export function FresherTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{b.name}</Text>
          {b.headline && <Text style={[s.subtitle, { color: accentColor }]}>{b.headline}</Text>}
          <Text style={s.subtitle}>{[b.email, b.phone, b.location].filter(Boolean).join(" · ")}</Text>
        </View>

        {b.summary && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Objective</Text>
            <Text style={{ fontSize: 8.5, marginBottom: 5 }}>{b.summary}</Text>
          </>
        )}

        {/* Education first — key for freshers */}
        {resume.education.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={s.row}>
                  <Text style={s.entryTitle}>{e.studyType} in {e.area}</Text>
                  <Text style={s.date}>{e.startDate} — {e.endDate || "Present"}</Text>
                </View>
                <Text style={s.companyLine}>{e.institution}</Text>
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
              <View key={i} style={{ marginBottom: 5 }}>
                <Text style={s.entryTitle}>{p.name}</Text>
                <Text style={{ fontSize: 8, color: "#555", marginBottom: 1 }}>{p.description}</Text>
                <View style={s.bulletList}>
                  {p.highlights.map((h, j) => (
                    <Text key={j} style={s.bullet}>• {h}</Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Experience (if any) */}
        {resume.work.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Internships</Text>
            {resume.work.map((w, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={s.row}>
                  <Text style={s.entryTitle}>{w.position}</Text>
                  <Text style={s.date}>{w.startDate} — {w.endDate || "Present"}</Text>
                </View>
                <Text style={s.companyLine}>{w.company}</Text>
                <View style={s.bulletList}>
                  {w.highlights.map((h, j) => (
                    <Text key={j} style={s.bullet}>• {h}</Text>
                  ))}
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
              <View key={i} style={{ marginBottom: 2 }}>
                <Text style={[s.entryTitle, { fontSize: 8.5 }]}>{sk.name}: </Text>
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
      </Page>
    </Document>
  );
}
