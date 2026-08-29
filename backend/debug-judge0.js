import { submitToJudge0 } from "./services/judge0.service.js";
import dotenv from "dotenv";
dotenv.config();
async function runDebug() {
  console.log("Submitting directly to Judge0...");
  
  const sourceCode = `
bool testFunction() {
    // intentionally missing return
}
`;
  
  try {
    const result = await submitToJudge0({
      sourceCode: sourceCode,
      languageId: 54, // C++
      compilerOptions: "-Werror=return-type"
    });
    
    console.log("=== FINAL JUDGE0 RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error("Error during Judge0 execution:", err);
  }
}
runDebug();
