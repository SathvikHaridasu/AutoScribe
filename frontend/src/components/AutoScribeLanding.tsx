import React, { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check, Download, Zap, Keyboard, Shield, Clock, Cog, Pause, Play, StopCircle, Globe2, MousePointer2, Cpu, Gauge, Github, Terminal } from "lucide-react";

// --- Helper Components ---
const Glow = ({ className = "" }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
    <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400/30 via-fuchsia-500/20 to-purple-500/30 blur-3xl" />
    <div className="absolute -bottom-24 right-1/2 h-72 w-[30rem] translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/30 via-cyan-400/20 to-emerald-400/30 blur-3xl" />
  </div>
);

const GridBG = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-b from-black via-slate-950 to-black">
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  </div>
);

const Tilt = ({ children }: { children: React.ReactNode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [ -20, 20 ], [ 10, -10 ]);
  const rotateY = useTransform(x, [ -20, 20 ], [ -10, 10 ]);

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 40 - 20;
        const py = ((e.clientY - rect.top) / rect.height) * 40 - 20;
        x.set(px); y.set(py);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="transition will-change-transform"
    >
      {children}
    </motion.div>
  );
};

const useOS = () => {
  const [os, setOs] = useState("windows");
  useEffect(() => {
    const p = navigator.platform?.toLowerCase() || "";
    if (/mac|iphone|ipad|darwin/.test(p)) setOs("mac");
    else if (/linux|x11/.test(p)) setOs("linux");
    else setOs("windows");
  }, []);
  return os;
};

const CopyButton = ({ text, label = "Copy" }: { text: string; label?: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <Button
      variant="secondary"
      className="rounded-xl"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {}
      }}
    >
      <Terminal className="mr-2 h-4 w-4" /> {ok ? "Copied" : label}
    </Button>
  );
};

// --- Main Page ---
export default function AutoScribeLanding() {
  const os = useOS();
  const variants = {
    hidden: { opacity: 0, y: 20 },
    show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: 0.1 * i, duration: 0.6, ease: "easeOut" } }),
  };

  const downloads = useMemo(() => ({
    windows: { label: "Download for Windows", file: "#", note: "AutoScribe-Setup.exe" },
    mac: { label: "Download for macOS", file: "#", note: "AutoScribe.dmg" },
    linux: { label: "Download for Linux", file: "#", note: "autoscribe.AppImage" },
  }), []);

  const primary = downloads[os as keyof typeof downloads];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-slate-100">
      <GridBG />
      <Glow />

      {/* NAV */}
      <motion.nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="relative">
            <motion.span
              className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-fuchsia-500/30 blur-xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <Keyboard className="h-7 w-7" />
          </div>
          <span className="font-semibold tracking-wide">AutoScribe</span>
          <Badge variant="secondary" className="ml-2">v1.0</Badge>
        </motion.div>
        <div className="hidden gap-2 sm:flex">
          <Button variant="ghost" className="rounded-xl">Features</Button>
          <Button variant="ghost" className="rounded-xl">Install</Button>
          <Button variant="ghost" className="rounded-xl">Usage</Button>
          <Button variant="ghost" className="rounded-xl">FAQ</Button>
          <Button className="rounded-xl">Get {primary.label.replace("Download for ", "")}</Button>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="relative mx-auto mt-6 w-full max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/60 p-1">
          <div className="relative rounded-[1.4rem] bg-black/40 p-10">
            <Glow />
            <div className="grid items-center gap-10 md:grid-cols-2">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true }}>
                <motion.h1 custom={0} variants={variants} className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                  Type at the speed of <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">thought</span>.
                </motion.h1>
                <motion.p custom={1} variants={variants} className="mt-4 max-w-prose text-slate-300/90">
                  AutoScribe is a desktop tool that simulates real keyboard input across any app—perfect for testing, demos, and vaporizing repetitive typing.
                </motion.p>
                <motion.div custom={2} variants={variants} className="mt-6 flex flex-wrap items-center gap-3">
                  <Button asChild className="rounded-2xl px-5 py-6 text-base">
                    <a href={primary.file} download>
                      <Download className="mr-2 h-5 w-5" /> {primary.label}
                    </a>
                  </Button>
                  <Button variant="secondary" asChild className="rounded-2xl px-5 py-6 text-base">
                    <a href="#install"><Terminal className="mr-2 h-5 w-5" /> Install via Python</a>
                  </Button>
                  <Badge variant="outline" className="rounded-xl border-white/20 bg-white/5">No browser extension. Native app.</Badge>
                </motion.div>
                <motion.div custom={3} variants={variants} className="mt-4 flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2"><Gauge className="h-4 w-4" />1–200 WPM</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" />Human-like delays</div>
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4" />Emergency stop</div>
                </motion.div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <Tilt>
                  <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-black p-6 shadow-2xl">
                    <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" />
                    <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-300"><Globe2 className="h-4 w-4" /> Target: Any App</div>
                        <Badge className="rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white">Live</Badge>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-sm text-slate-200">
                        <TypingPreview />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                        <FeatureChip icon={<Zap className="h-3.5 w-3.5" />} label="Global Hotkeys" />
                        <FeatureChip icon={<Cpu className="h-3.5 w-3.5" />} label="System-Level Events" />
                        <FeatureChip icon={<MousePointer2 className="h-3.5 w-3.5" />} label="Corner Kill-Switch" />
                      </div>
                    </div>
                  </div>
                </Tilt>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section id="features" className="mx-auto mt-20 w-full max-w-7xl px-6">
        <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Engineered for power, tuned for safety
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FCard icon={<Keyboard />} title="Real Keyboard Simulation" desc="System-level key events for rock-solid input in any app." />
          <FCard icon={<Gauge />} title="Adjustable Speed" desc="Dial from 1–200 WPM and keep it silky smooth." />
          <FCard icon={<Zap />} title="Human-like Typing" desc="Randomized delays and rhythm to mimic real users." />
          <FCard icon={<Shield />} title="Safety First" desc="Global stop hotkey + mouse-to-corner emergency brake." />
          <FCard icon={<Cog />} title="Global Hotkeys" desc="Start / Stop / Pause / Resume from anywhere." />
          <FCard icon={<Globe2 />} title="Universal Compatibility" desc="Works with Docs, Word, Notepad—anything that accepts keys." />
        </div>
      </section>

      {/* INSTALL */}
      <section id="install" className="mx-auto mt-20 w-full max-w-7xl px-6">
        <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Install in two ways
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Direct Download</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Grab the native installer for your OS and you're off to the races.</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className={`rounded-xl ${os === "windows" ? "ring-2 ring-cyan-400/60" : ""}`}>
                  <a href={downloads.windows.file} download>Windows (.exe)</a>
                </Button>
                <Button asChild className={`rounded-xl ${os === "mac" ? "ring-2 ring-cyan-400/60" : ""}`}>
                  <a href={downloads.mac.file} download>macOS (.dmg)</a>
                </Button>
                <Button asChild className={`rounded-xl ${os === "linux" ? "ring-2 ring-cyan-400/60" : ""}`}>
                  <a href={downloads.linux.file} download>Linux (.AppImage)</a>
                </Button>
              </div>
              <ul className="mt-2 space-y-2 text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Recommended for most users</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Code signing & standard system prompts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" /> Python (dev) Install</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Prefer source? Install requirements and run directly.</p>
              <div className="rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs">
{`# Requirements\nPython 3.x\npip install pyautogui keyboard\n\n# Run\npython autoscribe.py`}
              </div>
              <div className="flex gap-3">
                <CopyButton text={`pip install pyautogui keyboard`} label="Copy pip install" />
                <CopyButton text={`python autoscribe.py`} label="Copy run command" />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Github className="h-4 w-4" />
                <span>Clone the repo or download the source zip.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* USAGE */}
      <section id="usage" className="mx-auto mt-20 w-full max-w-7xl px-6">
        <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Zero to typing in 7 steps
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Play />, t: "Launch AutoScribe", d: "Open the desktop app." },
            { icon: <Keyboard />, t: "Paste your text", d: "Or type directly into the editor." },
            { icon: <Gauge />, t: "Set WPM", d: "From 1 to 200 words per minute." },
            { icon: <Clock />, t: "Set countdown", d: "Time to switch to your target window." },
            { icon: <Play />, t: "Start (F6)", d: "Begin the typing sequence." },
            { icon: <MousePointer2 />, t: "Switch app", d: "Focus the window where text should go." },
            { icon: <Zap />, t: "Watch it type", d: "Human-like rhythm, real key events." },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="group rounded-2xl border-white/10 bg-white/5 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <span className="grid h-9 w-9 place-content-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 text-slate-100">
                      {s.icon}
                    </span>
                    {s.t}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">{s.d}</CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOTKEYS & SAFETY */}
      <section id="hotkeys" className="mx-auto mt-20 w-full max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Default Hotkeys</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <Hotkey k="F6" label="Start typing" />
              <Hotkey k="F7" label="Stop typing" icon={<StopCircle className="h-4 w-4" />} />
              <Hotkey k="F8" label="Pause / Resume" icon={<Pause className="h-4 w-4" />} />
              <div className="col-span-full text-xs text-slate-400">Hotkeys are customizable in <em>Settings</em>.</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Safety Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-300">
                <LI>Move mouse to any screen corner to force-stop typing</LI>
                <LI>Global stop hotkey (F7) works at any time</LI>
                <LI>Configurable start delay for safe window switching</LI>
                <LI>Pause/Resume (F8) without losing your place</LI>
                <LI>Run as admin to type into elevated windows</LI>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto my-24 w-full max-w-7xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-950/60 via-fuchsia-950/40 to-purple-950/60 p-10">
          <Glow />
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h3 className="text-2xl font-semibold">Ready to automate your typing?</h3>
              <p className="mt-1 max-w-prose text-slate-300">Download AutoScribe and reclaim your minutes. Your hands will thank you.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl">
                <a href={primary.file} download>
                  <Download className="mr-2 h-5 w-5" /> {primary.label}
                </a>
              </Button>
              <Button variant="secondary" asChild className="rounded-2xl">
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto mb-10 w-full max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400 md:flex-row">
          <div className="flex items-center gap-2 text-slate-300"><Keyboard className="h-4 w-4" /> AutoScribe</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#hotkeys" className="hover:text-slate-200">Hotkeys</a>
            <a href="#install" className="hover:text-slate-200">Install</a>
            <a href="#usage" className="hover:text-slate-200">Usage</a>
            <span className="opacity-60"> 2023 AutoScribe.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Small UI bits ---
function FCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Card className="group relative overflow-hidden rounded-2xl border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] transition">
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:scale-150" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 text-slate-100">
              {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">{desc}</CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1">
      {icon}
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  );
}

function Hotkey({ k, label, icon }: { k: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
      <kbd className="rounded-md border border-white/20 bg-white/10 px-2 py-1 font-mono text-xs text-slate-200 shadow-inner">{k}</kbd>
      <span className="text-slate-300">{label}</span>
      {icon && <span className="ml-auto text-slate-400">{icon}</span>}
    </div>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 flex-none text-cyan-400" />
      <span>{children}</span>
    </li>
  );
}

function TypingPreview() {
  const samples = [
    "Automating typing...",
    "Simulating real key events...",
    "Global hotkeys armed (F6/F7/F8)...",
    "Corner kill-switch ready...",
    "Typing like a human, faster than a human.",
  ];
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("typing");

  useEffect(() => {
    const msg = samples[idx % samples.length];
    let i = 0;
    const type = () => {
      setText(msg.slice(0, i++));
      if (i <= msg.length) {
        setTimeout(type, 24 + Math.random() * 40);
      } else {
        setPhase("pause");
        setTimeout(() => setPhase("deleting"), 900);
      }
    };
    const del = () => {
      setText((t) => t.slice(0, -1));
      if (text.length > 0) {
        setTimeout(del, 12 + Math.random() * 30);
      } else {
        setIdx((i) => i + 1);
        setPhase("typing");
      }
    };

    if (phase === "typing") type();
    if (phase === "deleting") del();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      <span>{text}</span>
      <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-slate-200/70" />
    </div>
  );
}
