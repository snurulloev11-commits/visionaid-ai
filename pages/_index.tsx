import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Bot, Camera, Check, CheckCircle2, CircleHelp,
  Clipboard, Droplets, ExternalLink, Leaf, MapPin, Phone, Recycle, ScanLine, Send,
  ShieldAlert, Sparkles, Sprout, Trash2, Wind
} from "lucide-react";
import { Button } from "../components/Button";
import { FileDropzone } from "../components/FileDropzone";
import { Textarea } from "../components/Textarea";
import { postAnalyze } from "../endpoints/analyze_POST.schema";
import { postAsk } from "../endpoints/ask_POST.schema";
import styles from "./_index.module.css";

type Finding = {
  label: string;
  risk: "Low" | "Moderate" | "High";
  urgency: "Monitor" | "Soon" | "Urgent";
  confidence: string;
  summary: string;
  whyItMatters: string;
  evidence: string[];
  environmentalImpact: string[];
  humanImpact: string[];
  likelyCauses: string[];
  actions: string[];
  avoid: string[];
  prevention: string[];
  shouldReport: boolean;
  reportReason: string;
};

type QA = {
  question: string;
  answer: string;
};

async function compressImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not decode image"));
    element.src = source;
  });

  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

const pilotCases = [
  {
    place: "Dushanbe • Riverbank pilot scenario",
    title: "Plastic waste near urban water",
    icon: Droplets,
    issue: "Water + solid waste",
    action: "Map hotspot → organize safe cleanup → report recurring source",
    metric: "3-step response plan"
  },
  {
    place: "Dushanbe • Street pilot scenario",
    title: "Overflowing mixed waste",
    icon: Trash2,
    issue: "Illegal dumping",
    action: "Photo evidence → classify → route to sanitation response",
    metric: "< 60 sec assessment"
  },
  {
    place: "Dushanbe • Residential pilot scenario",
    title: "Smoke from open waste burning",
    icon: Wind,
    issue: "Local air pollution",
    action: "Identify source → safety guidance → alternative disposal",
    metric: "Actionable guidance"
  }
];

export default function EcoScanHome() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Finding | null>(null);
  const [scanning, setScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [analysisImageData, setAnalysisImageData] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [qa, setQa] = useState<QA[]>([]);

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return file.name + " • " + (file.size / 1024 / 1024).toFixed(1) + " MB";
  }, [file]);

  const onFilesSelected = (files: File[]) => {
    const next = files[0];
    if (!next) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setResult(null);
    setAiError(null);
    setCopied(false);
    setAnalysisImageData(null);
    setQuestion("");
    setChatError(null);
    setQa([]);
  };

  const runPrototypeScan = async () => {
    if (!file) return;
    setScanning(true);
    setResult(null);
    setAiError(null);
    setCopied(false);
    try {
      const imageData = await compressImage(file);
      setAnalysisImageData(imageData);
      const response = await postAnalyze({ imageData, fileName: file.name });
      setResult(response.result);
      window.location.hash = "result";
    } catch (error) {
      const typed = error as Error & { code?: string };
      if (typed.code !== "OUT_OF_CREDITS") {
        setAiError(typed.message || "Could not analyze this photo.");
      }
      console.warn("EcoScan analysis failed", error);
    } finally {
      setScanning(false);
    }
  };

  const copyReport = async () => {
    if (!result) return;
    const report = [
      "EcoScan environmental report",
      "Location: Dushanbe, Tajikistan",
      "Issue: " + result.label,
      "Risk: " + result.risk,
      "Observation: " + result.summary,
      "Why it matters: " + result.whyItMatters,
      "Visible evidence: " + result.evidence.join("; "),
      "Recommended actions:",
      ...result.actions.map((action, index) => (index + 1) + ". " + action),
    ].join("\n");
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const askEcoScan = async (preset?: string) => {
    const nextQuestion = (preset ?? question).trim();
    if (!result || !analysisImageData || !nextQuestion || asking) return;

    setAsking(true);
    setChatError(null);
    try {
      const recentHistory = qa
        .slice(-4)
        .map((item) => "User: " + item.question + "\nEcoScan: " + item.answer)
        .join("\n\n");

      const response = await postAsk({
        question: nextQuestion,
        imageData: analysisImageData,
        scanContext: JSON.stringify(result),
        recentHistory,
      });

      setQa((current) => [
        ...current,
        { question: nextQuestion, answer: response.answer },
      ]);
      setQuestion("");
    } catch (error) {
      const typed = error as Error & { code?: string };
      if (typed.code !== "OUT_OF_CREDITS") {
        setChatError(typed.message || "The EcoScan assistant could not answer.");
      }
      console.warn("EcoScan assistant failed", error);
    } finally {
      setAsking(false);
    }
  };

  const scrollToScan = () => {
    document.getElementById("scan")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#home" aria-label="EcoScan home">
          <span className={styles.brandMark}><Leaf size={18} /></span>
          <span>EcoScan</span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#scan">Scan</a>
          <a href="#result">Result</a>
          <a href="#impact">Impact</a>
        </nav>
        <span className={styles.prototypeBadge}>IYEC prototype</span>
      </header>

      <section className={styles.hero} id="home">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <ScanLine size={15} />
            Environmental evidence, made actionable
          </div>
          <h1>Turn one photo into a clearer environmental response.</h1>
          <p className={styles.heroLead}>
            EcoScan is a student-built prototype that helps people document visible
            environmental problems, understand the risk, and take a practical next step.
          </p>
          <div className={styles.heroActions}>
            <Button size="lg" onClick={scrollToScan}>
              Try the prototype <ArrowRight size={17} />
            </Button>
            <a className={styles.textLink} href="#impact">See pilot scenarios</a>
          </div>
          <div className={styles.heroStats}>
            <div><strong>01</strong><span>Upload evidence</span></div>
            <div><strong>02</strong><span>Classify the issue</span></div>
            <div><strong>03</strong><span>Act locally</span></div>
          </div>
        </div>

        <div className={styles.heroPanel} aria-label="EcoScan process">
          <div className={styles.panelTopline}>
            <span>FIELD SCAN / 001</span>
            <span className={styles.liveDot}>prototype</span>
          </div>
          <div className={styles.radar}>
            <span className={styles.radarRingOne} />
            <span className={styles.radarRingTwo} />
            <span className={styles.radarCore}><Leaf size={34} /></span>
          </div>
          <div className={styles.signalGrid}>
            <div><span>Input</span><strong>Photo evidence</strong></div>
            <div><span>Output</span><strong>Issue + risk + actions</strong></div>
            <div><span>Focus</span><strong>Urban environment</strong></div>
            <div><span>Pilot city</span><strong>Dushanbe, Tajikistan</strong></div>
          </div>
        </div>
      </section>

      <section className={styles.problemSection}>
        <div className={styles.sectionLabel}>Why EcoScan</div>
        <div className={styles.problemGrid}>
          <h2>Environmental problems are visible. The next action often is not.</h2>
          <div className={styles.problemText}>
            <p>
              A photo can capture illegal dumping, polluted water or smoke in seconds,
              but people may not know how serious the issue is, what evidence matters,
              or what to do next.
            </p>
            <p>
              EcoScan turns that first observation into a structured report and a short,
              safety-first action plan.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.scanSection} id="scan">
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionLabel}>Prototype scan</div>
            <h2>Upload one environmental photo.</h2>
          </div>
          <p>
            JPG or PNG, up to 10 MB. EcoScan uses image AI to inspect visible
            environmental evidence and turn it into practical next steps.
          </p>
        </div>

        <div className={styles.scanGrid}>
          <div className={styles.uploadCard}>
            <FileDropzone
              icon={<Camera size={38} />}
              title="Drop a field photo here"
              subtitle="JPG or PNG • one image • max 10 MB"
              accept=".jpg,.jpeg,.png"
              maxSize={10 * 1024 * 1024}
              onFilesSelected={onFilesSelected}
            />
            {file && (
              <div className={styles.fileRow}>
                <CheckCircle2 size={17} />
                <span>{fileMeta}</span>
              </div>
            )}
            <Button
              size="lg"
              disabled={!file || scanning}
              onClick={runPrototypeScan}
              className={styles.scanButton}
            >
              {scanning ? "Analyzing photo…" : "Run AI analysis"}
              <ScanLine size={17} />
            </Button>
            {aiError && <div className={styles.aiError}>{aiError}</div>}
          </div>

          <div className={styles.previewCard}>
            {previewUrl ? (
              <img src={previewUrl} alt="Uploaded environmental evidence preview" />
            ) : (
              <div className={styles.emptyPreview}>
                <Camera size={34} />
                <span>Your field photo will appear here.</span>
              </div>
            )}
            <div className={styles.previewFooter}>
              <span>Evidence preview</span>
              <span>{file ? "ready" : "waiting"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.resultSection} id="result">
        <div className={styles.sectionLabel}>Result</div>
        {!result ? (
          <div className={styles.resultPlaceholder}>
            <ShieldAlert size={25} />
            <div>
              <h3>No scan result yet.</h3>
              <p>Upload a photo above and run the prototype analysis.</p>
            </div>
          </div>
        ) : (
          <div className={styles.resultCard}>
            <div className={styles.resultSummary}>
              <div className={styles.resultMeta}>
                <span className={styles.categoryChip}>{result.label}</span>
                <span className={styles.riskChip}>{result.risk} risk</span>
              </div>
              <h2>{result.label}</h2>
              <p>{result.summary}</p>
              {result.evidence.length > 0 && (
                <div className={styles.evidenceList}>
                  <span>What the AI can see</span>
                  <ul>
                    {result.evidence.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              <div className={styles.prototypeNote}>
                <Sparkles size={16} />
                {result.confidence} — AI visual assessment. Verify local conditions before acting.
              </div>
            </div>
            <div className={styles.actionPanel}>
              <span className={styles.actionTitle}>Recommended next actions</span>
              <ol>
                {result.actions.map((action) => <li key={action}>{action}</li>)}
              </ol>
              <div className={styles.reportBox}>
                <div className={styles.reportMeta}>
                  <strong>{result.shouldReport ? "Better to report this issue" : "Want someone else to handle it?"}</strong>
                  <span>{result.reportReason}</span>
                </div>
                <a className={styles.callButton} href="tel:+992372210163">
                  <Phone size={16} />
                  Call Environmental Protection • +992 37 221-01-63
                </a>
                <Button variant="secondary" size="md" onClick={copyReport} className={styles.copyButton}>
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  {copied ? "Report copied" : "Copy ready-made report"}
                </Button>
                <a
                  className={styles.officialLink}
                  href="https://www.dushanbe.tj/public/structure"
                  target="_blank"
                  rel="noreferrer"
                >
                  Official Dushanbe city directory <ExternalLink size={13} />
                </a>
              </div>
            </div>
            <div className={styles.fullDetails}>
              <div className={styles.detailsHeading}>
                <div>
                  <span className={styles.actionTitle}>Detailed scan information</span>
                  <h3>Understand the problem before deciding what to do.</h3>
                </div>
                <span className={styles.urgencyBadge}>{result.urgency}</span>
              </div>

              <div className={styles.insightGrid}>
                <article className={styles.insightCard}>
                  <CircleHelp size={18} />
                  <h4>Why this is a problem</h4>
                  <p>{result.whyItMatters}</p>
                </article>

                <article className={styles.insightCard}>
                  <Sprout size={18} />
                  <h4>Environmental impact</h4>
                  <ul>
                    {result.environmentalImpact.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className={styles.insightCard}>
                  <Activity size={18} />
                  <h4>People & local safety</h4>
                  <ul>
                    {result.humanImpact.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className={styles.insightCard}>
                  <Sparkles size={18} />
                  <h4>Possible causes</h4>
                  <ul>
                    {result.likelyCauses.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className={styles.insightCard}>
                  <AlertTriangle size={18} />
                  <h4>What not to do</h4>
                  <ul>
                    {result.avoid.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>

                <article className={styles.insightCard}>
                  <Recycle size={18} />
                  <h4>How to prevent it</h4>
                  <ul>
                    {result.prevention.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              </div>

              <div className={styles.assistantPanel}>
                <div className={styles.assistantHeader}>
                  <span className={styles.assistantIcon}><Bot size={19} /></span>
                  <div>
                    <strong>Ask EcoScan about this photo</strong>
                    <span>The assistant sees the same image and scan data.</span>
                  </div>
                </div>

                <div className={styles.quickQuestions}>
                  {[
                    "Why is this harmful?",
                    "Is it safe to touch?",
                    "What should I do first?",
                    "How can this be prevented?",
                    "Should I report this?",
                  ].map((item) => (
                    <button key={item} type="button" onClick={() => askEcoScan(item)}>
                      {item}
                    </button>
                  ))}
                </div>

                {qa.length > 0 && (
                  <div className={styles.qaList}>
                    {qa.map((item, index) => (
                      <div className={styles.qaItem} key={item.question + index}>
                        <div className={styles.userQuestion}>{item.question}</div>
                        <div className={styles.aiAnswer}>
                          <Bot size={15} />
                          <p>{item.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.askComposer}>
                  <Textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask anything about this environmental issue…"
                    rows={3}
                    disabled={asking}
                  />
                  <Button
                    size="lg"
                    onClick={() => askEcoScan()}
                    disabled={!question.trim() || asking}
                  >
                    {asking ? "Thinking…" : "Ask EcoScan"} <Send size={16} />
                  </Button>
                </div>
                {chatError && <div className={styles.aiError}>{chatError}</div>}
                <p className={styles.assistantNote}>
                  EcoScan can explain visible environmental risks and practical next steps,
                  but it does not replace an on-site professional assessment.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={styles.impactSection} id="impact">
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionLabel}>Impact</div>
            <h2>Designed for field testing in Dushanbe.</h2>
          </div>
          <p>
            These are pilot scenarios for testing the workflow — not claims of measured
            environmental incidents.
          </p>
        </div>

        <div className={styles.caseGrid}>
          {pilotCases.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className={styles.caseCard} key={item.title}>
                <div className={styles.caseTop}>
                  <span className={styles.caseNumber}>{"0" + (index + 1)}</span>
                  <Icon size={21} />
                </div>
                <div className={styles.casePlace}><MapPin size={14} /> {item.place}</div>
                <h3>{item.title}</h3>
                <dl>
                  <div><dt>Issue</dt><dd>{item.issue}</dd></div>
                  <div><dt>Response</dt><dd>{item.action}</dd></div>
                  <div><dt>Goal</dt><dd>{item.metric}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.howSection}>
        <div className={styles.sectionLabel}>How it works</div>
        <div className={styles.howGrid}>
          <div>
            <span>01</span>
            <Camera size={22} />
            <h3>Document</h3>
            <p>Capture one clear photo of a visible environmental problem.</p>
          </div>
          <div>
            <span>02</span>
            <ScanLine size={22} />
            <h3>Understand</h3>
            <p>Classify the issue and translate it into plain-language risk information.</p>
          </div>
          <div>
            <span>03</span>
            <Recycle size={22} />
            <h3>Respond</h3>
            <p>Get specific, safety-first actions that can be taken locally.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark}><Leaf size={18} /></span>
          <div>
            <strong>EcoScan</strong>
            <span>Student environmental technology prototype</span>
          </div>
        </div>
        <p>
          Built for the International Youth Environmental Challenge • Dushanbe, Tajikistan • 2026
        </p>
      </footer>
    </main>
  );
}

