import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, ChevronDown, CheckCircle2, XCircle, Loader2, Terminal, FileText, AlertTriangle, Sun, Moon, GripVertical, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

const LANGUAGE_MAP = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  c: "C",
  java: "Java",
  typescript: "TypeScript",
  go: "Go",
  rust: "Rust",
};

const DEFAULT_BOILERPLATES = {
  javascript: `// Write your JavaScript code here\nconsole.log("Hello World");`,
  python: `# Write your Python code here\nprint("Hello World")`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    cout << "Hello World" << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    printf("Hello World\\n");\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n        System.out.println("Hello World");\n    }\n}`,
};

const formatLanguageName = (lang) => LANGUAGE_MAP[lang] || lang.toUpperCase();

/* ─── Skeleton Loading Placeholder ─── */
const SkeletonLoader = () => (
  <div className="p-5 space-y-6 animate-pulse">
    {/* Status skeleton */}
    <div className="h-6 w-36 bg-gray-200 rounded-lg" />
    {/* Case tabs skeleton */}
    <div className="flex gap-2">
      <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      <div className="h-9 w-20 bg-gray-200 rounded-lg" />
      <div className="h-9 w-20 bg-gray-200 rounded-lg" />
    </div>
    {/* Input skeleton */}
    <div className="space-y-2">
      <div className="h-4 w-14 bg-gray-100 rounded" />
      <div className="h-12 w-full bg-gray-100 rounded-lg" />
    </div>
    {/* Output skeleton */}
    <div className="space-y-2">
      <div className="h-4 w-16 bg-gray-100 rounded" />
      <div className="h-12 w-full bg-gray-100 rounded-lg" />
    </div>
    {/* Expected skeleton */}
    <div className="space-y-2">
      <div className="h-4 w-20 bg-gray-100 rounded" />
      <div className="h-12 w-full bg-gray-100 rounded-lg" />
    </div>
  </div>
);

/* ─── Error Display (Compile / Runtime) ─── */
const ErrorDisplay = ({ results }) => {
  // Check if there's a compile or runtime error from the first result
  const firstResult = results?.[0];
  const compileError = firstResult?.compileOutput;
  const runtimeError = firstResult?.runError;
  const errorMsg = compileError || runtimeError;
  const errorType = compileError ? "Compile Error" : "Runtime Error";

  if (!errorMsg) return null;

  return (
    <div className="p-5">
      <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        {errorType}
      </h3>
      <div className="bg-red-950/10 border border-red-200 rounded-xl p-4 overflow-x-auto">
        <pre className="text-red-600 font-mono text-sm whitespace-pre-wrap leading-relaxed">
          {errorMsg}
        </pre>
      </div>
    </div>
  );
};

/* ─── Test Result Panel ─── */
const TestResultPanel = ({ results, isExecuting }) => {
  const [activeCase, setActiveCase] = useState(0);

  useEffect(() => {
    setActiveCase(0);
  }, [results]);

  if (isExecuting) return <SkeletonLoader />;
  if (!results || results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <Terminal className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Use the Run Code button to execute your code.</p>
        <p className="text-xs mt-1 text-gray-300">Results will appear here</p>
      </div>
    );
  }

  // Check if ALL results have compile/runtime errors (no actual test output)
  const hasOnlyErrors = results.every(r => 
    (r.compileOutput && r.compileOutput.trim() !== "") || 
    (r.runError && r.runError.trim() !== "" && (!r.actualOutput || r.actualOutput.trim() === ""))
  );

  if (hasOnlyErrors) {
    return <ErrorDisplay results={results} />;
  }

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  const currentResult = results[activeCase];

  return (
    <div className="p-5 h-full flex flex-col overflow-y-auto" style={{ animation: 'fadeSlideIn 0.35s ease-out' }}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className={`text-lg font-bold ${allPassed ? 'text-emerald-600' : 'text-red-600'}`}>
            {allPassed ? 'Accepted' : 'Wrong Answer'}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {passedCount}/{results.length} passed
        </span>
      </div>

      {/* Case Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {results.map((res, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCase(idx)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeCase === idx
                ? res.passed
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              res.passed ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            Case {idx + 1}
          </button>
        ))}
      </div>

      {/* Active Case Details */}
      {currentResult && (
        <div className="space-y-4 flex-1" style={{ animation: 'fadeSlideIn 0.25s ease-out' }}>
          {/* Input */}
          {currentResult.input && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Input</label>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{currentResult.input}</pre>
              </div>
            </div>
          )}

          {/* Your Output */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Output</label>
            <div className={`border rounded-lg p-3 ${
              currentResult.passed === false
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <pre className={`text-sm font-mono whitespace-pre-wrap ${
                currentResult.passed === false ? 'text-red-700' : 'text-gray-800'
              }`}>
                {currentResult.actualOutput || "No output"}
              </pre>
            </div>
          </div>

          {/* Expected Output */}
          {currentResult.expectedOutput && currentResult.expectedOutput.trim() !== "" && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Expected</label>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{currentResult.expectedOutput}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CodeEditorWorkspace = ({
  question,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  isExecuting,
  runResult,
}) => {
  const [activeTab, setActiveTab] = useState("description");
  const [editorTheme, setEditorTheme] = useState("light");
  const [leftWidth, setLeftWidth] = useState(45);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to Description tab when navigating to a new question
  useEffect(() => {
    setActiveTab("description");
  }, [question?._id]);
  
  const coding = question.coding || {};
  const executionMode = coding.executionMode || "standard";
  
  const rawStarterCode = coding.starterCode?.find(s => s.language === language)?.code || DEFAULT_BOILERPLATES[language] || "";
  
  let preSignature = "";
  let postSignature = "";
  let defaultBody = "";
  let isFunctionMode = false;

  if (executionMode === "function" && rawStarterCode.includes("{{STUDENT_BODY}}")) {
    isFunctionMode = true;
    const parts = rawStarterCode.split("{{STUDENT_BODY}}");
    preSignature = parts[0];
    postSignature = parts[1] || "";
    defaultBody = "\n    // Write your code here\n";
  } else {
    defaultBody = rawStarterCode;
  }

  const displayCode = code !== undefined ? code : defaultBody;

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResetConfirm(true);
  };

  const confirmResetCode = () => {
    onCodeChange(defaultBody);
    setShowResetConfirm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("FRONTEND DEBUG LOG - CodeEditorWorkspace Run Code:", {
      executionMode,
      language,
      code
    });
    setActiveTab('result');
    onRunCode(); // No custom input - uses predefined test cases
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const handleMouseMove = (moveEvent) => {
      const container = document.getElementById("workspace-container");
      if (!container) return;
      const delta = moveEvent.clientX - startX;
      const deltaPercent = (delta / container.offsetWidth) * 100;
      const newWidth = Math.min(Math.max(startWidth + deltaPercent, 20), 80);
      setLeftWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = 'default';
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <>
      {/* Inline keyframe styles */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div id="workspace-container" className="flex h-full min-h-[600px] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {/* ──── Left Panel: Description & Test Results ──── */}
        <div style={{ width: `${leftWidth}%` }} className="flex flex-col border-r border-gray-200 bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'description'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setActiveTab('description')}
            >
              <FileText className="w-4 h-4" />
              Description
              {activeTab === 'description' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t" />
              )}
            </button>
            <button
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'result'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setActiveTab('result')}
            >
              <Terminal className="w-4 h-4" />
              Test Result
              {/* Show dot indicator when results are available */}
              {runResult && runResult.length > 0 && activeTab !== 'result' && (
                <span className={`w-2 h-2 rounded-full ${
                  runResult.every(r => r.passed) ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
              )}
              {activeTab === 'result' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'description' && (
              <div className="p-5 prose prose-sm max-w-none text-gray-800">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{coding.title}</h2>
                <ReactMarkdown>{coding.description || ""}</ReactMarkdown>

                {/* Function Parameters */}
                {coding.functionParams && coding.functionParams.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold mb-3 text-gray-900">Parameters</h3>
                    <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 space-y-2">
                      {coding.functionParams.map((param, idx) => (
                        <div key={idx} className="flex items-baseline gap-2">
                          <code className="text-sm font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-mono">{param.name}</code>
                          {param.description && (
                            <>
                              <span className="text-gray-300">—</span>
                              <span className="text-sm text-gray-600">{param.description}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Examples (no test cases, just illustrative examples) */}
                {coding.examples && coding.examples.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-base font-bold mb-3 text-gray-900">Examples</h3>
                    {coding.examples.map((ex, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-xl mb-4 font-mono text-sm border border-gray-100">
                        <div className="mb-2">
                          <strong className="text-gray-500 font-sans text-xs uppercase tracking-wider block mb-1">Input:</strong>
                          <span className="text-gray-800">{ex.input}</span>
                        </div>
                        <div className="mb-2">
                          <strong className="text-gray-500 font-sans text-xs uppercase tracking-wider block mb-1">Output:</strong>
                          <span className="text-gray-800">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div>
                            <strong className="text-gray-500 font-sans text-xs uppercase tracking-wider block mb-1">Explanation:</strong>
                            <span className="text-gray-600 font-sans text-sm">{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {coding.constraints && coding.constraints.length > 0 && coding.constraints.some(c => c.trim() !== '') && (
                  <div className="mt-6 mb-8">
                    <h3 className="text-base font-bold mb-3 text-gray-900">Constraints</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {coding.constraints.filter(c => c.trim() !== '').map((c, idx) => (
                        <li key={idx} className="font-mono text-sm bg-gray-50 px-2 py-1 rounded inline-block text-gray-700 border border-gray-100">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'result' && (
              <TestResultPanel 
                results={runResult} 
                isExecuting={isExecuting} 
              />
            )}
          </div>
        </div>

        {/* ──── Resizer ──── */}
        <div 
          onMouseDown={handleMouseDown}
          className="w-1.5 bg-gray-100 hover:bg-gray-300 hover:w-2 transition-all cursor-col-resize flex flex-col items-center justify-center shrink-0 z-10 relative group border-l border-gray-200"
          title="Drag to resize panels"
        >
          <GripVertical className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute" />
        </div>

        {/* ──── Right Panel: Code Editor ──── */}
        <div style={{ width: `calc(${100 - leftWidth}% - 6px)` }} className={`flex flex-col ${editorTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
          {/* Editor Header */}
          <div className={`flex items-center justify-between px-4 py-2.5 border-b ${editorTheme === 'dark' ? 'bg-[#252526] border-[#3C3C3C]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${editorTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Code</span>
              <div className={`w-px h-4 ${editorTheme === 'dark' ? 'bg-[#3C3C3C]' : 'bg-gray-300'}`} />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className={`flex items-center gap-2 text-xs pl-3 pr-2 py-1.5 rounded-md outline-none cursor-pointer transition-colors font-medium border ${
                    editorTheme === 'dark' 
                      ? 'bg-[#3C3C3C] text-gray-200 border-[#4D4D4D] hover:bg-[#4D4D4D]' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {formatLanguageName(language)}
                  <ChevronDown className={`w-3.5 h-3.5 ${editorTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
                
                {isLangDropdownOpen && (
                  <div className={`absolute top-full mt-1 left-0 min-w-[120px] rounded-lg shadow-lg border z-50 overflow-hidden ${
                    editorTheme === 'dark' ? 'bg-[#2D2D2D] border-[#4D4D4D] shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'
                  }`}>
                    {(coding.allowedLanguages || ["javascript"]).map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          onLanguageChange(lang);
                          setIsLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          editorTheme === 'dark'
                            ? `hover:bg-[#3C3C3C] text-gray-200 ${language === lang ? 'bg-[#4D4D4D]' : ''}`
                            : `hover:bg-gray-50 text-gray-700 ${language === lang ? 'bg-indigo-50 text-indigo-700 font-bold' : ''}`
                        }`}
                      >
                        {formatLanguageName(lang)}
                        {language === lang && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setEditorTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  editorTheme === 'dark'
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-[#3C3C3C]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
                title={editorTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              >
                {editorTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              <button 
                type="button"
                onClick={handleResetCode}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  editorTheme === 'dark'
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-[#3C3C3C]'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                }`}
                title="Reset to starter code"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isExecuting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-emerald-900/20 active:scale-[0.97]"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col">
            {isFunctionMode && preSignature && (
              <div className={`px-4 pt-4 pb-2 ${editorTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                <pre className={`font-mono text-[14px] leading-[1.5] opacity-60 whitespace-pre-wrap select-none ${editorTheme === 'dark' ? 'text-[#D4D4D4]' : 'text-gray-600'}`}>
                  {preSignature.trimEnd()}
                </pre>
              </div>
            )}
            <div className="flex-1">
              <Editor
                height="100%"
                language={language}
                theme={editorTheme === 'dark' ? 'vs-dark' : 'light'}
                value={displayCode}
                onChange={val => onCodeChange(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: isFunctionMode ? 4 : 16, bottom: isFunctionMode ? 4 : 16 },
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  folding: true,
                  renderLineHighlight: 'none',
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                }}
              />
            </div>
            {isFunctionMode && postSignature && (
              <div className={`px-4 pt-2 pb-4 ${editorTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'}`}>
                <pre className={`font-mono text-[14px] leading-[1.5] opacity-60 whitespace-pre-wrap select-none ${editorTheme === 'dark' ? 'text-[#D4D4D4]' : 'text-gray-600'}`}>
                  {postSignature.trimStart()}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-[fadeSlideIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Reset Code?</h3>
                <p className="text-sm text-gray-500">This will clear your current code</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">Your code will be reset to the starter template. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetCode}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                Reset Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CodeEditorWorkspace;
