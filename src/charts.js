/**
 * Dynamic Data Visualization Engine - Phase 2.2
 * 
 * Lightweight, zero-dependency SVG chart generation and analytical visualization suite.
 * Supports:
 * - Categorical: Bar charts, Horizontal ranking, Donut/Pie charts, Top/Bottom comparisons
 * - Numerical: Histograms with distribution curves, Box plots, Min/Max/Avg comparisons
 * - Time-Series: Chronological line & area charts, Period/Monthly/Quarterly trends
 * - Relationships: Scatter plots with linear regression trendlines, Correlation heatmaps
 * - Multi-Category: Grouped bar charts, Stacked bar charts
 * - User-Controlled Custom Chart Builder with dynamic aggregations (Count, Sum, Avg, Min, Max)
 */

import { formatMetricNumber, formatPercent, isMissing } from './profiling.js';

// Clean, high-contrast, professional color palette
export const PALETTE = [
  '#f97316', // Vibrant Orange (Primary Brand Accent)
  '#0284c7', // Sky Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

/**
 * Escape HTML attributes and labels for SVG safety
 */
export function escapeSvg(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format numbers with abbreviations (e.g. 1.2M, 45K) for tight SVG axes
 */
export function formatCompactNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(1).replace(/\.0$/, '');
}

/**
 * Contextual value formatter (adds currency prefix if column hints at money)
 */
export function formatAxisOrValue(val, colName = '', isPercent = false) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  if (isPercent) return formatPercent(val);
  
  const norm = String(colName || '').toUpperCase();
  const isCurrency = /(REVENUE|SALARY|AMOUNT|PRICE|COST|PROFIT|EXPENSE|BUDGET|IMPACT|FINANCIAL)/.test(norm);
  const formatted = formatMetricNumber(val);
  return isCurrency ? `$${formatted}` : formatted;
}

/**
 * Parse numeric value safely
 */
export function parseNum(val) {
  if (isMissing(val)) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Parse chronological sort key for dates, years, quarters, FYs, months
 */
export function parseChronologicalSortKey(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;

  // 1. Year-Quarter: "2025-Q1", "2025-Q2", "2025 Q3", "2025Q4"
  const yqMatch = s.match(/^(\d{4})[- /]?Q([1-4])$/i);
  if (yqMatch) {
    return parseInt(yqMatch[1], 10) * 10 + parseInt(yqMatch[2], 10);
  }

  // 2. Quarter-Year: "Q1-2025", "Q2 2025", "Q1 25"
  const qyMatch = s.match(/^Q([1-4])[- /]?(\d{2,4})$/i);
  if (qyMatch) {
    let y = parseInt(qyMatch[2], 10);
    if (y < 100) y += 2000;
    return y * 10 + parseInt(qyMatch[1], 10);
  }

  // 3. Financial Year: "FY2022", "FY22", "FY 2024", "FY-2025"
  const fyMatch = s.match(/^FY[- ]?(\d{2,4})$/i);
  if (fyMatch) {
    let y = parseInt(fyMatch[1], 10);
    if (y < 100) y += 2000;
    return y * 1000;
  }

  // 4. Pure Quarter: "Q1", "Q2", "Q3", "Q4"
  const qMatch = s.match(/^Q([1-4])$/i);
  if (qMatch) {
    return parseInt(qMatch[1], 10);
  }

  // 5. Pure 4-digit Year: "2022", "2024", "2026"
  const yearMatch = s.match(/^(\d{4})$/);
  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 1950 && yr <= 2100) {
      return yr * 1000;
    }
  }

  // 6. Year-Month: "2025-01", "2025/03"
  const ymMatch = s.match(/^(\d{4})[-/](0[1-9]|1[0-2])$/);
  if (ymMatch) {
    return parseInt(ymMatch[1], 10) * 100 + parseInt(ymMatch[2], 10);
  }

  // 7. Month name: "Jan", "Feb", ... or "Jan-2025"
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthNameMatch = s.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[- ]?(\d{2,4})?$/i);
  if (monthNameMatch) {
    const mIdx = monthNames.indexOf(monthNameMatch[1].toUpperCase().slice(0, 3)) + 1;
    let y = monthNameMatch[2] ? parseInt(monthNameMatch[2], 10) : 0;
    if (y > 0 && y < 100) y += 2000;
    return (y || 2000) * 100 + mIdx;
  }

  // 8. Standard Date parsing
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yr = d.getFullYear();
    if (yr >= 1900 && yr <= 2100) {
      return d.getTime();
    }
  }

  return null;
}

/**
 * Sort list chronologically when values represent periods/dates, or preserve logical order
 */
export function sortChronologicalOrCategorical(list, isDateOrPeriodHint = false) {
  if (!list || list.length <= 1) return list;

  const keys = list.map(item => parseChronologicalSortKey(item));
  const validKeyCount = keys.filter(k => k !== null).length;

  if (isDateOrPeriodHint || (validKeyCount / list.length >= 0.5)) {
    return [...list].sort((a, b) => {
      const keyA = parseChronologicalSortKey(a);
      const keyB = parseChronologicalSortKey(b);
      if (keyA !== null && keyB !== null) return keyA - keyB;
      if (keyA !== null) return -1;
      if (keyB !== null) return 1;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }

  return list;
}

/**
 * Robust Data Aggregation Engine
 * Groups tabular data by dimension(s) and aggregates a metric
 * 
 * @param {Array<Array>} rows - Tabular data rows
 * @param {Array<string>} headers - Column names
 * @param {string} xCol - Dimension column
 * @param {string} yCol - Metric column ('__count__' | '__pct__' | '__distinct__' | column name)
 * @param {string} groupCol - Optional breakdown column
 * @param {string} method - 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median'
 */
export function aggregateDataset({ 
  rows = [], 
  headers = [], 
  xCol, 
  yCol = '__count__', 
  groupCol = null, 
  groupCols = [], 
  method = 'count',
  presentation = 'composite',
  topN = 15
}) {
  let activeGroupCols = Array.isArray(groupCols) ? [...groupCols] : [];
  if (activeGroupCols.length === 0 && groupCol && groupCol !== '__none__') {
    activeGroupCols = [groupCol];
  }
  activeGroupCols = activeGroupCols.filter(c => c && c !== '__none__');

  const xIdx = headers.indexOf(xCol);
  const isCalcMeasure = ['__count__', '__pct__', '__distinct__'].includes(yCol);
  const yIdx = !isCalcMeasure ? headers.indexOf(yCol) : -1;
  const isGrouped = activeGroupCols.length > 0;

  if (xIdx === -1) {
    return { series: [], categories: [], groups: [], isGrouped: false, totalRecords: 0 };
  }

  // Small Multiples / Facets mode
  if (presentation === 'facets' && activeGroupCols.length >= 1) {
    const facetCol = activeGroupCols[0];
    const facetIdx = headers.indexOf(facetCol);
    const subGroupCols = activeGroupCols.slice(1);

    const facetBuckets = new Map();
    rows.forEach(r => {
      if (!r) return;
      const rawFacet = r[facetIdx];
      const facetVal = !isMissing(rawFacet) ? String(rawFacet).trim() : '(Missing)';
      if (!facetBuckets.has(facetVal)) {
        facetBuckets.set(facetVal, []);
      }
      facetBuckets.get(facetVal).push(r);
    });

    const facetEntries = Array.from(facetBuckets.entries()).sort((a, b) => b[1].length - a[1].length);
    const activeFacets = facetEntries.slice(0, 6).map(([facetVal, fRows]) => {
      const subAgg = aggregateDataset({
        rows: fRows,
        headers,
        xCol,
        yCol,
        groupCols: subGroupCols,
        method,
        presentation: 'composite'
      });
      return {
        facetVal,
        facetCol,
        recordCount: fRows.length,
        aggregation: subAgg
      };
    });

    return {
      isFacets: true,
      facets: activeFacets,
      facetCol,
      xCol,
      yCol,
      isGrouped: true,
      totalRecords: rows.length
    };
  }

  const gIndices = activeGroupCols.map(c => headers.indexOf(c));

  // First pass: aggregate counts to find Top-N composite keys if cardinality is high
  const compositeCounts = new Map();
  rows.forEach(r => {
    if (!r) return;
    const rawX = r[xIdx];
    if (isMissing(rawX)) return;

    let compKey = '__default__';
    if (isGrouped) {
      const parts = gIndices.map(idx => {
        if (idx === -1) return '(Missing)';
        const val = r[idx];
        return !isMissing(val) ? String(val).trim() : '(Missing)';
      });
      compKey = parts.join(' | ');
    }
    compositeCounts.set(compKey, (compositeCounts.get(compKey) || 0) + 1);
  });

  let allowedGroups = Array.from(compositeCounts.keys());
  let hasOther = false;
  if (isGrouped && allowedGroups.length > topN) {
    allowedGroups.sort((a, b) => compositeCounts.get(b) - compositeCounts.get(a));
    const topKeys = new Set(allowedGroups.slice(0, topN - 1));
    allowedGroups = Array.from(topKeys);
    allowedGroups.push(`Other (${compositeCounts.size - topN + 1})`);
    hasOther = true;
  }

  const allowedGroupsSet = new Set(allowedGroups);
  const groupsSet = new Set();
  const aggMap = new Map();
  let totalValidRecords = 0;

  rows.forEach(row => {
    if (!row) return;
    const rawX = row[xIdx];
    if (isMissing(rawX)) return;
    const xVal = String(rawX).trim();
    totalValidRecords++;

    let gVal = '__default__';
    if (isGrouped) {
      const parts = gIndices.map(idx => {
        if (idx === -1) return '(Missing)';
        const val = row[idx];
        return !isMissing(val) ? String(val).trim() : '(Missing)';
      });
      const rawComp = parts.join(' | ');
      if (hasOther && !allowedGroupsSet.has(rawComp)) {
        gVal = `Other (${compositeCounts.size - topN + 1})`;
      } else {
        gVal = rawComp;
      }
    }
    groupsSet.add(gVal);

    if (!aggMap.has(xVal)) {
      aggMap.set(xVal, new Map());
    }
    const gMap = aggMap.get(xVal);
    if (!gMap.has(gVal)) {
      gMap.set(gVal, { count: 0, sum: 0, min: Infinity, max: -Infinity, values: [], distinctVals: new Set() });
    }

    const cell = gMap.get(gVal);
    cell.count += 1;

    if (yIdx !== -1) {
      const rawVal = row[yIdx];
      if (!isMissing(rawVal)) {
        cell.distinctVals.add(String(rawVal).trim());
        const num = parseNum(rawVal);
        if (num !== null) {
          cell.sum += num;
          cell.min = Math.min(cell.min, num);
          cell.max = Math.max(cell.max, num);
          cell.values.push(num);
        }
      }
    }
  });

  const rawCategories = Array.from(aggMap.keys());
  const xNorm = String(xCol || '').toUpperCase();
  const isXDate = /(DATE|PERIOD|YEAR|QUARTER|MONTH|TIME|DAY|FY)/.test(xNorm);
  const categories = sortChronologicalOrCategorical(rawCategories, isXDate);

  const rawGroups = isGrouped ? Array.from(groupsSet) : ['__default__'];
  let groups = rawGroups;
  if (isGrouped) {
    const regular = rawGroups.filter(g => !g.startsWith('Other ('));
    const others = rawGroups.filter(g => g.startsWith('Other ('));
    const isGDate = activeGroupCols.some(c => /(DATE|PERIOD|YEAR|QUARTER|MONTH|TIME|DAY|FY)/.test(String(c).toUpperCase()));
    groups = [...sortChronologicalOrCategorical(regular, isGDate), ...others];
  }

  // Calculate final aggregated metric for each category and group
  const series = categories.map(cat => {
    const gMap = aggMap.get(cat);
    const groupMetrics = {};
    let totalVal = 0;

    groups.forEach(grp => {
      const cell = gMap ? gMap.get(grp) : null;
      let metricVal = 0;
      if (cell) {
        if (yCol === '__count__') {
          metricVal = cell.count;
        } else if (yCol === '__pct__') {
          metricVal = totalValidRecords > 0 ? (cell.count / totalValidRecords) * 100 : 0;
        } else if (yCol === '__distinct__') {
          metricVal = cell.distinctVals.size || cell.count;
        } else if (method === 'sum') {
          metricVal = cell.sum;
        } else if (method === 'avg') {
          metricVal = cell.values.length > 0 ? (cell.sum / cell.values.length) : 0;
        } else if (method === 'min') {
          metricVal = cell.min !== Infinity ? cell.min : 0;
        } else if (method === 'max') {
          metricVal = cell.max !== -Infinity ? cell.max : 0;
        } else if (method === 'median') {
          if (cell.values.length > 0) {
            const sorted = [...cell.values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            metricVal = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          } else {
            metricVal = 0;
          }
        } else if (method === 'count') {
          metricVal = cell.values.length > 0 ? cell.values.length : cell.count;
        }
      }
      groupMetrics[grp] = metricVal;
      totalVal += metricVal;
    });

    return {
      category: cat,
      value: groupMetrics['__default__'] !== undefined ? groupMetrics['__default__'] : totalVal,
      groupMetrics,
      total: totalVal
    };
  });

  return { 
    series, 
    categories, 
    groups, 
    isGrouped, 
    totalRecords: totalValidRecords,
    activeGroupCols,
    hasOther
  };
}

/**
 * Compute nice numerical binning for Histograms
 */
export function computeBins(values, numBins = 7) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number);
  if (valid.length === 0) return [];

  const min = Math.min(...valid);
  const max = Math.max(...valid);

  if (min === max) {
    return [{
      binStart: min,
      binEnd: max,
      label: formatMetricNumber(min),
      count: valid.length,
      percentage: 100
    }];
  }

  const rawStep = (max - min) / numBins;
  // Compute nice round step
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let niceStep = 1;
  if (normalized > 5) niceStep = 10;
  else if (normalized > 2) niceStep = 5;
  else if (normalized > 1) niceStep = 2;
  const step = niceStep * magnitude;

  const start = Math.floor(min / step) * step;
  const bins = [];
  let cur = start;

  while (cur <= max + 0.00001) {
    const next = cur + step;
    bins.push({
      binStart: cur,
      binEnd: next,
      label: `${formatCompactNumber(cur)} - ${formatCompactNumber(next)}`,
      count: 0,
      percentage: 0
    });
    cur = next;
  }

  // Count items into bins
  valid.forEach(v => {
    let placed = false;
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i];
      if (i === bins.length - 1 ? (v >= b.binStart && v <= b.binEnd) : (v >= b.binStart && v < b.binEnd)) {
        b.count++;
        placed = true;
        break;
      }
    }
    if (!placed && bins.length > 0) {
      bins[bins.length - 1].count++;
    }
  });

  bins.forEach(b => {
    b.percentage = (b.count / valid.length) * 100;
  });

  return bins;
}

/**
 * Compute complete Five-Number Summary + Outliers for Box Plots
 */
export function computeBoxPlotStats(values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number).sort((a, b) => a - b);
  if (valid.length === 0) return null;

  const n = valid.length;
  const min = valid[0];
  const max = valid[n - 1];

  function getPercentile(p) {
    const index = (n - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return valid[lower];
    return valid[lower] * (1 - weight) + valid[upper] * weight;
  }

  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;
  const mean = valid.reduce((a, b) => a + b, 0) / n;

  // Tukey fences for outliers
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = valid.filter(v => v < lowerFence || v > upperFence);

  return {
    count: n,
    min,
    max,
    q1,
    median,
    q3,
    iqr,
    mean,
    lowerFence,
    upperFence,
    outliers
  };
}

/**
 * Compute linear regression line for scatter plots
 */
export function computeLinearRegression(points) {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  });

  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation r and R2
  const rDenom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = rDenom !== 0 ? (n * sumXY - sumX * sumY) / rDenom : 0;
  const r2 = r * r;

  return { slope, intercept, r, r2 };
}

// =============================================================================
// SVG CHART RENDERERS (Crisp, Responsive, Pure Native SVG)
// =============================================================================

/**
 * 1. VERTICAL BAR CHART
 */
export function renderSvgBarChart({
  data = [],
  xLabel = '',
  yLabel = '',
  color = '#f97316',
  height = 280,
  width = 600,
  showAvgLine = true
}) {
  if (!data || data.length === 0) {
    return `<div class="chart-empty-state">No categorical data available to chart</div>`;
  }

  const padding = { top: 30, right: 25, bottom: 55, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 0);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const yRange = maxVal > minVal ? maxVal - minVal : (maxVal > 0 ? maxVal : 1);
  const niceMax = maxVal === 0 ? 1 : maxVal * 1.12;

  const totalSum = data.reduce((acc, d) => acc + d.value, 0);
  const avgVal = data.length > 0 ? totalSum / data.length : 0;

  // Bar dimensions
  const barSpacing = chartW / data.length;
  const barWidth = Math.min(48, Math.max(12, barSpacing * 0.65));

  // Y-axis grid lines (4 ticks)
  const ticks = [0, niceMax * 0.33, niceMax * 0.66, niceMax];

  const yTicksSvg = ticks.map(t => {
    const yPos = padding.top + chartH - (t / niceMax) * chartH;
    return `
      <g class="chart-grid-line">
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  // Bars
  const barsSvg = data.map((d, i) => {
    const barH = (d.value / niceMax) * chartH;
    const xPos = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
    const yPos = padding.top + chartH - barH;
    const labelX = xPos + barWidth / 2;
    const labelY = padding.top + chartH + 18;
    const truncLabel = d.category.length > 11 ? d.category.slice(0, 10) + '…' : d.category;
    const pct = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : 0;

    return `
      <g class="chart-bar-group" 
         data-tooltip-title="${escapeSvg(d.category)}"
         data-tooltip-metric="${formatMetricNumber(d.value)}"
         data-tooltip-sub="${pct}% of total (${yLabel || 'Value'})">
        <rect 
          x="${xPos}" 
          y="${yPos}" 
          width="${barWidth}" 
          height="${Math.max(2, barH)}" 
          fill="${color}" 
          rx="4" 
          class="interactive-bar"
        />
        <text 
          x="${labelX}" 
          y="${Math.max(padding.top + 12, yPos - 6)}" 
          font-size="11" 
          font-weight="600" 
          fill="#475569" 
          text-anchor="middle"
        >
          ${formatCompactNumber(d.value)}
        </text>
        <text 
          x="${labelX}" 
          y="${labelY}" 
          font-size="11" 
          fill="#64748b" 
          text-anchor="middle" 
          transform="rotate(${data.length > 6 ? -25 : 0}, ${labelX}, ${labelY})"
        >
          ${escapeSvg(truncLabel)}
        </text>
      </g>
    `;
  }).join('');

  // Average benchmark line
  let avgLineSvg = '';
  if (showAvgLine && avgVal > 0 && data.length > 1) {
    const avgY = padding.top + chartH - (avgVal / niceMax) * chartH;
    avgLineSvg = `
      <g class="chart-avg-line">
        <line x1="${padding.left}" y1="${avgY}" x2="${width - padding.right}" y2="${avgY}" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="4 4"/>
        <text x="${width - padding.right}" y="${avgY - 6}" font-size="10" font-weight="600" fill="#ea580c" text-anchor="end">Avg: ${formatCompactNumber(avgVal)}</text>
      </g>
    `;
  }

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Vertical Bar Chart">
        ${yTicksSvg}
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${barsSvg}
        ${avgLineSvg}
        ${yLabel ? `<text x="${padding.left}" y="16" font-size="11" font-weight="600" fill="#64748b">${escapeSvg(yLabel)}</text>` : ''}
      </svg>
    </div>
  `;
}

/**
 * 2. HORIZONTAL RANKING BAR CHART (Ideal for long category names & top/bottom ranking)
 */
export function renderSvgHorizontalBarChart({
  data = [],
  metricLabel = 'Value',
  color = '#f97316',
  height = 300,
  width = 600,
  maxBars = 10
}) {
  if (!data || data.length === 0) {
    return `<div class="chart-empty-state">No ranking data available</div>`;
  }

  // Sort descending and take top N
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);
  const maxVal = Math.max(...sorted.map(d => d.value), 0);
  const niceMax = maxVal === 0 ? 1 : maxVal * 1.15;
  const totalSum = data.reduce((acc, d) => acc + d.value, 0);

  const calculatedHeight = Math.max(height, sorted.length * 36 + 50);
  const padding = { top: 25, right: 65, bottom: 25, left: 130 };
  const chartW = width - padding.left - padding.right;
  const chartH = calculatedHeight - padding.top - padding.bottom;
  const rowHeight = chartH / sorted.length;
  const barHeight = Math.min(22, rowHeight * 0.65);

  const rowsSvg = sorted.map((d, i) => {
    const barW = Math.max(3, (d.value / niceMax) * chartW);
    const yPos = padding.top + i * rowHeight + (rowHeight - barHeight) / 2;
    const truncLabel = d.category.length > 16 ? d.category.slice(0, 15) + '…' : d.category;
    const pct = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : 0;
    const rankColor = i === 0 ? '#ea580c' : (i < 3 ? '#f97316' : '#94a3b8');

    return `
      <g class="chart-hbar-row"
         data-tooltip-title="${escapeSvg(d.category)}"
         data-tooltip-metric="${formatMetricNumber(d.value)}"
         data-tooltip-sub="Rank #${i + 1} &bull; ${pct}% of total">
        <!-- Rank Badge -->
        <circle cx="${padding.left - 116}" cy="${yPos + barHeight / 2}" r="9" fill="${rankColor}" opacity="0.15"/>
        <text x="${padding.left - 116}" y="${yPos + barHeight / 2 + 3.5}" font-size="10" font-weight="700" fill="${rankColor}" text-anchor="middle">${i + 1}</text>
        
        <!-- Category Label -->
        <text x="${padding.left - 12}" y="${yPos + barHeight / 2 + 4}" font-size="12" font-weight="500" fill="#334155" text-anchor="end" title="${escapeSvg(d.category)}">
          ${escapeSvg(truncLabel)}
        </text>

        <!-- Track & Bar -->
        <rect x="${padding.left}" y="${yPos}" width="${chartW}" height="${barHeight}" fill="#f1f5f9" rx="3"/>
        <rect x="${padding.left}" y="${yPos}" width="${barW}" height="${barHeight}" fill="${color}" rx="3" class="interactive-bar"/>
        
        <!-- Value Label -->
        <text x="${padding.left + barW + 8}" y="${yPos + barHeight / 2 + 4}" font-size="11" font-weight="700" fill="#0f172a">
          ${formatCompactNumber(d.value)}
        </text>
      </g>
    `;
  }).join('');

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${calculatedHeight}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Horizontal Ranking Chart">
        <!-- Baseline -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${calculatedHeight - padding.bottom}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${rowsSvg}
      </svg>
    </div>
  `;
}

/**
 * 3. DONUT / PROPORTIONAL CHART (Category Share & Distribution)
 */
export function renderSvgDonutChart({
  data = [],
  metricLabel = 'Distribution',
  size = 320,
  innerRadiusRatio = 0.58
}) {
  if (!data || data.length === 0) {
    return `<div class="chart-empty-state">No distribution data available</div>`;
  }

  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return `<div class="chart-empty-state">All values are zero</div>`;
  }

  const isPie = innerRadiusRatio <= 0.05;

  // Aggregate top 6 categories + "Other" if there are many
  let chartData = [...data].sort((a, b) => b.value - a.value);
  if (chartData.length > 7) {
    const top = chartData.slice(0, 6);
    const otherVal = chartData.slice(6).reduce((a, b) => a + b.value, 0);
    top.push({ category: 'Other Categories', value: otherVal });
    chartData = top;
  }

  const center = size / 2;
  const radius = size * 0.42;
  const innerRadius = isPie ? 0 : radius * innerRadiusRatio;

  let currentAngle = -Math.PI / 2; // Start from 12 o'clock

  const slicesSvg = chartData.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const sliceColor = PALETTE[i % PALETTE.length];
    const pct = ((d.value / total) * 100).toFixed(1);

    // Path for slice
    let pathD = '';
    if (isPie) {
      pathD = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
    } else {
      const ix1 = center + innerRadius * Math.cos(endAngle);
      const iy1 = center + innerRadius * Math.sin(endAngle);
      const ix2 = center + innerRadius * Math.cos(startAngle);
      const iy2 = center + innerRadius * Math.sin(startAngle);
      pathD = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z'
      ].join(' ');
    }

    return `
      <path 
        d="${pathD}" 
        fill="${sliceColor}" 
        stroke="#ffffff" 
        stroke-width="2" 
        class="donut-slice"
        data-tooltip-title="${escapeSvg(d.category)}"
        data-tooltip-metric="${formatMetricNumber(d.value)}"
        data-tooltip-sub="${pct}% share of total"
      />
    `;
  }).join('');

  // Legend Items
  const legendHtml = chartData.map((d, i) => {
    const sliceColor = PALETTE[i % PALETTE.length];
    const pct = ((d.value / total) * 100).toFixed(1);
    return `
      <div class="donut-legend-item" 
           data-tooltip-title="${escapeSvg(d.category)}"
           data-tooltip-metric="${formatMetricNumber(d.value)}"
           data-tooltip-sub="${pct}% share">
        <span class="legend-color-dot" style="background-color: ${sliceColor};"></span>
        <span class="legend-label" title="${escapeSvg(d.category)}">${escapeSvg(d.category)}</span>
        <span class="legend-value">${pct}%</span>
      </div>
    `;
  }).join('');

  return `
    <div class="donut-chart-container">
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 ${size} ${size}" class="dashboard-donut-svg" role="img" aria-label="${isPie ? 'Pie Chart' : 'Donut Chart'}">
          <g>${slicesSvg}</g>
          ${!isPie ? `
            <!-- Center Callout -->
            <circle cx="${center}" cy="${center}" r="${Math.max(1, innerRadius - 4)}" fill="#ffffff" />
            <text x="${center}" y="${center - 6}" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle" text-transform="uppercase">Total</text>
            <text x="${center}" y="${center + 16}" font-size="18" font-weight="700" fill="#0f172a" text-anchor="middle">${formatCompactNumber(total)}</text>
          ` : ''}
        </svg>
      </div>
      <div class="donut-legend-tray">
        ${legendHtml}
      </div>
    </div>
  `;
}

/**
 * Classical Pie Chart (Helper for renderSvgDonutChart with innerRadiusRatio = 0)
 */
export function renderSvgPieChart(props) {
  return renderSvgDonutChart({ ...props, innerRadiusRatio: 0 });
}

/**
 * 4. TIME-SERIES LINE & AREA CHART
 */
export function renderSvgLineChart({
  data = [],
  xLabel = 'Timeline',
  yLabel = 'Metric',
  color = '#f97316',
  height = 280,
  width = 620,
  showPoints = true,
  isArea = false
}) {
  if (!data || data.length === 0) {
    return `<div class="chart-empty-state">No temporal trend data available</div>`;
  }

  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 0);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const niceMax = maxVal === 0 ? 1 : maxVal * 1.15;
  const baseZero = minVal >= 0;
  const niceMin = baseZero ? 0 : minVal * 1.1;
  const valSpan = niceMax - niceMin || 1;

  // X coordinate calculation
  const getX = (i) => padding.left + (i / Math.max(1, data.length - 1)) * chartW;
  const getY = (v) => padding.top + chartH - ((v - niceMin) / valSpan) * chartH;

  // Build points
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    category: d.category,
    value: d.value
  }));

  // Line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Area path (closed at baseline)
  const baseY = getY(0);
  const areaPath = [
    linePath,
    `L ${points[points.length - 1].x.toFixed(1)} ${baseY}`,
    `L ${points[0].x.toFixed(1)} ${baseY}`,
    'Z'
  ].join(' ');

  // Y-axis grid
  const ticks = [niceMin, niceMin + valSpan * 0.33, niceMin + valSpan * 0.66, niceMax];
  const yTicksSvg = ticks.map(t => {
    const yPos = getY(t);
    return `
      <g class="chart-grid-line">
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  // X-axis ticks (sample if too dense)
  const step = Math.max(1, Math.ceil(data.length / 8));
  const xTicksSvg = points.filter((_, i) => i % step === 0 || i === points.length - 1).map(p => {
    const trunc = p.category.length > 10 ? p.category.slice(0, 9) + '…' : p.category;
    return `
      <text x="${p.x}" y="${padding.top + chartH + 20}" font-size="11" fill="#64748b" text-anchor="middle">${escapeSvg(trunc)}</text>
    `;
  }).join('');

  // Gradient ID
  const gradId = `area-grad-${Math.random().toString(36).substring(2, 8)}`;

  // Points dots
  const dotsSvg = showPoints ? points.map(p => `
    <circle 
      cx="${p.x}" 
      cy="${p.y}" 
      r="4.5" 
      fill="${color}" 
      stroke="#ffffff" 
      stroke-width="2" 
      class="interactive-dot"
      data-tooltip-title="${escapeSvg(p.category)}"
      data-tooltip-metric="${formatMetricNumber(p.value)}"
      data-tooltip-sub="${yLabel || 'Trend Point'}"
    />
  `).join('') : '';

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="${isArea ? 'Area Chart' : 'Time Series Line Chart'}">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="${isArea ? '0.52' : '0.28'}"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="${isArea ? '0.08' : '0.0'}"/>
          </linearGradient>
        </defs>
        ${yTicksSvg}
        <line x1="${padding.left}" y1="${baseY}" x2="${width - padding.right}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1.5"/>
        <path d="${areaPath}" fill="url(#${gradId})"/>
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="${isArea ? '3' : '2.5'}" stroke-linecap="round" stroke-linejoin="round"/>
        ${dotsSvg}
        ${xTicksSvg}
        ${yLabel ? `<text x="${padding.left}" y="16" font-size="11" font-weight="600" fill="#64748b">${escapeSvg(yLabel)}</text>` : ''}
      </svg>
    </div>
  `;
}

/**
 * Area Chart (Helper for renderSvgLineChart with isArea = true)
 */
export function renderSvgAreaChart(props) {
  return renderSvgLineChart({ ...props, isArea: true });
}

/**
 * 5. HISTOGRAM WITH DISTRIBUTION CURVE
 */
export function renderSvgHistogram({
  values = [],
  metricName = 'Value',
  binsCount = 7,
  color = '#0284c7',
  height = 280,
  width = 620
}) {
  const bins = computeBins(values, binsCount);
  if (!bins || bins.length === 0) {
    return `<div class="chart-empty-state">Insufficient numerical variance for histogram</div>`;
  }

  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number);
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const padding = { top: 30, right: 30, bottom: 55, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxCount = Math.max(...bins.map(b => b.count), 0);
  const niceMax = maxCount === 0 ? 1 : maxCount * 1.15;
  const barSpacing = chartW / bins.length;
  const barWidth = Math.max(10, barSpacing - 6);

  // Y-axis grid
  const ticks = [0, Math.ceil(niceMax * 0.33), Math.ceil(niceMax * 0.66), Math.ceil(niceMax)];
  const yTicksSvg = ticks.map(t => {
    const yPos = padding.top + chartH - (t / niceMax) * chartH;
    return `
      <g class="chart-grid-line">
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${t}</text>
      </g>
    `;
  }).join('');

  // Bins bars
  const barsSvg = bins.map((b, i) => {
    const barH = (b.count / niceMax) * chartH;
    const xPos = padding.left + i * barSpacing + 3;
    const yPos = padding.top + chartH - barH;
    const labelX = xPos + barWidth / 2;
    const labelY = padding.top + chartH + 18;

    return `
      <g class="chart-hist-bin"
         data-tooltip-title="${escapeSvg(b.label)}"
         data-tooltip-metric="${b.count} records"
         data-tooltip-sub="${b.percentage.toFixed(1)}% of distribution">
        <rect 
          x="${xPos}" 
          y="${yPos}" 
          width="${barWidth}" 
          height="${Math.max(2, barH)}" 
          fill="${color}" 
          rx="3" 
          class="interactive-bar"
        />
        <text x="${labelX}" y="${Math.max(padding.top + 12, yPos - 5)}" font-size="10" font-weight="600" fill="#475569" text-anchor="middle">${b.count}</text>
        <text x="${labelX}" y="${labelY}" font-size="10" fill="#64748b" text-anchor="middle" transform="rotate(-20, ${labelX}, ${labelY})">${escapeSvg(b.label)}</text>
      </g>
    `;
  }).join('');

  // Distribution curve points (spline overlay across bin tops)
  const curvePoints = bins.map((b, i) => {
    const barH = (b.count / niceMax) * chartH;
    return {
      x: padding.left + i * barSpacing + barWidth / 2 + 3,
      y: padding.top + chartH - barH
    };
  });
  const curvePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Mean indicator line
  const minVal = bins[0].binStart;
  const maxVal = bins[bins.length - 1].binEnd;
  const span = maxVal - minVal || 1;
  const meanX = padding.left + ((mean - minVal) / span) * chartW;

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Numerical Histogram">
        ${yTicksSvg}
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${barsSvg}
        <path d="${curvePath}" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="3 3"/>
        ${meanX >= padding.left && meanX <= width - padding.right ? `
          <line x1="${meanX}" y1="${padding.top}" x2="${meanX}" y2="${padding.top + chartH}" stroke="#dc2626" stroke-width="1.5"/>
          <text x="${meanX + 4}" y="${padding.top + 14}" font-size="10" font-weight="700" fill="#dc2626">Mean: ${formatCompactNumber(mean)}</text>
        ` : ''}
        <text x="${padding.left}" y="16" font-size="11" font-weight="600" fill="#64748b">Frequency Count (${escapeSvg(metricName)})</text>
      </svg>
    </div>
  `;
}

/**
 * 6. BOX PLOT (Five-Number Summary: Min, Q1, Median, Q3, Max, Outliers)
 */
export function renderSvgBoxPlot({
  values = [],
  metricName = 'Measure',
  color = '#8b5cf6',
  height = 240,
  width = 600
}) {
  const stats = computeBoxPlotStats(values);
  if (!stats) {
    return `<div class="chart-empty-state">Insufficient numerical data for box plot</div>`;
  }

  const padding = { top: 35, right: 40, bottom: 45, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minVal = Math.min(stats.min, stats.lowerFence);
  const maxVal = Math.max(stats.max, stats.upperFence);
  const valSpan = maxVal - minVal || 1;
  const niceMin = minVal >= 0 ? 0 : minVal * 1.05;
  const niceMax = maxVal * 1.05;
  const span = niceMax - niceMin || 1;

  const getX = (v) => padding.left + ((v - niceMin) / span) * chartW;
  const centerY = padding.top + chartH / 2;
  const boxHeight = 44;

  const xMin = getX(stats.min);
  const xQ1 = getX(stats.q1);
  const xMed = getX(stats.median);
  const xQ3 = getX(stats.q3);
  const xMax = getX(stats.max);
  const xMean = getX(stats.mean);

  // Ticks along the horizontal axis
  const ticks = [niceMin, niceMin + span * 0.25, niceMin + span * 0.5, niceMin + span * 0.75, niceMax];
  const axisTicksSvg = ticks.map(t => {
    const xPos = getX(t);
    return `
      <g>
        <line x1="${xPos}" y1="${padding.top + chartH}" x2="${xPos}" y2="${padding.top + chartH + 5}" stroke="#94a3b8" stroke-width="1"/>
        <text x="${xPos}" y="${padding.top + chartH + 18}" font-size="11" fill="#64748b" text-anchor="middle">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  // Outliers
  const outliersSvg = stats.outliers.map(o => `
    <circle 
      cx="${getX(o)}" 
      cy="${centerY}" 
      r="4" 
      fill="#ef4444" 
      stroke="#ffffff" 
      stroke-width="1.5"
      data-tooltip-title="Outlier Value"
      data-tooltip-metric="${formatMetricNumber(o)}"
      data-tooltip-sub="Exceeds 1.5 &times; IQR threshold"
    />
  `).join('');

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Box Plot">
        <!-- Scale Axis -->
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${axisTicksSvg}

        <!-- Whisker lines -->
        <line x1="${xMin}" y1="${centerY}" x2="${xQ1}" y2="${centerY}" stroke="#64748b" stroke-width="2"/>
        <line x1="${xQ3}" y1="${centerY}" x2="${xMax}" y2="${centerY}" stroke="#64748b" stroke-width="2"/>
        
        <!-- Min/Max end caps -->
        <line x1="${xMin}" y1="${centerY - 12}" x2="${xMin}" y2="${centerY + 12}" stroke="#64748b" stroke-width="2"/>
        <line x1="${xMax}" y1="${centerY - 12}" x2="${xMax}" y2="${centerY + 12}" stroke="#64748b" stroke-width="2"/>

        <!-- IQR Box (Q1 to Q3) -->
        <rect 
          x="${xQ1}" 
          y="${centerY - boxHeight / 2}" 
          width="${Math.max(2, xQ3 - xQ1)}" 
          height="${boxHeight}" 
          fill="${color}" 
          fill-opacity="0.22" 
          stroke="${color}" 
          stroke-width="2" 
          rx="4"
          data-tooltip-title="${escapeSvg(metricName)} (IQR)"
          data-tooltip-metric="Q1: ${formatMetricNumber(stats.q1)} &bull; Q3: ${formatMetricNumber(stats.q3)}"
          data-tooltip-sub="IQR: ${formatMetricNumber(stats.iqr)}"
        />

        <!-- Median Line -->
        <line x1="${xMed}" y1="${centerY - boxHeight / 2}" x2="${xMed}" y2="${centerY + boxHeight / 2}" stroke="#7c3aed" stroke-width="3"/>
        
        <!-- Mean Marker (Diamond) -->
        <polygon 
          points="${xMean},${centerY - 8} ${xMean + 7},${centerY} ${xMean},${centerY + 8} ${xMean - 7},${centerY}" 
          fill="#ea580c" 
          stroke="#ffffff" 
          stroke-width="1.5"
          data-tooltip-title="Mean (Average)"
          data-tooltip-metric="${formatMetricNumber(stats.mean)}"
          data-tooltip-sub="Arithmetic average across ${stats.count} records"
        />

        <!-- Stat labels -->
        <text x="${xMin}" y="${centerY - 18}" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">Min: ${formatCompactNumber(stats.min)}</text>
        <text x="${xMed}" y="${centerY - 28}" font-size="10" font-weight="700" fill="#7c3aed" text-anchor="middle">Med: ${formatCompactNumber(stats.median)}</text>
        <text x="${xMax}" y="${centerY - 18}" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">Max: ${formatCompactNumber(stats.max)}</text>

        ${outliersSvg}
        <text x="${padding.left}" y="18" font-size="11" font-weight="600" fill="#64748b">${escapeSvg(metricName)}: Five-Number Distribution</text>
      </svg>
    </div>
  `;
}

/**
 * 7. SCATTER PLOT WITH REGRESSION TRENDLINE (Numerical Relationships)
 */
export function renderSvgScatterPlot({
  rows = [],
  headers = [],
  xCol,
  yCol,
  color = '#0284c7',
  height = 300,
  width = 620
}) {
  const xIdx = headers.indexOf(xCol);
  const yIdx = headers.indexOf(yCol);

  if (xIdx === -1 || yIdx === -1) {
    return `<div class="chart-empty-state">Invalid columns for scatter plot</div>`;
  }

  const points = [];
  rows.forEach(r => {
    if (!r) return;
    const x = parseNum(r[xIdx]);
    const y = parseNum(r[yIdx]);
    if (x !== null && y !== null) {
      points.push({ x, y });
    }
  });

  if (points.length < 2) {
    return `<div class="chart-empty-state">Insufficient pairs for scatter analysis</div>`;
  }

  const padding = { top: 30, right: 30, bottom: 50, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const niceMinX = minX >= 0 ? 0 : minX * 1.05;
  const niceMaxX = maxX * 1.08;
  const niceMinY = minY >= 0 ? 0 : minY * 1.05;
  const niceMaxY = maxY * 1.08;

  const rangeX = niceMaxX - niceMinX || 1;
  const rangeY = niceMaxY - niceMinY || 1;

  const getSvgX = (x) => padding.left + ((x - niceMinX) / rangeX) * chartW;
  const getSvgY = (y) => padding.top + chartH - ((y - niceMinY) / rangeY) * chartH;

  // Linear Regression
  const reg = computeLinearRegression(points);

  let trendlineSvg = '';
  if (reg) {
    const startXVal = niceMinX;
    const endXVal = niceMaxX;
    const startYVal = reg.slope * startXVal + reg.intercept;
    const endYVal = reg.slope * endXVal + reg.intercept;

    const x1 = getSvgX(startXVal);
    const y1 = getSvgY(startYVal);
    const x2 = getSvgX(endXVal);
    const y2 = getSvgY(endYVal);

    trendlineSvg = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ea580c" stroke-width="2" stroke-dasharray="4 4"/>
    `;
  }

  // Ticks
  const xTicks = [niceMinX, niceMinX + rangeX * 0.5, niceMaxX];
  const yTicks = [niceMinY, niceMinY + rangeY * 0.5, niceMaxY];

  const xTicksSvg = xTicks.map(t => {
    const xPos = getSvgX(t);
    return `
      <g>
        <line x1="${xPos}" y1="${padding.top + chartH}" x2="${xPos}" y2="${padding.top + chartH + 5}" stroke="#94a3b8"/>
        <text x="${xPos}" y="${padding.top + chartH + 18}" font-size="11" fill="#64748b" text-anchor="middle">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  const yTicksSvg = yTicks.map(t => {
    const yPos = getSvgY(t);
    return `
      <g>
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  const dotsSvg = points.map(p => {
    const cx = getSvgX(p.x);
    const cy = getSvgY(p.y);
    return `
      <circle 
        cx="${cx}" 
        cy="${cy}" 
        r="4.5" 
        fill="${color}" 
        fill-opacity="0.7" 
        stroke="#ffffff" 
        stroke-width="1.5"
        class="interactive-dot"
        data-tooltip-title="${escapeSvg(xCol)} vs ${escapeSvg(yCol)}"
        data-tooltip-metric="${xCol}: ${formatMetricNumber(p.x)}"
        data-tooltip-sub="${yCol}: ${formatMetricNumber(p.y)}"
      />
    `;
  }).join('');

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Scatter Plot">
        ${yTicksSvg}
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${xTicksSvg}
        ${trendlineSvg}
        ${dotsSvg}
        <!-- Titles and Labels -->
        <text x="${width / 2}" y="${height - 6}" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle">${escapeSvg(xCol)}</text>
        <text x="14" y="${height / 2}" font-size="11" font-weight="600" fill="#64748b" text-anchor="middle" transform="rotate(-90, 14, ${height / 2})">${escapeSvg(yCol)}</text>
        ${reg ? `
          <text x="${width - padding.right}" y="18" font-size="11" font-weight="600" fill="#ea580c" text-anchor="end">
            Trendline: r = ${reg.r >= 0 ? '+' : ''}${reg.r.toFixed(2)} (R&sup2; = ${reg.r2.toFixed(2)})
          </text>
        ` : ''}
      </svg>
    </div>
  `;
}

/**
 * 8. CORRELATION HEATMAP (Pairwise numerical matrix)
 */
export function renderSvgCorrelationHeatmap({
  numericalColumns = [],
  correlations = [],
  size = 360
}) {
  if (!numericalColumns || numericalColumns.length < 2) {
    return `<div class="chart-empty-state">At least 2 numerical columns required for correlation heatmap</div>`;
  }

  // Build matrix lookup
  const cols = numericalColumns.slice(0, 6); // cap at 6 to keep cells clear
  const n = cols.length;

  const corrMap = new Map();
  correlations.forEach(c => {
    corrMap.set(`${c.colA}__${c.colB}`, c.r);
    corrMap.set(`${c.colB}__${c.colA}`, c.r);
  });

  const padding = { top: 55, right: 25, bottom: 25, left: 95 };
  const gridW = size - padding.left - padding.right;
  const cellSize = gridW / n;

  function getColorForR(r) {
    if (r === 1) return '#ea580c';
    if (r > 0) {
      // White to Orange gradient
      const alpha = Math.min(1, Math.max(0.1, r));
      return `rgba(234, 88, 12, ${alpha.toFixed(2)})`;
    } else {
      // White to Crimson gradient
      const alpha = Math.min(1, Math.max(0.1, Math.abs(r)));
      return `rgba(220, 38, 38, ${alpha.toFixed(2)})`;
    }
  }

  const cellsSvg = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const colA = cols[i];
      const colB = cols[j];
      const r = (i === j) ? 1.0 : (corrMap.get(`${colA}__${colB}`) || 0);
      const x = padding.left + j * cellSize;
      const y = padding.top + i * cellSize;
      const cellBg = getColorForR(r);
      const textColor = Math.abs(r) > 0.5 ? '#ffffff' : '#0f172a';

      cellsSvg.push(`
        <g class="heatmap-cell"
           data-tooltip-title="${escapeSvg(colA)} &times; ${escapeSvg(colB)}"
           data-tooltip-metric="Pearson r: ${r >= 0 ? '+' : ''}${r.toFixed(2)}"
           data-tooltip-sub="${Math.abs(r) > 0.7 ? 'Strong correlation' : (Math.abs(r) > 0.3 ? 'Moderate correlation' : 'Weak or no correlation')}">
          <rect 
            x="${x + 1}" 
            y="${y + 1}" 
            width="${cellSize - 2}" 
            height="${cellSize - 2}" 
            fill="${cellBg}" 
            rx="3" 
            class="interactive-bar"
          />
          <text 
            x="${x + cellSize / 2}" 
            y="${y + cellSize / 2 + 4}" 
            font-size="11" 
            font-weight="700" 
            fill="${textColor}" 
            text-anchor="middle"
          >
            ${r.toFixed(2)}
          </text>
        </g>
      `);
    }
  }

  // Col and Row labels
  const labelsSvg = cols.map((col, idx) => {
    const trunc = col.length > 11 ? col.slice(0, 10) + '…' : col;
    const x = padding.left + idx * cellSize + cellSize / 2;
    const y = padding.top + idx * cellSize + cellSize / 2 + 4;
    return `
      <!-- Top Col Label -->
      <text x="${x}" y="${padding.top - 10}" font-size="10" font-weight="600" fill="#475569" text-anchor="middle" transform="rotate(-30, ${x}, ${padding.top - 10})">
        ${escapeSvg(trunc)}
      </text>
      <!-- Left Row Label -->
      <text x="${padding.left - 8}" y="${y}" font-size="10" font-weight="600" fill="#475569" text-anchor="end">
        ${escapeSvg(trunc)}
      </text>
    `;
  }).join('');

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Correlation Heatmap">
        ${cellsSvg.join('')}
        ${labelsSvg}
      </svg>
    </div>
  `;
}

/**
 * 9. GROUPED / STACKED BAR CHART (Multi-Categorical Variables)
 */
export function renderSvgGroupedOrStackedBarChart({
  aggregation,
  metricLabel = 'Metric',
  isStacked = false,
  height = 300,
  width = 620
}) {
  const { series = [], categories = [], groups = [] } = aggregation || {};
  if (!series || series.length === 0 || !groups || groups.length === 0 || !categories || categories.length === 0) {
    return `<div class="chart-empty-state">No multi-category data available. Select one or more series dimensions to display breakdown.</div>`;
  }

  const padding = { top: 35, right: 25, bottom: 65, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxVal = 0;
  if (isStacked) {
    maxVal = Math.max(...series.map(s => s.total), 0);
  } else {
    series.forEach(s => {
      groups.forEach(g => {
        maxVal = Math.max(maxVal, s.groupMetrics[g] || 0);
      });
    });
  }

  const niceMax = maxVal === 0 ? 1 : maxVal * 1.15;
  const catSpacing = chartW / series.length;

  // Grid ticks
  const ticks = [0, niceMax * 0.33, niceMax * 0.66, niceMax];
  const yTicksSvg = ticks.map(t => {
    const yPos = padding.top + chartH - (t / niceMax) * chartH;
    return `
      <g class="chart-grid-line">
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  let barsSvg = '';

  if (isStacked) {
    // Stacked mode
    barsSvg = series.map((s, i) => {
      const catX = padding.left + i * catSpacing + (catSpacing - Math.min(36, catSpacing * 0.7)) / 2;
      const barW = Math.min(36, catSpacing * 0.7);
      let curY = padding.top + chartH;

      const stackSegments = groups.map((g, gIdx) => {
        const val = s.groupMetrics[g] || 0;
        if (val <= 0) return '';
        const segH = (val / niceMax) * chartH;
        curY -= segH;
        const color = PALETTE[gIdx % PALETTE.length];
        return `
          <rect 
            x="${catX}" 
            y="${curY}" 
            width="${barW}" 
            height="${segH}" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="1"
            class="interactive-bar"
            data-tooltip-title="${escapeSvg(s.category)} &bull; ${escapeSvg(g)}"
            data-tooltip-metric="${formatMetricNumber(val)}"
            data-tooltip-sub="${s.total > 0 ? ((val / s.total) * 100).toFixed(1) : 0}% of category total"
          />
        `;
      }).join('');

      const labelX = catX + barW / 2;
      const labelY = padding.top + chartH + 18;
      const truncLabel = s.category.length > 10 ? s.category.slice(0, 9) + '…' : s.category;

      return `
        <g>
          ${stackSegments}
          <text x="${labelX}" y="${labelY}" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(${series.length > 5 ? -25 : 0}, ${labelX}, ${labelY})">${escapeSvg(truncLabel)}</text>
        </g>
      `;
    }).join('');
  } else {
    // Grouped mode
    const numSubBars = groups.length;
    const subBarWidth = Math.min(22, Math.max(6, (catSpacing * 0.8) / numSubBars));

    barsSvg = series.map((s, i) => {
      const catStartX = padding.left + i * catSpacing + (catSpacing - subBarWidth * numSubBars) / 2;
      const subBars = groups.map((g, gIdx) => {
        const val = s.groupMetrics[g] || 0;
        const barH = (val / niceMax) * chartH;
        const barX = catStartX + gIdx * subBarWidth;
        const barY = padding.top + chartH - barH;
        const color = PALETTE[gIdx % PALETTE.length];

        return `
          <rect 
            x="${barX}" 
            y="${barY}" 
            width="${Math.max(2, subBarWidth - 2)}" 
            height="${Math.max(2, barH)}" 
            fill="${color}" 
            rx="2"
            class="interactive-bar"
            data-tooltip-title="${escapeSvg(s.category)} &bull; ${escapeSvg(g)}"
            data-tooltip-metric="${formatMetricNumber(val)}"
            data-tooltip-sub="${metricLabel || 'Value'}"
          />
        `;
      }).join('');

      const labelX = padding.left + i * catSpacing + catSpacing / 2;
      const labelY = padding.top + chartH + 18;
      const truncLabel = s.category.length > 10 ? s.category.slice(0, 9) + '…' : s.category;

      return `
        <g>
          ${subBars}
          <text x="${labelX}" y="${labelY}" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(${series.length > 5 ? -25 : 0}, ${labelX}, ${labelY})">${escapeSvg(truncLabel)}</text>
        </g>
      `;
    }).join('');
  }

  // Legend at top
  const legendSvg = groups.map((g, gIdx) => {
    const color = PALETTE[gIdx % PALETTE.length];
    return `
      <span class="grouped-legend-badge">
        <span class="legend-color-dot" style="background-color: ${color};"></span>
        <span>${escapeSvg(g)}</span>
      </span>
    `;
  }).join('');

  return `
    <div class="grouped-chart-container">
      <div class="grouped-legend-bar">${legendSvg}</div>
      <div class="svg-chart-wrapper">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Grouped / Stacked Bar Chart">
          ${yTicksSvg}
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
          ${barsSvg}
          <text x="${padding.left}" y="16" font-size="11" font-weight="600" fill="#64748b">${escapeSvg(metricLabel)}</text>
        </svg>
      </div>
    </div>
  `;
}

/**
 * 10. MULTI-SERIES LINE & AREA CHART (For Multidimensional Analysis with Category / Series)
 */
export function renderSvgMultiLineChart({
  aggregation,
  metricLabel = 'Metric',
  isArea = false,
  height = 320,
  width = 620
}) {
  const { series = [], categories = [], groups = [] } = aggregation || {};
  if (!series || series.length === 0 || !categories || categories.length === 0 || !groups || groups.length === 0) {
    return `<div class="chart-empty-state">No multi-dimensional time-series data available</div>`;
  }

  const padding = { top: 35, right: 30, bottom: 65, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxVal = 0;
  let minVal = 0;
  series.forEach(s => {
    groups.forEach(g => {
      const v = s.groupMetrics ? (s.groupMetrics[g] || 0) : 0;
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  const niceMax = maxVal === 0 ? 1 : maxVal * 1.15;
  const niceMin = minVal >= 0 ? 0 : minVal * 1.1;
  const valSpan = niceMax - niceMin || 1;

  const getX = (i) => padding.left + (categories.length > 1 ? (i / (categories.length - 1)) * chartW : chartW / 2);
  const getY = (v) => padding.top + chartH - ((v - niceMin) / valSpan) * chartH;
  const baseY = getY(0);

  // Y-axis grid
  const ticks = [niceMin, niceMin + valSpan * 0.33, niceMin + valSpan * 0.66, niceMax];
  const yTicksSvg = ticks.map(t => {
    const yPos = getY(t);
    return `
      <g class="chart-grid-line">
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${yPos + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${formatCompactNumber(t)}</text>
      </g>
    `;
  }).join('');

  // X-axis ticks
  const step = Math.max(1, Math.ceil(categories.length / 8));
  const xTicksSvg = categories.map((cat, i) => {
    if (i % step !== 0 && i !== categories.length - 1) return '';
    const x = getX(i);
    const trunc = cat.length > 10 ? cat.slice(0, 9) + '…' : cat;
    return `
      <text x="${x}" y="${padding.top + chartH + 20}" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(${categories.length > 5 ? -25 : 0}, ${x}, ${padding.top + chartH + 20})">
        ${escapeSvg(trunc)}
      </text>
    `;
  }).join('');

  // Series lines, areas, and dots
  const seriesElements = groups.map((grp, gIdx) => {
    const color = PALETTE[gIdx % PALETTE.length];
    const gradId = `multiline-grad-${gIdx}-${Math.random().toString(36).substring(2, 6)}`;
    const pts = series.map((s, i) => {
      const val = s.groupMetrics ? (s.groupMetrics[grp] || 0) : 0;
      return {
        x: getX(i),
        y: getY(val),
        category: s.category,
        val
      };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    let areaPath = '';
    if (isArea && pts.length > 1) {
      areaPath = [
        linePath,
        `L ${pts[pts.length - 1].x.toFixed(1)} ${baseY}`,
        `L ${pts[0].x.toFixed(1)} ${baseY}`,
        'Z'
      ].join(' ');
    }

    const dots = pts.map(p => `
      <circle 
        cx="${p.x.toFixed(1)}" 
        cy="${p.y.toFixed(1)}" 
        r="4" 
        fill="${color}" 
        stroke="#ffffff" 
        stroke-width="1.5" 
        class="interactive-dot"
        data-tooltip-title="${escapeSvg(p.category)} &bull; ${escapeSvg(grp)}"
        data-tooltip-metric="${formatMetricNumber(p.val)}"
        data-tooltip-sub="${escapeSvg(metricLabel)}"
      />
    `).join('');

    return `
      <g class="multi-line-series">
        ${isArea ? `
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#${gradId})"/>
        ` : ''}
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </g>
    `;
  }).join('');

  // Top Legend
  const legendHtml = groups.map((grp, gIdx) => {
    const color = PALETTE[gIdx % PALETTE.length];
    return `
      <span class="grouped-legend-badge">
        <span class="legend-color-dot" style="background-color: ${color};"></span>
        <span>${escapeSvg(grp)}</span>
      </span>
    `;
  }).join('');

  return `
    <div class="grouped-chart-container">
      <div class="grouped-legend-bar">${legendHtml}</div>
      <div class="svg-chart-wrapper">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="${isArea ? 'Multi-Series Area Chart' : 'Multi-Series Line Chart'}">
          ${yTicksSvg}
          <line x1="${padding.left}" y1="${baseY}" x2="${width - padding.right}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1.5"/>
          ${seriesElements}
          ${xTicksSvg}
          <text x="${padding.left}" y="16" font-size="11" font-weight="600" fill="#64748b">${escapeSvg(metricLabel)}</text>
        </svg>
      </div>
    </div>
  `;
}

/**
 * 11. 2D CROSS-TABULATION MATRIX HEATMAP (For Multidimensional Analysis)
 */
export function renderSvgCrossTabHeatmap({
  aggregation,
  metricLabel = 'Metric',
  height = 320,
  width = 620
}) {
  const { series = [], categories = [], groups = [] } = aggregation || {};
  if (!series.length || !categories.length || !groups.length) {
    return `<div class="chart-empty-state">No multidimensional matrix data available</div>`;
  }

  const padding = { top: 45, right: 30, bottom: 60, left: 110 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxVal = 0;
  series.forEach(s => {
    groups.forEach(g => {
      const v = s.groupMetrics ? (s.groupMetrics[g] || 0) : 0;
      if (v > maxVal) maxVal = v;
    });
  });

  const cellW = chartW / categories.length;
  const cellH = chartH / groups.length;

  const cells = [];
  categories.forEach((cat, colIdx) => {
    const s = series[colIdx];
    groups.forEach((grp, rowIdx) => {
      const val = s && s.groupMetrics ? (s.groupMetrics[grp] || 0) : 0;
      const intensity = maxVal > 0 ? (val / maxVal) : 0;
      // Vibrant orange gradient for high intensity
      const r = Math.round(255 - intensity * (255 - 234));
      const g = Math.round(245 - intensity * (245 - 88));
      const b = Math.round(235 - intensity * (235 - 12));
      const cellBg = intensity === 0 ? '#f8fafc' : `rgb(${r}, ${g}, ${b})`;
      const textColor = intensity > 0.55 ? '#ffffff' : '#0f172a';

      const x = padding.left + colIdx * cellW;
      const y = padding.top + rowIdx * cellH;

      cells.push(`
        <g class="heatmap-cell"
           data-tooltip-title="${escapeSvg(cat)} &times; ${escapeSvg(grp)}"
           data-tooltip-metric="${formatMetricNumber(val)}"
           data-tooltip-sub="${escapeSvg(metricLabel)}">
          <rect 
            x="${x + 1.5}" 
            y="${y + 1.5}" 
            width="${Math.max(2, cellW - 3)}" 
            height="${Math.max(2, cellH - 3)}" 
            fill="${cellBg}" 
            rx="3" 
            class="interactive-bar"
          />
          <text 
            x="${x + cellW / 2}" 
            y="${y + cellH / 2 + 4}" 
            font-size="${Math.min(12, Math.max(9, cellH * 0.35))}" 
            font-weight="600" 
            fill="${textColor}" 
            text-anchor="middle"
          >
            ${val > 0 ? formatCompactNumber(val) : '0'}
          </text>
        </g>
      `);
    });
  });

  // Category labels (Top)
  const colLabels = categories.map((cat, idx) => {
    const x = padding.left + idx * cellW + cellW / 2;
    const trunc = cat.length > 9 ? cat.slice(0, 8) + '…' : cat;
    return `
      <text x="${x}" y="${padding.top - 12}" font-size="10" font-weight="600" fill="#475569" text-anchor="middle" transform="rotate(${categories.length > 5 ? -25 : 0}, ${x}, ${padding.top - 12})">
        ${escapeSvg(trunc)}
      </text>
    `;
  }).join('');

  // Group labels (Left)
  const rowLabels = groups.map((grp, idx) => {
    const y = padding.top + idx * cellH + cellH / 2 + 4;
    const trunc = grp.length > 14 ? grp.slice(0, 13) + '…' : grp;
    return `
      <text x="${padding.left - 8}" y="${y}" font-size="10" font-weight="600" fill="#475569" text-anchor="end">
        ${escapeSvg(trunc)}
      </text>
    `;
  }).join('');

  return `
    <div class="svg-chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dashboard-svg-chart" role="img" aria-label="Matrix Heatmap">
        ${cells.join('')}
        ${colLabels}
        ${rowLabels}
      </svg>
    </div>
  `;
}

// =============================================================================
// INTELLIGENT CHART RECOMMENDATION ENGINE
// =============================================================================

/**
 * Automatically inspects dataset and profiles to generate structured,
 * meaningful visualizations across the 5 required logical analytical groups.
 */
export function generateRecommendedCharts(dataset, profile) {
  if (!dataset || !profile) return { groups: [] };

  const { rows, headers } = dataset;
  const { categoricalColumns, numericalColumns, dateColumns, columnProfiles, correlations } = profile;

  // Analytical Groups Container
  const result = {
    distribution: [],
    comparisons: [],
    numerical: [],
    temporal: [],
    relationships: []
  };

  // -------------------------------------------------------------
  // 1. DISTRIBUTION ANALYSIS
  // -------------------------------------------------------------
  if (categoricalColumns && categoricalColumns.length > 0) {
    // Intelligently prioritize columns with clean category counts (2 to 30 distinct values)
    const sortedCats = [...categoricalColumns].sort((a, b) => {
      const profA = columnProfiles[a] || {};
      const profB = columnProfiles[b] || {};
      const countA = profA.distinctCount || 999;
      const countB = profB.distinctCount || 999;
      // Bonus if name has semantic significance
      const isKeyCatA = /(RISK|STATUS|SCENARIO|METRIC|PRODUCT|REGION|DEPARTMENT|TYPE|LEVEL|QUARTER|BUSINESS|FLAG|NATURE|IMPACT|LIKELIHOOD|REPEAT)/i.test(a);
      const isKeyCatB = /(RISK|STATUS|SCENARIO|METRIC|PRODUCT|REGION|DEPARTMENT|TYPE|LEVEL|QUARTER|BUSINESS|FLAG|NATURE|IMPACT|LIKELIHOOD|REPEAT)/i.test(b);
      if (isKeyCatA && !isKeyCatB) return -1;
      if (!isKeyCatA && isKeyCatB) return 1;
      return countA - countB;
    });

    // Generate distributions for all suitable categorical columns (up to 16)
    sortedCats.forEach((catCol, idx) => {
      const catProf = columnProfiles[catCol] || {};
      const rawDist = catProf.fullDistribution || catProf.distribution || catProf.frequencies || [];
      const distData = rawDist.map(d => ({
        category: String(d.category !== undefined ? d.category : (d.value !== undefined ? d.value : (Array.isArray(d) ? d[0] : 'Unknown'))),
        value: Number(d.count !== undefined ? d.count : (d.value !== undefined ? d.value : (Array.isArray(d) ? d[1] : 0))),
        percentage: Number(d.percentage || 0)
      })).filter(d => d.value > 0);

      if (distData.length === 0) return;

      const numCategories = distData.length;
      let primaryType = 'donut';
      if (numCategories <= 5) {
        primaryType = 'donut';
      } else if (numCategories <= 10) {
        primaryType = (idx % 2 === 0 ? 'donut' : 'bar');
      } else {
        primaryType = 'hbar';
      }

      const missingText = catProf.missingCount ? ` &bull; ${catProf.missingCount} missing` : '';

      result.distribution.push({
        id: `dist-${catCol.replace(/[^A-Za-z0-9_-]/g, '_')}`,
        title: `${catCol} Distribution`,
        subtitle: `${numCategories} distinct categories &bull; ${catProf.validCount || rows.length} valid records${missingText}`,
        type: primaryType,
        supportedTypes: ['donut', 'pie', 'bar', 'hbar'],
        activeType: primaryType,
        data: distData,
        xCol: catCol,
        yCol: '__count__',
        yLabel: 'Record Count',
        validCount: catProf.validCount || rows.length,
        missingCount: catProf.missingCount || 0,
        distinctCount: numCategories
      });
    });
  }

  // -------------------------------------------------------------
  // 2. CATEGORY COMPARISONS
  // -------------------------------------------------------------
  if (categoricalColumns && categoricalColumns.length > 0) {
    const primaryCat = categoricalColumns[0];
    const secondCat = categoricalColumns[1];

    if (numericalColumns && numericalColumns.length > 0) {
      const primaryNum = numericalColumns[0];
      const agg = aggregateDataset({
        rows,
        headers,
        xCol: primaryCat,
        yCol: primaryNum,
        method: 'sum'
      });

      result.comparisons.push({
        id: `comp-${primaryCat}-${primaryNum}`,
        title: `${primaryNum} by ${primaryCat}`,
        subtitle: `Aggregated sum of ${primaryNum} ranked across ${primaryCat} categories`,
        type: 'hbar',
        supportedTypes: ['hbar', 'bar'],
        activeType: 'hbar',
        data: agg.series,
        xCol: primaryCat,
        yCol: primaryNum,
        yLabel: `Sum of ${primaryNum}`
      });

      // Second category comparison with primary metric
      if (secondCat) {
        const agg2 = aggregateDataset({
          rows,
          headers,
          xCol: secondCat,
          yCol: primaryNum,
          method: 'sum'
        });

        result.comparisons.push({
          id: `comp-${secondCat}-${primaryNum}`,
          title: `${primaryNum} by ${secondCat}`,
          subtitle: `Aggregated sum of ${primaryNum} ranked across ${secondCat} categories`,
          type: 'hbar',
          supportedTypes: ['hbar', 'bar'],
          activeType: 'hbar',
          data: agg2.series,
          xCol: secondCat,
          yCol: primaryNum,
          yLabel: `Sum of ${primaryNum}`
        });
      }

      // If second numerical column exists, average comparison
      if (numericalColumns.length > 1) {
        const secondNum = numericalColumns[1];
        const aggAvg = aggregateDataset({
          rows,
          headers,
          xCol: primaryCat,
          yCol: secondNum,
          method: 'avg'
        });

        result.comparisons.push({
          id: `comp-avg-${primaryCat}-${secondNum}`,
          title: `Average ${secondNum} by ${primaryCat}`,
          subtitle: `Mean measure benchmarks by category segment`,
          type: 'bar',
          supportedTypes: ['bar', 'hbar'],
          activeType: 'bar',
          data: aggAvg.series,
          xCol: primaryCat,
          yCol: secondNum,
          yLabel: `Avg ${secondNum}`
        });
      }
    } else {
      // Record Volume Rankings
      const agg = aggregateDataset({
        rows,
        headers,
        xCol: primaryCat,
        yCol: '__count__',
        method: 'count'
      });

      result.comparisons.push({
        id: `comp-count-${primaryCat}`,
        title: `Record Volume by ${primaryCat}`,
        subtitle: `Ranking of distinct ${primaryCat} categories by record volume`,
        type: 'hbar',
        supportedTypes: ['hbar', 'bar'],
        activeType: 'hbar',
        data: agg.series,
        xCol: primaryCat,
        yCol: '__count__',
        yLabel: 'Record Count'
      });
    }

    // Multiple Categorical Variables: Grouped / Stacked Bar
    if (categoricalColumns.length >= 2) {
      const catA = categoricalColumns[0];
      const catB = categoricalColumns[1];
      const aggMulti = aggregateDataset({
        rows,
        headers,
        xCol: catA,
        groupCol: catB,
        yCol: (numericalColumns && numericalColumns.length > 0) ? numericalColumns[0] : '__count__',
        method: (numericalColumns && numericalColumns.length > 0) ? 'sum' : 'count'
      });

      result.comparisons.push({
        id: `multi-${catA}-${catB}`,
        title: `${catA} Cross-Tabulation by ${catB}`,
        subtitle: `Multi-dimensional composition and cross-category segmentation`,
        type: 'grouped',
        supportedTypes: ['grouped', 'stacked', 'line', 'heatmap'],
        activeType: 'grouped',
        aggregation: aggMulti,
        xCol: catA,
        groupCol: catB,
        yLabel: (numericalColumns && numericalColumns.length > 0) ? `Sum of ${numericalColumns[0]}` : 'Record Count'
      });
    }
  }

  // -------------------------------------------------------------
  // 3. NUMERICAL ANALYSIS
  // -------------------------------------------------------------
  if (numericalColumns && numericalColumns.length > 0) {
    const topNums = numericalColumns.slice(0, 2);
    topNums.forEach(numCol => {
      const numIdx = headers.indexOf(numCol);
      const vals = rows.map(r => r ? r[numIdx] : null);

      result.numerical.push({
        id: `num-hist-${numCol}`,
        title: `${numCol} Frequency Histogram`,
        subtitle: `Binned distribution curve and central tendency evaluation`,
        type: 'histogram',
        supportedTypes: ['histogram', 'boxplot'],
        activeType: 'histogram',
        values: vals,
        metricName: numCol
      });

      result.numerical.push({
        id: `num-box-${numCol}`,
        title: `${numCol} Box Plot (Five-Number Summary)`,
        subtitle: `Quartiles (Q1, Median, Q3), whiskers, spread, and outlier points`,
        type: 'boxplot',
        supportedTypes: ['boxplot', 'histogram'],
        activeType: 'boxplot',
        values: vals,
        metricName: numCol
      });
    });
  }

  // -------------------------------------------------------------
  // 4. TIME-SERIES ANALYSIS
  // -------------------------------------------------------------
  if (dateColumns && dateColumns.length > 0) {
    dateColumns.forEach(dateCol => {
      const timeMeasureCol = (numericalColumns && numericalColumns.length > 0) ? numericalColumns[0] : '__count__';
      const method = timeMeasureCol !== '__count__' ? 'sum' : 'count';

      const aggTime = aggregateDataset({
        rows,
        headers,
        xCol: dateCol,
        yCol: timeMeasureCol,
        method
      });

      result.temporal.push({
        id: `time-line-${dateCol}`,
        title: `Timeline Trend by ${dateCol}`,
        subtitle: `Chronological progression of ${timeMeasureCol !== '__count__' ? timeMeasureCol : 'record volume'} over time`,
        type: 'line',
        supportedTypes: ['line', 'area', 'bar'],
        activeType: 'line',
        data: aggTime.series,
        xCol: dateCol,
        yCol: timeMeasureCol,
        yLabel: timeMeasureCol !== '__count__' ? `Sum of ${timeMeasureCol}` : 'Records'
      });
    });
  }

  // -------------------------------------------------------------
  // 5. RELATIONSHIP ANALYSIS
  // -------------------------------------------------------------
  if (numericalColumns && numericalColumns.length >= 2) {
    const colA = numericalColumns[0];
    const colB = numericalColumns[1];

    result.relationships.push({
      id: `rel-scatter-${colA}-${colB}`,
      title: `${colA} vs ${colB} Relationship`,
      subtitle: `Bivariate scatter distribution with linear regression trendline`,
      type: 'scatter',
      supportedTypes: ['scatter'],
      activeType: 'scatter',
      rows,
      headers,
      xCol: colA,
      yCol: colB
    });

    result.relationships.push({
      id: `rel-heatmap`,
      title: `Pearson Correlation Heatmap`,
      subtitle: `Pairwise bivariate correlation matrix across quantitative measures`,
      type: 'heatmap',
      supportedTypes: ['heatmap'],
      activeType: 'heatmap',
      numericalColumns,
      correlations
    });
  }

  return result;
}

/**
 * 12. 100% STACKED BAR CHART (Relative Multi-Dimensional Proportions)
 */
export function renderSvg100PercentStackedBarChart({
  aggregation,
  metricLabel = 'Percentage',
  height = 320,
  width = 620
}) {
  const { series = [], categories = [], groups = [] } = aggregation || {};
  if (!series.length || !categories.length || !groups.length) {
    return `<div class="chart-empty-state">No multidimensional data available for 100% stacked bar chart</div>`;
  }

  const padding = { top: 35, right: 25, bottom: 65, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const ticks = [0, 25, 50, 75, 100];
  const gridLines = ticks.map(pct => {
    const y = padding.top + chartH - (pct / 100) * chartH;
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${padding.left - 8}" y="${y + 4}" font-size="10" fill="var(--text-muted)" text-anchor="end">${pct}%</text>
    `;
  }).join('');

  const catBand = chartW / categories.length;
  const barWidth = Math.max(12, Math.min(48, catBand * 0.65));

  const bars = series.map((item, cIdx) => {
    const x = padding.left + cIdx * catBand + (catBand - barWidth) / 2;
    const catTotal = item.total || 0;
    let accumulatedY = padding.top + chartH;

    const segments = groups.map((grp, gIdx) => {
      const val = item.groupMetrics ? (item.groupMetrics[grp] || 0) : 0;
      const pct = catTotal > 0 ? (val / catTotal) * 100 : 0;
      const segH = catTotal > 0 ? (pct / 100) * chartH : 0;
      const y = accumulatedY - segH;
      accumulatedY = y;
      const color = PALETTE[gIdx % PALETTE.length];

      return `
        <rect 
          x="${x}" 
          y="${y}" 
          width="${barWidth}" 
          height="${Math.max(0, segH)}" 
          fill="${color}" 
          rx="1"
          class="interactive-bar"
          data-tooltip-title="${escapeSvg(item.category)} &bull; ${escapeSvg(grp)}"
          data-tooltip-metric="${formatMetricNumber(val)} (${pct.toFixed(1)}%)"
          data-tooltip-sub="${escapeSvg(metricLabel)}"
        >
          <title>${escapeSvg(item.category)} &bull; ${escapeSvg(grp)}: ${formatMetricNumber(val)} (${pct.toFixed(1)}%)</title>
        </rect>
      `;
    }).join('');

    const labelX = x + barWidth / 2;
    const labelY = height - padding.bottom + 18;
    const truncatedCat = item.category.length > 14 ? item.category.slice(0, 12) + '…' : item.category;

    return `
      <g class="bar-group">
        ${segments}
        <text 
          x="${labelX}" 
          y="${labelY}" 
          font-size="11" 
          fill="var(--text-secondary)" 
          text-anchor="middle"
          transform="rotate(${categories.length > 6 ? -30 : 0}, ${labelX}, ${labelY})"
        >
          ${escapeSvg(truncatedCat)}
        </text>
      </g>
    `;
  }).join('');

  const legend = groups.slice(0, 10).map((grp, gIdx) => {
    const color = PALETTE[gIdx % PALETTE.length];
    return `
      <span class="chart-legend-item">
        <span class="chart-legend-dot" style="background-color: ${color};"></span>
        <span class="chart-legend-text" title="${escapeSvg(grp)}">${escapeSvg(grp)}</span>
      </span>
    `;
  }).join('');

  return `
    <div class="chart-wrapper">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="max-height: 360px;">
        ${gridLines}
        ${bars}
      </svg>
      <div class="chart-legend-row" style="margin-top: 6px;">
        ${legend}
        ${groups.length > 10 ? `<span style="font-size: 11px; color: var(--text-muted);">+${groups.length - 10} more series</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * 13. SMALL MULTIPLES / FACETED CHARTS (Higher-Dimensional Small Multiples Grid)
 */
export function renderSvgSmallMultiples({
  aggregation,
  metricLabel = 'Metric'
}) {
  const { facets = [], facetCol = 'Dimension' } = aggregation || {};
  if (!facets.length) {
    return `<div class="chart-empty-state">No faceted small multiples data available</div>`;
  }

  const panels = facets.map(f => {
    const subSvg = renderSvgGroupedOrStackedBarChart({
      aggregation: f.aggregation,
      metricLabel,
      isStacked: false,
      height: 220,
      width: 320
    });

    return `
      <div class="facet-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
          <strong style="font-size: 12px; color: var(--accent-orange); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeSvg(f.facetVal)}">
            ${escapeSvg(facetCol)}: ${escapeSvg(f.facetVal)}
          </strong>
          <span style="font-size: 11px; color: var(--text-muted); flex-shrink: 0;">${f.recordCount.toLocaleString()} rows</span>
        </div>
        <div style="flex: 1; min-height: 180px;">
          ${subSvg}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="facets-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; width: 100%;">
      ${panels}
    </div>
  `;
}

/**
 * Universal Chart Component Renderer
 * Dispatches to individual SVG renderers based on item.activeType
 */
export function renderDashboardChart(item) {
  if (!item) return `<div class="chart-empty-state">No chart specified</div>`;

  // Check if aggregation was generated with faceted mode
  if (item.aggregation && item.aggregation.isFacets) {
    return renderSvgSmallMultiples({
      aggregation: item.aggregation,
      metricLabel: item.yLabel
    });
  }

  const activeType = item.activeType || item.type || 'bar';
  const chartType = activeType;
  const isMultiDim = item.aggregation && (item.groupCol || (item.groupCols && item.groupCols.length > 0) || (item.aggregation.isGrouped));

  switch (chartType) {
    case 'bar':
      if (isMultiDim) {
        return renderSvgGroupedOrStackedBarChart({
          aggregation: item.aggregation,
          metricLabel: item.yLabel,
          isStacked: false
        });
      }
      return renderSvgBarChart({
        data: item.data,
        xLabel: item.xCol,
        yLabel: item.yLabel,
        color: PALETTE[0]
      });

    case 'hbar':
      return renderSvgHorizontalBarChart({
        data: item.data,
        metricLabel: item.yLabel,
        color: PALETTE[0]
      });

    case 'donut':
      return renderSvgDonutChart({
        data: item.data,
        metricLabel: item.yLabel,
        innerRadiusRatio: 0.58
      });

    case 'pie':
      return renderSvgDonutChart({
        data: item.data,
        metricLabel: item.yLabel,
        innerRadiusRatio: 0
      });

    case 'line':
      if (isMultiDim) {
        return renderSvgMultiLineChart({
          aggregation: item.aggregation,
          metricLabel: item.yLabel,
          isArea: false
        });
      }
      return renderSvgLineChart({
        data: item.data,
        xLabel: item.xCol,
        yLabel: item.yLabel,
        color: PALETTE[0],
        isArea: false
      });

    case 'area':
      if (isMultiDim) {
        return renderSvgMultiLineChart({
          aggregation: item.aggregation,
          metricLabel: item.yLabel,
          isArea: true
        });
      }
      return renderSvgLineChart({
        data: item.data,
        xLabel: item.xCol,
        yLabel: item.yLabel,
        color: PALETTE[0],
        isArea: true
      });

    case 'histogram':
      return renderSvgHistogram({
        values: item.values,
        metricName: item.metricName,
        color: PALETTE[1]
      });

    case 'boxplot':
      return renderSvgBoxPlot({
        values: item.values,
        metricName: item.metricName,
        color: PALETTE[3]
      });

    case 'scatter':
      return renderSvgScatterPlot({
        rows: item.rows,
        headers: item.headers,
        xCol: item.xCol,
        yCol: item.yCol,
        color: PALETTE[1]
      });

    case 'heatmap':
      if (isMultiDim) {
        return renderSvgCrossTabHeatmap({
          aggregation: item.aggregation,
          metricLabel: item.yLabel
        });
      }
      return renderSvgCorrelationHeatmap({
        numericalColumns: item.numericalColumns,
        correlations: item.correlations
      });

    case 'grouped':
    case 'stacked':
      if (item.aggregation && item.aggregation.groups && item.aggregation.groups.length > 0 && !item.aggregation.groups.includes('__default__')) {
        return renderSvgGroupedOrStackedBarChart({
          aggregation: item.aggregation,
          metricLabel: item.yLabel,
          isStacked: activeType === 'stacked'
        });
      }
      return renderSvgBarChart({
        data: item.data || (item.aggregation ? item.aggregation.series : []),
        metricLabel: item.yLabel
      });

    case 'stacked100':
      if (item.aggregation && item.aggregation.groups && item.aggregation.groups.length > 0 && !item.aggregation.groups.includes('__default__')) {
        return renderSvg100PercentStackedBarChart({
          aggregation: item.aggregation,
          metricLabel: item.yLabel
        });
      }
      return renderSvgBarChart({
        data: item.data || (item.aggregation ? item.aggregation.series : []),
        metricLabel: item.yLabel
      });

    case 'facets':
      if (item.aggregation && item.aggregation.facets && item.aggregation.facets.length > 0) {
        return renderSvgSmallMultiples({
          aggregation: item.aggregation,
          metricLabel: item.yLabel
        });
      }
      return renderSvgBarChart({
        data: item.data || (item.aggregation ? item.aggregation.series : []),
        metricLabel: item.yLabel
      });

    default:
      return `<div class="chart-empty-state">Unsupported chart visualization format</div>`;
  }
}
