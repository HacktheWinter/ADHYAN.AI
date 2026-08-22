import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, AlertTriangle, CheckCircle, XCircle, ChevronDown } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("description"); // description, testcases, output
  const [customInput, setCustomInput] = useState("");
  
  const coding = question.coding || {};

  const displayCode = code !== undefined ? code : (coding.starterCode?.find(s => s.language === language)?.code || DEFAULT_BOILERPLATES[language] || "");

  const handleResetCode = () => {
    if (confirm("Are you sure you want to reset your code to the starter template?")) {
      const starter = coding.starterCode?.find(s => s.language === language)?.code;
      onCodeChange(starter || DEFAULT_BOILERPLATES[language] || "");
    }
  };

  return (
    <div className="flex h-full min-h-[600px] border border-line rounded-2xl overflow-hidden bg-surface">
      {/* Left Panel: Description & Output */}
      <div className="w-[45%] flex flex-col border-r border-line bg-paper">
        <div className="flex border-b border-line">
          <button
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'description' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-ink-soft hover:bg-gray-50'}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'output' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-ink-soft hover:bg-gray-50'}`}
            onClick={() => setActiveTab('output')}
          >
            Execution Output
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'description' && (
            <div className="prose prose-sm max-w-none text-ink">
              <h2 className="text-xl font-bold font-display text-indigo-800 mb-4">{coding.title}</h2>
              <ReactMarkdown>{coding.description || ""}</ReactMarkdown>
              
              {coding.examples && coding.examples.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-3 text-indigo-800">Examples</h3>
                  {coding.examples.map((ex, idx) => (
                    <div key={idx} className="bg-gray-100 p-4 rounded-xl mb-4 font-mono text-sm border border-gray-200 shadow-sm">
                      <div className="mb-2"><strong className="text-gray-700 font-sans text-xs uppercase tracking-wider block mb-1">Input:</strong> {ex.input}</div>
                      <div className="mb-2"><strong className="text-gray-700 font-sans text-xs uppercase tracking-wider block mb-1">Output:</strong> {ex.output}</div>
                      {ex.explanation && <div><strong className="text-gray-700 font-sans text-xs uppercase tracking-wider block mb-1">Explanation:</strong> <span className="text-gray-600 font-sans text-sm">{ex.explanation}</span></div>}
                    </div>
                  ))}
                </div>
              )}

              {coding.constraints && coding.constraints.length > 0 && coding.constraints.some(c => c.trim() !== '') && (
                <div className="mt-6 mb-8">
                  <h3 className="text-lg font-bold mb-3 text-indigo-800">Constraints</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {coding.constraints.filter(c => c.trim() !== '').map((c, idx) => (
                      <li key={idx} className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block text-gray-800 border border-gray-200">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'output' && (
            <div className="h-full flex flex-col">
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Custom Input (Optional)</label>
                <textarea 
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  className="w-full h-20 p-2 text-sm font-mono border rounded outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter input to pass to your program..."
                />
              </div>

              <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-y-auto text-gray-300 font-mono text-sm">
                {!runResult ? (
                  <div className="text-gray-500 h-full flex items-center justify-center">Run code to see output</div>
                ) : (
                  <div>
                    {runResult.map((res, i) => (
                      <div key={i} className="mb-6 pb-4 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-400">Test Case {i + 1}</span>
                          {res.passed !== undefined && (
                            res.passed ? 
                            <span className="text-green-500 flex items-center text-xs"><CheckCircle className="w-3 h-3 mr-1"/> Passed</span> : 
                            <span className="text-rose-500 flex items-center text-xs"><XCircle className="w-3 h-3 mr-1"/> Failed</span>
                          )}
                        </div>
                        
                        <div className="mb-2">
                          <div className="text-xs text-gray-500">Input:</div>
                          <pre className="bg-gray-800 p-2 rounded">{res.input || "None"}</pre>
                        </div>
                        
                        <div className="mb-2">
                          <div className="text-xs text-gray-500">Your Output:</div>
                          <pre className={`p-2 rounded ${res.passed === false ? 'bg-rose-950/30' : 'bg-gray-800'}`}>
                            {res.actualOutput || res.runError || res.compileOutput || "No output"}
                          </pre>
                        </div>

                        {res.expectedOutput !== undefined && res.expectedOutput !== "" && (
                          <div>
                            <div className="text-xs text-gray-500">Expected Output:</div>
                            <pre className="bg-gray-800 p-2 rounded">{res.expectedOutput}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="w-[55%] flex flex-col bg-[#1E1E1E]">
        <div className="flex items-center justify-between p-3 bg-[#2D2D2D] border-b border-[#3D3D3D]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={language}
                onChange={e => onLanguageChange(e.target.value)}
                className="bg-[#3D3D3D] text-gray-200 text-sm pl-3 pr-8 py-1 rounded outline-none border border-[#4D4D4D] focus:border-indigo-500 appearance-none cursor-pointer transition-colors hover:bg-[#4D4D4D]"
              >
                {(coding.allowedLanguages || ["javascript"]).map(lang => (
                  <option key={lang} value={lang}>{formatLanguageName(lang)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            
            <button 
              onClick={handleResetCode}
              className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1 transition-colors"
              title="Reset to starter code"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setActiveTab('output');
              onRunCode(customInput);
            }}
            disabled={isExecuting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Running...' : 'Run Code'}
          </button>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={displayCode}
            onChange={val => onCodeChange(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditorWorkspace;
