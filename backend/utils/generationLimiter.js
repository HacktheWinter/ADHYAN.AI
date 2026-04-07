import GenerationQuota from "../models/GenerationQuota.js";

export const DAILY_GENERATION_LIMIT = 2;

const getDateKeyUTC = () => new Date().toISOString().slice(0, 10);

export const enforceDailyGenerationLimit = async (
  teacherId,
  contentType,
  limit = DAILY_GENERATION_LIMIT
) => {
  if (!teacherId) {
    return { used: 0, remaining: limit };
  }

  const dateKey = getDateKeyUTC();
  const quota = await GenerationQuota.findOne({
    teacherId,
    contentType,
    dateKey,
  }).select("successCount");

  const used = quota?.successCount || 0;
  if (used >= limit) {
    const error = new Error(
      `Daily ${contentType} generation limit reached (${limit}/day). Try again tomorrow.`
    );
    error.code = "DAILY_LIMIT_REACHED";
    throw error;
  }

  return { used, remaining: Math.max(0, limit - used) };
};

export const incrementDailyGenerationCount = async (
  teacherId,
  contentType
) => {
  if (!teacherId) {
    return;
  }

  const dateKey = getDateKeyUTC();
  await GenerationQuota.updateOne(
    { teacherId, contentType, dateKey },
    {
      $setOnInsert: { teacherId, contentType, dateKey },
      $inc: { successCount: 1 },
    },
    { upsert: true }
  );
};

export const getDailyGenerationUsage = async (
  teacherId,
  contentType,
  limit = DAILY_GENERATION_LIMIT
) => {
  if (!teacherId) {
    return { dailyLimit: limit, used: 0, remaining: limit };
  }

  const dateKey = getDateKeyUTC();
  const quota = await GenerationQuota.findOne({
    teacherId,
    contentType,
    dateKey,
  }).select("successCount");

  const used = quota?.successCount || 0;
  return {
    dailyLimit: limit,
    used,
    remaining: Math.max(0, limit - used),
  };
};