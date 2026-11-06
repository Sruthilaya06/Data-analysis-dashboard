/**
 * Data Profiling Engine - Phase 2.1
 * 
 * Domain-agnostic automated data profiling for tabular datasets (Excel & CSV).
 * Analyzes numerical, categorical, date/period, identifier, and text columns.
 * Calculates descriptive statistics, frequency distributions, data quality audits,
 * and Pearson correlation relationships locally in the browser.
 */

// Helper to determine if a value is empty/missing
export function isMissing(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const s = v.trim();
    return s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'nan';
  }
  return false;
}

// Format numbers nicely (e.g. commas, decimals)
export function formatMetricNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (Number.isInteger(num)) return num.toLocaleString();
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

// Format percentage
export function formatPercent(rate, decimals = 1) {
  if (rate === null || rate === undefined || isNaN(rate)) return '0.0%';
  return `${Number(rate).toFixed(decimals)}%`;
}

/**
 * Check if a column is an Identifier based on naming conventions and value patterns
 */
export function isIdentifierColumn(header, sampleValues = []) {
  const norm = String(header || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  const isIdName = (
    /(^|_)(ID|CODE|NUMBER|NO|NUM|REF|REFERENCE|PAN|MOBILE|PHONE|ACCOUNT|ACC|SSN|AADHAAR|UID|UUID|GUID)($|_)/i.test(norm) ||
    norm.endsWith('_ID') ||
    norm.endsWith('_CODE') ||
    norm.endsWith('_NUMBER') ||
    norm.endsWith('_NO') ||
    norm.endsWith('_NUM') ||
    norm.endsWith('_REF') ||
    norm.endsWith('_PAN') ||
    norm.endsWith('_PHONE') ||
    norm.endsWith('_MOBILE') ||
    norm.endsWith('_ACCOUNT') ||
    norm.startsWith('ID_') ||
    norm.startsWith('CODE_') ||
    norm.startsWith('REF_') ||
    norm.startsWith('PAN_') ||
    norm.startsWith('PHONE_') ||
    norm.startsWith('MOBILE_') ||
    norm.startsWith('ACCOUNT_')
  );

  if (isIdName) return true;

  // Value-based check: high frequency of alphanumeric ID formats (OBS-001) or string with leading zeros
  const validVals = sampleValues.filter(v => !isMissing(v));
  if (validVals.length >= 3) {
    const idValCount = validVals.filter(v => {
      const s = String(v).trim();
      return /^[A-Za-z]{2,6}[-_]?\d+$/.test(s) || /^0\d{3,}$/.test(s);
    }).length;
    if (idValCount / validVals.length >= 0.7) return true;
  }

  return false;
}

/**
 * Check if a value is a strict date or period
 */
export function parseDateOrPeriod(v) {
  if (isMissing(v)) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = String(v).trim();
  if (s.length < 4 || s.length > 35) return null;
  if (/^[A-Za-z]{2,6}[-_]?\d+$/.test(s)) return null; // Reject IDs like OBS-001
  if (/^\d+$/.test(s)) return null; // Reject raw integers

  // Period pattern: 2026-Q1, Q1 2026, FY26, Jan-26, 2026-01
  const periodPattern = /^(Q[1-4][- ]\d{2,4}|\d{4}[- ]Q[1-4]|\d{4}Q[1-4]|FY\d{2,4}|\d{4}[-/](0[1-9]|1[0-2])|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[- ]\d{2,4})$/i;
  if (periodPattern.test(s)) {
    // Return approximate timestamp for the period
    const qMatch = s.match(/Q([1-4])[- ]?(\d{4})|(\d{4})[- ]?Q([1-4])/i);
    if (qMatch) {
      const q = parseInt(qMatch[1] || qMatch[4], 10);
      const y = parseInt(qMatch[2] || qMatch[3], 10);
      const month = (q - 1) * 3;
      return new Date(y, month, 1);
    }
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return new Date(parsed);
    return new Date(2026, 0, 1);
  }

  const isoPattern = /^\d{4}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])/;
  const stdPattern = /^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]\d{2,4}/;
  const usPattern = /^(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.]\d{2,4}/;
  const namedMonthPattern = /^(\d{1,2}[- ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ]\d{2,4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;

  if (isoPattern.test(s) || stdPattern.test(s) || usPattern.test(s) || namedMonthPattern.test(s)) {
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const year = d.getFullYear();
      if (year >= 1900 && year <= 2100) return d;
    }
  }

  return null;
}

/**
 * Parse strict numerical value (handles currency, percentages, negatives)
 */
export function parseNumericValue(v) {
  if (isMissing(v)) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;
  // Preserve identifiers with leading zeros from becoming numbers
  if (/^0\d+$/.test(s)) return null;

  let clean = s.replace(/^[$\u20B9\u00A3\u20AC\u00A5]/, '').replace(/,/g, '').trim();
  if (clean.endsWith('%')) clean = clean.slice(0, -1).trim();
  if (/^\(.*\)$/.test(clean)) clean = '-' + clean.slice(1, -1).trim();

  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    const num = Number(clean);
    return isFinite(num) ? num : null;
  }
  return null;
}

/**
 * Classify a column into one of 5 distinct semantic profiling types:
 * - 'NUMERICAL'
 * - 'CATEGORICAL'
 * - 'DATE_PERIOD'
 * - 'IDENTIFIER'
 * - 'DESCRIPTIVE_TEXT'
 */
export function classifyColumn(header, rows, colIndex) {
  const norm = String(header || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const values = rows.map(r => r ? r[colIndex] : undefined);
  const sampleValues = values.slice(0, 100);

  // 1. Identifier Check (Priority 1)
  if (isIdentifierColumn(header, sampleValues)) {
    return 'IDENTIFIER';
  }

  // 2. Date or Period Check (Priority 2)
  const isDateName = (
    /(^|_)(DATE|DT|TIME|TIMESTAMP|DAY|MONTH|YEAR|PERIOD|QUARTER)($|_)/i.test(norm) ||
    norm.includes('DATE') ||
    norm.includes('PERIOD')
  );

  const validSampleCount = sampleValues.filter(v => !isMissing(v)).length;
  const dateParsedSampleCount = sampleValues.filter(v => parseDateOrPeriod(v) !== null).length;

  if (isDateName) {
    if (validSampleCount === 0 || dateParsedSampleCount / validSampleCount >= 0.5) {
      return 'DATE_PERIOD';
    }
  } else if (validSampleCount > 0 && dateParsedSampleCount / validSampleCount >= 0.8) {
    return 'DATE_PERIOD';
  }

  // 3. Numerical Check (Priority 3)
  const numParsedSampleCount = sampleValues.filter(v => parseNumericValue(v) !== null).length;
  if (validSampleCount > 0 && numParsedSampleCount / validSampleCount >= 0.7) {
    return 'NUMERICAL';
  }

  // 4. Categorical vs Descriptive Text (Issue 2)
  // Use a combination of:
  // - Column name semantics
  // - Distinct-value count
  // - Cardinality ratio (distinct / validCount)
  // - Actual value patterns (average length, sentence structures, punctuation)
  const nonMissingSamples = sampleValues.filter(v => !isMissing(v)).map(v => String(v).trim());
  const distinctSet = new Set(nonMissingSamples);
  const validSampleCount4 = nonMissingSamples.length;
  const distinctCount = distinctSet.size;
  const cardinalityRatio = validSampleCount4 > 0 ? distinctCount / validSampleCount4 : 0;
  
  const avgLength = validSampleCount4 > 0 
    ? nonMissingSamples.reduce((sum, s) => sum + s.length, 0) / validSampleCount4 
    : 0;

  // Semantic keywords indicating Descriptive Text
  // e.g. Employee_Name, Customer_Name, Observation_Details, Observation_Title, Notes, Remarks, Description
  const isDescriptiveSemantic = (
    /(^|_)(NAME|TITLE|DETAIL|DETAILS|DESC|DESCRIPTION|NOTE|NOTES|COMMENT|COMMENTS|REMARK|REMARKS|SUMMARY|REASON|MESSAGE|ADDRESS|STREET|FEEDBACK|TEXT)($|_)/i.test(norm) ||
    norm.endsWith('_NAME') ||
    norm.endsWith('_TITLE') ||
    norm.endsWith('_DETAILS') ||
    norm.endsWith('_DETAIL') ||
    norm.endsWith('_DESC') ||
    norm.endsWith('_DESCRIPTION') ||
    norm.endsWith('_NOTES') ||
    norm.endsWith('_NOTE') ||
    norm.endsWith('_COMMENTS') ||
    norm.endsWith('_COMMENT') ||
    norm.endsWith('_REMARKS') ||
    norm.endsWith('_REMARK') ||
    norm.startsWith('NAME_') ||
    norm.startsWith('DESC_') ||
    norm.startsWith('DETAIL_')
  );

  // Semantic keywords indicating Categorical fields
  // e.g. Department, Location, Employment_Status, Risk_Level, Status, Region, Product, Category, Scenario, Metric, Designation, Role,
  // Business, Observation_Level, Risk_Nature, Risk, Risk_Impact, Risk_Likelihood, Repeat_Flag, Quarter, Audit_Type
  const isCategoricalSemantic = (
    /(^|_)(DEPT|DEPARTMENT|LOCATION|CITY|STATE|COUNTRY|REGION|STATUS|STAGE|LEVEL|RISK|PRIORITY|CATEGORY|TYPE|SECTOR|SEGMENT|GENDER|TIER|SCENARIO|CHANNEL|ROLE|DESIGNATION|METRIC|PRODUCT|REP|QUARTER|BUSINESS|NATURE|FLAG|IMPACT|LIKELIHOOD|REPEAT|AUDIT)($|_)/i.test(norm) ||
    norm.includes('STATUS') ||
    norm.includes('LEVEL') ||
    norm.includes('DEPT') ||
    norm.includes('REGION') ||
    norm.includes('SCENARIO') ||
    norm.includes('LOCATION') ||
    norm.includes('RISK') ||
    norm.includes('TYPE') ||
    norm.includes('IMPACT') ||
    norm.includes('LIKELIHOOD') ||
    norm.includes('FLAG') ||
    norm.includes('NATURE') ||
    norm.includes('QUARTER')
  );

  // If header has descriptive semantics:
  if (isDescriptiveSemantic) {
    // Only classify as categorical if cardinality is exceptionally low (< 3 distinct in large sample)
    if (distinctCount > 3 || cardinalityRatio >= 0.35 || avgLength > 15) {
      return 'DESCRIPTIVE_TEXT';
    }
  }

  // If header has categorical semantics:
  if (isCategoricalSemantic) {
    if (cardinalityRatio <= 0.85 || distinctCount <= 30) {
      return 'CATEGORICAL';
    }
  }

  // Value-based heuristics:
  // Long sentences, narrative descriptions, or multi-word details
  const hasLongSentences = nonMissingSamples.some(s => s.length > 50 || s.split(/\s+/).length > 5);
  if (hasLongSentences || avgLength > 35) {
    return 'DESCRIPTIVE_TEXT';
  }

  // High cardinality text: when distinct values are a high proportion of records
  if (validSampleCount4 >= 5 && cardinalityRatio >= 0.65) {
    return 'DESCRIPTIVE_TEXT';
  }

  // Low cardinality recurring text -> Categorical
  if (distinctCount <= 30 && cardinalityRatio <= 0.6) {
    return 'CATEGORICAL';
  }

  return 'DESCRIPTIVE_TEXT';
}

/**
 * Numerical Column Profiling
 */
export function profileNumericalColumn(values) {
  let validCount = 0;
  let missingCount = 0;
  let invalidCount = 0;
  const validNumbers = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      missingCount++;
    } else {
      const parsed = parseNumericValue(v);
      if (parsed !== null) {
        validCount++;
        validNumbers.push(parsed);
      } else {
        invalidCount++;
      }
    }
  }

  if (validCount === 0) {
    return {
      validCount: 0,
      missingCount,
      missingRate: values.length ? (missingCount / values.length) * 100 : 0,
      invalidCount,
      sum: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      range: null,
      stdDev: null,
      variance: null
    };
  }

  // Numerical calculations
  validNumbers.sort((a, b) => a - b);
  const sum = validNumbers.reduce((acc, x) => acc + x, 0);
  const mean = sum / validCount;

  // Median
  const mid = Math.floor(validCount / 2);
  const median = validCount % 2 !== 0 
    ? validNumbers[mid] 
    : (validNumbers[mid - 1] + validNumbers[mid]) / 2;

  const min = validNumbers[0];
  const max = validNumbers[validCount - 1];
  const range = max - min;

  // Population & Sample Variance and Standard Deviation
  const sumSquaredDiff = validNumbers.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
  const variancePop = sumSquaredDiff / validCount;
  const stdDevPop = Math.sqrt(variancePop);
  
  // Sample variance and std dev (Bessel's correction n - 1 for n > 1)
  const varianceSample = validCount > 1 ? sumSquaredDiff / (validCount - 1) : 0;
  const stdDevSample = Math.sqrt(varianceSample);

  return {
    validCount,
    missingCount,
    missingRate: (missingCount / values.length) * 100,
    invalidCount,
    sum,
    mean,
    median,
    min,
    max,
    range,
    stdDev: stdDevSample,
    variance: varianceSample,
    stdDevSample,
    varianceSample,
    stdDevPop,
    variancePop
  };
}

/**
 * Categorical Column Profiling
 */
export function profileCategoricalColumn(values) {
  let missingCount = 0;
  const freqMap = new Map();
  let totalValid = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      missingCount++;
    } else {
      totalValid++;
      const s = String(v).trim();
      freqMap.set(s, (freqMap.get(s) || 0) + 1);
    }
  }

  const distinctCount = freqMap.size;
  let uniqueCount = 0; // Appears exactly once
  let repeatedCount = 0; // Appears > 1 time

  let mostFrequent = null;
  let mostFrequentCount = -1;
  let leastFrequent = null;
  let leastFrequentCount = Infinity;

  const distribution = [];

  for (const [category, count] of freqMap.entries()) {
    if (count === 1) {
      uniqueCount++;
    } else {
      repeatedCount++;
    }

    if (count > mostFrequentCount) {
      mostFrequentCount = count;
      mostFrequent = category;
    }
    if (count < leastFrequentCount) {
      leastFrequentCount = count;
      leastFrequent = category;
    }

    distribution.push({
      category,
      value: category,
      count,
      percentage: totalValid > 0 ? (count / totalValid) * 100 : 0
    });
  }

  distribution.sort((a, b) => b.count - a.count);

  return {
    validCount: totalValid,
    missingCount,
    missingRate: values.length ? (missingCount / values.length) * 100 : 0,
    distinctCount,
    uniqueCount,
    repeatedCount,
    mostFrequent: mostFrequent !== null ? { category: mostFrequent, count: mostFrequentCount, percentage: totalValid ? (mostFrequentCount / totalValid) * 100 : 0 } : null,
    leastFrequent: leastFrequent !== null && leastFrequentCount !== Infinity ? { category: leastFrequent, count: leastFrequentCount, percentage: totalValid ? (leastFrequentCount / totalValid) * 100 : 0 } : null,
    distribution: distribution, // complete distribution
    topDistribution: distribution.slice(0, 10), // Top 10 for compact previews
    fullDistribution: distribution,
    frequencies: distribution
  };
}

/**
 * Date and Period Column Profiling
 */
export function profileDateColumn(values) {
  let missingCount = 0;
  let invalidCount = 0;
  const dates = [];

  const yearMap = new Map();
  const quarterMap = new Map();
  const monthMap = new Map();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      missingCount++;
    } else {
      const d = parseDateOrPeriod(v);
      if (d) {
        dates.push({ date: d, raw: String(v) });
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const q = Math.ceil(m / 3);

        const yStr = `${y}`;
        const qStr = `${y}-Q${q}`;
        const mStr = `${y}-${String(m).padStart(2, '0')}`;

        yearMap.set(yStr, (yearMap.get(yStr) || 0) + 1);
        quarterMap.set(qStr, (quarterMap.get(qStr) || 0) + 1);
        monthMap.set(mStr, (monthMap.get(mStr) || 0) + 1);
      } else {
        invalidCount++;
      }
    }
  }

  if (dates.length === 0) {
    return {
      validCount: 0,
      missingCount,
      missingRate: values.length ? (missingCount / values.length) * 100 : 0,
      invalidCount,
      earliest: null,
      latest: null,
      rangeDays: 0,
      byYear: [],
      byQuarter: [],
      byMonth: []
    };
  }

  dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const earliestDate = dates[0].date;
  const latestDate = dates[dates.length - 1].date;

  const rangeMs = latestDate.getTime() - earliestDate.getTime();
  const rangeDays = Math.round(rangeMs / (1000 * 60 * 60 * 24));

  const formatList = (map) => {
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return {
    validCount: dates.length,
    missingCount,
    missingRate: (missingCount / values.length) * 100,
    invalidCount,
    earliest: earliestDate.toISOString().split('T')[0],
    latest: latestDate.toISOString().split('T')[0],
    rangeDays,
    byYear: formatList(yearMap),
    byQuarter: formatList(quarterMap),
    byMonth: formatList(monthMap)
  };
}

/**
 * Identifier Column Profiling
 */
export function profileIdentifierColumn(values) {
  let missingCount = 0;
  const valSet = new Set();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      missingCount++;
    } else {
      valSet.add(String(v).trim());
    }
  }

  const validCount = values.length - missingCount;
  const distinctCount = valSet.size;

  return {
    validCount,
    missingCount,
    missingRate: values.length ? (missingCount / values.length) * 100 : 0,
    distinctCount,
    isUniqueId: distinctCount === validCount && validCount > 0,
    sampleValues: Array.from(valSet).slice(0, 5)
  };
}

/**
 * Descriptive Text Column Profiling (Issue 2)
 * High-cardinality descriptive columns calculate text lengths, distinct frequencies,
 * and sample values while avoiding misleading category distribution charts.
 */
export function profileTextColumn(values) {
  let missingCount = 0;
  let totalLength = 0;
  let minLength = Infinity;
  let maxLength = 0;
  const valSet = new Set();
  const freqMap = new Map();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      missingCount++;
    } else {
      const s = String(v).trim();
      valSet.add(s);
      freqMap.set(s, (freqMap.get(s) || 0) + 1);
      totalLength += s.length;
      if (s.length < minLength) minLength = s.length;
      if (s.length > maxLength) maxLength = s.length;
    }
  }

  const validCount = values.length - missingCount;
  const distinctCount = valSet.size;
  const cardinalityRate = validCount > 0 ? (distinctCount / validCount) * 100 : 0;

  // Sorted frequencies for distinct values inspector
  const frequencies = Array.from(freqMap.entries())
    .map(([val, count]) => ({
      value: val,
      count,
      percentage: validCount > 0 ? (count / validCount) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    validCount,
    missingCount,
    missingRate: values.length ? (missingCount / values.length) * 100 : 0,
    distinctCount,
    cardinalityRate,
    avgLength: validCount > 0 ? Number((totalLength / validCount).toFixed(1)) : 0,
    minLength: minLength !== Infinity ? minLength : 0,
    maxLength,
    isHighCardinality: cardinalityRate >= 65,
    sampleValues: Array.from(valSet).slice(0, 5),
    frequencies,
    distribution: frequencies.slice(0, 10)
  };
}

/**
 * Pearson Correlation Calculation for Numerical Column Pairs
 * r = sum((x - meanX) * (y - meanY)) / sqrt(sum((x - meanX)^2) * sum((y - meanY)^2))
 */
export function calculatePearsonCorrelation(valuesA, valuesB) {
  const paired = [];

  for (let i = 0; i < Math.min(valuesA.length, valuesB.length); i++) {
    const a = parseNumericValue(valuesA[i]);
    const b = parseNumericValue(valuesB[i]);
    if (a !== null && b !== null) {
      paired.push([a, b]);
    }
  }

  // Need at least 3 valid observations to report meaningful correlation
  if (paired.length < 3) {
    return { r: null, observationCount: paired.length, reason: 'Insufficient observations (min 3 required)' };
  }

  const n = paired.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += paired[i][0];
    sumY += paired[i][1];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = paired[i][0] - meanX;
    const dy = paired[i][1] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  // Constant column check (variance 0)
  if (denX === 0 || denY === 0) {
    return { r: null, observationCount: n, reason: 'Zero variance (constant column values)' };
  }

  const r = num / (Math.sqrt(denX) * Math.sqrt(denY));
  // Bound to [-1, 1] against precision drift
  const boundedR = Math.max(-1, Math.min(1, r));

  let strength = 'None';
  const absR = Math.abs(boundedR);
  if (absR >= 0.7) strength = boundedR > 0 ? 'Strong Positive' : 'Strong Negative';
  else if (absR >= 0.4) strength = boundedR > 0 ? 'Moderate Positive' : 'Moderate Negative';
  else if (absR >= 0.15) strength = boundedR > 0 ? 'Weak Positive' : 'Weak Negative';

  return {
    r: boundedR,
    observationCount: n,
    strength,
    formattedR: boundedR.toFixed(3)
  };
}

/**
 * Data Quality and Hygiene Audit
 */
export function calculateDataQuality(headers, rows, columnProfiles) {
  const totalRows = rows.length;
  const totalCols = headers.length;
  const totalCells = totalRows * totalCols;

  let totalMissingCells = 0;
  const columnQuality = {};

  // Missing values per column
  headers.forEach((header, colIdx) => {
    let colMissing = 0;
    let colInvalid = 0;
    for (let r = 0; r < totalRows; r++) {
      if (isMissing(rows[r][colIdx])) {
        colMissing++;
      }
    }
    totalMissingCells += colMissing;

    const profile = columnProfiles[header];
    const distinctCount = profile ? (profile.distinctCount || (profile.distribution ? profile.distribution.length : 0)) : 0;
    const isConstant = distinctCount === 1 && (totalRows - colMissing > 0);
    const isNearConstant = profile && profile.mostFrequent && totalRows > 5 && (profile.mostFrequent.count / (totalRows - colMissing) >= 0.95);

    let status = 'Healthy';
    const missingRate = totalRows > 0 ? (colMissing / totalRows) * 100 : 0;
    if (isConstant) status = 'Constant (1 value)';
    else if (isNearConstant) status = 'Near-Constant (>95%)';
    else if (missingRate > 25) status = 'High Missing';
    else if (missingRate > 0) status = 'Minor Missing';

    columnQuality[header] = {
      missingCount: colMissing,
      missingRate,
      isConstant,
      isNearConstant,
      status
    };
  });

  // Duplicate Records Check
  const rowHashCounts = new Map();
  let duplicateCount = 0;

  for (let r = 0; r < totalRows; r++) {
    // Normalize cells for exact row comparison
    const rowKey = rows[r].map(c => isMissing(c) ? '«NULL»' : String(c).trim()).join('║');
    const prev = rowHashCounts.get(rowKey) || 0;
    if (prev >= 1) {
      duplicateCount++;
    }
    rowHashCounts.set(rowKey, prev + 1);
  }

  const completenessPercentage = totalCells > 0 
    ? Math.max(0, ((totalCells - totalMissingCells) / totalCells) * 100) 
    : 100;
  const duplicatePercentage = totalRows > 0 
    ? (duplicateCount / totalRows) * 100 
    : 0;

  return {
    totalRecords: totalRows,
    totalColumns: totalCols,
    totalCells,
    totalMissingCells,
    completenessPercentage,
    duplicateCount,
    duplicatePercentage,
    columnQuality
  };
}


/**
 * Spearman Rank Correlation Coefficient (monotonic relationship)
 */
export function calculateSpearmanCorrelation(valuesA, valuesB) {
  const paired = [];
  for (let i = 0; i < Math.min(valuesA.length, valuesB.length); i++) {
    const a = parseNumericValue(valuesA[i]);
    const b = parseNumericValue(valuesB[i]);
    if (a !== null && b !== null) {
      paired.push({ a, b, originalIdx: i });
    }
  }

  if (paired.length < 3) {
    return { rho: null, observationCount: paired.length, reason: 'Insufficient observations (min 3 required)' };
  }

  function getRanks(arr, key) {
    const sorted = arr.map((item, originalIdx) => ({ val: item[key], originalIdx }))
                      .sort((x, y) => x.val - y.val);
    const ranks = new Array(arr.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length - 1 && sorted[j + 1].val === sorted[j].val) {
        j++;
      }
      const avgRank = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) {
        ranks[sorted[k].originalIdx] = avgRank;
      }
      i = j + 1;
    }
    return ranks;
  }

  const ranksA = getRanks(paired, 'a');
  const ranksB = getRanks(paired, 'b');

  const pRes = calculatePearsonCorrelation(ranksA, ranksB);
  if (pRes.r === null) {
    return { rho: null, observationCount: paired.length, reason: pRes.reason };
  }

  return {
    rho: pRes.r,
    formattedRho: pRes.r.toFixed(3),
    strength: pRes.strength,
    observationCount: paired.length
  };
}

/**
 * Contingency Table, Row/Column Percentages & Cramér's V Association
 */
export function calculateContingencyTable(valuesA, valuesB) {
  const rowCountsMap = new Map();
  const colCatSet = new Set();
  let totalObservations = 0;

  for (let i = 0; i < Math.min(valuesA.length, valuesB.length); i++) {
    const rawA = valuesA[i];
    const rawB = valuesB[i];
    if (isMissing(rawA) || isMissing(rawB)) continue;
    const catA = String(rawA).trim();
    const catB = String(rawB).trim();
    totalObservations++;
    colCatSet.add(catB);

    if (!rowCountsMap.has(catA)) {
      rowCountsMap.set(catA, new Map());
    }
    const rMap = rowCountsMap.get(catA);
    rMap.set(catB, (rMap.get(catB) || 0) + 1);
  }

  const rowCategories = Array.from(rowCountsMap.keys());
  const colCategories = Array.from(colCatSet);

  if (rowCategories.length === 0 || colCategories.length === 0 || totalObservations === 0) {
    return {
      rowCategories: [],
      colCategories: [],
      matrix: [],
      rowTotals: {},
      colTotals: {},
      total: 0,
      cramersV: 0,
      chiSquare: 0,
      strength: 'None',
      limitation: 'No valid paired observations'
    };
  }

  const rowTotals = {};
  const colTotals = {};
  colCategories.forEach(c => colTotals[c] = 0);

  const matrix = [];
  rowCategories.forEach(r => {
    rowTotals[r] = 0;
    const rMap = rowCountsMap.get(r);
    const counts = {};
    colCategories.forEach(c => {
      const cnt = rMap.get(c) || 0;
      counts[c] = cnt;
      rowTotals[r] += cnt;
      colTotals[c] += cnt;
    });
    matrix.push({ rowCat: r, counts });
  });

  let chiSquare = 0;
  let sparseCells = 0;
  const totalCells = rowCategories.length * colCategories.length;

  matrix.forEach(item => {
    item.rowPcts = {};
    item.colPcts = {};
    const rTot = rowTotals[item.rowCat] || 0;
    colCategories.forEach(c => {
      const cnt = item.counts[c] || 0;
      const cTot = colTotals[c] || 0;
      item.rowPcts[c] = rTot > 0 ? (cnt / rTot) * 100 : 0;
      item.colPcts[c] = cTot > 0 ? (cnt / cTot) * 100 : 0;

      const expected = (rTot * cTot) / (totalObservations || 1);
      if (expected < 5) sparseCells++;
      if (expected > 0) {
        chiSquare += Math.pow(cnt - expected, 2) / expected;
      }
    });
  });

  const minDim = Math.min(rowCategories.length - 1, colCategories.length - 1);
  let cramersV = 0;
  if (minDim > 0 && totalObservations > 0) {
    cramersV = Math.sqrt(chiSquare / (totalObservations * minDim));
    if (isNaN(cramersV)) cramersV = 0;
    cramersV = Math.min(1, Math.max(0, cramersV));
  }

  let strength = 'Weak';
  if (cramersV >= 0.35) strength = 'Strong';
  else if (cramersV >= 0.15) strength = 'Moderate';

  let limitation = null;
  if (totalObservations < 10) {
    limitation = `Small sample size (N=${totalObservations}); statistical significance is limited.`;
  } else if (totalCells > 0 && (sparseCells / totalCells) > 0.2) {
    limitation = `Sparse cell distribution (${Math.round((sparseCells / totalCells) * 100)}% cells have expected frequency < 5).`;
  }

  const matrix2D = rowCategories.map(r => {
    const item = matrix.find(m => m.rowCat === r);
    return colCategories.map(c => (item && item.counts) ? (item.counts[c] || 0) : 0);
  });

  const rowPercentages = rowCategories.map(r => {
    const item = matrix.find(m => m.rowCat === r);
    return colCategories.map(c => (item && item.rowPcts) ? (item.rowPcts[c] || 0) : 0);
  });

  const colPercentages = rowCategories.map(r => {
    const item = matrix.find(m => m.rowCat === r);
    return colCategories.map(c => (item && item.colPcts) ? (item.colPcts[c] || 0) : 0);
  });

  const rowTotalsArr = rowCategories.map(r => rowTotals[r] || 0);
  const colTotalsArr = colCategories.map(c => colTotals[c] || 0);
  const df = Math.max(1, (rowCategories.length - 1) * (colCategories.length - 1));

  return {
    rowCategories,
    colCategories,
    matrix: matrix2D,
    matrixRows: matrix,
    rowTotals: rowTotalsArr,
    colTotals: colTotalsArr,
    rowTotalsMap: rowTotals,
    colTotalsMap: colTotals,
    rowPercentages,
    colPercentages,
    total: totalObservations,
    grandTotal: totalObservations,
    df,
    chiSquare: Number(chiSquare.toFixed(2)),
    cramersV: Number(cramersV.toFixed(3)),
    strength,
    limitation,
    lowExpectedWarning: !!limitation
  };
}

/**
 * Numerical Analysis Grouped by Categorical Dimension
 */
export function calculateNumericalByCategorical(rows, headers, catCol, numCol) {
  const cIdx = headers.indexOf(catCol);
  const nIdx = headers.indexOf(numCol);
  if (cIdx === -1 || nIdx === -1) return [];

  const groups = new Map();
  rows.forEach(r => {
    if (!r) return;
    const catRaw = r[cIdx];
    const numRaw = r[nIdx];
    if (isMissing(catRaw) || isMissing(numRaw)) return;
    const cat = String(catRaw).trim();
    const num = parseNumericValue(numRaw);
    if (num === null) return;

    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat).push(num);
  });

  const result = [];
  groups.forEach((vals, category) => {
    vals.sort((a, b) => a - b);
    const count = vals.length;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    const min = vals[0];
    const max = vals[count - 1];

    let variance = 0;
    if (count > 1) {
      const sqDiffs = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
      variance = sqDiffs / (count - 1);
    }
    const stdDev = Math.sqrt(variance);

    result.push({
      category,
      count,
      sum,
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      min,
      max,
      stdDev: Number(stdDev.toFixed(2))
    });
  });

  result.sort((a, b) => b.mean - a.mean);
  return result;
}

/**
 * Comprehensive Relationship Discovery Engine
 */
export function discoverAllRelationships(headers, rows, profilingResults) {
  const { categoricalColumns, numericalColumns, dateColumns } = profilingResults;

  // 1. Categorical Associations (Cramér's V & Contingency)
  const categoricalAssociations = [];
  for (let i = 0; i < categoricalColumns.length; i++) {
    for (let j = i + 1; j < categoricalColumns.length; j++) {
      const colA = categoricalColumns[i];
      const colB = categoricalColumns[j];
      const idxA = headers.indexOf(colA);
      const idxB = headers.indexOf(colB);

      const valsA = rows.map(r => r ? r[idxA] : undefined);
      const valsB = rows.map(r => r ? r[idxB] : undefined);

      const ct = calculateContingencyTable(valsA, valsB);
      if (ct.total > 0 && ct.rowCategories.length > 1 && ct.colCategories.length > 1) {
        categoricalAssociations.push({
          colA,
          colB,
          cramersV: ct.cramersV,
          chiSquare: ct.chiSquare,
          df: ct.df || Math.max(1, (ct.rowCategories.length - 1) * (ct.colCategories.length - 1)),
          strength: ct.strength,
          observations: ct.total,
          sampleSize: ct.total,
          table: ct
        });
      }
    }
  }
  categoricalAssociations.sort((a, b) => b.cramersV - a.cramersV);

  // 2. Numerical Correlations (Pearson r & Spearman rho)
  const numericalCorrelations = [];
  for (let i = 0; i < numericalColumns.length; i++) {
    for (let j = i + 1; j < numericalColumns.length; j++) {
      const colA = numericalColumns[i];
      const colB = numericalColumns[j];
      const idxA = headers.indexOf(colA);
      const idxB = headers.indexOf(colB);

      const valsA = rows.map(r => r ? r[idxA] : undefined);
      const valsB = rows.map(r => r ? r[idxB] : undefined);

      const pRes = calculatePearsonCorrelation(valsA, valsB);
      const sRes = calculateSpearmanCorrelation(valsA, valsB);

      if (pRes && pRes.r !== null && !isNaN(pRes.r)) {
        const pearsonVal = Number(pRes.r);
        const spearmanVal = (sRes && typeof sRes.rho === 'number' && !isNaN(sRes.rho)) ? Number(sRes.rho) : pearsonVal;
        numericalCorrelations.push({
          colA,
          colB,
          r: pearsonVal,
          pearson: pearsonVal,
          formattedR: pRes.formattedR || pearsonVal.toFixed(3),
          rho: spearmanVal,
          spearman: spearmanVal,
          formattedRho: (sRes && sRes.formattedRho) || spearmanVal.toFixed(3),
          strength: pRes.strength || 'Moderate',
          observations: pRes.observationCount || 0,
          count: pRes.observationCount || 0,
          sampleSize: pRes.observationCount || 0
        });
      }
    }
  }
  numericalCorrelations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // 3. Temporal vs Categorical Relationships
  const temporalRelationships = [];
  const timeCols = dateColumns.length > 0 ? dateColumns : headers.filter(h => /(YEAR|DATE|PERIOD|QUARTER|MONTH)/i.test(h));
  timeCols.forEach(tCol => {
    categoricalColumns.forEach(cCol => {
      const ct = calculateContingencyTable(
        rows.map(r => r ? r[headers.indexOf(tCol)] : undefined),
        rows.map(r => r ? r[headers.indexOf(cCol)] : undefined)
      );
      if (ct.total > 0) {
        temporalRelationships.push({
          timeCol: tCol,
          catCol: cCol,
          observations: ct.total,
          table: ct
        });
      }
    });
  });

  // 4. Numerical by Categorical Breakdowns
  const numericalByCategorical = [];
  if (numericalColumns.length > 0 && categoricalColumns.length > 0) {
    categoricalColumns.slice(0, 4).forEach(cCol => {
      numericalColumns.slice(0, 3).forEach(nCol => {
        const stats = calculateNumericalByCategorical(rows, headers, cCol, nCol);
        if (stats.length > 0) {
          numericalByCategorical.push({
            catCol: cCol,
            numCol: nCol,
            stats
          });
        }
      });
    });
  }

  return {
    categoricalAssociations,
    numericalCorrelations,
    temporalRelationships,
    numericalByCategorical
  };
}

/**
 * Main Profiling Orchestrator
 */
export function profileDataset(headers, rows) {
  if (!headers || !headers.length || !rows || !rows.length) {
    return null;
  }

  const classifications = {};
  const columnProfiles = {};
  const numericalColumns = [];
  const categoricalColumns = [];
  const dateColumns = [];
  const identifierColumns = [];
  const textColumns = [];

  // Step 1: Classify & Profile Each Column
  headers.forEach((header, colIndex) => {
    const colValues = rows.map(r => r ? r[colIndex] : undefined);
    const classification = classifyColumn(header, rows, colIndex);
    classifications[header] = classification;

    switch (classification) {
      case 'NUMERICAL':
        columnProfiles[header] = profileNumericalColumn(colValues);
        numericalColumns.push(header);
        break;
      case 'CATEGORICAL':
        columnProfiles[header] = profileCategoricalColumn(colValues);
        categoricalColumns.push(header);
        break;
      case 'DATE_PERIOD':
        columnProfiles[header] = profileDateColumn(colValues);
        dateColumns.push(header);
        break;
      case 'IDENTIFIER':
        columnProfiles[header] = profileIdentifierColumn(colValues);
        identifierColumns.push(header);
        break;
      case 'DESCRIPTIVE_TEXT':
      default:
        columnProfiles[header] = profileTextColumn(colValues);
        textColumns.push(header);
        break;
    }
  });

  // Step 2: Quality & Hygiene Analysis
  const quality = calculateDataQuality(headers, rows, columnProfiles);

  // Step 3: Run Full Relationship Discovery Suite
  const relationships = discoverAllRelationships(headers, rows, {
    categoricalColumns,
    numericalColumns,
    dateColumns
  });

  const correlations = relationships.numericalCorrelations;

  return {
    headers,
    totalRecords: rows.length,
    totalColumns: headers.length,
    classifications,
    columnProfiles,
    counts: {
      numerical: numericalColumns.length,
      categorical: categoricalColumns.length,
      date: dateColumns.length,
      identifier: identifierColumns.length,
      text: textColumns.length
    },
    numericalColumns,
    categoricalColumns,
    dateColumns,
    identifierColumns,
    textColumns,
    quality,
    correlations,
    relationships
  };
}

