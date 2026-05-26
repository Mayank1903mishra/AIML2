import { useState, useRef, useEffect } from "react";

const MODEL = "claude-sonnet-4-20250514";

async function callClaude(system, messages, maxTokens = 2000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content.map((b) => b.text || "").join("");
}

const TABS = ["Home", "Resume", "Market", "Roadmap", "Interview"];

/* ─── Shared UI ─── */
const Btn = ({ children, onClick, variant = "primary", disabled, style = {} }) => {
  const base = {
    padding: "10px 22px", borderRadius: 10, fontWeight: 600,
    fontSize: 14, cursor: disabled ? "default" : "pointer",
    border: "none", transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit", ...style,
  };
  const styles = {
    primary: { background: "linear-gradient(135deg,#4f7fff,#7c5cfc)", color: "#fff", boxShadow: "0 0 24px rgba(79,127,255,.28)" },
    secondary: { background: "rgba(255,255,255,.07)", color: "#c8d4ff", border: "1px solid rgba(100,140,255,.22)" },
    ghost: { background: "transparent", color: "#8a9bc4", border: "1px solid rgba(100,140,255,.18)", padding: "7px 16px", fontSize: 13 },
  };
  return <button style={{ ...base, ...styles[variant] }} onClick={disabled ? undefined : onClick}>{children}</button>;
};

const Panel = ({ children, style = {}, accent }) => (
  <div style={{
    background: "rgba(20,28,48,.95)", border: "1px solid rgba(100,140,255,.13)",
    borderRadius: 18, padding: 24, marginBottom: 18,
    borderTop: accent ? `2px solid ${accent}` : undefined, ...style,
  }}>{children}</div>
);

const Tag = ({ children, color = "blue" }) => {
  const colors = {
    blue: { bg: "rgba(79,127,255,.15)", border: "rgba(79,127,255,.3)", text: "#7aa8ff" },
    green: { bg: "rgba(0,200,122,.12)", border: "rgba(0,200,122,.28)", text: "#2ee89a" },
    red: { bg: "rgba(255,79,106,.12)", border: "rgba(255,79,106,.28)", text: "#ff7a92" },
    amber: { bg: "rgba(245,166,35,.12)", border: "rgba(245,166,35,.28)", text: "#f5c84a" },
    teal: { bg: "rgba(0,229,200,.1)", border: "rgba(0,229,200,.25)", text: "#00e5c8" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500,
    }}>{children}</span>
  );
};

const SkillBar = ({ label, pct, color = "#4f7fff" }) => (
  <div style={{ marginBottom: 13 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8a9bc4", marginBottom: 5 }}>
      <span>{label}</span><span>{pct}%</span>
    </div>
    <div style={{ height: 5, background: "rgba(255,255,255,.07)", borderRadius: 5, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},#00e5c8)`, borderRadius: 5, transition: "width 1s ease" }} />
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 20px" }}>
    <div style={{
      width: 44, height: 44, border: "3px solid rgba(79,127,255,.2)",
      borderTopColor: "#4f7fff", borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <span style={{ color: "#8a9bc4", fontSize: 14 }}>Analyzing with AI…</span>
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "70px 20px", color: "#4a5880" }}>
    <div style={{ fontSize: 46, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, color: "#8a9bc4", marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13 }}>{sub}</div>
  </div>
);

/* ─── Score Ring ─── */
const ScoreRing = ({ score }) => {
  const c = score >= 80 ? "#2ee89a" : score >= 60 ? "#4f7fff" : "#f5c84a";
  const r = 46, circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
      <svg viewBox="0 0 110 110" width={110} height={110} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={9} />
        <circle cx={55} cy={55} r={r} fill="none" stroke={c} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 800, color: c }}>{score}</div>
        <div style={{ fontSize: 10, color: "#4a5880", textTransform: "uppercase", letterSpacing: "0.5px" }}>Score</div>
      </div>
    </div>
  );
};

/* ─── Trend Sparkline ─── */
const Sparkline = ({ data }) => {
  const W = 540, H = 120;
  const maxV = Math.max(...data.map((d) => d.jobs));
  const pts = data.map((d, i) => {
    const x = 20 + (i / (data.length - 1)) * (W - 40);
    const y = H - 10 - ((d.jobs / maxV) * (H - 20));
    return `${x},${y}`;
  });
  const line = pts.map((p, i) => (i ? "L" : "M") + p).join(" ");
  const area = `${line} L${pts[pts.length - 1].split(",")[0]},${H - 10} L20,${H - 10} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }}>
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4f7fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#4f7fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={line} fill="none" stroke="#4f7fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = 20 + (i / (data.length - 1)) * (W - 40);
        const y = H - 10 - ((d.jobs / maxV) * (H - 20));
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#4f7fff" />
            <text x={x} y={H} textAnchor="middle" fontSize={10} fill="#4a5880">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ═══════════════════ HOME ═══════════════════ */
const Home = ({ setTab }) => (
  <div>
    <div style={{ textAlign: "center", padding: "80px 20px 50px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(79,127,255,.1)", border: "1px solid rgba(79,127,255,.3)",
        borderRadius: 30, padding: "5px 16px", marginBottom: 28,
        fontSize: 11, fontWeight: 700, color: "#7aa8ff", letterSpacing: "1.5px", textTransform: "uppercase",
      }}>
        <span style={{ width: 6, height: 6, background: "#00e5c8", borderRadius: "50%", animation: "pulse 2s infinite" }} />
        AI-Powered Career Navigator
      </div>
      <h1 style={{
        fontFamily: "Syne,sans-serif", fontSize: "clamp(38px,5.5vw,68px)",
        fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 20,
        background: "linear-gradient(135deg,#4f7fff 0%,#00e5c8 55%,#7c5cfc 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        Your Career,<br />Intelligently Guided
      </h1>
      <p style={{ fontSize: 17, color: "#8a9bc4", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
        Analyze your resume, explore live market trends, build a personalized career roadmap,
        and ace interviews — all powered by Claude AI. No setup required.
      </p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        <Btn onClick={() => setTab("Resume")}>⚡ Analyze My Resume</Btn>
        <Btn variant="secondary" onClick={() => setTab("Interview")}>🎤 Practice Interview</Btn>
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, maxWidth: 820, margin: "0 auto 48px", padding: "0 20px" }}>
      {[["94%", "Match Accuracy"], ["50K+", "Careers Guided"], ["3.2×", "Faster Hiring"], ["Live", "Market Data"]].map(([n, l]) => (
        <div key={l} style={{ background: "rgba(20,28,48,.95)", border: "1px solid rgba(100,140,255,.12)", borderRadius: 16, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 800, color: "#4f7fff" }}>{n}</div>
          <div style={{ fontSize: 11, color: "#4a5880", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div>
        </div>
      ))}
    </div>

    {/* Feature cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 1040, margin: "0 auto", padding: "0 0 60px" }}>
      {[
        { icon: "📄", title: "Resume Intelligence", sub: "Deep AI analysis with ATS scoring, keyword gaps, and salary benchmarks", tags: ["ATS Score", "Skill Gaps", "Salary Range"], color: "#4f7fff", tab: "Resume" },
        { icon: "📊", title: "Market Trends", sub: "Real-time job market intelligence with demand forecasting and top companies", tags: ["Live Insights", "Top Roles", "Growth Data"], color: "#7c5cfc", tab: "Market" },
        { icon: "🤖", title: "Interview Coach", sub: "AI mock interviews with role-specific questions and instant expert feedback", tags: ["Mock Rounds", "Live Feedback", "STAR Method"], color: "#00e5c8", tab: "Interview" },
      ].map((f) => (
        <Panel key={f.title} accent={f.color} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#e8eeff" }}>{f.title}</div>
          <div style={{ fontSize: 13, color: "#8a9bc4", lineHeight: 1.6, marginBottom: 14 }}>{f.sub}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {f.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setTab(f.tab)} style={{ width: "100%" }}>Explore →</Btn>
          </div>
        </Panel>
      ))}
    </div>
  </div>
);

/* ═══════════════════ RESUME ═══════════════════ */
const Resume = () => {
  const [text, setText] = useState("");
  const [role, setRole] = useState("Software Engineer");
  const [industry, setIndustry] = useState("Technology");
  const [exp, setExp] = useState("Mid Level (3-5 years)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!text.trim()) { setError("Please paste your resume text first."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const raw = await callClaude(
        "You are an expert resume coach. Analyze resumes accurately. Return ONLY valid JSON, no markdown, no backticks.",
        [{ role: "user", content: `Analyze this resume for "${role}" in ${industry} at ${exp}.\n\nRESUME:\n${text.slice(0, 4500)}\n\nReturn ONLY this JSON:\n{"overallScore":72,"atsScore":68,"marketFitScore":75,"strengths":["s1","s2","s3","s4"],"gaps":["g1","g2","g3"],"keywords":{"present":["k1","k2","k3","k4"],"missing":["m1","m2","m3","m4"]},"improvements":["i1","i2","i3","i4"],"salaryRange":"$90,000 – $130,000","summary":"2-3 sentence honest evaluation.","topSkills":[{"skill":"Python","level":85},{"skill":"Leadership","level":70},{"skill":"SQL","level":60},{"skill":"Communication","level":80}]}` }]
      );
      setResult(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) { setError("⚠️ " + e.message); }
    setLoading(false);
  };

  const inp = { width: "100%", background: "rgba(10,15,30,.9)", border: "1px solid rgba(100,140,255,.18)", borderRadius: 10, padding: "11px 14px", color: "#e8eeff", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Resume <span style={{ background: "linear-gradient(135deg,#4f7fff,#00e5c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Analyzer</span>
      </h2>
      <p style={{ fontSize: 13, color: "#8a9bc4", marginBottom: 24 }}>AI-powered analysis scored against the current job market</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* LEFT */}
        <div>
          <Panel>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>📤 Your Resume</div>
            <div style={{ fontSize: 12, color: "#8a9bc4", marginBottom: 14 }}>Paste your resume text below</div>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder={"Paste your full resume here...\n\nJohn Doe | Software Engineer\nSkills: Python, React, AWS...\nExperience: 3 years at TechCorp..."}
              style={{ ...inp, resize: "vertical", minHeight: 160, lineHeight: 1.6 }} />
          </Panel>
          <Panel>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🎯 Target Role</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Job Title</label>
                <input style={inp} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Product Manager" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Industry</label>
                <select style={inp} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {["Technology", "Finance", "Healthcare", "Marketing", "Data Science", "Design", "Operations"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Experience</label>
              <select style={inp} value={exp} onChange={(e) => setExp(e.target.value)}>
                {["Entry Level (0-2 years)", "Mid Level (3-5 years)", "Senior Level (6-10 years)", "Principal/Staff (10+ years)"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <Btn onClick={analyze} disabled={loading} style={{ width: "100%" }}>
              {loading ? "⏳ Analyzing…" : "⚡ Analyze with AI"}
            </Btn>
            {error && <div style={{ marginTop: 12, padding: "11px 14px", background: "rgba(255,79,106,.1)", border: "1px solid rgba(255,79,106,.3)", borderRadius: 10, fontSize: 13, color: "#ff7a92" }}>{error}</div>}
          </Panel>
        </div>

        {/* RIGHT */}
        <div>
          {loading ? <Panel><Spinner /></Panel> : result ? <ResumeResult data={result} role={role} /> : (
            <EmptyState icon="🔍" title="Results appear here" sub="Paste your resume, set your target role, and click Analyze" />
          )}
        </div>
      </div>
    </div>
  );
};

const ResumeResult = ({ data: d, role }) => {
  const c = d.overallScore >= 80 ? "#2ee89a" : d.overallScore >= 60 ? "#4f7fff" : "#f5c84a";
  return (
    <div>
      <Panel accent="#4f7fff">
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📊 Analysis — {role}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <ScoreRing score={d.overallScore} />
          <div style={{ flex: 1 }}>
            <SkillBar label="ATS Compatibility" pct={d.atsScore} color="#4f7fff" />
            <SkillBar label="Market Fit" pct={d.marketFitScore} color="#7c5cfc" />
            <div style={{ fontSize: 13, color: "#8a9bc4", marginTop: 8 }}>
              💰 Salary: <strong style={{ color: "#00e5c8" }}>{d.salaryRange}</strong>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#8a9bc4", lineHeight: 1.65, padding: 12, background: "rgba(0,0,0,.25)", borderRadius: 10, border: "1px solid rgba(100,140,255,.1)" }}>{d.summary}</p>
      </Panel>

      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💪 Skill Levels</div>
        {(d.topSkills || []).map((s) => <SkillBar key={s.skill} label={s.skill} pct={s.level} />)}
      </Panel>

      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔑 Keywords</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2ee89a", letterSpacing: "0.5px", marginBottom: 7, textTransform: "uppercase" }}>✓ Present</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {(d.keywords?.present || []).map((k) => <Tag key={k} color="green">{k}</Tag>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ff7a92", letterSpacing: "0.5px", marginBottom: 7, textTransform: "uppercase" }}>✗ Missing — Add These</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {(d.keywords?.missing || []).map((k) => <Tag key={k} color="red">{k}</Tag>)}
          </div>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {[["✅ Strengths", d.strengths, "#2ee89a"], ["⚠️ Gaps", d.gaps, "#f5c84a"]].map(([title, items, col]) => (
          <div key={title} style={{ background: "rgba(10,15,30,.8)", border: "1px solid rgba(100,140,255,.12)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5880", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>{title}</div>
            {(items || []).map((s, i) => <div key={i} style={{ fontSize: 13, color: "#8a9bc4", padding: "5px 0", borderBottom: "1px solid rgba(100,140,255,.08)", display: "flex", gap: 7 }}><span style={{ color: col }}>•</span>{s}</div>)}
          </div>
        ))}
      </div>

      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🚀 Recommendations</div>
        {(d.improvements || []).map((imp, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(100,140,255,.08)", alignItems: "flex-start" }}>
            <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "#4f7fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: "#8a9bc4", lineHeight: 1.6 }}>{imp}</div>
          </div>
        ))}
      </Panel>
    </div>
  );
};

/* ═══════════════════ MARKET ═══════════════════ */
const Market = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetch_ = async () => {
    if (!query.trim()) return;
    setLoading(true); setData(null);
    try {
      const raw = await callClaude(
        "You are a job market intelligence analyst. Return ONLY valid JSON, no markdown.",
        [{ role: "user", content: `Job market intelligence for "${query}". Return ONLY this JSON:\n{"demandScore":82,"growthRate":"+23% YoY","avgSalary":"$115,000","salaryRange":"$85,000 – $165,000","competitionLevel":"Moderate","timeToHire":"3-5 weeks","topSkills":[{"skill":"Python","demand":92,"trend":"rising"},{"skill":"AWS","demand":85,"trend":"rising"},{"skill":"React","demand":74,"trend":"stable"},{"skill":"Docker","demand":70,"trend":"rising"},{"skill":"SQL","demand":66,"trend":"stable"}],"topCompanies":[{"name":"Google","openRoles":132,"fit":"High"},{"name":"Meta","openRoles":89,"fit":"High"},{"name":"Stripe","openRoles":54,"fit":"Medium"},{"name":"Airbnb","openRoles":41,"fit":"Medium"}],"marketInsights":["Insight 1","Insight 2","Insight 3"],"certifications":["Cert 1","Cert 2","Cert 3"],"jobTrends":[{"month":"Jan","jobs":110},{"month":"Feb","jobs":128},{"month":"Mar","jobs":145},{"month":"Apr","jobs":162},{"month":"May","jobs":178},{"month":"Jun","jobs":195}]}` }]
      );
      setData(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const inp = { flex: 1, background: "rgba(10,15,30,.9)", border: "1px solid rgba(100,140,255,.18)", borderRadius: 10, padding: "11px 16px", color: "#e8eeff", fontFamily: "inherit", fontSize: 14, outline: "none" };

  return (
    <div>
      <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Job Market <span style={{ background: "linear-gradient(135deg,#4f7fff,#00e5c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Intelligence</span>
      </h2>
      <p style={{ fontSize: 13, color: "#8a9bc4", marginBottom: 20 }}>Real-time AI insights on salary, demand, and opportunities</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input style={inp} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetch_()}
          placeholder="Enter role: e.g. Data Scientist, UX Designer, DevOps Engineer..." />
        <Btn onClick={fetch_} disabled={loading}>{loading ? "⏳" : "🔍 Analyze"}</Btn>
      </div>

      {loading ? <Panel><Spinner /></Panel> : data ? <MarketResult data={data} role={query} /> : (
        <EmptyState icon="📈" title="Enter a role to explore the market" sub="Get AI-powered insights on salaries, demand trends, and top companies" />
      )}
    </div>
  );
};

const MarketResult = ({ data: d, role }) => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
      {[[`${d.demandScore}/100`, "Demand Score", "#4f7fff"], [d.growthRate, "Growth Rate", "#2ee89a"], [d.avgSalary, "Avg Salary", "#00e5c8"]].map(([v, l, c]) => (
        <div key={l} style={{ background: "rgba(20,28,48,.95)", border: "1px solid rgba(100,140,255,.12)", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
          <div style={{ fontSize: 11, color: "#4a5880", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div>
        </div>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📈 Hiring Trend</div>
        <Sparkline data={d.jobTrends} />
        <div style={{ fontSize: 12, color: "#8a9bc4", marginTop: 8 }}>
          Range: <strong style={{ color: "#e8eeff" }}>{d.salaryRange}</strong> · Time to Hire: <strong style={{ color: "#00e5c8" }}>{d.timeToHire}</strong>
        </div>
      </Panel>
      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🔥 Skill Demand</div>
        {d.topSkills.map((s) => (
          <div key={s.skill} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8a9bc4", marginBottom: 5, alignItems: "center" }}>
              <span>{s.skill}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tag color={s.trend === "rising" ? "green" : "amber"}>{s.trend === "rising" ? "↑ Rising" : "→ Stable"}</Tag>
                <span>{s.demand}%</span>
              </div>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,.07)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.demand}%`, background: "linear-gradient(90deg,#4f7fff,#00e5c8)", borderRadius: 5 }} />
            </div>
          </div>
        ))}
      </Panel>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🏢 Top Hiring Companies</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {d.topCompanies.map((c) => (
            <div key={c.name} style={{ background: "rgba(10,15,30,.8)", border: "1px solid rgba(100,140,255,.12)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(79,127,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#4f7fff" }}>{c.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#4a5880" }}>{c.openRoles} roles</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#4a5880", display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Fit</span><span>{c.fit}</span></div>
              <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${c.fit === "High" ? 88 : c.fit === "Medium" ? 58 : 35}%`, background: "linear-gradient(90deg,#4f7fff,#00e5c8)" }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💡 Market Insights</div>
        {d.marketInsights.map((ins, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: "1px solid rgba(100,140,255,.08)", alignItems: "flex-start" }}>
            <span style={{ color: "#00e5c8", flexShrink: 0 }}>◆</span>
            <span style={{ fontSize: 13, color: "#8a9bc4", lineHeight: 1.6 }}>{ins}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#4a5880", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Recommended Certs</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {d.certifications.map((c) => <Tag key={c}>{c}</Tag>)}
          </div>
        </div>
      </Panel>
    </div>
  </div>
);

/* ═══════════════════ ROADMAP ═══════════════════ */
const Roadmap = () => {
  const [from_, setFrom] = useState("Junior Developer");
  const [to_, setTo] = useState("Engineering Manager");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const generate = async () => {
    setLoading(true); setData(null);
    try {
      const raw = await callClaude(
        "You are a senior career strategist. Build detailed realistic career roadmaps. Return ONLY valid JSON.",
        [{ role: "user", content: `Career roadmap from "${from_}" to "${to_}". Return ONLY this JSON:\n{"totalDuration":"18-24 months","salaryJump":"40-70% increase","difficulty":"Moderate","phases":[{"phase":"Phase 1","title":"Foundation","duration":"3 months","status":"current","description":"Build core skills and knowledge.","skills":["skill1","skill2"],"actions":["Action 1","Action 2","Action 3"]},{"phase":"Phase 2","title":"Expansion","duration":"6 months","status":"upcoming","description":"Expand and build portfolio.","skills":["skill3","skill4"],"actions":["Action 1","Action 2"]},{"phase":"Phase 3","title":"Expertise","duration":"6 months","status":"upcoming","description":"Deepen expertise and lead.","skills":["skill5","skill6"],"actions":["Action 1","Action 2"]},{"phase":"Phase 4","title":"Transition","duration":"3-6 months","status":"upcoming","description":"Active job search and interviews.","skills":["Networking"],"actions":["Update resume","Apply to companies","Negotiate offer"]}],"keyMilestones":["Milestone at 3 months","Milestone at 9 months","Milestone at 18 months"],"topResources":["Coursera / Udemy","GitHub projects","Mentorship","Books / Blogs","LinkedIn Learning"]}` }]
      );
      setData(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const inp = { background: "rgba(10,15,30,.9)", border: "1px solid rgba(100,140,255,.18)", borderRadius: 10, padding: "11px 14px", color: "#e8eeff", fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
  const statusColors = { current: "#00e5c8", upcoming: "#4f7fff", done: "#2ee89a" };

  return (
    <div>
      <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Career <span style={{ background: "linear-gradient(135deg,#4f7fff,#00e5c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Roadmap</span>
      </h2>
      <p style={{ fontSize: 13, color: "#8a9bc4", marginBottom: 20 }}>Your personalized AI-generated step-by-step career plan</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {[["Current Role", from_, setFrom, "e.g. Junior Developer"], ["Target Role", to_, setTo, "e.g. Engineering Manager / CTO"]].map(([label, val, set, ph]) => (
          <div key={label}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
            <input style={inp} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} />
          </div>
        ))}
      </div>
      <Btn onClick={generate} disabled={loading} style={{ marginBottom: 28 }}>
        {loading ? "⏳ Building…" : "🗺️ Generate My Roadmap"}
      </Btn>

      {loading ? <Panel><Spinner /></Panel> : data ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
            {[[data.totalDuration, "Total Time", "#4f7fff"], [data.salaryJump, "Salary Jump", "#2ee89a"], [data.difficulty, "Difficulty", "#e8eeff"]].map(([v, l, c]) => (
              <div key={l} style={{ background: "rgba(20,28,48,.95)", border: "1px solid rgba(100,140,255,.12)", borderRadius: 16, padding: 20, textAlign: "center" }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: "#4a5880", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div>
              </div>
            ))}
          </div>

          <Panel>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🗺️ {from_} → {to_}</div>
            <div style={{ position: "relative", paddingLeft: 28 }}>
              <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "linear-gradient(to bottom,#4f7fff,#7c5cfc,transparent)" }} />
              {(data.phases || []).map((p) => (
                <div key={p.phase} style={{ position: "relative", marginBottom: 28 }}>
                  <div style={{ position: "absolute", left: -25, top: 4, width: 13, height: 13, borderRadius: "50%", background: statusColors[p.status] || "#4f7fff", border: "2px solid #050810", boxShadow: `0 0 10px ${statusColors[p.status] || "#4f7fff"}88` }} />
                  <div style={{ fontSize: 10, color: "#4f7fff", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 3 }}>{p.phase}</div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#8a9bc4", lineHeight: 1.6, marginBottom: 8 }}>{p.description}</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                    <Tag color="blue">⏱ {p.duration}</Tag>
                    {(p.skills || []).slice(0, 3).map((s) => <Tag key={s} color="teal">{s}</Tag>)}
                  </div>
                  {(p.actions || []).map((a, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#8a9bc4", padding: "4px 0", display: "flex", gap: 8 }}>
                      <span style={{ color: "#4f7fff" }}>→</span>{a}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Panel>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🏁 Key Milestones</div>
              {(data.keyMilestones || []).map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(100,140,255,.08)", alignItems: "center" }}>
                  <div style={{ minWidth: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#4f7fff,#7c5cfc)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: "#8a9bc4" }}>{m}</div>
                </div>
              ))}
            </Panel>
            <Panel>
              <div style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📚 Resources</div>
              {(data.topResources || []).map((r) => (
                <div key={r} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(100,140,255,.08)", alignItems: "center" }}>
                  <span style={{ color: "#00e5c8" }}>◈</span>
                  <span style={{ fontSize: 14, color: "#c8d4ff" }}>{r}</span>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      ) : (
        <EmptyState icon="🗺️" title="Set your destination" sub="Enter your current and goal role to get a personalized roadmap" />
      )}
    </div>
  );
};

/* ═══════════════════ INTERVIEW ═══════════════════ */
const Interview = () => {
  const [role, setRole] = useState("Software Engineer");
  const [type, setType] = useState("behavioral");
  const [msgs, setMsgs] = useState([{ role: "ai", text: "👋 Hi! I'm Alex, your AI Interview Coach.\n\nI'll run a realistic mock interview — role-specific questions, follow-ups, and scored feedback on every answer.\n\nSet your role and type above, then hit Start Session!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const system = `You are Alex, a senior hiring manager conducting a ${type} interview for ${role}. Rules:
- Ask ONE question at a time. After the candidate answers, give 2-line feedback with a score (e.g. "Score: 7/10"), then ask the next question.
- Be realistic, professional, and encouraging but honest.
- For behavioral: expect STAR format answers. For technical: probe deeper with follow-ups.
- Keep each response under 180 words.`;

  const addMsg = (role_, text) => setMsgs((m) => [...m, { role: role_, text }]);

  const startSession = async () => {
    setActive(true);
    const h = [{ role: "user", content: "Start the interview. Greet me briefly and ask your first question immediately." }];
    setHistory(h);
    addMsg("user", "Ready! Please start my interview.");
    setLoading(true);
    try {
      const reply = await callClaude(system, h, 700);
      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      addMsg("ai", reply);
    } catch (e) { addMsg("ai", "⚠️ Error: " + e.message); }
    setLoading(false);
  };

  const send = async (txt) => {
    const text = txt || input.trim();
    if (!text) return;
    if (!active) { startSession(); return; }
    setInput("");
    addMsg("user", text);
    const h = [...history, { role: "user", content: text }];
    setHistory(h);
    setLoading(true);
    try {
      const reply = await callClaude(system, h, 700);
      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      addMsg("ai", reply);
    } catch (e) { addMsg("ai", "⚠️ " + e.message); }
    setLoading(false);
  };

  const reset = () => {
    setMsgs([{ role: "ai", text: "👋 Hi! I'm Alex, your AI Interview Coach.\n\nSet your role and type above, then hit Start Session!" }]);
    setHistory([]); setActive(false); setInput("");
  };

  const inp = { background: "rgba(10,15,30,.9)", border: "1px solid rgba(100,140,255,.18)", borderRadius: 10, padding: "11px 14px", color: "#e8eeff", fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Interview <span style={{ background: "linear-gradient(135deg,#4f7fff,#00e5c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Coach</span>
      </h2>
      <p style={{ fontSize: 13, color: "#8a9bc4", marginBottom: 20 }}>AI mock interviews with real-time expert scoring and feedback</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Target Role</label>
          <input style={inp} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer at Google" />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#8a9bc4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Interview Type</label>
          <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="behavioral">Behavioral / Culture Fit</option>
            <option value="technical">Technical / Coding</option>
            <option value="case">Case Study / Problem Solving</option>
            <option value="leadership">Leadership & Management</option>
            <option value="general">General Round</option>
          </select>
        </div>
      </div>

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(100,140,255,.12)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f7fff,#7c5cfc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 14, fontWeight: 700 }}>Alex — AI Interview Coach</div>
            <div style={{ fontSize: 11, color: "#00e5c8" }}>{active ? `${role} · ${type}` : "Ready to start"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 12, color: "#2ee89a" }}>
            <span style={{ width: 6, height: 6, background: "#2ee89a", borderRadius: "50%", animation: "pulse 2s infinite" }} />Online
          </div>
          <Btn variant="ghost" onClick={reset} style={{ marginLeft: 8 }}>↺ Reset</Btn>
        </div>

        {/* Messages */}
        <div style={{ height: 420, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "78%", alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.65,
                borderBottomRightRadius: m.role === "user" ? 4 : 16,
                borderBottomLeftRadius: m.role === "ai" ? 4 : 16,
                background: m.role === "user" ? "linear-gradient(135deg,#4f7fff,#7c5cfc)" : "rgba(20,28,48,.95)",
                border: m.role === "ai" ? "1px solid rgba(100,140,255,.15)" : "none",
                color: m.role === "user" ? "#fff" : "#c8d4ff",
                whiteSpace: "pre-wrap",
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignSelf: "flex-start" }}>
              <div style={{ padding: "12px 16px", borderRadius: 16, borderBottomLeftRadius: 4, background: "rgba(20,28,48,.95)", border: "1px solid rgba(100,140,255,.15)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ width: 6, height: 6, background: "#4f7fff", borderRadius: "50%", display: "inline-block", animation: `bounce 1.2s ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick buttons */}
        <div style={{ padding: "0 20px 10px", display: "flex", gap: 7, flexWrap: "wrap" }}>
          {[
            ["🎤 Start Session", () => startSession()],
            ["💡 Give me a hint", () => send("Give me a hint for this question")],
            ["📊 Evaluate my answer", () => send("Evaluate my last answer in detail with a score out of 10")],
            ["⚠️ Common mistakes", () => send("What are common mistakes candidates make on this type of question?")],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} disabled={loading} style={{
              padding: "5px 13px", background: "rgba(20,28,48,.8)", border: "1px solid rgba(100,140,255,.18)",
              borderRadius: 20, fontSize: 12, color: "#8a9bc4", cursor: "pointer", fontFamily: "inherit",
            }}>{label}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type your answer here... (Enter to send, Shift+Enter for new line)"
            rows={2} style={{ ...inp, resize: "none", flex: 1, maxHeight: 110, lineHeight: 1.5 }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{
            width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,#4f7fff,#7c5cfc)",
            border: "none", color: "#fff", cursor: "pointer", fontSize: 16, flexShrink: 0,
            opacity: (loading || !input.trim()) ? 0.45 : 1,
          }}>➤</button>
        </div>
      </Panel>
    </div>
  );
};

/* ═══════════════════ ROOT APP ═══════════════════ */
export default function App() {
  const [tab, setTab] = useState("Home");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#050810 0%,#0a0f1e 50%,#050810 100%)", color: "#e8eeff", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; scrollbar-width: thin; scrollbar-color: rgba(79,127,255,.3) transparent; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        select option { background: #0a0f1e; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(79,127,255,.3); border-radius: 4px; }
      `}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 20% 10%,rgba(79,127,255,.07) 0%,transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%,rgba(124,92,252,.06) 0%,transparent 60%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(79,127,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(79,127,255,.035) 1px,transparent 1px)",
        backgroundSize: "60px 60px" }} />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 36px", background: "rgba(5,8,16,.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(100,140,255,.1)" }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg,#4f7fff,#00e5c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>◈ CareerAI</div>
        <div style={{ display: "flex", gap: 3, background: "rgba(20,28,48,.9)", borderRadius: 12, padding: 4, border: "1px solid rgba(100,140,255,.12)" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "all 0.2s",
              background: tab === t ? "#4f7fff" : "transparent",
              color: tab === t ? "#fff" : "#8a9bc4",
              boxShadow: tab === t ? "0 0 18px rgba(79,127,255,.35)" : "none",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg,#4f7fff,#7c5cfc)", color: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600 }}>✦ No API Key Needed</div>
      </nav>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, paddingTop: 78 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px", animation: "fadeUp 0.35s ease" }} key={tab}>
          {tab === "Home" && <Home setTab={setTab} />}
          {tab === "Resume" && <Resume />}
          {tab === "Market" && <Market />}
          {tab === "Roadmap" && <Roadmap />}
          {tab === "Interview" && <Interview />}
        </div>
      </div>
    </div>
  );
}
