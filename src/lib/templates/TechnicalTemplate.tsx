import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 32, fontFamily: "Helvetica", fontSize: 9.5, lineHeight: 1.35 },
    header: { marginBottom: 14 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    name: { fontSize: 22, fontFamily: "Helvetica-Bold" },
    contactCol: { alignItems: "flex-end", fontSize: 8, color: "#555", lineHeight: 1.6 },
    headline: { fontSize: 10, color: accent, marginTop: 2, fontFamily: "Helvetica-Bold" },
    divider: { borderTop: `1.5pt solid ${accent}`, marginVertical: 7, opacity: 0.4 },
    sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 5, color: accent, textTransform: "uppercase", letterSpacing: 1.2 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
    date: { fontSize: 8, color: "#888" },
    companyLine: { fontSize: 8.5, color: "#444", marginBottom: 1 },
    bulletList: { marginLeft: 14, marginBottom: 5 },
    bullet: { fontSize: 8.5, marginBottom: 0.8 },
    techBadge: { fontSize: 7.5, backgroundColor: "#f1f5f9", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3, color: "#475569" },
    techRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginVertical: 3 },
    skillsSection: { marginBottom: 2 },
    skillGroupName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 1 },
    skillItems: { fontSize: 8, color: "#333" },
  });

export function TechnicalTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.topRow}>
            <Text style={s.name}>{b.name}</Text>
            <View style={s.contactCol}>
              <Text>{b.email}</Text>
              {b.phone && <Text>{b.phone}</Text>}
              {b.location && <Text>{b.location}</Text>}
            </View>
          </View>
          {b.headline && <Text style={s.headline}>{b.headline}</Text>}
        </View>

        {b.summary && (
          <Text style={{ fontSize: 8.5, marginBottom: 7, color: "#444" }}>{b.summary}</Text>
        )}

        {/* Skills section — prominent placement */}
        {resume.skills.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Technical Skills</Text>
            {resume.skills.map((sk, i) => (
              <View key={i} style={s.skillsSection}>
                <Text style={s.skillGroupName}>{sk.name}</Text>
                <View style={s.techRow}>
                  {sk.keywords.map((kw, j) => (
                    <Text key={j} style={[s.techBadge, { backgroundColor: accentColor + "15", color: accentColor }]}>{kw}</Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Experience */}
        {resume.work.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Experience</Text>
            {resume.work.map((w, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
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

        {/* Education subtle */}
        {resume.education.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 3 }}>
                <View style={s.row}>
                  <Text style={s.entryTitle}>{e.studyType} in {e.area}</Text>
                  <Text style={s.date}>{e.startDate} — {e.endDate || "Present"}</Text>
                </View>
                <Text style={s.companyLine}>{e.institution}</Text>
              </View>
            ))}
          </>
        )}

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
