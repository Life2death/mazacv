import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4 },
    header: { marginBottom: 14, borderBottom: `2pt solid ${accent}`, paddingBottom: 10 },
    name: { fontSize: 20, fontFamily: "Helvetica-Bold" },
    contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, fontSize: 8.5, color: "#555" },
    contactLabel: { fontFamily: "Helvetica-Bold", color: accent, marginRight: 1 },
    sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 5, color: accent },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    sectionNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", color: accent, marginRight: 6 },
    sectionLine: { flex: 1, borderTop: `0.5pt solid ${accent}`, opacity: 0.4 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    date: { fontSize: 9, color: "#888" },
    companyLine: { fontSize: 9, color: "#555", fontFamily: "Helvetica-Oblique", marginBottom: 2 },
    bulletList: { marginLeft: 14, marginBottom: 7 },
    bullet: { fontSize: 9, marginBottom: 1, lineHeight: 1.35 },
    skillsBlock: { marginBottom: 4 },
    skillRow: { flexDirection: "row", marginBottom: 2 },
    skillName: { fontFamily: "Helvetica-Bold", fontSize: 9, width: 100 },
    skillItems: { fontSize: 9, flex: 1 },
  });

let sectionCounter = 0;
function nextNum() { return ++sectionCounter; }

export function ProfessionalTemplate({ resume, accentColor }: Props) {
  const s = styles(accentColor);
  const b = resume.basics;
  sectionCounter = 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{b.name}</Text>
          {b.headline && <Text style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{b.headline}</Text>}
          <View style={s.contactRow}>
            {b.email && <Text><Text style={s.contactLabel}>Email:</Text> {b.email}</Text>}
            {b.phone && <Text><Text style={s.contactLabel}>Phone:</Text> {b.phone}</Text>}
            {b.location && <Text><Text style={s.contactLabel}>Location:</Text> {b.location}</Text>}
          </View>
        </View>

        {b.summary && (
          <Text style={{ fontSize: 9.5, marginBottom: 10, color: "#444" }}>{b.summary}</Text>
        )}

        {resume.work.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>{nextNum()}.</Text>
              <Text style={s.sectionTitle}>Experience</Text>
              <View style={s.sectionLine} />
            </View>
            {resume.work.map((w, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
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

        {resume.education.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>{nextNum()}.</Text>
              <Text style={s.sectionTitle}>Education</Text>
              <View style={s.sectionLine} />
            </View>
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

        {resume.skills.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>{nextNum()}.</Text>
              <Text style={s.sectionTitle}>Skills</Text>
              <View style={s.sectionLine} />
            </View>
            {resume.skills.map((sk, i) => (
              <View key={i} style={s.skillRow}>
                <Text style={s.skillName}>{sk.name}</Text>
                <Text style={s.skillItems}>{sk.keywords.join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        {resume.certifications && resume.certifications.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>{nextNum()}.</Text>
              <Text style={s.sectionTitle}>Certifications</Text>
              <View style={s.sectionLine} />
            </View>
            {resume.certifications.map((c, i) => (
              <Text key={i} style={s.bullet}>• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}</Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
