"use client";

import { useState, useEffect, useRef } from "react";
import { CDNAsset } from "@/github_cdn_package/src/types";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error" | "warning" | "process";
  message: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [rateLimit, setRateLimit] = useState<{ tokens: number; percentage: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [assets, setAssets] = useState<CDNAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const scrollToConsole = () => {
    consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    fetchAssets();
    addLog("System initialized. Ready for CDN operations.", "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [...prev.slice(-49), newLog]);
  };

  const fetchAssets = async () => {
    setIsLoadingAssets(true);
    addLog("Polling registry.json from GitHub...", "process");
    try {
      const res = await fetch("/api/assets", { cache: 'no-store' });
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
        addLog(`Registry loaded. ${data.assets.length} assets mapped.`, "success");
      }
    } catch (err: unknown) {
      console.error(err);
      addLog("Failed to synchronize with asset registry.", "error");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    scrollToConsole();
    setLogs([]); // Clear for clean demo
    addLog(`Initiating Research Upload for: ${file.name}`, "info");
    addLog(`File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, "info");
    addLog("Stage 1: Inverting data stream into sequential chunks...", "process");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const startTime = Date.now();
      addLog("Stage 2: Pushing parallel blobs to GitHub Trees API (Batch: 10)...", "process");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last partial line

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);

          if (data.type === "log") {
            addLog(data.message, data.logType as LogEntry["type"]);
          } else if (data.type === "error") {
            addLog(`Upload Failed: ${data.message}`, "error");
            setIsUploading(false);
            return;
          } else if (data.type === "done") {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            const sha = data.commitSha ? data.commitSha.substring(0, 7) : "unknown";
            addLog(`Stage 3: Atomic commit verified. Hash: ${sha}`, "success");
            addLog(`Upload Completed in ${elapsed}s. Optimized throughput achieved.`, "success");
            setUploadedPath(data.folderPath);
            fetchAssets();
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog(`Critical Connection Error: ${message}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, path: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY purge "${name}" and all its physical data from GitHub?`)) return;

    setDeletingId(id);
    scrollToConsole();
    addLog(`Initiating Research Purge for: ${name}`, "warning");
    console.log("[CDN] Purging Asset:", { id, path, name });

    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, path })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown API Error" }));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);

          if (data.type === "log") {
            addLog(data.message, data.logType as LogEntry["type"]);
          } else if (data.type === "error") {
            addLog(`Purge Failed: ${data.message}`, "error");
            setDeletingId(null);
            return;
          } else if (data.type === "done") {
            addLog(`Final Status: ${data.message}`, "success");
            setAssets(prev => prev.filter(a => a.id !== id));
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog(`Purge Interrupted: ${message}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFetch = async (explicitPath?: string) => {
    const path = explicitPath || uploadedPath;
    if (!path) return;
    setIsFetching(true);
    scrollToConsole();
    setPreviewUrl("");
    addLog(`Retrieval Request: ${path}`, "info");
    addLog("Hybrid Algorithm: Racing JSDelivr/Fastly against GitHub Raw...", "process");

    try {
      const startTime = Date.now();
      const res = await fetch(`/api/fetch?file=${encodeURIComponent(path)}`);

      const statusHeader = res.headers.get("X-RateLimit-Status");
      if (statusHeader) setRateLimit(JSON.parse(statusHeader));

      if (!res.ok) {
        const err = await res.json();
        addLog(`Fetch Failure: ${err.error}`, "error");
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      setMimeType(contentType);
      addLog(`Manifest Found. MIME Type detected as: ${contentType}`, "success");
      addLog("Pipelined Streaming: Reconstructing chunks in browser memory...", "process");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      const tt = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog(`File Reconstructed. Total time: ${tt}s (TTFB optimized).`, "success");

      // Removed forced window scroll
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog(`Streaming Interrupted: ${message}`, "error");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSync = async () => {
    scrollToConsole();
    addLog("Scanning GitHub Repository for untracked manifests...", "process");
    setIsLoadingAssets(true);
    try {
      const res = await fetch("/api/admin/recover", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addLog(`History Recovery complete. ${data.recoveredCount} assets synchronized.`, "success");
        fetchAssets();
      } else {
        addLog(`Deep Scan Failed: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog(`Scan Error: ${message}`, "error");
    } finally {
      setIsLoadingAssets(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-[family-name:var(--font-geist-sans)] selection:bg-blue-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,transparent_50%)] pointer-events-none opacity-50" />

      <main className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header - Academic Style */}
        <header className="text-center space-y-4 pb-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold tracking-widest uppercase rounded-full border border-blue-500/20">
              Prototype v5.2
            </span>
            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold tracking-widest uppercase rounded-full border border-purple-500/20">
              Research Demo
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            DECENTRALIZED ASSET CDN
          </h1>
          <p className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto font-medium">
            Exploring High-Performance File Chunking and Atomic Synchronization via GitHub Infrastructure.
          </p>
        </header>

        {/* Operational Grid */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Left Column: Controls - Unified Height for Symmetry */}
          <div className="lg:col-span-5 flex flex-col gap-6 h-[570px]">

            {/* Upload Section - Flex-1 to share space */}
            <div className="flex-1 group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl hover:border-blue-500/30 transition-all duration-500 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                    Ingestion Engine
                  </h2>
                  <div className="group/info relative">
                    <span className="cursor-help w-5 h-5 flex items-center justify-center border border-zinc-700 rounded-full text-[10px] text-zinc-500 font-bold hover:bg-zinc-800">i</span>
                    <div className="absolute right-0 top-6 w-48 p-2 bg-black border border-zinc-800 rounded-lg text-[10px] text-zinc-400 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                      Uses parallelized chunking and Git Trees API for atomic commits. Ensures no data loss even on partial failure.
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative h-24 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center bg-black/20 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all cursor-pointer overflow-hidden">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <svg className="w-8 h-8 text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center px-4">
                      {file ? file.name : "Select Asset for Processing"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`w-full py-4 mt-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${isUploading
                  ? "bg-zinc-800 text-zinc-600 animate-pulse"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)] active:scale-95"
                  }`}
              >
                {isUploading ? "Analysing & Uploading..." : "Process to CDN"}
              </button>
            </div>

            {/* Metrics Section - Flex-1 to share space */}
            <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between">
              <h2 className="text-lg font-bold flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                Network Observability
              </h2>
              <div className="space-y-5">
                <div className="p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">GitHub API Tokens</span>
                    <span className={`text-xs font-mono font-bold ${rateLimit && rateLimit.tokens < 500 ? "text-red-400" : "text-emerald-400"}`}>
                      {rateLimit?.tokens ?? 5000}
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-1000"
                      style={{ width: `${rateLimit?.percentage ?? 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-black/20 rounded-xl border border-zinc-800">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase mb-1">Retrieval Latency</p>
                    <p className="text-sm font-mono font-bold text-emerald-400">Sub-Second</p>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-zinc-800">
                    <p className="text-[9px] text-zinc-600 font-bold uppercase mb-1">Asset Source</p>
                    <p className="text-sm font-mono font-bold text-blue-400">Multi-CDN</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Log Console */}
          <div className="lg:col-span-7 h-[570px] flex flex-col" ref={consoleRef}>
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                </div>
                <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Operational Console</span>
                <div className="w-8" />
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-1 font-mono">
                {logs.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 filter grayscale">
                    <p className="text-xs uppercase tracking-[0.3em]">Standby for input</p>
                  </div>
                )}
                {logs.map((log: LogEntry) => (
                  <div key={log.id} className="text-[11px] leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-zinc-600 mr-2">[{log.timestamp}]</span>
                    <span className={`
                      ${log.type === "success" ? "text-emerald-400" : ""}
                      ${log.type === "error" ? "text-red-400 font-bold" : ""}
                      ${log.type === "warning" ? "text-amber-400" : ""}
                      ${log.type === "process" ? "text-blue-400" : ""}
                      ${log.type === "info" ? "text-zinc-400" : ""}
                     uppercase tracking-tight`}>
                      {log.type === "process" ? "› " : ""}
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Reconstruction Lab - Top Feed */}
        {isFetching || previewUrl ? (
          <section className="bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl p-8 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-emerald-500/20">
                Reconstruction Lab
              </span>
              <p className="text-zinc-500 text-xs font-medium">Re-injecting Origin Headers for Cross-Platform Compatibility</p>
            </div>

            <div className="flex justify-center min-h-[200px] items-center">
              {isFetching ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-zinc-600 animate-pulse tracking-widest">DRY-RECONSTRUCTING BITSTREAM...</p>
                </div>
              ) : previewUrl && (
                <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative group/preview">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none" />
                  {mimeType.startsWith("image/") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previewUrl} className="w-full h-auto" alt="Preview" />
                  ) : mimeType.startsWith("video/") ? (
                    <video controls className="w-full aspect-video">
                      <source src={previewUrl} type={mimeType} />
                    </video>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      </div>
                      <p className="text-sm font-bold text-zinc-400">Generic Binary Stream Detected</p>
                      <a href={previewUrl} download="cdn_asset" className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">Download Reconstructed Data</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Improved Asset Library */}
        <section className="space-y-6 pt-12">
          <div className="flex justify-between items-end border-b border-zinc-800/50 pb-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-4">
                Global Registry
                <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 tracking-normal">ZERO-DB MODE</span>
              </h2>
              <p className="text-zinc-500 text-xs font-medium italic">Synchronized against repository root/registry.json</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                className="text-[10px] font-black uppercase tracking-widest bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-2 px-4 rounded-xl border border-purple-500/30 transition-all flex items-center gap-2"
              >
                Deep Sync
              </button>
              <button
                onClick={fetchAssets}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoadingAssets ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-zinc-900/20 border border-zinc-800 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/10 border-2 border-dashed border-zinc-800/40 rounded-[3rem]">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4 text-zinc-700">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z"></path></svg>
              </div>
              <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Registry Empty</p>
              <p className="text-zinc-700 text-[10px] mt-2 italic">Upload a file to initialize the atomic index.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset: CDNAsset) => (
                <div key={asset.id} className="group relative bg-zinc-900/20 border border-zinc-800/60 p-5 rounded-3xl hover:bg-zinc-900/40 hover:border-zinc-700 transition-all duration-300 shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        <h4 className="text-xs font-black uppercase tracking-wider truncate max-w-[140px] text-zinc-300" title={asset.name}>
                          {asset.name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-zinc-600 font-mono">{(asset.size / 1024 / 1024).toFixed(2)} MB • {asset.type.split('/')[1].toUpperCase()}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(asset.id, asset.path, asset.name)}
                      disabled={deletingId === asset.id}
                      className={`p-2 rounded-xl transition-all ${deletingId === asset.id
                        ? "text-amber-400 bg-amber-400/10 cursor-wait"
                        : "text-zinc-700 hover:text-red-400 hover:bg-red-400/10"
                        }`}
                    >
                      {deletingId === asset.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <button
                      onClick={() => handleFetch(asset.path)}
                      className="flex-1 bg-white hover:bg-zinc-200 text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Retrieve Asset
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://cdn.jsdelivr.net/gh/CodeFaisalDev/github_cdn@main/${asset.path}/manifest.json`;
                        navigator.clipboard.writeText(url);
                        addLog(`Link exported: ${asset.id}`, "info");
                        alert("CDN URL copied!");
                      }}
                      className="w-10 bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center rounded-xl transition-colors"
                      title="Copy Public link"
                    >
                      <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800 items-center flex justify-between">
                    <p className="text-[9px] text-zinc-700 font-mono tracking-tighter opacity-50">{asset.id}</p>
                    <span className="text-[9px] font-bold text-zinc-700 uppercase">{new Date(asset.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer Research Credits */}
        <footer className="pt-20 pb-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-4 opacity-30 grayscale hover:opacity-100 transition-all duration-700">
            <div className="h-px w-12 bg-zinc-800" />
            <span className="text-xs font-black tracking-widest uppercase">Open Research Prototype</span>
            <div className="h-px w-12 bg-zinc-800" />
          </div>
          <p className="text-[10px] text-zinc-600 font-medium max-w-lg mx-auto leading-relaxed">
            This project is part of an ongoing study into the feasibility of leveraging public source control architectures for large-scale distributed binary storage. All operations are conducted via ethical rate-limiting proxies.
          </p>
        </footer>
      </main>
    </div>
  );
}
