// Backend/services/languageMap.js
// Centralized language mapping for Judge0 CE language IDs.
// These IDs correspond to the verified Judge0 languages on the production VPS.

const LANGUAGE_TO_JUDGE0_ID = {
  c: 50,        // C (GCC 9.2.0)
  cpp: 54,      // C++ (GCC 9.2.0)
  java: 62,     // Java (OpenJDK 13.0.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
  python: 71,   // Python (3.8.1)
};

// Aliases: map common display names and variations to canonical keys
const LANGUAGE_ALIASES = {
  "c": "c",
  "c++": "cpp",
  "cpp": "cpp",
  "java": "java",
  "javascript": "javascript",
  "js": "javascript",
  "python": "python",
  "python3": "python",
  "python 3": "python",
  "py": "python",
};

/**
 * Normalize a language string to a canonical key.
 * @param {string} language - Language identifier from the frontend (e.g., "python", "C++", "Java").
 * @returns {string|null} Canonical language key or null if unrecognized.
 */
export const normalizeLanguage = (language) => {
  if (!language || typeof language !== "string") return null;
  const key = language.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] || null;
};

/**
 * Get the Judge0 language ID for a given language.
 * @param {string} language - Language identifier from the frontend.
 * @returns {number|null} Judge0 language ID or null if unsupported.
 */
export const getJudge0LanguageId = (language) => {
  const normalized = normalizeLanguage(language);
  if (!normalized) return null;
  return LANGUAGE_TO_JUDGE0_ID[normalized] || null;
};

/**
 * Check if a language is supported.
 * @param {string} language - Language identifier.
 * @returns {boolean}
 */
export const isSupportedLanguage = (language) => {
  return getJudge0LanguageId(language) !== null;
};

/**
 * Get the list of supported languages.
 * @returns {string[]}
 */
export const getSupportedLanguages = () => Object.keys(LANGUAGE_TO_JUDGE0_ID);

export default LANGUAGE_TO_JUDGE0_ID;
