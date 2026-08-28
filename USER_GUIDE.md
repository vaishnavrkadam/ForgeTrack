# ForgeTrack — Comprehensive User Guide

Welcome to **ForgeTrack**, an engineering issue tracker inspired by Bugzilla, wrapped in a friendly, expressive visual world with signature mascot interactions, custom pointer effects, and AI intelligence.

This step-by-step guide explains how to start, navigate, configure, and use every feature of ForgeTrack.

---

## Table of Contents

1. [Quick Start & Setup](#1-quick-start--setup)
2. [Global Navigation & Shortcuts](#2-global-navigation--shortcuts)
3. [Managing Issues & Defects](#3-managing-issues--defects)
4. [Using the Kanban Board](#4-using-the-kanban-board)
5. [AI Intelligence Workbench](#5-ai-intelligence-workbench)
6. [Release Health & CI Intelligence](#6-release-health--ci-intelligence)
7. [Git Integrations & Webhooks](#7-git-integrations--webhooks)
8. [Import & Export (Bugzilla / CSV / JSON)](#8-import--export-bugzilla--csv--json)
9. [Customization & Preferences](#9-customization--preferences)

---

## 1. Quick Start & Setup

### Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later
- **Docker / PostgreSQL**: **100% Optional!** (The system includes an automatic embedded in-memory PostgreSQL engine that boots seamlessly if Docker/Postgres is not running).

### Starting the Applications

1. **Install dependencies & Build**:
   ```bash
   npm install
   npm run build
   ```

2. **Start Both Frontend & Backend (Recommended)**:
   ```bash
   npm run dev
   ```
   *This starts the NestJS API on `http://localhost:3001/api/v1` and the Next.js Web UI on `http://localhost:3000` with zero configuration required.*

3. **Or Start Services Individually**:
   - **Backend API**:
     ```bash
     npm run dev --workspace=@forgetrack/api
     ```
   - **Frontend UI**:
     ```bash
     npm run dev --workspace=@forgetrack/web
     ```

4. **Optional: Starting External PostgreSQL Container**:
   If you have Docker Desktop installed and prefer using a containerized PostgreSQL instance on port 5432:
   ```bash
   npm run docker:up
   ```

5. **Open the Web Dashboard**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 2. Global Navigation & Shortcuts

ForgeTrack includes global keybindings to maximize your engineering velocity:

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | **Command Palette** | Instant modal to search issues, switch workspaces, or trigger quick actions. |
| <kbd>C</kbd> | **Create Issue** | Opens the issue composer modal from anywhere in the application. |
| <kbd>/</kbd> | **Quick Search** | Focuses the global search bar in the TopBar. |
| <kbd>Esc</kbd> | **Dismiss** | Closes any active modal, drawer, or command menu. |

### TopBar Controls
- **Workspace / Project Switcher Dropdown**:
  - Select between active project workspaces (e.g. `FORGE — ForgeTrack Core Engine`, `WEB — Web Dashboard & UI`, `AI — AI Intelligence Pipeline`).
  - Switching projects immediately filters your Dashboard metrics, All Issues table, and Kanban Board to that specific project workspace.
- **Sound Toggle (`🔊 Sound On` / `🔇 Muted`)**: Enables/disables subtle audio micro-chirps on hover and pops on click.
- **Cursor Toggle (`🐛 Bug Cursor` / `Default`)**: Switches between the animated bug pointer mascot (which replaces and hides the default OS cursor) and the standard OS cursor.
- **`+ New Issue` Button**: Opens the issue creation modal with sequence allocation for the active project.

---

## 3. Managing Issues & Defects

### Creating an Issue (<kbd>C</kbd>)
1. Press <kbd>C</kbd> or click the **`+ New Issue`** button.
2. Select your **Issue Type**:
   - 🐛 **Bug Defect**: System errors, regressions, or unexpected behaviors.
   - ✨ **Feature Request**: New functionality or enhancements.
   - 📋 **Task**: Refactoring, migrations, or maintenance work.
   - ⚡ **Improvement**: Performance or UI polish.
3. Enter a **Title**:
   - As you type, the **Live AI Quality Meter (0–100)** audits your summary for clarity and detail.
   - If a similar issue exists, a **Live AI Duplicate Warning Banner** will appear with the matching issue key.
4. Enter the **Description & Reproduction Steps**:
   - Toggle between the **Write** and **Preview** tabs to preview Markdown formatting.
   - Include steps to reproduce, expected results, and actual behavior.
5. Set the **Priority** (`URGENT`, `HIGH`, `MEDIUM`, `LOW`) and **Severity** (`BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `TRIVIAL`).
6. Assign a **Component** (e.g. `Core Engine`, `Database`, `UI/UX`, `Security`) and an **Assignee**.
7. Click **Create Issue** or press <kbd>Enter</kbd>.

### Viewing & Transitioning Issue Status
1. Click on any row in the **All Issues** table to open the **Issue Detail View**.
2. Transition the issue through its workflow using the top status ribbon:
   - **`OPEN`** → Initial triage state.
   - **`IN PROGRESS`** → Under active development.
   - **`RESOLVED`** → Patched and verified.
   - **`CLOSED`** → Completed and archived.
3. Review the **AI Executive Summary Card** summarizing root-cause analysis and discussion highlights.
4. Inspect linked **Git Commits & CI Pipeline Runs** associated with the issue.
5. Leave comments and updates in the chronological discussion timeline.

---

## 4. Using the Kanban Board

1. In the sidebar, select **Kanban Board**.
2. View your project issues organized across 4 workflow columns:
   - **To Do / Open** (Yellow)
   - **In Progress** (Blue)
   - **Resolved / Verified** (Green)
   - **Closed** (Gray)
3. Click on any card to open its full detail drawer.
4. Click the quick transition arrow (**`→`**) on any card to advance it to the next workflow stage.

---

## 5. AI Intelligence Workbench

Navigate to **AI Workbench** from the sidebar to access AI tools:

### 1. Duplicate Detection Scanner
- Compares issue title and description embeddings using cosine vector similarity ($\ge 0.70$).
- Displays match similarity percentages and explanation snippets.

### 2. Triage Classifier
- Automatically predicts issue type, recommended priority, defect severity, and component leads from text heuristics and ML models.

### 3. Quality Audit Assistant
- Computes a 0–100 completeness score.
- Alerts when step-by-step reproduction instructions or environment details are missing.

### 4. Semantic & Hybrid Search
- Uses Reciprocal Rank Fusion (RRF) combining full-text search with vector embeddings.
- Filters results according to project permissions.

### 5. AI Suggestions Review Card
- Non-destructive review of AI recommendations.
- Click **Accept** to apply relationships or metadata, or **Dismiss** to reject.

---

## 6. Release Health & CI Intelligence

Navigate to **Releases & CI** from the sidebar:

1. **Sprint Milestones**:
   - Track progress percentages, total issues, resolved issues, and target release dates.
2. **Release Health Badge**:
   - `HEALTHY` (Green): Pass rate $\ge 90\%$, zero blocker defects.
   - `AT_RISK` (Yellow): Blocker defects detected or pass rate $< 90\%$.
   - `CRITICAL` (Red): Multiple blocking defects or failing build pipelines.
3. **CI Pipeline Runs**:
   - View commit hashes, workflow names, run statuses (`SUCCESS`, `RUNNING`, `FAILED`), and direct links to build logs.

---

## 7. Git Integrations & Webhooks

Navigate to **Integrations & Git** from the sidebar:

### Git Providers (GitHub & GitLab)
- Automatically parses issue keys in commit messages and PR titles using regex:
  ```regex
  /([A-Z][A-Z0-9]+)-(\d+)/g
  ```
  *(e.g. `git commit -m "Fix database connection leak (FORGE-101)"` automatically links the commit to `FORGE-101`).*
- Validates incoming GitHub webhooks with HMAC SHA-256 signatures (`X-Hub-Signature-256`).

### Outbound Webhook Subscriptions
1. In the **Outbound Webhook Endpoints** section, enter your target webhook URL.
2. Click **Add Webhook** (SSRF protection blocks localhost, RFC 1918 subnets, and AWS/GCP metadata endpoints).
3. Click **Send Ping** to test connectivity and verify HMAC payload delivery (`X-ForgeTrack-Signature`).

---

## 8. Import & Export (Bugzilla / CSV / JSON)

Navigate to **Settings & Imports** from the sidebar:

### Exporting Issues
- Click **Export CSV** to download issues as an RFC 4180 formatted CSV spreadsheet.
- Click **Export JSON** to download a structured JSON archive of all issue metadata.

### Importing from Bugzilla or CSV
1. In the **Import from Bugzilla / CSV** panel, click **Run Bugzilla XML/CSV Import**.
2. ForgeTrack spins off an asynchronous background job, mapping Bugzilla fields (`summary`, `description`, `component`, `priority`, `op_sys`, `version`) to ForgeTrack issues.
3. The live progress bar monitors batch completion and reports validation status.

---

## 9. Customization & Preferences

ForgeTrack allows you to tailor the UI experience to your liking:

- **Bug Mascot Cursor**: Enable for pointer tracking with squashing and hover effects (automatically hides the default OS cursor), or select **Default** for standard OS behavior.
- **Audio Feedback**: Turn on micro audio chirps and pops, or select **Muted** for silent operation.
- **Reduced Motion**: Automatically respected when enabled in OS settings, disabling decorative animations while keeping transitions immediate.
- **Theme**: Supports light and dark mode palettes.

---

*Enjoy tracking defects with ForgeTrack! Zero bugs escape.*
