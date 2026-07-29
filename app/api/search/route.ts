const DIMENSIONS = 96;

type EvidenceDocument = {
  id: string;
  source: string;
  text: string;
  tag: string;
  category: "latency" | "certificate" | "deployment" | "security";
};

const documents: EvidenceDocument[] = [
  {
    id: "trace-checkout-cache",
    source: "OpenTelemetry trace",
    text: "checkout-api waits 2.41 seconds on session-cache after the Redis connection pool is exhausted.",
    tag: "TRACE",
    category: "latency",
  },
  {
    id: "deploy-pool-regression",
    source: "Argo CD deployment",
    text: "Connection pool limit changed from 800 to 120 in checkout-api version 2.19.4 at 14:03 UTC.",
    tag: "DEPLOY",
    category: "deployment",
  },
  {
    id: "incident-similar-redis",
    source: "Incident #2417",
    text: "A semantically similar checkout latency failure followed a Redis client configuration rollout in March.",
    tag: "MEMORY",
    category: "latency",
  },
  {
    id: "envoy-tls-health",
    source: "Envoy access log",
    text: "No TLS handshake failures or certificate validation errors occurred in the affected request path.",
    tag: "LOG",
    category: "certificate",
  },
  {
    id: "certificate-inventory",
    source: "Certificate inventory",
    text: "All production certificates remain valid for at least 41 days and automatic rotation is healthy.",
    tag: "CONFIG",
    category: "certificate",
  },
  {
    id: "tls-runbook",
    source: "Runbook: TLS failures",
    text: "Observed symptoms do not match certificate expiry, trust-chain, or mutual TLS failure behavior.",
    tag: "RUNBOOK",
    category: "certificate",
  },
  {
    id: "git-connection-lifecycle",
    source: "Git commit 8f31ac",
    text: "The latest production change modified Redis connection lifecycle, retry, and pool-size configuration.",
    tag: "CODE",
    category: "deployment",
  },
  {
    id: "sre-isolated-replay",
    source: "SRE remediation runbook",
    text: "Clone the affected workload into an isolated namespace and replay production signals before rollout.",
    tag: "RUNBOOK",
    category: "security",
  },
  {
    id: "policy-boundary",
    source: "OPA policy decision",
    text: "The proposed connection-pool remediation passes network, identity, cost, and resource-limit policies.",
    tag: "POLICY",
    category: "security",
  },
];

const synonyms: Record<string, string[]> = {
  latency: ["slow", "timeout", "duration", "p99", "response"],
  deployment: ["rollout", "release", "change", "version", "argocd"],
  certificate: ["tls", "ssl", "expiry", "handshake", "trust"],
  cache: ["redis", "session", "pool", "connection", "memory"],
  failure: ["incident", "error", "outage", "degraded", "critical"],
  replay: ["simulation", "sandbox", "clone", "validate", "remediation"],
};

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function tokenize(text: string) {
  const raw = text.toLowerCase().match(/[a-z0-9.-]+/g) ?? [];
  const expanded = [...raw];
  for (const token of raw) {
    for (const [root, related] of Object.entries(synonyms)) {
      if (token === root || related.includes(token)) expanded.push(root, ...related);
    }
  }
  return expanded;
}

function embed(text: string) {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  for (const token of tokenize(text)) {
    const hash = hashToken(token);
    const primary = hash % DIMENSIONS;
    const secondary = Math.floor(hash / DIMENSIONS) % DIMENSIONS;
    vector[primary] += 1;
    vector[secondary] += 0.35;
  }
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function cosine(a: number[], b: number[]) {
  return a.reduce((total, value, index) => total + value * b[index], 0);
}

const localIndex = documents.map((document) => ({
  document,
  vector: embed(`${document.source} ${document.text} ${document.category}`),
}));

async function searchQdrant(queryVector: number[]) {
  const qdrantUrl = process.env.QDRANT_URL;
  if (!qdrantUrl) return null;

  try {
    const response = await fetch(`${qdrantUrl}/collections/aegis_evidence/points/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: queryVector, limit: 3, with_payload: true }),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      result?: { points?: Array<{ score: number; payload?: EvidenceDocument }> };
    };
    const points = result.result?.points ?? [];
    if (!points.length) return null;
    return points
      .filter((point) => point.payload)
      .map((point) => ({ ...point.payload!, score: point.score }));
  } catch {
    return null;
  }
}

function buildSummary(matches: Array<EvidenceDocument & { score: number }>) {
  const categories = matches.reduce<Record<string, number>>((counts, match) => {
    counts[match.category] = (counts[match.category] ?? 0) + match.score;
    return counts;
  }, {});
  const strongest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (strongest === "certificate") {
    return "Certificate expiry is unlikely. The affected path shows healthy TLS handshakes, while the timing aligns with a connection-pool configuration change.";
  }
  if (strongest === "security") {
    return "The safest next action is an isolated Kubernetes replay. The candidate remediation satisfies the current policy boundaries.";
  }
  return "A connection-pool regression in checkout-api exhausted session-cache after the v2.19.4 rollout. Independent trace, deployment, and incident-memory signals support the causal path.";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim();
  if (!query) {
    return Response.json({ error: "A query is required." }, { status: 400 });
  }

  const queryVector = embed(query);
  const remoteMatches = await searchQdrant(queryVector);
  const localMatches = localIndex
    .map(({ document, vector }) => ({ ...document, score: cosine(queryVector, vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const matches = remoteMatches ?? localMatches;
  const confidence = Math.max(81, Math.min(97, Math.round(82 + (matches[0]?.score ?? 0) * 18)));

  return Response.json({
    engine: remoteMatches ? "qdrant" : "embedded-cosine",
    dimensions: DIMENSIONS,
    confidence,
    summary: buildSummary(matches),
    matches: matches.map((match) => ({
      score: match.score.toFixed(2),
      source: match.source,
      text: match.text,
      tag: match.tag,
    })),
  });
}
