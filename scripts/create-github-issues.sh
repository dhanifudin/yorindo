#!/usr/bin/env bash
# Create GitHub Issues for all Yorindo stories (FE + BE split)
# Usage: bash scripts/create-github-issues.sh
set -euo pipefail

REPO="dhanifudin/yorindo"
OWNER="dhanifudin"
PROJECT_NUMBER=7
STORY_DIR="_bmad-output/implementation-artifacts"
BASE_URL="https://github.com/dhanifudin/yorindo/blob/main/_bmad-output/implementation-artifacts"
SPRINT_STATUS="$STORY_DIR/sprint-status.yaml"

# ── Epic metadata ────────────────────────────────────────────────────────────
declare -A EPIC_NAMES=(
  [1]="Epic 1: Foundation & OpenAPI"
  [2]="Epic 2: Team & Access Management"
  [3]="Epic 3: Contact Database & Intelligence"
  [4]="Epic 4: Event Configuration & Management"
  [5]="Epic 5: Invitation Blast & Notifications"
  [6]="Epic 6: Participant Registration & Approval"
  [7]="Epic 7: Event-Day Check-in (Offline PWA)"
  [8]="Epic 8: Analytics, Reporting & YoriMind"
  [9]="Epic 9: Participant Data Rights & UU PDP"
  [10]="Epic 10: UI Design System & Mobile Redesign"
  [11]="Epic 11: UX Experience & Routing Revamp"
)

declare -A EPIC_COLORS=(
  [1]="0052cc" [2]="0075ca" [3]="e4e669"
  [4]="d93f0b" [5]="0e8a16" [6]="e99695"
  [7]="f9d0c4" [8]="c2e0c6" [9]="bfd4f2"
  [10]="fef2c0" [11]="d4c5f9"
)

# ── Create labels ────────────────────────────────────────────────────────────
echo "→ Creating labels..."

gh label create "frontend"   --color "0075ca" --description "Phase 1 — Frontend (MSW mocks)"      --repo "$REPO" --force 2>/dev/null || true
gh label create "backend"    --color "d93f0b" --description "Phase 2 — Backend (real DB/services)" --repo "$REPO" --force 2>/dev/null || true

for n in "${!EPIC_NAMES[@]}"; do
  gh label create "epic-$n" \
    --color "${EPIC_COLORS[$n]}" \
    --description "${EPIC_NAMES[$n]}" \
    --repo "$REPO" --force 2>/dev/null || true
done

echo "✓ Labels ready"

# ── Helper: derive title from story key ─────────────────────────────────────
key_to_title() {
  local key="$1"
  # Strip epic+story prefix (e.g. "3-1-")
  local slug="${key#*-*-}"
  # Title-case hyphen-separated words
  echo "$slug" | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g'
}

# ── Helper: extract title from .md file ─────────────────────────────────────
md_title() {
  local file="$1"
  # Match "# Story N.N — Title" or "# Story N.N - Title"
  grep -m1 "^# Story" "$file" 2>/dev/null \
    | sed 's/^# Story [0-9][0-9.]*[[:space:]]*[—–-][[:space:]]*//' \
    || echo ""
}

# ── Helper: extract user story summary (As a... I want...) ──────────────────
md_summary() {
  local file="$1"
  # Grab lines between "## Story" and the next "---" or "##"
  awk '/^## Story$/{found=1; next} found && /^(---|##)/{exit} found && NF{print}' "$file" \
    | head -6 | tr '\n' ' ' | xargs
}

# ── Main loop ────────────────────────────────────────────────────────────────
CREATED=0
FAILED=0

while IFS= read -r line; do
  # Match "  3-1-story-slug: status" lines only
  if [[ "$line" =~ ^[[:space:]]+([0-9]+)-([0-9]+)-([a-z0-9-]+):[[:space:]] ]]; then
    epic_num="${BASH_REMATCH[1]}"
    story_num="${BASH_REMATCH[2]}"
    story_slug="${BASH_REMATCH[3]}"
    story_key="${epic_num}-${story_num}-${story_slug}"

    md_file="$STORY_DIR/${story_key}.md"

    # Resolve title
    if [[ -f "$md_file" ]]; then
      title=$(md_title "$md_file")
      summary=$(md_summary "$md_file")
    else
      title=$(key_to_title "$story_key")
      summary=""
    fi
    [[ -z "$title" ]] && title=$(key_to_title "$story_key")

    epic_label="epic-${epic_num}"
    md_link="$BASE_URL/${story_key}.md"

    # ── FE issue ──────────────────────────────────────────────────────────
    if [[ -n "$summary" ]]; then
      fe_body="${summary}

📄 [Story Details](${md_link})"
    else
      fe_body="📄 [Story Details](${md_link})"
    fi

    fe_url=$(gh issue create \
      --repo "$REPO" \
      --title "[FE] ${title}" \
      --body "$fe_body" \
      --label "frontend,${epic_label}" \
      2>/dev/null) && {
        gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$fe_url" 2>/dev/null || true
        echo "  ✓ FE #$(basename "$fe_url") — ${title}"
      } || { echo "  ✗ FE FAILED — ${story_key}"; ((FAILED++)) || true; continue; }

    # ── BE issue ──────────────────────────────────────────────────────────
    if [[ -n "$summary" ]]; then
      be_body="${summary}

📄 [Story Details](${md_link})"
    else
      be_body="📄 [Story Details](${md_link})"
    fi

    be_url=$(gh issue create \
      --repo "$REPO" \
      --title "[BE] ${title}" \
      --body "$be_body" \
      --label "backend,${epic_label}" \
      2>/dev/null) && {
        gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$be_url" 2>/dev/null || true
        echo "  ✓ BE #$(basename "$be_url") — ${title}"
      } || { echo "  ✗ BE FAILED — ${story_key}"; ((FAILED++)) || true; }

    ((CREATED+=2)) || true
    sleep 0.5  # avoid secondary rate limit
  fi
done < "$SPRINT_STATUS"

echo ""
echo "Done — ${CREATED} issues created, ${FAILED} failed"
echo "Project: https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}"
