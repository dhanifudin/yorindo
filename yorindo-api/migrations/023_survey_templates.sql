-- ─────────────────────────────────────────────
-- Migration 023: Survey Templates Table
-- Stores reusable survey templates for events
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_templates (
  id            TEXT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  survey_type   VARCHAR(20) NOT NULL CHECK (survey_type IN ('registration', 'post-event')),
  schema        JSONB NOT NULL,
  ui_schema     JSONB NOT NULL DEFAULT '{}',
  is_builtin    BOOLEAN NOT NULL DEFAULT FALSE,  -- true = system preset, false = user-created
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_templates_type ON survey_templates(survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_templates_builtin ON survey_templates(is_builtin);

-- Seed built-in templates
INSERT INTO survey_templates (id, name, description, survey_type, schema, ui_schema, is_builtin) VALUES
('tpl-reg-simple', 'Informasi Tambahan', 'Pertanyaan tambahan: sumber informasi dan ekspektasi', 'registration',
 '{
    "type": "object",
    "title": "Informasi Tambahan",
    "properties": {
      "sumberInformasi": {
        "type": "string",
        "title": "Bagaimana Anda mengetahui event ini?",
        "enum": ["Media Sosial", "Email", "Rekomendasi Teman", "Website", "Lainnya"]
      },
      "ekspektasi": { "type": "string", "title": "Apa yang Anda harapkan dari event ini?" }
    },
    "required": []
  }',
 '{
    "sumberInformasi": { "ui:widget": "radio" },
    "ekspektasi": { "ui:widget": "textarea" }
  }',
 true),

('tpl-reg-detailed', 'Registrasi Lengkap', 'Pertanyaan registrasi: sumber informasi, industri, dan ekspektasi', 'registration',
 '{
    "type": "object",
    "title": "Pertanyaan Registrasi",
    "properties": {
      "sumberInformasi": {
        "type": "string",
        "title": "Bagaimana Anda mengetahui event ini?",
        "enum": ["Media Sosial", "Email", "Rekomendasi Teman", "Website", "Lainnya"]
      },
      "topikTertarik": {
        "type": "string",
        "title": "Topik mana yang paling Anda minati?",
        "enum": ["AI & Machine Learning", "Cloud Native", "DevOps", "Data Engineering", "Security", "Lainnya"]
      },
      "ekspektasi": { "type": "string", "title": "Apa yang Anda harapkan dari event ini?" },
      "pertanyaanKhusus": { "type": "string", "title": "Apakah ada pertanyaan khusus untuk pembicara?" }
    },
    "required": []
  }',
 '{
    "sumberInformasi": { "ui:widget": "radio" },
    "topikTertarik": { "ui:widget": "checkboxes" },
    "ekspektasi": { "ui:widget": "textarea" },
    "pertanyaanKhusus": { "ui:widget": "textarea" }
  }',
 true),

('tpl-post-feedback', 'Feedback Post-Event', 'Survei kepuasan peserta dengan rating dan saran', 'post-event',
 '{
    "type": "object",
    "title": "Survei Kepuasan Peserta",
    "properties": {
      "ratingKeseluruhan": { "type": "integer", "title": "Rating Keseluruhan Event", "minimum": 1, "maximum": 5 },
      "topikFavorit": {
        "type": "string",
        "title": "Topik mana yang paling Anda sukai?",
        "enum": ["AI & Machine Learning", "Cloud Native", "DevOps", "Data Engineering", "Security", "Lainnya"]
      },
      "kualitasPenyajian": { "type": "integer", "title": "Kualitas Penyajian Materi", "minimum": 1, "maximum": 5 },
      "saranPerbaikan": { "type": "string", "title": "Saran Perbaikan untuk Event Berikutnya" },
      "akanHadirLagi": {
        "type": "string",
        "title": "Apakah Anda akan hadir di event berikutnya?",
        "enum": ["Ya", "Mungkin", "Tidak"]
      }
    },
    "required": ["ratingKeseluruhan", "kualitasPenyajian"]
  }',
 '{
    "ratingKeseluruhan": { "ui:widget": "range" },
    "topikFavorit": { "ui:widget": "radio" },
    "kualitasPenyajian": { "ui:widget": "range" },
    "saranPerbaikan": { "ui:widget": "textarea" },
    "akanHadirLagi": { "ui:widget": "radio" }
  }',
 true),

('tpl-post-nps', 'NPS Post-Event', 'Survei NPS (Net Promoter Score) sederhana', 'post-event',
 '{
    "type": "object",
    "title": "Survei NPS Event",
    "properties": {
      "npsScore": { "type": "integer", "title": "Seberapa besar kemungkinan Anda merekomendasikan event ini? (0-10)", "minimum": 0, "maximum": 10 },
      "alasan": { "type": "string", "title": "Apa alasan utama penilaian Anda?" },
      "yangDisukai": { "type": "string", "title": "Apa yang paling Anda sukai dari event ini?" },
      "yangDitingkatkan": { "type": "string", "title": "Apa yang perlu kami tingkatkan?" }
    },
    "required": ["npsScore"]
  }',
 '{
    "npsScore": { "ui:widget": "range" },
    "alasan": { "ui:widget": "textarea" },
    "yangDisukai": { "ui:widget": "textarea" },
    "yangDitingkatkan": { "ui:widget": "textarea" }
  }',
 true)
ON CONFLICT (id) DO NOTHING;
