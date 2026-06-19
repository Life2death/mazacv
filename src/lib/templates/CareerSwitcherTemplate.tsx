import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { JsonResume } from "../types";

interface Props {
  resume: JsonResume;
  accentColor: string;
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { padding: 34, fontFamily: "Helvetica", fontSize: 9.5, lineHeight: 1.35 },
    header: { marginBottom: 14 },
    name: { fontSize: 21, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    contact: { fontSize: 8.5, color: "#555", marginBottom: 1 },
    professionalSummary: { fontSize: 9, color: "#333", marginBottom: 8 },
    divider: { borderTop: `0.75pt solid #ccc`, marginVertical: 6 },
    sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 5, color: accent, textTransform: "uppercase", letterSpacing: 1.5 },
    entryTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
    date: { fontSize: 8, color: "#888" },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    companyLine: { fontSize: 8.5, color: "#555", marginBottom: 1 },
    bulletList: { marginLeft: 14, marginBottom: 5 },
    bullet: { fontSize: 8.5, marginBottom: 0.8 },
    skillGroup: { marginBottom: 4 },
    skillGroupTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: accent, marginBottom: 1 },
    skillGroupItems: { fontSize: 8.5, color: "#444" },
    certLine: { fontSize: 8.5, marginBottom: 2 },
  });

export function CareerSwitcherTemplate({ resume, accentColor }: Props) {
  const b = resume.basics;
  const s = styles(accentColor);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{b.name}</Text>
          <Text style={s.contact}>{[b.email, b.phone, b.location].filter(Boolean).join(" · ")}</Text>
          {b.headline && <Text style={[s.professionalSummary, { color: accentColor, marginTop: 2 }]}>{b.headline}</Text>}
        </View>

        {/* Professional Summary — prominent for career switchers */}
        {b.summary && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Professional Summary</Text>
            <Text style={s.professionalSummary}>{b.summary}</Text>
          </>
        )}

        {/* Transferable Skills — first, since that's the core value proposition */}
        {resume.skills.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Transferable Skills</Text>
            {resume.skills.map((sk, i) => (
              <View key={i} style={s.skillGroup}>
                <Text style={s.skillGroupTitle}>{sk.name}</Text>
                <Text style={s.skillGroupItems}>{sk.keywords.join(" · ")}</Text>
              </View>
            ))}
          </>
        )}

        {/* Experience — functional style, grouped by transferable achievement */}
        {resume.work.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Relevant Experience</Text>
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

        {/* Education */}
        {resume.education.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
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
            <Text style={s.sectionTitle}>Key Projects</Text>
            {resume.projects.map((p, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <Text style={s.entryTitle}>{p.name}</Text>
                {p.highlights.map((h, j) => (
                  <Text key={j} style={s.bullet}>• {h}</Text>
                ))}
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
              <Text key={i} style={s.certLine}>• {c.name}{c.issuer ? ` — ${c.issuer}` : ""}</Text>
            ))}
          </>
        )}

        {/* Languages */}
        {resume.languages && resume.languages.length > 0 && (
          <>
            <View style={s.divider} />
            <Text style={s.sectionTitle}>Languages</Text>
            <Text style={s.skillGroupItems}>
              {resume.languages.map((l) => `${l.language} (${l.fluency})`).join(" · ")}
            </Text>
          </>
        )}
      </Page>
    </Document>
  );
}
