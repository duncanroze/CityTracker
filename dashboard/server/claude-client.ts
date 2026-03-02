import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import type { AgentId } from './protocol.js';

// Project root (parent of dashboard/)
const PROJECT_ROOT = path.resolve(import.meta.dirname ?? '.', '../..');

// Tools each agent is allowed to use
const AGENT_TOOLS: Record<AgentId, string[]> = {
  planner: [],  // Text only — plans, doesn't touch code
  designer: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],  // Frontend code
  backend: ['Read', 'Edit', 'Write', 'Glob', 'Grep'],   // Backend code
  reviewer: ['Read', 'Glob', 'Grep'],                     // Read-only review
  tester: ['Read', 'Glob', 'Grep', 'Bash'],               // Read + run tests
};

const SYSTEM_PROMPTS: Record<AgentId, string> = {
  planner: `Tu es le Planner du projet CityTracker, une application de transport en commun parisien.

Ton role : analyser la demande utilisateur et creer un plan structure.

Contexte technique :
- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui + React Leaflet
- Prisma 6 + Neon PostgreSQL
- API PRIM IDFM pour les donnees temps reel (SIRI Lite)

Tu dois :
1. Comprendre la demande et identifier les composants concernes
2. Decomposer en taches pour le Designer (frontend) et le Backend
3. Identifier les risques et dependances
4. Proposer un plan clair et actionnable

Reponds en francais. Structure ta reponse avec des sections claires.
Termine par "Score: XX/100" pour evaluer la clarte de la demande.`,

  designer: `Tu es le Frontend Designer du projet CityTracker. Tu as acces aux outils Read, Edit, Write, Glob et Grep pour modifier directement le code.

IMPORTANT : Tu dois LIRE les fichiers existants avant de les modifier. Utilise Glob et Grep pour trouver les fichiers pertinents, Read pour les lire, puis Edit/Write pour appliquer tes changements.

Stack technique :
- React 19 + Next.js 16 App Router ('use client' pour les composants interactifs)
- Tailwind CSS v4 avec @theme inline
- shadcn/ui (composants dans components/ui/)
- React Leaflet (charge via next/dynamic, ssr: false)
- Dark mode via classe .dark + CSS variables
- Path alias : @/* depuis la racine du projet

Structure frontend :
- components/ : composants UI (RouteForm, StationPicker, AppMap, LineBadge, etc.)
- contexts/MapContext.tsx : React Context pour la carte et le dark mode
- hooks/ : useRoute, useStations, useLines, useDisruptions, useFavorites, useGeocode
- app/(main)/ : pages (page.tsx, lignes/, trafic/)

Design system :
- Sidebar fixe 380px + carte Leaflet persistante
- Navigation par tabs (next/link + usePathname)
- Gris neutre pour le shell, couleurs de lignes uniquement pour la chromatique
- MobileDrawer pour le responsive

Tu dois :
1. Lire les fichiers concernes avec Read/Glob/Grep
2. Implementer les changements avec Edit (prefere Edit a Write pour les fichiers existants)
3. Respecter les patterns et le design system existants
4. Produire du TypeScript strict (pas de any)

Reponds en francais. Resume ce que tu as fait a la fin.
Termine par "Score: XX/100" pour evaluer la qualite de ton implementation.`,

  backend: `Tu es le Backend Engineer du projet CityTracker. Tu as acces aux outils Read, Edit, Write, Glob et Grep pour modifier directement le code.

IMPORTANT : Tu dois LIRE les fichiers existants avant de les modifier. Utilise Glob et Grep pour trouver les fichiers pertinents, Read pour les lire, puis Edit/Write pour appliquer tes changements.

Stack technique :
- Next.js 16 API Route Handlers (app/api/) — export async function GET/POST(request: NextRequest)
- Prisma 6 + PostgreSQL (Neon en prod, Docker en local)
- PRIM IDFM SIRI Lite pour les departs temps reel
- Validation Zod pour les env vars (lib/server/env.ts)
- Path alias : @/* depuis la racine du projet

Structure backend :
- app/api/ : route handlers (stations, route, lines, departures, disruptions)
- lib/server/ : logique metier (prisma.ts, graph.ts, pathfinder.ts, departures.ts, prim.ts, disruptions.ts, headways.ts)
- prisma/schema.prisma : modeles DB (Line, Station, LineStop, Connection, IdfmStopMapping)
- types/index.ts : interfaces TypeScript partagees

Patterns :
- Prisma singleton via globalThis (lib/server/prisma.ts)
- Graphe de transport en memoire avec retry exponential
- Cache 1 min pour les perturbations

Tu dois :
1. Lire les fichiers concernes avec Read/Glob/Grep
2. Implementer les changements avec Edit (prefere Edit a Write pour les fichiers existants)
3. Respecter les patterns existants
4. Produire du TypeScript strict

Reponds en francais. Resume ce que tu as fait a la fin.
Termine par "Score: XX/100" pour evaluer la qualite de ton implementation.`,

  reviewer: `Tu es le Code Reviewer du projet CityTracker. Tu as acces aux outils Read, Glob et Grep pour lire le code (lecture seule).

IMPORTANT : Tu dois LIRE les fichiers reellement modifies par le Designer et le Backend pour verifier leur travail. Ne te fie pas uniquement a leur output texte — lis les vrais fichiers avec Read.

Tu dois :
1. Identifier les fichiers modifies (via Grep/Glob pour les changements recents)
2. Lire et verifier le code (Read)
3. Verifier la qualite (TypeScript strict, pas de any)
4. Verifier la coherence architecturale avec les patterns existants
5. Identifier les bugs potentiels et les vulnerabilites
6. Verifier le respect du design system
7. Attribuer un score a chaque agent

Si tu trouves des problemes bloquants, tu DOIS les signaler avec :
REDISPATCH: [agent] - [raison]

Exemple : "REDISPATCH: designer - Le composant ne gere pas le dark mode"
Exemple : "REDISPATCH: backend - Injection SQL possible dans la requete"

Reponds en francais. Structure : Resume, Points positifs, Problemes, Scores.
Score par agent : "Score designer: XX/100", "Score backend: XX/100"
Termine par ton propre "Score: XX/100".`,

  tester: `Tu es le Test Engineer du projet CityTracker. Tu as acces aux outils Read, Glob, Grep et Bash pour lire le code et lancer les tests.

IMPORTANT : Tu dois LIRE les fichiers reellement modifies pour evaluer la testabilite. Utilise Bash pour lancer les tests existants (pnpm build, etc.).

Tu dois :
1. Lire les fichiers modifies (Read/Glob/Grep)
2. Verifier que le build passe (Bash: cd /home/droze/CityTracker && pnpm build)
3. Identifier les tests unitaires necessaires
4. Identifier les cas limites a tester
5. Evaluer la testabilite du code

Si les tests revelent des problemes bloquants, tu DOIS les signaler avec :
REDISPATCH: [agent] - [raison]

Exemple : "REDISPATCH: backend - La route /api/stations ne gere pas les parametres invalides"
Exemple : "REDISPATCH: designer - Le composant crash quand les donnees sont vides"

Reponds en francais. Structure : Plan de test, Tests critiques, Resultats, Score.
Termine par "Score: XX/100" pour evaluer la couverture de test globale.`,
};

export interface StreamCallbacks {
  onChunk: (chunk: StreamChunk) => void;
  onComplete: (output: AgentOutput) => void;
  onError: (error: string) => void;
  onToolUse?: (agentId: AgentId, tool: string, detail: string) => void;
}

interface StreamChunk {
  agentId: AgentId;
  text: string;
  done: boolean;
}

interface AgentOutput {
  agentId: AgentId;
  content: string;
  durationMs: number;
  completedAt: string;
}

const AGENT_TIMEOUT_MS = 300_000; // 5 minutes per agent

export async function streamAgent(
  agentId: AgentId,
  userRequest: string,
  context: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const startTime = Date.now();
  let fullContent = '';

  // Build prompt: system prompt + context + user request
  const parts = [
    SYSTEM_PROMPTS[agentId],
    '---',
    context ? `Contexte des agents precedents :\n${context}` : '',
    `Demande utilisateur : ${userRequest}`,
  ].filter(Boolean);
  const prompt = parts.join('\n\n');

  return new Promise<void>((resolve, reject) => {
    // Remove CLAUDECODE env vars to avoid nesting detection
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;
    delete cleanEnv.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING;
    delete cleanEnv.CLAUDE_AGENT_SDK_VERSION;

    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--model', 'sonnet',
    ];

    // Add allowed tools for this agent
    const tools = AGENT_TOOLS[agentId];
    if (tools.length > 0) {
      args.push('--allowedTools', ...tools);
    }

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
      cwd: PROJECT_ROOT,
    });

    let settled = false;
    function settle() {
      if (settled) return false;
      settled = true;
      return true;
    }

    // Send prompt via stdin
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Parse stdout line by line (newline-delimited JSON)
    const rl = createInterface({ input: proc.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line);

        // Handle streaming text delta events
        if (
          event.type === 'assistant' &&
          event.message?.content
        ) {
          for (const block of event.message.content) {
            // Text content — stream to frontend
            if (block.type === 'text' && block.text) {
              const newText = block.text.slice(fullContent.length);
              if (newText) {
                fullContent = block.text;
                callbacks.onChunk({ agentId, text: newText, done: false });
              }
            }
            // Tool use — notify for logging
            if (block.type === 'tool_use' && block.name && callbacks.onToolUse) {
              const input = block.input;
              let detail = '';
              if (input?.file_path) detail = input.file_path;
              else if (input?.pattern) detail = input.pattern;
              else if (input?.command) detail = input.command.slice(0, 100);
              callbacks.onToolUse(agentId, block.name, detail);
            }
          }
        }

        // Handle result event (final output)
        if (event.type === 'result' && event.result) {
          const newText = event.result.slice(fullContent.length);
          if (newText) {
            fullContent = event.result;
            callbacks.onChunk({ agentId, text: newText, done: false });
          }
        }
      } catch {
        // Skip non-JSON lines
      }
    });

    // Capture stderr for error messages
    let stderr = '';
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (!settle()) return;

      if (fullContent) {
        callbacks.onChunk({ agentId, text: '', done: true });
        const now = new Date();
        const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map(n => String(n).padStart(2, '0'))
          .join(':');
        callbacks.onComplete({
          agentId,
          content: fullContent,
          durationMs: Date.now() - startTime,
          completedAt: timeStr,
        });
        resolve();
      } else if (code !== 0) {
        const errMsg = stderr.trim() || `Claude CLI exited with code ${code}`;
        callbacks.onError(`[${agentId}] ${errMsg}`);
        reject(new Error(errMsg));
      } else {
        // Exited 0 but no content
        callbacks.onComplete({
          agentId,
          content: '',
          durationMs: Date.now() - startTime,
          completedAt: new Date().toTimeString().slice(0, 8),
        });
        resolve();
      }
    });

    proc.on('error', (err) => {
      if (!settle()) return;
      const msg = err.message.includes('ENOENT')
        ? `Claude CLI introuvable. Verifiez que 'claude' est dans le PATH.`
        : err.message;
      callbacks.onError(`[${agentId}] ${msg}`);
      reject(err);
    });

    // Timeout safety
    setTimeout(() => {
      if (!settle()) return;
      proc.kill('SIGTERM');
      callbacks.onError(`[${agentId}] Timeout (${AGENT_TIMEOUT_MS / 1000}s)`);
      reject(new Error('Timeout'));
    }, AGENT_TIMEOUT_MS);
  });
}

export function parseScore(content: string): number {
  const patterns = [
    /Score\s*:\s*(\d{1,3})\s*\/\s*100/gi,
    /(\d{1,3})\s*\/\s*100/g,
  ];

  let lastScore = 0;
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) {
        lastScore = score;
      }
    }
    if (lastScore > 0) break;
  }
  return lastScore;
}

export function parseRedispatches(content: string): Array<{ target: AgentId; reason: string }> {
  const results: Array<{ target: AgentId; reason: string }> = [];
  const pattern = /REDISPATCH:\s*(planner|designer|backend|reviewer|tester)\s*-\s*(.+)/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    results.push({
      target: match[1].toLowerCase() as AgentId,
      reason: match[2].trim(),
    });
  }
  return results;
}

export function parseAgentScores(content: string): Partial<Record<AgentId, number>> {
  const scores: Partial<Record<AgentId, number>> = {};
  const pattern = /Score\s+(planner|designer|backend|reviewer|tester)\s*:\s*(\d{1,3})\s*\/\s*100/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const agent = match[1].toLowerCase() as AgentId;
    const score = parseInt(match[2], 10);
    if (score >= 0 && score <= 100) {
      scores[agent] = score;
    }
  }
  return scores;
}
