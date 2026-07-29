"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  CircleDot,
  Cloud,
  Command,
  Database,
  GitBranch,
  Globe2,
  Hexagon,
  Layers3,
  Network,
  Play,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "overview" | "evidence" | "replay" | "fleet";
type CloudFilter = "global" | "aws" | "gcp" | "azure";
type EvidenceItem = { score: string; source: string; text: string; tag: string };

const nodes = [
  { id: "edge", label: "edge-router", sub: "34 pods", cloud: "global", x: 49, y: 13, status: "healthy" },
  { id: "checkout", label: "checkout-api", sub: "18 pods", cloud: "aws", x: 30, y: 38, status: "critical" },
  { id: "catalog", label: "catalog-api", sub: "24 pods", cloud: "gcp", x: 69, y: 39, status: "healthy" },
  { id: "payments", label: "payments", sub: "12 pods", cloud: "azure", x: 18, y: 68, status: "warning" },
  { id: "redis", label: "session-cache", sub: "6 nodes", cloud: "aws", x: 49, y: 67, status: "critical" },
  { id: "orders", label: "orders-db", sub: "3 replicas", cloud: "gcp", x: 81, y: 69, status: "healthy" },
];

const nodeDetails: Record<string, { title: string; description: string; metric: string; detail: string }> = {
  edge: { title: "edge-router", description: "Global ingress and traffic policy", metric: "99.99%", detail: "Availability" },
  checkout: { title: "checkout-api", description: "Primary transaction orchestration", metric: "2.84s", detail: "p99 latency" },
  catalog: { title: "catalog-api", description: "Product inventory and pricing", metric: "82ms", detail: "p99 latency" },
  payments: { title: "payments", description: "Payment authorization service", metric: "0.7%", detail: "Error rate" },
  redis: { title: "session-cache", description: "Distributed checkout session state", metric: "93.2%", detail: "CPU saturation" },
  orders: { title: "orders-db", description: "Multi-region order persistence", metric: "12ms", detail: "Replica lag" },
};

const evidenceSets = {
  latency: [
    { score: "0.97", source: "OpenTelemetry trace", text: "checkout-api waits 2.41s on session-cache after pool exhaustion.", tag: "TRACE" },
    { score: "0.94", source: "Argo CD deployment", text: "Connection pool limit changed from 800 to 120 at 14:03 UTC.", tag: "DEPLOY" },
    { score: "0.89", source: "Incident #2417", text: "Semantically similar failure followed a Redis client rollout in March.", tag: "MEMORY" },
  ],
  certificate: [
    { score: "0.93", source: "Envoy access log", text: "No TLS handshake failures detected in the affected request path.", tag: "LOG" },
    { score: "0.86", source: "Certificate inventory", text: "All production certificates remain valid for more than 41 days.", tag: "CONFIG" },
    { score: "0.74", source: "Runbook: TLS failures", text: "Observed symptoms do not match certificate expiry behavior.", tag: "RUNBOOK" },
  ],
  default: [
    { score: "0.91", source: "Cluster event stream", text: "Strongest semantic match links the query to checkout-api and session-cache.", tag: "EVENT" },
    { score: "0.87", source: "Git commit 8f31ac", text: "The latest production change touched connection lifecycle configuration.", tag: "CODE" },
    { score: "0.81", source: "SRE runbook", text: "Recommended next step is an isolated configuration replay.", tag: "RUNBOOK" },
  ],
};

const timeline = [
  { time: "14:03", title: "Deployment completed", detail: "checkout-api v2.19.4", tone: "neutral" },
  { time: "14:05", title: "Cache saturation", detail: "CPU crossed 90%", tone: "warning" },
  { time: "14:07", title: "SLO burn detected", detail: "18.4× normal rate", tone: "critical" },
  { time: "14:08", title: "Aegis correlated cause", detail: "Confidence 97%", tone: "aegis" },
];

const nav = [
  { id: "overview" as View, label: "Command", icon: Activity },
  { id: "evidence" as View, label: "Evidence", icon: Database },
  { id: "replay" as View, label: "Replay", icon: Workflow },
  { id: "fleet" as View, label: "Fleet", icon: Globe2 },
];

function AegisMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <Hexagon size={24} strokeWidth={1.6} />
      <span />
    </div>
  );
}

function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState<CloudFilter>("global");
  const [selectedNode, setSelectedNode] = useState("checkout");
  const [query, setQuery] = useState("Why did checkout latency spike after the deployment?");
  const [answerKey, setAnswerKey] = useState<keyof typeof evidenceSets>("latency");
  const [searching, setSearching] = useState(false);
  const [liveEvidence, setLiveEvidence] = useState<EvidenceItem[]>(evidenceSets.latency);
  const [liveSummary, setLiveSummary] = useState("A connection-pool regression in checkout-api exhausted session-cache after the v2.19.4 rollout. The causal path appears in three independent signal classes.");
  const [liveConfidence, setLiveConfidence] = useState(97);
  const [searchEngine, setSearchEngine] = useState("embedded-cosine");
  const [palette, setPalette] = useState(false);
  const [simulation, setSimulation] = useState(0);
  const [failedOver, setFailedOver] = useState(false);
  const [incidentResolved, setIncidentResolved] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
      if (event.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (simulation < 1 || simulation >= 4) return;
    const timer = window.setTimeout(() => setSimulation((step) => step + 1), 850);
    return () => window.clearTimeout(timer);
  }, [simulation]);

  useEffect(() => {
    if (simulation === 4) setIncidentResolved(true);
  }, [simulation]);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => filter === "global" || node.cloud === filter || node.cloud === "global"),
    [filter]
  );

  const submitQuery = async (nextQuery?: string) => {
    const value = nextQuery ?? query;
    if (!value.trim()) return;
    setQuery(value);
    setSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: value }),
      });
      if (!response.ok) throw new Error("Search failed");
      const result = await response.json() as {
        matches: EvidenceItem[];
        summary: string;
        confidence: number;
        engine: string;
      };
      setLiveEvidence(result.matches);
      setLiveSummary(result.summary);
      setLiveConfidence(result.confidence);
      setSearchEngine(result.engine);
      const normalized = value.toLowerCase();
      setAnswerKey(normalized.includes("certificate") || normalized.includes("tls") ? "certificate" : normalized.includes("latency") || normalized.includes("checkout") || normalized.includes("cache") ? "latency" : "default");
    } catch {
      setLiveEvidence(evidenceSets.default);
      setLiveSummary("The local evidence cache found the strongest relationship around connection lifecycle configuration. An isolated replay is the safest next action.");
      setLiveConfidence(86);
      setSearchEngine("local-fallback");
    } finally {
      setSearching(false);
      setPalette(false);
      setView("overview");
    }
  };

  const resetIncident = () => {
    setSimulation(0);
    setIncidentResolved(false);
    setFailedOver(false);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="logo-button" aria-label="Aegis Mesh home" onClick={() => setView("overview")}>
          <AegisMark />
        </button>
        <nav className="primary-nav" aria-label="Primary navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "nav-button active" : "nav-button"}
                onClick={() => setView(item.id)}
                aria-label={item.label}
                aria-current={view === item.id ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-orbit" title="All systems connected"><span /></div>
          <button className="avatar" aria-label="Open profile">JG</button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="brand-lockup">
            <div>
              <p className="eyebrow">AEGIS MESH</p>
              <h1>Incident command</h1>
            </div>
            <div className="environment-select">
              <span className="env-dot" />
              demo-global
              <ChevronDown size={13} />
            </div>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setPalette(true)}>
              <Search size={15} />
              Search infrastructure
              <span><Command size={11} /> K</span>
            </button>
            <StatusPill tone="live"><span className="pulse-dot" /> LIVE</StatusPill>
            <button className="icon-button" aria-label="System notifications">
              <CircleDot size={18} />
              <i />
            </button>
          </div>
        </header>

        <div className="content">
          <section className={`incident-strip ${incidentResolved ? "resolved" : ""}`}>
            <div className="incident-icon">
              {incidentResolved ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="incident-copy">
              <div className="incident-title-row">
                <StatusPill tone={incidentResolved ? "healthy" : "critical"}>{incidentResolved ? "RECOVERED" : "SEV-1"}</StatusPill>
                <h2>{incidentResolved ? "Checkout latency restored" : "Checkout latency cascade"}</h2>
              </div>
              <p>{incidentResolved ? "Replay-validated configuration is holding across all production regions." : "Customer transactions are breaching the global p99 objective across two regions."}</p>
            </div>
            <div className="incident-meta">
              <div><span>DETECTED</span><strong>{incidentResolved ? "18m ago" : "11m ago"}</strong></div>
              <div><span>IMPACT</span><strong>{incidentResolved ? "0.0%" : "18.7%"}</strong></div>
              <button className="text-button" onClick={() => setView("replay")}>Open incident <ArrowRight size={14} /></button>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Key reliability metrics">
            <article className="metric-card">
              <div className="metric-label"><Activity size={15} /> Global availability</div>
              <div className="metric-value">{incidentResolved ? "99.99" : "99.82"}<small>%</small></div>
              <div className={incidentResolved ? "metric-change up" : "metric-change down"}>{incidentResolved ? "+0.17% recovered" : "−0.17% from baseline"}</div>
              <div className="spark-bars" aria-hidden="true">{[42, 58, 51, 70, 65, 78, 45, 39, 73, 84].map((h, i) => <span key={i} style={{ height: `${incidentResolved ? Math.max(h, 68) : h}%` }} />)}</div>
            </article>
            <article className="metric-card">
              <div className="metric-label"><Zap size={15} /> Error budget burn</div>
              <div className="metric-value">{incidentResolved ? "0.8" : "18.4"}<small>×</small></div>
              <div className={incidentResolved ? "metric-change up" : "metric-change critical"}>{incidentResolved ? "Inside SLO target" : "Critical burn rate"}</div>
              <div className="budget-track"><span style={{ width: incidentResolved ? "18%" : "82%" }} /></div>
            </article>
            <article className="metric-card">
              <div className="metric-label"><Network size={15} /> Active clusters</div>
              <div className="metric-value">12<small>/12</small></div>
              <div className="cluster-mini">
                <span className="aws-color">AWS 5</span>
                <span className="gcp-color">GCP 4</span>
                <span className="azure-color">Azure 3</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-label"><Database size={15} /> Vector memory</div>
              <div className="metric-value">28.6<small>M</small></div>
              <div className="metric-change up">+42.8k signals today</div>
              <div className="vector-dots" aria-hidden="true">{Array.from({ length: 18 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 80}ms` }} />)}</div>
            </article>
          </section>

          {view === "overview" && (
            <section className="command-grid">
              <article className="panel topology-panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">LIVE SERVICE GRAPH</p>
                    <h3>Production topology</h3>
                  </div>
                  <div className="filter-tabs" role="group" aria-label="Filter topology by cloud">
                    {(["global", "aws", "gcp", "azure"] as CloudFilter[]).map((cloud) => (
                      <button key={cloud} className={filter === cloud ? "active" : ""} onClick={() => setFilter(cloud)}>
                        {cloud === "global" ? "All clouds" : cloud.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="topology-canvas">
                  <div className="topology-grid" />
                  <div className="edge-line e1" /><div className="edge-line e2 critical" /><div className="edge-line e3" />
                  <div className="edge-line e4 warning" /><div className="edge-line e5 critical" /><div className="edge-line e6" /><div className="edge-line e7" />
                  {visibleNodes.map((node) => {
                    const NodeIcon = node.id.includes("db") || node.id === "redis" || node.id === "orders" ? Database : node.id === "edge" ? Network : Box;
                    return (
                      <button
                        className={`service-node ${node.status} ${selectedNode === node.id ? "selected" : ""}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        key={node.id}
                        onClick={() => setSelectedNode(node.id)}
                        aria-label={`${node.label}, ${node.status}`}
                      >
                        <span className="node-icon"><NodeIcon size={16} /></span>
                        <span><strong>{node.label}</strong><small>{node.sub}</small></span>
                        <i />
                      </button>
                    );
                  })}
                  <div className="region-tag aws-tag"><span /> us-east-1</div>
                  <div className="region-tag gcp-tag"><span /> europe-west1</div>
                  <div className="region-tag azure-tag"><span /> westeurope</div>
                  <aside className="node-inspector">
                    <button aria-label="Close service details" onClick={() => setSelectedNode("")}><X size={14} /></button>
                    <p>{nodeDetails[selectedNode]?.title ?? "Select a service"}</p>
                    <span>{nodeDetails[selectedNode]?.description ?? "Inspect live service health and dependencies."}</span>
                    <div><strong>{nodeDetails[selectedNode]?.metric ?? "—"}</strong><small>{nodeDetails[selectedNode]?.detail ?? "Metric"}</small></div>
                  </aside>
                </div>
                <div className="topology-footer">
                  <span><i className="healthy-dot" /> Healthy 8</span>
                  <span><i className="warning-dot" /> Degraded 2</span>
                  <span><i className="critical-dot" /> Critical 2</span>
                  <button onClick={() => setView("fleet")}><Layers3 size={14} /> Inspect fleet</button>
                </div>
              </article>

              <article className="panel intelligence-panel">
                <div className="ai-header">
                  <div className="ai-orb"><Sparkles size={17} /></div>
                  <div><p>AEGIS INTELLIGENCE</p><span>Live server-side vector retrieval</span></div>
                  <StatusPill tone="healthy">ONLINE</StatusPill>
                </div>
                <form className="query-box" onSubmit={(event) => { event.preventDefault(); submitQuery(); }}>
                  <textarea value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Ask Aegis about this incident" />
                  <div>
                    <span><Database size={12} /> {searchEngine} · 96 dimensions</span>
                    <button type="submit" aria-label="Search incident intelligence"><ArrowRight size={16} /></button>
                  </div>
                </form>
                <div className="query-suggestions">
                  <button onClick={() => submitQuery("Could an expired certificate be causing this?")}>Check certificate path</button>
                  <button onClick={() => submitQuery("Find similar cache incidents from the last 90 days")}>Find similar incidents</button>
                </div>
                <div className={`analysis-result ${searching ? "loading" : ""}`}>
                  <div className="answer-label"><span><Sparkles size={13} /> SYNTHESIS</span><strong>{searching ? "Searching…" : `${liveConfidence}% confidence`}</strong></div>
                  <p>{searching ? "Traversing traces, configuration history, runbooks, and incident memory…" : liveSummary}</p>
                  <div className="evidence-list">
                    {liveEvidence.map((item) => (
                      <button key={item.source} onClick={() => setView("evidence")}>
                        <span className="evidence-score">{item.score}</span>
                        <span><strong>{item.source}</strong><small>{item.text}</small></span>
                        <em>{item.tag}</em>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="recommendation">
                  <div><ShieldCheck size={17} /><span><strong>Safe action available</strong><small>Validate pool configuration in an isolated replay.</small></span></div>
                  <button onClick={() => { setView("replay"); if (simulation === 0) setSimulation(1); }}>Simulate fix <Play size={13} fill="currentColor" /></button>
                </div>
              </article>
            </section>
          )}

          {view === "evidence" && (
            <section className="deep-view">
              <div className="deep-header">
                <div><p className="panel-kicker">RETRIEVAL EXPLAINABILITY</p><h3>Evidence fabric</h3><span>Every conclusion remains attached to its source, timestamp, and access boundary.</span></div>
                <StatusPill tone="healthy">28.6M VECTORS</StatusPill>
              </div>
              <div className="evidence-dashboard">
                <article className="panel collection-panel">
                  <h4>Indexed collections</h4>
                  {[
                    ["Traces + spans", "12.4M", "38 ms", "aws-color"],
                    ["Logs + events", "9.8M", "51 ms", "gcp-color"],
                    ["Code + configuration", "4.1M", "72 ms", "azure-color"],
                    ["Runbooks + incidents", "2.3M", "44 ms", "violet-color"],
                  ].map(([name, count, latency, color]) => (
                    <div className="collection-row" key={name}>
                      <i className={color} /><span><strong>{name}</strong><small>{count} embeddings</small></span><em>{latency}</em>
                    </div>
                  ))}
                </article>
                <article className="panel embedding-panel">
                  <div className="panel-header"><div><p className="panel-kicker">SEMANTIC NEIGHBORHOOD</p><h3>Checkout incident cluster</h3></div><StatusPill>cosine · 96d</StatusPill></div>
                  <div className="embedding-space" aria-label="Visualization of semantically related infrastructure signals">
                    {Array.from({ length: 48 }).map((_, i) => <span key={i} className={i % 11 === 0 ? "hot" : i % 7 === 0 ? "warm" : ""} style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${9 + ((i * 53) % 80)}%`, animationDelay: `${i * 35}ms` }} />)}
                    <div className="embedding-label l1">pool exhaustion</div>
                    <div className="embedding-label l2">v2.19.4</div>
                    <div className="embedding-label l3">redis saturation</div>
                  </div>
                </article>
                <article className="panel provenance-panel">
                  <h4>Causal evidence</h4>
                  {evidenceSets.latency.map((item, i) => (
                    <div className="provenance-row" key={item.source}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <div><strong>{item.source}</strong><p>{item.text}</p><small>Verified source · access policy satisfied</small></div>
                      <StatusPill>{item.score}</StatusPill>
                    </div>
                  ))}
                </article>
              </div>
            </section>
          )}

          {view === "replay" && (
            <section className="deep-view">
              <div className="deep-header">
                <div><p className="panel-kicker">KUBERNETES SAFETY LAYER</p><h3>Isolated incident replay</h3><span>Clone the affected workload, replay production signals, validate the fix, then generate a guarded rollout.</span></div>
                <button className="secondary-button" onClick={resetIncident}><RotateCcw size={14} /> Reset demo</button>
              </div>
              <div className="replay-grid">
                <article className="panel replay-stage">
                  <div className="sandbox-head">
                    <div className="sandbox-icon"><Terminal size={20} /></div>
                    <div><h4>replay-inc-2419</h4><span>Ephemeral namespace · us-east-1</span></div>
                    <StatusPill tone={simulation === 4 ? "healthy" : simulation > 0 ? "live" : "default"}>{simulation === 4 ? "PASSED" : simulation > 0 ? "RUNNING" : "READY"}</StatusPill>
                  </div>
                  <div className="simulation-flow">
                    {[
                      ["Clone", "Workload + policies", Box],
                      ["Hydrate", "Anonymized signals", Database],
                      ["Replay", "Production traffic", Play],
                      ["Validate", "SLO + security gates", ShieldCheck],
                    ].map(([title, subtitle, Icon], i) => {
                      const step = i + 1;
                      return (
                        <div className={`sim-step ${simulation >= step ? "active" : ""} ${simulation > step ? "done" : ""}`} key={title as string}>
                          <div>{simulation > step ? <Check size={17} /> : <Icon size={17} />}</div>
                          <strong>{title as string}</strong><span>{subtitle as string}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="terminal-window">
                    <div className="terminal-top"><span /><span /><span /><em>replay-controller</em></div>
                    <pre>{simulation === 0 ? "$ aegis replay create --incident inc-2419\nReady to provision isolated namespace." : simulation === 1 ? "$ cloning deployment/checkout-api...\n✓ policies and secrets references mapped" : simulation === 2 ? "$ hydrating replay from vector evidence set...\n✓ 18m 42s of production signals loaded" : simulation === 3 ? "$ replaying 24,000 req/s against candidate config...\n→ p99 94ms  errors 0.02%  cache CPU 41%" : "$ aegis validate --all-gates\n✓ SLO gate     ✓ Security gate\n✓ Cost gate    ✓ Regression gate\n\nREMEDIATION VERIFIED"}</pre>
                  </div>
                  {simulation === 0 ? (
                    <button className="run-button" onClick={() => setSimulation(1)}><Play size={15} fill="currentColor" /> Run isolated simulation</button>
                  ) : simulation < 4 ? (
                    <button className="run-button running" disabled><span className="spinner" /> Simulation in progress</button>
                  ) : (
                    <div className="success-banner"><ShieldCheck size={19} /><span><strong>Remediation verified</strong><small>Projected p99: 94ms · zero policy violations</small></span><button onClick={() => setView("overview")}>View recovery</button></div>
                  )}
                </article>
                <aside className="replay-side">
                  <article className="panel">
                    <p className="panel-kicker">CANDIDATE CHANGE</p>
                    <h4>Restore connection pool limits</h4>
                    <div className="diff-block"><span>− max_connections: <em>120</em></span><span>+ max_connections: <strong>800</strong></span><span>+ circuit_breaker: <strong>enabled</strong></span></div>
                    <div className="change-meta"><span><GitBranch size={13} /> ConfigMap checkout-pool</span><span><ShieldCheck size={13} /> Policy-safe</span></div>
                  </article>
                  <article className="panel impact-card">
                    <p className="panel-kicker">PROJECTED IMPACT</p>
                    <div><span>p99 latency</span><strong>2.84s → 94ms</strong></div>
                    <div><span>Error rate</span><strong>4.7% → 0.02%</strong></div>
                    <div><span>Cache CPU</span><strong>93% → 41%</strong></div>
                  </article>
                </aside>
              </div>
            </section>
          )}

          {view === "fleet" && (
            <section className="deep-view">
              <div className="deep-header">
                <div><p className="panel-kicker">MULTI-CLOUD CONTROL PLANE</p><h3>Global cluster fleet</h3><span>Policy-consistent orchestration across twelve production Kubernetes clusters.</span></div>
                <button className={failedOver ? "secondary-button success" : "secondary-button"} onClick={() => setFailedOver(!failedOver)}>{failedOver ? <Check size={14} /> : <Zap size={14} />}{failedOver ? "Traffic shifted" : "Test regional failover"}</button>
              </div>
              <div className="fleet-map panel">
                <div className="world-grid" />
                {[
                  { name: "us-east-1", cloud: "AWS", x: 22, y: 42, health: failedOver ? "draining" : "critical", load: failedOver ? "8%" : "41%" },
                  { name: "us-west-2", cloud: "AWS", x: 11, y: 36, health: "healthy", load: failedOver ? "34%" : "21%" },
                  { name: "europe-west1", cloud: "GCP", x: 51, y: 32, health: "healthy", load: failedOver ? "31%" : "18%" },
                  { name: "westeurope", cloud: "AZURE", x: 56, y: 40, health: "warning", load: "16%" },
                  { name: "asia-southeast1", cloud: "GCP", x: 81, y: 61, health: "healthy", load: failedOver ? "11%" : "4%" },
                ].map((region) => (
                  <button className={`map-region ${region.health}`} style={{ left: `${region.x}%`, top: `${region.y}%` }} key={region.name}>
                    <i /><span><strong>{region.name}</strong><small>{region.cloud} · {region.load} traffic</small></span>
                  </button>
                ))}
                <div className={`traffic-arc arc1 ${failedOver ? "active" : ""}`} />
                <div className={`traffic-arc arc2 ${failedOver ? "active" : ""}`} />
                <div className="fleet-legend"><span><i className="healthy-dot" /> Healthy</span><span><i className="warning-dot" /> Degraded</span><span><i className="critical-dot" /> Critical</span></div>
              </div>
              <div className="fleet-cards">
                {[
                  ["AWS", "5 clusters", "2,184 pods", "99.93%", "aws-color"],
                  ["Google Cloud", "4 clusters", "1,608 pods", "99.99%", "gcp-color"],
                  ["Microsoft Azure", "3 clusters", "932 pods", "99.97%", "azure-color"],
                ].map(([provider, clusters, pods, uptime, color]) => (
                  <article className="panel provider-card" key={provider}>
                    <i className={color} /><div><p>{provider}</p><span>{clusters} · {pods}</span></div><strong>{uptime}<small>30d uptime</small></strong>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="timeline-panel">
            <div className="timeline-heading"><div><p className="panel-kicker">CAUSAL TIMELINE</p><h3>11 minutes from change to diagnosis</h3></div><button onClick={() => setView("replay")}>View full replay <ArrowRight size={14} /></button></div>
            <div className="timeline-track">
              {timeline.map((item, i) => (
                <button className={`timeline-event ${item.tone}`} key={item.time} onClick={() => i === 3 ? setView("evidence") : setSelectedNode(i === 1 ? "redis" : "checkout")}>
                  <span className="time">{item.time}</span><i /><div><strong>{item.title}</strong><small>{item.detail}</small></div>
                </button>
              ))}
              <div className="timeline-line" />
            </div>
          </section>
        </div>
      </section>

      {palette && (
        <div className="palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPalette(false); }}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search Aegis Mesh">
            <div className="palette-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitQuery(); }} /><button onClick={() => setPalette(false)}><X size={16} /></button></div>
            <div className="palette-body">
              <p>ASK ACROSS YOUR INFRASTRUCTURE</p>
              {[
                ["Why did checkout latency spike?", "Search traces, deploys, logs, and incident memory", Search],
                ["Find workloads affected by inc-2419", "Traverse the live service dependency graph", Network],
                ["Replay the proposed remediation", "Open an isolated Kubernetes simulation", Play],
              ].map(([title, subtitle, Icon]) => (
                <button key={title as string} onClick={() => title === "Replay the proposed remediation" ? (setView("replay"), setPalette(false)) : submitQuery(title as string)}>
                  <span><Icon size={17} /></span><div><strong>{title as string}</strong><small>{subtitle as string}</small></div><ArrowRight size={14} />
                </button>
              ))}
            </div>
            <footer><span><kbd>↵</kbd> run query</span><span><kbd>esc</kbd> close</span><em>Search is scoped by your active access policy</em></footer>
          </section>
        </div>
      )}
    </main>
  );
}
