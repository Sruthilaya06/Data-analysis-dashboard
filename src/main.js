import './style.css';
import * as XLSX from 'xlsx';
import { 
  profileDataset, 
  formatMetricNumber, 
  formatPercent,
  isMissing,
  calculateContingencyTable,
  calculateSpearmanCorrelation,
  calculateNumericalByCategorical
} from './profiling.js';
import {
  generateRecommendedCharts,
  renderDashboardChart,
  aggregateDataset,
  renderSvgBarChart,
  renderSvgHorizontalBarChart,
  renderSvgDonutChart,
  renderSvgLineChart,
  renderSvgHistogram,
  renderSvgBoxPlot,
  renderSvgScatterPlot,
  renderSvgCorrelationHeatmap,
  renderSvgGroupedOrStackedBarChart,
  renderSvg100PercentStackedBarChart,
  renderSvgSmallMultiples,
  renderSvgCrossTabHeatmap,
  PALETTE,
  escapeSvg
} from './charts.js';

/**
 * Data Analysis Dashboard - Phase 2.2 Application Logic
 * Automated Data Profiling & Dynamic Visualization Engine
 * Architecture: Vanilla JavaScript (ES6+), HTML5, CSS3, Vite
 */

// Application State
const state = {
  activeTab: 'overview', // 'overview' | 'preview' | 'visualizations' | 'analysis' | 'insights'
  profilingSubTab: 'all', // 'all' | 'table' | 'numerical' | 'categorical' | 'dates' | 'correlations' | 'quality'
  visualizationsFilter: 'all', // 'all' | 'distribution' | 'comparisons' | 'numerical' | 'temporal' | 'relationships' | 'custom'
  relationshipTab: 'overview', // 'overview' | 'categorical' | 'numerical' | 'temporal' | 'multidimensional'
  contingencyMode: 'counts', // 'counts' | 'rowPct' | 'colPct'
  selectedCatColA: '',
  selectedCatColB: '',
  selectedNumColA: '',
  selectedNumColB: '',
  selectedTimeCol: '',
  selectedTimeCatCol: '',
  selected3WayX: '',
  selected3WayS1: '',
  selected3WayS2: '',
  file: null, // { name, size, formattedSize, extension, rawFile }
  dataset: null, // { headers: [], rows: [], totalRecords: 0, totalColumns: 0, columnTypes: {}, profile: {} }
  charts: null, // Generated recommended analytical charts
  customCharts: [], // User-created custom charts
  chartToggles: {}, // Map: chartId -> activeType
  isCustomChartModalOpen: false,
  customChartForm: {
    type: 'bar',
    xCol: '',
    yCol: '__count__',
    groupCols: [],
    presentation: 'composite', // 'composite' | 'facets'
    topN: 15,
    fieldSearch: '',
    includeIdentifiers: false,
    method: 'count',
    title: ''
  },
  previewSearch: '',
  profileSearch: '',
  previewPage: 1,
  pageSize: 15,
  errorMessage: null,
  isProcessing: false
};

// SVG Icon Helpers (Crisp inline vector icons)
const icons = {
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
  upload: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  fileSpreadsheet: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>`,
  table: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  database: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  columns: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  barChart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  pieChart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  alertCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

/**
 * Utility: Format byte size to human readable string
 */
function formatFileSize(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
  return `${value} ${sizes[i]}`;
}

/**
 * Helper: Map data type string to CSS badge class
 */
function getTypeBadgeClass(type) {
  if (!type) return 'txt';
  const t = String(type).toUpperCase();
  if (t === 'NUMBER' || t === 'NUM') return 'num';
  if (t === 'DATE') return 'date';
  if (t === 'PERIOD') return 'period';
  return 'txt';
}

/**
 * Enhanced Automatic Column Data Type Detection Engine
 * 
 * Strict Priority Order:
 * 1. Identifier / Reference Detection -> TEXT (Highest Priority)
 * 2. Explicit Date & Period Detection -> DATE or PERIOD
 * 3. Numerical Detection -> NUMBER
 * 4. General Text and Categorical Detection -> TEXT
 */
function detectColumnTypes(headers, rows) {
  const types = {};
  const sampleLimit = Math.min(rows.length, 100);

  headers.forEach((header, colIndex) => {
    const rawHeader = String(header !== undefined && header !== null ? header : '').trim();
    // Normalized header for robust boundary and pattern evaluation
    const norm = rawHeader.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Extract non-empty sample values for this column
    const sampleValues = [];
    for (let r = 0; r < sampleLimit; r++) {
      const val = rows[r] ? rows[r][colIndex] : undefined;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        sampleValues.push(val);
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 1: IDENTIFIER / REFERENCE COLUMN DETECTION -> TEXT
    // -------------------------------------------------------------
    // Columns whose names contain identifiers or reference terms must be classified
    // as TEXT, regardless of whether their values look numeric or contain date-like patterns.
    // Examples: ID, *_ID, *_CODE, *_NUMBER, *_NO, *_REF, PAN, MOBILE, PHONE, ACCOUNT, REFERENCE
    const isIdentifierName = (
      // Word / delimiter boundaries: (^|_)(TERM)($|_)
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

    if (isIdentifierName) {
      types[rawHeader] = 'TEXT';
      return;
    }

    // Also check if values themselves are predominantly alphanumeric identifiers with hyphens/prefixes (e.g. OBS-001)
    // or string codes with leading zeros (e.g. "0987654321", "0012345678")
    if (sampleValues.length > 0) {
      const identifierValCount = sampleValues.filter(v => {
        const s = String(v).trim();
        // Alphanumeric patterns like OBS-001, CLI001, EMP-002, TXN-101
        if (/^[A-Za-z]{2,6}[-_]?\d+$/.test(s)) return true;
        // String with leading zero and at least 3 digits (e.g. 0987654321, 00123)
        if (/^0\d{2,}$/.test(s)) return true;
        return false;
      }).length;

      if (identifierValCount / sampleValues.length >= 0.7) {
        types[rawHeader] = 'TEXT';
        return;
      }
    }

    // -------------------------------------------------------------
    // PRIORITY 2: DATE AND PERIOD DETECTION -> DATE or PERIOD
    // -------------------------------------------------------------
    const isDateHeader = (
      /(^|_)(DATE|DT|TIME|TIMESTAMP|DAY|MONTH|YEAR|PERIOD|QUARTER)($|_)/i.test(norm) ||
      norm.includes('DATE') ||
      norm.includes('PERIOD')
    );

    function isStrictDateOrPeriod(v) {
      if (v instanceof Date) return !isNaN(v.getTime());
      const s = String(v).trim();
      if (!s || s.length < 4 || s.length > 35) return false;

      // Reject alphanumeric identifiers like OBS-001 or EMP-001
      if (/^[A-Za-z]{2,6}[-_]?\d+$/.test(s)) return false;

      // Reject pure integers (e.g. 123456, 20260101 without date delimiters)
      if (/^\d+$/.test(s)) return false;

      // Check genuine Period patterns: e.g. "2026-Q1", "Q1-2026", "Q1 2026", "2026 Q1", "FY26", "FY2026", "Jan-26", "2026-01"
      const periodPattern = /^(Q[1-4][- ]\d{2,4}|\d{4}[- ]Q[1-4]|\d{4}Q[1-4]|FY\d{2,4}|\d{4}[-/](0[1-9]|1[0-2])|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[- ]\d{2,4})$/i;
      if (periodPattern.test(s)) {
        return true;
      }

      // Standard date formats with valid delimiters
      const isoPattern = /^\d{4}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])(\s|T|$)/;
      const standardPattern = /^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]\d{2,4}(\s|$)/;
      const usPattern = /^(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.]\d{2,4}(\s|$)/;
      const namedMonthPattern = /^(\d{1,2}[- ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ]\d{2,4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;

      if (isoPattern.test(s) || standardPattern.test(s) || usPattern.test(s) || namedMonthPattern.test(s)) {
        const parsed = Date.parse(s);
        if (!isNaN(parsed)) {
          const year = new Date(parsed).getFullYear();
          return year >= 1900 && year <= 2100;
        }
      }

      return false;
    }

    const dateValCount = sampleValues.filter(isStrictDateOrPeriod).length;
    if (isDateHeader) {
      if (sampleValues.length === 0 || dateValCount / sampleValues.length >= 0.5) {
        types[rawHeader] = norm.includes('PERIOD') ? 'PERIOD' : 'DATE';
        return;
      }
    } else if (sampleValues.length > 0 && dateValCount / sampleValues.length >= 0.8) {
      types[rawHeader] = 'DATE';
      return;
    }

    // -------------------------------------------------------------
    // PRIORITY 3: NUMERICAL DETECTION -> NUMBER
    // -------------------------------------------------------------
    function isStrictNumber(v) {
      if (typeof v === 'number') return !isNaN(v) && isFinite(v);
      const s = String(v).trim();
      if (!s) return false;

      // Reject codes with leading zeros (e.g. "0987654321", "0012345678")
      if (/^0\d+$/.test(s)) return false;

      // Strip currency symbols ($, ₹, €, £, ¥), thousands separators, trailing percent, or accounting parentheses
      let clean = s.replace(/^[$\u20B9\u00A3\u20AC\u00A5]/, '').replace(/,/g, '').trim();
      if (clean.endsWith('%')) clean = clean.slice(0, -1).trim();
      if (/^\(.*\)$/.test(clean)) clean = '-' + clean.slice(1, -1).trim();

      return /^-?\d+(\.\d+)?$/.test(clean) && !isNaN(Number(clean)) && isFinite(Number(clean));
    }

    const numValCount = sampleValues.filter(isStrictNumber).length;
    if (sampleValues.length > 0 && numValCount / sampleValues.length >= 0.7) {
      types[rawHeader] = 'NUMBER';
      return;
    }

    // -------------------------------------------------------------
    // PRIORITY 4: GENERAL TEXT AND CATEGORICAL DETECTION -> TEXT
    // -------------------------------------------------------------
    types[rawHeader] = 'TEXT';
  });

  return types;
}

/**
 * Validate file format
 */
function validateFile(file) {
  if (!file) return { valid: false, message: 'No file selected.' };
  
  const ext = file.name.split('.').pop().toLowerCase();
  const validExtensions = ['xlsx', 'xls', 'csv'];

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      message: `Unsupported file format ".${ext}". Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.`
    };
  }

  // 50 MB safety threshold
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      message: `File size exceeds the 50 MB limit (${formatFileSize(file.size)}). Please choose a smaller dataset.`
    };
  }

  return { valid: true, extension: ext };
}

/**
 * Parse uploaded file using XLSX engine
 */
async function processDatasetFile(rawFile) {
  const validation = validateFile(rawFile);
  if (!validation.valid) {
    state.errorMessage = validation.message;
    state.isProcessing = false;
    renderApp();
    return;
  }

  state.isProcessing = true;
  state.errorMessage = null;
  renderApp();

  try {
    const arrayBuffer = await rawFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The uploaded spreadsheet contains no readable sheets.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // raw: false ensures formatted strings (such as leading zeros in account/phone numbers) are preserved
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

    if (!rawData || rawData.length === 0) {
      throw new Error('The uploaded file is empty or contains no records.');
    }

    // Header extraction
    const rawHeaderRow = rawData[0] || [];
    // Ensure all header names are unique non-empty strings
    const headers = rawHeaderRow.map((col, idx) => {
      const name = String(col !== undefined && col !== null ? col : '').trim();
      return name || `Column_${idx + 1}`;
    });

    if (headers.length === 0) {
      throw new Error('No header columns could be identified in the dataset.');
    }

    // Data rows extraction (ignore trailing completely blank rows)
    const rawDataRows = rawData.slice(1);
    const rows = rawDataRows.filter(row => {
      if (!row || !Array.isArray(row)) return false;
      return row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    });

    // Detect column types
    const columnTypes = detectColumnTypes(headers, rows);

    // Run automated data profiling engine
    const profile = profileDataset(headers, rows);

    // Update application state
    state.file = {
      name: rawFile.name,
      size: rawFile.size,
      formattedSize: formatFileSize(rawFile.size),
      extension: validation.extension,
      sheetName: firstSheetName,
      lastModified: new Date(rawFile.lastModified || Date.now()).toLocaleDateString()
    };

    state.dataset = {
      headers,
      rows,
      totalRecords: rows.length,
      totalColumns: headers.length,
      columnTypes,
      profile
    };

    // Generate dynamic recommended charts
    state.charts = generateRecommendedCharts(state.dataset, profile);
    state.customCharts = [];
    state.chartToggles = {};

    state.previewPage = 1;
    state.previewSearch = '';
    state.profileSearch = '';
    state.errorMessage = null;
  } catch (err) {
    console.error('File parsing error:', err);
    state.errorMessage = err.message || 'Failed to read the uploaded dataset. Please ensure the file is not corrupted.';
    state.file = null;
    state.dataset = null;
  } finally {
    state.isProcessing = false;
    renderApp();
  }
}

/**
 * Built-in test sample datasets for instant preview & validation testing
 */
const sampleDatasets = {
  sales: {
    name: 'sales_q1_test_dataset.csv',
    size: 2680,
    formattedSize: '2.7 KB',
    headers: ['Order_ID', 'Order_Date', 'Order_Month', 'Customer_Name', 'Region', 'Sales_Rep', 'Product', 'Category', 'Units_Sold', 'Unit_Price_INR', 'Revenue_INR', 'Profit_INR'],
    rows: [
      ['ORD-1001', '2026-01-08', '2026-01', 'Apex Systems', 'North America', 'Sarah Jenkins', 'Cloud Analytics Enterprise', 'Software', 4, 45000, 180000, 54000],
      ['ORD-1002', '2026-01-12', '2026-01', 'Global Tech Solutions', 'Europe', 'Elena Rostova', 'Precision Edge Server', 'Hardware', 2, 92000, 184000, 36800],
      ['ORD-1003', '2026-01-15', '2026-01', 'Zenith Enterprises', 'Asia Pacific', 'David Chen', 'Systems Integration', 'Services', 1, 145000, 145000, 43500],
      ['ORD-1004', '2026-01-19', '2026-01', 'Vanguard Logistics', 'North America', 'Sarah Jenkins', 'API Gateway Suite', 'Software', 6, 21000, 126000, 37800],
      ['ORD-1005', '2026-01-23', '2026-01', 'Horizon Retail', 'Latin America', 'Alex Rivera', 'Security Compliance Suite', 'Software', 1, 88000, 88000, 26400],
      ['ORD-1006', '2026-01-28', '2026-01', 'Nexus Health', 'Europe', 'Elena Rostova', 'Cloud Analytics Pro', 'Software', 5, 28000, 140000, 42000],
      ['ORD-1007', '2026-02-02', '2026-02', 'Starlight Media', 'Asia Pacific', 'David Chen', 'Network Switch Series X', 'Hardware', 8, 26000, 208000, 41600],
      ['ORD-1008', '2026-02-07', '2026-02', 'Titan Industrial', 'North America', 'Marcus Vance', 'DevOps Managed Service', 'Services', 3, 54000, 162000, 48600],
      ['ORD-1009', '2026-02-12', '2026-02', 'Pioneer Software', 'Europe', 'Elena Rostova', 'Precision Edge Server', 'Hardware', 3, 92000, 276000, 55200],
      ['ORD-1010', '2026-02-17', '2026-02', 'Silverline Financial', 'North America', 'Sarah Jenkins', 'Cloud Analytics Enterprise', 'Software', 7, 45000, 315000, 94500],
      ['ORD-1011', '2026-02-22', '2026-02', 'Echo Networks', 'Asia Pacific', 'David Chen', 'API Gateway Suite', 'Software', 4, 21000, 84000, 25200],
      ['ORD-1012', '2026-02-27', '2026-02', 'Beacon Energy', 'Latin America', 'Alex Rivera', 'Systems Integration', 'Services', 2, 145000, 290000, 87000],
      ['ORD-1013', '2026-03-05', '2026-03', 'Solaria Technologies', 'North America', 'Marcus Vance', 'Security Compliance Suite', 'Software', 3, 88000, 264000, 79200],
      ['ORD-1014', '2026-03-12', '2026-03', 'Quantum Dynamics', 'Europe', 'Elena Rostova', 'DevOps Managed Service', 'Services', 2, 54000, 108000, 32400],
      ['ORD-1015', '2026-03-20', '2026-03', 'Acme Corporation', 'Asia Pacific', 'David Chen', 'Cloud Analytics Pro', 'Software', 6, 28000, 168000, 50400]
    ]
  },
  audit: {
    name: 'audit_observations_test_dataset.csv',
    size: 2740,
    formattedSize: '2.7 KB',
    headers: ['Observation_ID', 'Observation_Date', 'Audit_Year', 'Quarter', 'Department', 'Location', 'Observation_Level', 'Audit_Type', 'Risk_Nature', 'Risk_Level', 'Status', 'Repeat_Flag', 'Observation_Title', 'Observation_Details', 'Financial_Impact_INR'],
    rows: [
      ['OBS-001', '2026-01-10', '2026', 'Q1', 'IT Audit', 'Bengaluru', 'Process', 'IT Audit', 'Operational', 'High', 'Open', 'Yes', 'Unrestricted DB Admin Access', 'Administrative credentials shared across engineering teams without audit trail logging', 850000],
      ['OBS-002', '2026-01-14', '2026', 'Q1', 'Finance', 'Mumbai', 'Entity', 'Financial Audit', 'Financial', 'Medium', 'In Progress', 'No', 'ERP Segregation of Duties Conflict', 'Accounts payable approval threshold lacks secondary sign-off above INR 500000', 320000],
      ['OBS-003', '2026-01-18', '2026', 'Q1', 'Operations', 'Delhi', 'Branch', 'Operational Audit', 'Compliance', 'Low', 'Closed', 'No', 'Delayed Inventory Physical Verification', 'Quarterly warehouse asset count delayed by two weeks across central depot', 0],
      ['OBS-004', '2026-01-22', '2026', 'Q1', 'Compliance', 'Hyderabad', 'Entity', 'Compliance Audit', 'Regulatory', 'Critical', 'Under Review', 'Yes', 'Statutory Tax Filing Delay', 'Withholding tax documentation reconciliation discrepancy pending regulatory review', 1500000],
      ['OBS-005', '2026-01-27', '2026', 'Q1', 'Information Security', 'Bengaluru', 'Process', 'Cybersecurity Audit', 'Operational', 'High', 'Open', 'Yes', 'Unpatched Perimeter Firewall Firmware', 'Critical CVE patch pending deployment on primary DMZ ingress firewalls', 1200000],
      ['OBS-006', '2026-02-02', '2026', 'Q1', 'Human Resources', 'Mumbai', 'Process', 'HR Audit', 'Compliance', 'Low', 'Closed', 'No', 'Incomplete Background Verification Records', 'Contractor personnel onboarding checklist missing third-party address verification', 0],
      ['OBS-007', '2026-02-06', '2026', 'Q1', 'Supply Chain', 'Chennai', 'Branch', 'Supply Chain Audit', 'Operational', 'Medium', 'In Progress', 'No', 'Single Source Vendor Dependency', 'Sole-source supplier contract active for essential server hardware components', 650000],
      ['OBS-008', '2026-02-11', '2026', 'Q1', 'IT Audit', 'Hyderabad', 'Entity', 'IT Audit', 'Operational', 'Critical', 'Open', 'Yes', 'Disaster Recovery Backup Failure', 'Secondary cold site snapshot replication failed integrity test during quarterly drill', 2400000],
      ['OBS-009', '2026-02-15', '2026', 'Q1', 'Finance', 'Delhi', 'Entity', 'Financial Audit', 'Financial', 'High', 'Under Review', 'No', 'Unreconciled Intercompany Balances', 'Variance identified between subsidiary ledger and parent holding accounts', 950000],
      ['OBS-010', '2026-02-19', '2026', 'Q1', 'Operations', 'Mumbai', 'Branch', 'Operational Audit', 'Compliance', 'Medium', 'Closed', 'No', 'Overtime Hours Authorization Gap', 'Production plant shift overtime logs missing supervisor countersignature', 140000],
      ['OBS-011', '2026-02-24', '2026', 'Q1', 'Information Security', 'Bengaluru', 'Process', 'Cybersecurity Audit', 'Operational', 'Critical', 'Open', 'Yes', 'Exposed API Key in Client Bundle', 'Production API gateway access token embedded in public staging web application', 3100000],
      ['OBS-012', '2026-03-01', '2026', 'Q1', 'Compliance', 'Chennai', 'Process', 'Compliance Audit', 'Regulatory', 'Medium', 'In Progress', 'No', 'Data Protection Policy Training Gap', 'Annual GDPR and DPDP compliance refresher training overdue for 35 percent staff', 250000],
      ['OBS-013', '2026-03-07', '2026', 'Q1', 'Supply Chain', 'Delhi', 'Branch', 'Supply Chain Audit', 'Compliance', 'Low', 'Closed', 'No', 'Purchase Order Retrospective Approval', 'Five purchase requisitions issued post-invoice receipt by regional branch', 90000],
      ['OBS-014', '2026-03-14', '2026', 'Q1', 'Finance', 'Bengaluru', 'Entity', 'Financial Audit', 'Financial', 'High', 'Open', 'Yes', 'Uncollected Customer Receivables Over 180 Days', 'Aged trade receivables exceeding 180 days lack documented provisioning', 1800000],
      ['OBS-015', '2026-03-21', '2026', 'Q1', 'Operations', 'Hyderabad', 'Process', 'Operational Audit', 'Operational', 'Low', 'Under Review', 'No', 'Logistics Transit Temperature Excursion', 'Cold chain temperature monitors registered intermittent calibration drift', 180000]
    ]
  },
  employee: {
    name: 'employee_test_dataset.csv',
    size: 2450,
    formattedSize: '2.5 KB',
    headers: ['Employee_ID', 'Employee_Name', 'Department', 'Location', 'Designation', 'Employment_Status', 'Joining_Date', 'Joining_Year', 'Annual_Salary_INR', 'Performance_Score'],
    rows: [
      ['EMP-101', 'Aarav Sharma', 'Engineering', 'Bengaluru', 'Senior Software Engineer', 'Active', '2022-04-15', '2022', 1850000, 4.6],
      ['EMP-102', 'Diya Patel', 'Sales', 'Mumbai', 'Account Executive', 'Active', '2022-07-01', '2022', 1400000, 4.2],
      ['EMP-103', 'Rohan Mehta', 'Human Resources', 'Delhi', 'HR Specialist', 'Active', '2023-01-10', '2023', 980000, 3.9],
      ['EMP-104', 'Ananya Iyer', 'Finance', 'Bengaluru', 'Financial Analyst', 'Active', '2023-03-20', '2023', 1250000, 4.4],
      ['EMP-105', 'Vikram Malhotra', 'Engineering', 'Hyderabad', 'DevOps Lead', 'Active', '2023-06-15', '2023', 2200000, 4.8],
      ['EMP-106', 'Neha Verma', 'Marketing', 'Pune', 'Marketing Manager', 'Active', '2023-09-01', '2023', 1650000, 4.1],
      ['EMP-107', 'Kabir Joshi', 'Operations', 'Mumbai', 'Operations Lead', 'Active', '2023-11-15', '2023', 1350000, 4.0],
      ['EMP-108', 'Pooja Nair', 'Engineering', 'Bengaluru', 'Frontend Engineer', 'On Leave', '2024-02-01', '2024', 1500000, 4.3],
      ['EMP-109', 'Aditya Rao', 'Sales', 'Hyderabad', 'Regional Sales Lead', 'Active', '2024-04-10', '2024', 2100000, 4.7],
      ['EMP-110', 'Sneha Kulkarni', 'Finance', 'Pune', 'Senior Accountant', 'Active', '2024-06-25', '2024', 1450000, 4.1],
      ['EMP-111', 'Arjun Kapoor', 'Engineering', 'Bengaluru', 'Principal Architect', 'Active', '2024-09-01', '2024', 2800000, 4.9],
      ['EMP-112', 'Priyanka Sen', 'Marketing', 'Delhi', 'Content Strategist', 'Probation', '2025-01-15', '2025', 1050000, 3.8],
      ['EMP-113', 'Rahul Saxena', 'Operations', 'Hyderabad', 'Logistics Coordinator', 'Probation', '2025-03-01', '2025', 920000, 3.9],
      ['EMP-114', 'Kavita Reddy', 'Human Resources', 'Bengaluru', 'Talent Acquisition Partner', 'Active', '2025-05-10', '2025', 1180000, 4.2],
      ['EMP-115', 'Siddharth Jain', 'Engineering', 'Pune', 'Backend Engineer', 'Active', '2025-08-01', '2025', 1600000, 4.5]
    ]
  },
  financial: {
    name: 'financial_reporting_test_dataset.csv',
    size: 2180,
    formattedSize: '2.2 KB',
    headers: ['Period', 'Financial_Year', 'Quarter', 'Department', 'Metric', 'Scenario', 'Amount_INR'],
    rows: [
      ['2025-Q1', 'FY2025', 'Q1', 'Enterprise Sales', 'Gross Revenue', 'Actual', 6200000],
      ['2025-Q1', 'Core Infrastructure', 'Cost of Goods Sold', 'Actual', 3100000],
      ['2025-Q1', 'Global Operations', 'Operating Expense', 'Actual', 1450000],
      ['2025-Q2', 'Enterprise Sales', 'Gross Revenue', 'Actual', 6800000],
      ['2025-Q2', 'Core Infrastructure', 'Cost of Goods Sold', 'Actual', 3300000],
      ['2025-Q2', 'Global Operations', 'Operating Expense', 'Actual', 1520000],
      ['2025-Q3', 'Enterprise Sales', 'Gross Revenue', 'Actual', 7100000],
      ['2025-Q3', 'Core Infrastructure', 'Cost of Goods Sold', 'Actual', 3450000],
      ['2025-Q3', 'Global Operations', 'Operating Expense', 'Actual', 1600000],
      ['2025-Q4', 'Enterprise Sales', 'Gross Revenue', 'Budget', 7500000],
      ['2025-Q4', 'Core Infrastructure', 'Cost of Goods Sold', 'Budget', 3600000],
      ['2025-Q4', 'Global Operations', 'Operating Expense', 'Budget', 1650000],
      ['2026-Q1', 'Customer Success', 'Operating Expense', 'Forecast', 950000],
      ['2026-Q1', 'Corporate Shared Services', 'Operating Expense', 'Budget', 1100000],
      ['2026-Q1', 'Enterprise Sales', 'Net Margin', 'Forecast', 1850000]
    ]
  }
};

/**
 * Load built-in sample business dataset for instant preview testing
 */
function loadSampleDataset(key = 'sales') {
  const sample = sampleDatasets[key] || sampleDatasets.sales;
  const columnTypes = detectColumnTypes(sample.headers, sample.rows);
  const profile = profileDataset(sample.headers, sample.rows);

  state.file = {
    name: sample.name,
    size: sample.size,
    formattedSize: sample.formattedSize,
    extension: 'csv',
    sheetName: 'Sheet1',
    lastModified: new Date().toLocaleDateString()
  };

  state.dataset = {
    headers: sample.headers,
    rows: sample.rows,
    totalRecords: sample.rows.length,
    totalColumns: sample.headers.length,
    columnTypes,
    profile
  };

  // Generate dynamic recommended charts
  state.charts = generateRecommendedCharts(state.dataset, profile);
  state.customCharts = [];
  state.chartToggles = {};

  state.previewPage = 1;
  state.previewSearch = '';
  state.profileSearch = '';
  state.errorMessage = null;
  renderApp();
}

/**
 * Remove dataset and reset to initial state
 */
function removeDataset() {
  state.file = null;
  state.dataset = null;
  state.charts = null;
  state.customCharts = [];
  state.chartToggles = {};
  state.previewSearch = '';
  state.profileSearch = '';
  state.previewPage = 1;
  state.profilingSubTab = 'all';
  state.visualizationsFilter = 'all';
  state.errorMessage = null;
  renderApp();
}

/**
 * Render Header Component
 */
function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-container">
        <div class="brand-wrapper">
          <div class="brand-logo" aria-hidden="true">
            ${icons.chart}
          </div>
          <div class="brand-info">
            <h1 class="brand-title">Data Analysis Dashboard</h1>
            <span class="brand-subtitle">Business Intelligence & Analytical Reporting</span>
          </div>
        </div>

        <div class="header-meta">
          <span class="phase-badge">
            <span class="status-dot"></span>
            Phase 2.2: Dynamic Data Visualization Engine
          </span>
        </div>
      </div>
    </header>
  `;
}

/**
 * Render Navigation Tabs
 */
function renderNavigation() {
  // Count total generated charts
  let totalCharts = 0;
  if (state.charts) {
    totalCharts = (state.charts.distribution?.length || 0) +
                  (state.charts.comparisons?.length || 0) +
                  (state.charts.numerical?.length || 0) +
                  (state.charts.temporal?.length || 0) +
                  (state.charts.relationships?.length || 0) +
                  (state.customCharts?.length || 0);
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: icons.database },
    { 
      id: 'preview', 
      label: 'Data Preview', 
      icon: icons.table,
      badge: state.dataset ? `${state.dataset.totalRecords.toLocaleString()} rows` : null 
    },
    {
      id: 'visualizations',
      label: 'Visualizations',
      icon: icons.chart,
      badge: totalCharts > 0 ? `${totalCharts} charts` : null
    },
    { 
      id: 'analysis', 
      label: 'Data Profiling', 
      icon: icons.barChart,
      badge: state.dataset ? `${state.dataset.totalColumns} cols` : null
    },
    { id: 'insights', label: 'Insights', icon: icons.sparkles, reserved: true }
  ];

  return `
    <nav class="app-nav" aria-label="Main Navigation">
      <div class="nav-container">
        ${tabs.map(tab => {
          const isActive = state.activeTab === tab.id;
          return `
            <button 
              type="button" 
              class="nav-tab ${isActive ? 'active' : ''}" 
              data-tab="${tab.id}"
            >
              ${tab.icon}
              <span>${tab.label}</span>
              ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
              ${tab.reserved ? `<span class="tab-badge pill-reserved">Phase 2.2</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}

/**
 * Render Error/Alert Banner
 */
function renderAlertBanner() {
  if (!state.errorMessage) return '';
  return `
    <div class="alert-banner error" role="alert">
      <div style="flex-shrink:0;">${icons.alertCircle}</div>
      <div class="alert-content">
        <div class="alert-title">File Validation Error</div>
        <div>${state.errorMessage}</div>
      </div>
      <button type="button" class="alert-close" id="dismiss-alert-btn" aria-label="Dismiss alert">&times;</button>
    </div>
  `;
}

/**
 * Render File Upload / Active File Component
 */
function renderFileUploadSection() {
  if (state.file) {
    const extClass = state.file.extension || 'csv';
    return `
      <div class="upload-card">
        <div class="section-title-wrap" style="margin-bottom: 16px;">
          <h2 class="section-title">Active Dataset Source</h2>
          <p class="section-subtitle">File is loaded and parsed into in-memory data structures</p>
        </div>

        <div class="file-loaded-state">
          <div class="active-file-box">
            <div class="file-info-group">
              <div class="file-type-icon ${extClass}">
                ${state.file.extension.toUpperCase()}
              </div>
              <div class="file-details">
                <div class="file-name-text" title="${state.file.name}">${state.file.name}</div>
                <div class="file-meta-sub">
                  <span>${state.file.formattedSize}</span>
                  <span>•</span>
                  <span>Loaded ${state.file.lastModified}</span>
                </div>
              </div>
            </div>

            <div class="file-actions-group">
              <button type="button" class="btn btn-secondary btn-sm" id="replace-file-btn" title="Choose another file">
                ${icons.refresh}
                <span>Replace File</span>
              </button>
              <button type="button" class="btn btn-danger-outline btn-sm" id="remove-file-btn" title="Remove loaded dataset">
                ${icons.trash}
                <span>Remove</span>
              </button>
            </div>
          </div>

          <input type="file" id="dataset-file-input" class="file-input-hidden" accept=".xlsx,.xls,.csv" />
        </div>
      </div>
    `;
  }

  return `
    <div class="upload-card">
      <div class="section-title-wrap" style="margin-bottom: 16px;">
        <h2 class="section-title">Upload Dataset</h2>
        <p class="section-subtitle">Select an Excel or CSV file to start analysis</p>
      </div>

      <div class="dropzone" id="dropzone" tabindex="0" role="region" aria-label="File dropzone">
        <input type="file" id="dataset-file-input" class="file-input-hidden" accept=".xlsx,.xls,.csv" />
        <div class="dropzone-icon-wrap">
          ${icons.upload}
        </div>
        <p class="dropzone-prompt">Drag & drop your dataset here</p>
        <p class="dropzone-subtext">or click the button below to browse your computer</p>

        <button type="button" class="btn btn-primary" id="browse-files-btn">
          ${icons.fileSpreadsheet}
          <span>Browse Files</span>
        </button>

        <div class="dropzone-formats">
          <span class="format-chip">.XLSX</span>
          <span class="format-chip">.XLS</span>
          <span class="format-chip">.CSV</span>
        </div>
      </div>

      <div class="sample-action-bar">
        <span class="sample-action-text">Or try a built-in sample dataset:</span>
        <div class="sample-buttons-grid">
          <button type="button" class="btn-sample-chip" data-sample="sales">
            Sales Dataset
          </button>
          <button type="button" class="btn-sample-chip" data-sample="audit">
            Audit (OBS-001)
          </button>
          <button type="button" class="btn-sample-chip" data-sample="employee">
            Employee (EMP-001)
          </button>
          <button type="button" class="btn-sample-chip" data-sample="financial">
            Financial (Period)
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Dataset Information Section
 */
function renderDatasetInfoSection() {
  if (!state.dataset || !state.file) {
    return `
      <div class="dataset-info-card">
        <div class="section-title-wrap" style="margin-bottom: 16px;">
          <h2 class="section-title">Dataset Information</h2>
          <p class="section-subtitle">Key file specifications and dimensional attributes</p>
        </div>

        <div class="empty-state-panel">
          <div class="empty-state-icon">
            ${icons.info}
          </div>
          <h3 class="empty-state-title">Awaiting Dataset Upload</h3>
          <p class="empty-state-desc">
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file to view total record counts, columns, and structural attributes.
          </p>
        </div>
      </div>
    `;
  }

  const { totalRecords, totalColumns, headers, columnTypes } = state.dataset;

  return `
    <div class="dataset-info-card">
      <div class="section-title-wrap" style="margin-bottom: 16px;">
        <h2 class="section-title">Dataset Information</h2>
        <p class="section-subtitle">Structural summary of the currently loaded dataset</p>
      </div>

      <div class="dataset-metrics-grid">
        <div class="meta-metric-card accented">
          <span class="meta-metric-label">
            <span>Total Records</span>
            ${icons.table}
          </span>
          <span class="meta-metric-value">${totalRecords.toLocaleString()}</span>
          <span class="meta-metric-subtext">Clean data rows parsed</span>
        </div>

        <div class="meta-metric-card accented">
          <span class="meta-metric-label">
            <span>Total Columns</span>
            ${icons.columns}
          </span>
          <span class="meta-metric-value">${totalColumns}</span>
          <span class="meta-metric-subtext">Identified data dimensions</span>
        </div>

        <div class="meta-metric-card">
          <span class="meta-metric-label">
            <span>File Name</span>
            ${icons.fileSpreadsheet}
          </span>
          <span class="meta-metric-value" style="font-size: 14px; font-weight: 600; line-height: 1.3;" title="${state.file.name}">
            ${state.file.name}
          </span>
          <span class="meta-metric-subtext">Format: ${state.file.extension.toUpperCase()}</span>
        </div>

        <div class="meta-metric-card">
          <span class="meta-metric-label">
            <span>File Size</span>
            ${icons.database}
          </span>
          <span class="meta-metric-value">${state.file.formattedSize}</span>
          <span class="meta-metric-subtext">${state.file.size.toLocaleString()} bytes</span>
        </div>
      </div>

      <div class="columns-chip-tray">
        <div class="columns-tray-label">
          <span>Detected Columns (${headers.length})</span>
          <span style="font-weight: 400; font-size: 11px;">Types: TEXT, DATE, NUMBER, PERIOD</span>
        </div>
        <div class="columns-tag-list">
          ${headers.map(h => {
            const type = columnTypes[h] || 'TEXT';
            const badgeClass = getTypeBadgeClass(type);
            return `
              <span class="column-tag">
                <span>${escapeHtml(h)}</span>
                <span class="column-tag-type ${badgeClass}">${type}</span>
              </span>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Dynamic Overview 8-KPI Section (Phase 2.1)
 * Displays: Total records, Total columns, Numerical columns, Categorical columns,
 * Date columns, Missing values, Duplicate records, Data completeness percentage
 */
function renderOverviewKPISection() {
  const profile = state.dataset ? state.dataset.profile : null;

  if (!profile) {
    return `
      <section class="overview-kpis-wrapper">
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="reserved-badge-header">Dataset Profiling</span>
            <h2 class="section-title">Core Dataset Dimensions & Quality Metrics</h2>
            <p class="section-subtitle">
              Awaiting dataset upload. Dynamic record counts, column types, and data quality metrics will populate upon upload.
            </p>
          </div>
        </div>

        <div class="empty-state-panel" style="min-height: 160px;">
          <div class="empty-state-icon">${icons.info}</div>
          <h3 class="empty-state-title">Awaiting Dataset Upload</h3>
          <p class="empty-state-desc">Upload a dataset or select a sample dataset above to compute real-time dimensional profiles and data quality audits.</p>
        </div>
      </section>
    `;
  }

  const { totalRecords, totalColumns, counts, quality } = profile;
  const missingRate = quality.totalCells > 0 ? (quality.totalMissingCells / quality.totalCells) * 100 : 0;

  return `
    <section class="overview-kpis-wrapper">
      <div class="section-header">
        <div class="section-title-wrap">
          <span class="reserved-badge-header" style="background-color: var(--accent-orange-light); color: var(--accent-orange-hover); border-color: var(--accent-orange-border);">
            Live Dataset Profile
          </span>
          <h2 class="section-title">Core Dataset Dimensions & Quality Metrics</h2>
          <p class="section-subtitle">Real-time analytical metrics calculated from all parsed tabular records</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="jump-to-analysis-btn">
          View Complete Profiling Suite &rarr;
        </button>
      </div>

      <div class="overview-kpi-grid">
        <!-- 1. Total Records -->
        <div class="overview-kpi-card accent-orange">
          <div class="kpi-header">
            <span class="kpi-label">Total Records</span>
            <span class="kpi-icon">${icons.table}</span>
          </div>
          <div class="kpi-value">${totalRecords.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span>Clean records parsed</span>
            <span class="quality-badge healthy">Indexed</span>
          </div>
        </div>

        <!-- 2. Total Columns -->
        <div class="overview-kpi-card accent-orange">
          <div class="kpi-header">
            <span class="kpi-label">Total Columns</span>
            <span class="kpi-icon">${icons.columns}</span>
          </div>
          <div class="kpi-value">${totalColumns}</div>
          <div class="kpi-subtext">
            <span>Dimensions</span>
            <span>${counts.identifier} ID / Ref</span>
          </div>
        </div>

        <!-- 3. Numerical Columns -->
        <div class="overview-kpi-card accent-blue">
          <div class="kpi-header">
            <span class="kpi-label">Numerical Columns</span>
            <span class="kpi-icon" style="color: #0284c7;">${icons.barChart}</span>
          </div>
          <div class="kpi-value">${counts.numerical}</div>
          <div class="kpi-subtext">
            <span>Quantitative measures</span>
            <span>${formatPercent(totalColumns ? (counts.numerical / totalColumns) * 100 : 0)}</span>
          </div>
        </div>

        <!-- 4. Categorical Columns -->
        <div class="overview-kpi-card accent-purple">
          <div class="kpi-header">
            <span class="kpi-label">Categorical Columns</span>
            <span class="kpi-icon" style="color: #8b5cf6;">${icons.pieChart}</span>
          </div>
          <div class="kpi-value">${counts.categorical}</div>
          <div class="kpi-subtext">
            <span>Discrete segments</span>
            <span>${formatPercent(totalColumns ? (counts.categorical / totalColumns) * 100 : 0)}</span>
          </div>
        </div>

        <!-- 5. Date Columns -->
        <div class="overview-kpi-card accent-emerald">
          <div class="kpi-header">
            <span class="kpi-label">Date Columns</span>
            <span class="kpi-icon" style="color: #10b981;">${icons.chart}</span>
          </div>
          <div class="kpi-value">${counts.date}</div>
          <div class="kpi-subtext">
            <span>Temporal fields</span>
            <span>${counts.date > 0 ? 'Active' : 'None'}</span>
          </div>
        </div>

        <!-- 6. Missing Values -->
        <div class="overview-kpi-card ${quality.totalMissingCells > 0 ? 'accent-orange' : 'accent-emerald'}">
          <div class="kpi-header">
            <span class="kpi-label">Missing Values</span>
            <span class="kpi-icon" style="color: ${quality.totalMissingCells > 0 ? 'var(--accent-orange)' : '#10b981'};">${icons.alertCircle}</span>
          </div>
          <div class="kpi-value">${quality.totalMissingCells.toLocaleString()}</div>
          <div class="kpi-subtext">
            <span>${formatPercent(missingRate)} of total cells</span>
            <span class="quality-badge ${quality.totalMissingCells === 0 ? 'healthy' : 'warning'}">
              ${quality.totalMissingCells === 0 ? 'Zero missing' : `${quality.totalMissingCells} empty`}
            </span>
          </div>
        </div>

        <!-- 7. Duplicate Records -->
        <div class="overview-kpi-card ${quality.duplicateCount > 0 ? 'accent-orange' : 'accent-emerald'}">
          <div class="kpi-header">
            <span class="kpi-label">Duplicate Records</span>
            <span class="kpi-icon" style="color: ${quality.duplicateCount > 0 ? 'var(--accent-orange)' : '#10b981'};">${icons.database}</span>
          </div>
          <div class="kpi-value">${quality.duplicateCount}</div>
          <div class="kpi-subtext">
            <span>${formatPercent(quality.duplicatePercentage)} duplicate rate</span>
            <span class="quality-badge ${quality.duplicateCount === 0 ? 'healthy' : 'warning'}">
              ${quality.duplicateCount === 0 ? '100% unique' : 'Duplicates'}
            </span>
          </div>
        </div>

        <!-- 8. Data Completeness Percentage -->
        <div class="overview-kpi-card accent-emerald">
          <div class="kpi-header">
            <span class="kpi-label">Data Completeness</span>
            <span class="kpi-icon" style="color: #10b981;">${icons.sparkles}</span>
          </div>
          <div class="kpi-value">${formatPercent(quality.completenessPercentage)}</div>
          <div class="kpi-subtext">
            <span>Populated cell ratio</span>
            <span class="quality-badge ${quality.completenessPercentage >= 95 ? 'healthy' : 'warning'}">
              ${quality.completenessPercentage >= 95 ? 'High Quality' : 'Review'}
            </span>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render Executive Overview Charts Section (Phase 2.2 Dynamic Charts)
 */
function renderOverviewChartsSection() {
  if (!state.dataset || !state.charts) {
    return `
      <section class="reserved-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="reserved-badge-header">Visual Analytics</span>
            <h2 class="section-title">Visual Exploration & Distribution Analysis</h2>
            <p class="section-subtitle">Real-time analytical visualizer charts generated from active records</p>
          </div>
        </div>

        <div class="empty-state-panel" style="min-height: 200px;">
          <div class="empty-state-icon">${icons.barChart}</div>
          <h3 class="empty-state-title">Awaiting Dataset Upload</h3>
          <p class="empty-state-desc">
            Upload an Excel or CSV file, or select a sample dataset above to dynamically generate interactive distribution charts, category rankings, and visual breakdowns.
          </p>
        </div>
      </section>
    `;
  }

  // Pick top two summary charts
  const distCharts = state.charts.distribution || [];
  const compCharts = state.charts.comparisons || [];
  const tempCharts = state.charts.temporal || [];
  const numCharts = state.charts.numerical || [];

  const chart1 = distCharts[0] || numCharts[0];
  const chart2 = compCharts[0] || tempCharts[0] || distCharts[1] || numCharts[1];

  let totalChartsCount = 0;
  if (state.charts) {
    totalChartsCount = (state.charts.distribution?.length || 0) +
                       (state.charts.comparisons?.length || 0) +
                       (state.charts.numerical?.length || 0) +
                       (state.charts.temporal?.length || 0) +
                       (state.charts.relationships?.length || 0) +
                       (state.customCharts?.length || 0);
  }

  return `
    <section class="reserved-section">
      <div class="section-header">
        <div class="section-title-wrap">
          <span class="reserved-badge-header" style="background-color: var(--accent-orange-light); color: var(--accent-orange-hover); border-color: var(--accent-orange-border);">
            Live Visual Analytics
          </span>
          <h2 class="section-title">Executive Visual Exploration & Composition</h2>
          <p class="section-subtitle">Real-time multi-dimensional charts generated dynamically from ${state.dataset.totalRecords.toLocaleString()} rows</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="jump-to-visualizations-btn">
          ${icons.chart}
          <span>Explore All Visualizations (${totalChartsCount}) &rarr;</span>
        </button>
      </div>

      <div class="viz-charts-grid" style="padding: 0; background: transparent; margin-bottom: 20px;">
        ${chart1 ? renderChartCard(chart1) : ''}
        ${chart2 ? renderChartCard(chart2) : ''}
      </div>

      <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="color: var(--accent-orange); display: flex;">${icons.sparkles}</span>
          <span style="font-size: 13px; color: var(--text-secondary);">
            <strong>5 Analytical Dimensions Ready:</strong> Category Distributions, Comparisons, Numerical Histograms & Box Plots, Time-Series Trends, and Correlation Heatmaps.
          </span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="jump-to-visualizations-btn-2">
          View Complete Visualizations Suite &rarr;
        </button>
      </div>
    </section>
  `;
}

/**
 * Universal Chart Card Component
 */
function renderChartCard(item) {
  const currentType = state.chartToggles[item.id] || item.activeType || item.type;
  const activeItem = { ...item, activeType: currentType };

  const hasToggle = item.supportedTypes && item.supportedTypes.length > 1;
  const toggleLabel = getToggleLabel(currentType, item.supportedTypes);

  return `
    <div class="chart-card" id="card-${item.id}">
      <div class="chart-card-topbar">
        <div class="chart-card-title-group">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.subtitle || '')}</p>
        </div>
        <div class="chart-card-actions">
          ${hasToggle ? `
            <button type="button" class="chart-toggle-btn" data-chart-id="${item.id}" title="Toggle between alternative chart representations">
              ${icons.refresh}
              <span>${toggleLabel}</span>
            </button>
          ` : ''}
          <button type="button" class="chart-export-btn" data-export-chart="${item.id}" title="Download high-resolution vector SVG">
            ${icons.upload}
            <span>Export SVG</span>
          </button>
          ${item.isCustom ? `
            <button type="button" class="btn btn-danger-outline btn-sm btn-remove-custom-chart" data-custom-id="${item.id}" title="Remove custom chart">
              ${icons.trash}
            </button>
          ` : ''}
        </div>
      </div>
      <div class="chart-card-body">
        ${renderDashboardChart(activeItem)}
      </div>
    </div>
  `;
}

function getToggleLabel(current, supported) {
  if (!supported || supported.length <= 1) return 'Toggle View';
  const currentIdx = supported.indexOf(current);
  const nextIdx = (currentIdx + 1) % supported.length;
  const next = supported[nextIdx];
  switch (next) {
    case 'bar': return 'View as Bar';
    case 'hbar': return 'View as Ranking';
    case 'donut': return 'View as Donut';
    case 'pie': return 'View as Pie';
    case 'line': return 'View as Line';
    case 'area': return 'View as Area';
    case 'histogram': return 'View as Histogram';
    case 'boxplot': return 'View as Box Plot';
    case 'grouped': return 'View Grouped';
    case 'stacked': return 'View Stacked';
    case 'heatmap': return 'View Heatmap';
    case 'scatter': return 'View Scatter';
    default: return `Switch to ${next}`;
  }
}


/**
 * Render Data Table Preview
 */
function renderDataTablePreview(limitRows = null) {
  if (!state.dataset) {
    return `
      <div class="table-preview-card">
        <div class="empty-state-panel" style="min-height: 280px;">
          <div class="empty-state-icon">${icons.table}</div>
          <h3 class="empty-state-title">No Dataset Loaded</h3>
          <p class="empty-state-desc">Upload an Excel (.xlsx, .xls) or CSV (.csv) file to explore the interactive record preview.</p>
        </div>
      </div>
    `;
  }

  const { headers, rows, columnTypes } = state.dataset;
  
  // Filter by search query if present
  let filteredRows = rows;
  if (state.previewSearch.trim()) {
    const q = state.previewSearch.trim().toLowerCase();
    filteredRows = rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(q)));
  }

  const totalFiltered = filteredRows.length;
  let displayRows = filteredRows;
  let paginationInfo = '';

  if (limitRows) {
    // Quick preview mode (e.g. Overview tab)
    displayRows = filteredRows.slice(0, limitRows);
  } else {
    // Full preview mode with pagination
    const totalPages = Math.ceil(totalFiltered / state.pageSize) || 1;
    const currentPage = Math.min(state.previewPage, totalPages);
    const startIdx = (currentPage - 1) * state.pageSize;
    const endIdx = startIdx + state.pageSize;
    displayRows = filteredRows.slice(startIdx, endIdx);

    paginationInfo = `
      <div class="table-pagination-bar">
        <div class="pagination-info">
          Showing <strong>${startIdx + 1}</strong> to <strong>${Math.min(endIdx, totalFiltered)}</strong> of <strong>${totalFiltered.toLocaleString()}</strong> rows
          ${totalFiltered !== rows.length ? `(filtered from ${rows.length.toLocaleString()})` : ''}
        </div>
        <div class="pagination-controls">
          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            id="prev-page-btn" 
            ${currentPage <= 1 ? 'disabled' : ''}
          >
            Previous
          </button>
          <span style="font-size: 12px; font-weight: 600; padding: 0 8px;">
            Page ${currentPage} of ${totalPages}
          </span>
          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            id="next-page-btn" 
            ${currentPage >= totalPages ? 'disabled' : ''}
          >
            Next
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="table-preview-card">
      <div class="table-controls-bar">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <input 
            type="text" 
            class="table-search-input" 
            id="table-search-input"
            placeholder="Search records in preview..." 
            value="${escapeHtml(state.previewSearch)}"
          />
          ${state.previewSearch ? `
            <button type="button" class="btn btn-secondary btn-sm" id="clear-search-btn">
              Clear Search
            </button>
          ` : ''}
        </div>

        <div class="table-meta-summary">
          <strong>${headers.length}</strong> columns &bull; <strong>${rows.length.toLocaleString()}</strong> total records
        </div>
      </div>

      <div class="table-scroll-container">
        <table class="preview-table">
          <thead>
            <tr>
              <th class="row-num-th">#</th>
              ${headers.map(h => {
                const type = columnTypes[h] || 'TEXT';
                const badgeClass = getTypeBadgeClass(type);
                return `
                <th>
                  <div class="th-content">
                    <span>${escapeHtml(h)}</span>
                    <span class="th-type ${badgeClass}">${type}</span>
                  </div>
                </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${displayRows.length > 0 ? displayRows.map((row, idx) => {
              const actualRowIndex = limitRows 
                ? idx + 1 
                : ((state.previewPage - 1) * state.pageSize) + idx + 1;
              return `
                <tr>
                  <td class="row-num-cell">${actualRowIndex}</td>
                  ${headers.map((_, colIdx) => {
                    const cellVal = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
                    return `<td>${escapeHtml(cellVal)}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${headers.length + 1}" style="text-align: center; padding: 36px; color: var(--text-muted);">
                  No records match your search filter "${escapeHtml(state.previewSearch)}".
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      ${paginationInfo}
    </div>
  `;
}







/**
 * Render Overview View
 */
function renderOverviewView() {
  return `
    <div class="file-management-grid">
      ${renderFileUploadSection()}
      ${renderDatasetInfoSection()}
    </div>
    ${renderOverviewKPISection()}
    ${renderOverviewChartsSection()}
    ${state.dataset ? `
      <section class="reserved-section" style="margin-top: 32px;">
        <div class="section-header">
          <div class="section-title-wrap">
            <h2 class="section-title">Data Sample Quickview</h2>
            <p class="section-subtitle">First 5 records of uploaded dataset &bull; View complete table in the Data Preview tab</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="jump-to-preview-btn">
            View All in Data Preview &rarr;
          </button>
        </div>
        ${renderDataTablePreview(5)}
      </section>
    ` : ''}
  `;
}

/**
 * Render Dedicated Data Preview Tab View
 */
function renderPreviewView() {
  return `
    <div class="section-header">
      <div class="section-title-wrap">
        <h2 class="section-title">Dataset Preview & Exploration</h2>
        <p class="section-subtitle">Examine raw tabular records, verify column mappings, and search attributes</p>
      </div>
    </div>
    ${renderDataTablePreview()}
  `;
}

/**
 * Helper: Map classification type to badge styling
 */
function getClassificationBadge(type) {
  switch (type) {
    case 'NUMERICAL':
      return `<span class="column-tag-type num">Numerical</span>`;
    case 'CATEGORICAL':
      return `<span class="column-tag-type" style="background-color: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe;">Categorical</span>`;
    case 'DATE_PERIOD':
      return `<span class="column-tag-type date">Date / Period</span>`;
    case 'IDENTIFIER':
      return `<span class="column-tag-type" style="background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">Identifier</span>`;
    case 'DESCRIPTIVE_TEXT':
    default:
      return `<span class="column-tag-type txt">Text</span>`;
  }
}

/**
 * Render Column-wise Profiling Results Table (Phase 2.1 - Section A)
 */
function renderColumnWiseTable(profile) {
  const { headers, classifications, columnProfiles, quality } = profile;
  let displayHeaders = headers;

  if (state.profileSearch.trim()) {
    const q = state.profileSearch.trim().toLowerCase();
    displayHeaders = headers.filter(h => h.toLowerCase().includes(q));
  }

  return `
    <div class="profile-card" id="section-table">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Column-wise Profiling Summary</h3>
          <p class="profile-card-subtitle">Comprehensive structural, statistical and dimensional attributes for every column</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input 
            type="text" 
            class="table-search-input" 
            id="profile-search-input" 
            placeholder="Filter columns..." 
            value="${escapeHtml(state.profileSearch)}"
          />
          ${state.profileSearch ? `
            <button type="button" class="btn btn-secondary btn-sm" id="clear-profile-search-btn">
              Clear
            </button>
          ` : ''}
        </div>
      </div>

      <div class="profile-table-wrap">
        <table class="profiling-table">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">#</th>
              <th>Column Name</th>
              <th>Classification</th>
              <th>Valid Values</th>
              <th>Missing Values</th>
              <th>Distinct Values</th>
              <th>Primary Summary & Moments</th>
              <th>Data Health Status</th>
            </tr>
          </thead>
          <tbody>
            ${displayHeaders.length > 0 ? displayHeaders.map((header, idx) => {
              const type = classifications[header] || 'DESCRIPTIVE_TEXT';
              const p = columnProfiles[header] || {};
              const q = quality.columnQuality[header] || {};

              // Summary metric formatting
              let summaryText = '—';
              if (type === 'NUMERICAL') {
                summaryText = `Mean: <strong>${formatMetricNumber(p.mean)}</strong> &bull; Min: <strong>${formatMetricNumber(p.min)}</strong> &bull; Max: <strong>${formatMetricNumber(p.max)}</strong>`;
              } else if (type === 'CATEGORICAL') {
                const topCat = p.mostFrequent ? `"${escapeHtml(p.mostFrequent.category)}"` : 'None';
                summaryText = `Top: <strong>${topCat}</strong> (${formatPercent(p.mostFrequent ? p.mostFrequent.percentage : 0)})`;
              } else if (type === 'DATE_PERIOD') {
                summaryText = `<strong>${p.earliest || '—'}</strong> &rarr; <strong>${p.latest || '—'}</strong> (${p.rangeDays || 0} days)`;
              } else if (type === 'IDENTIFIER') {
                summaryText = p.isUniqueId 
                  ? `<span style="color: #047857; font-weight: 600;">Unique Reference Key (100%)</span>`
                  : `Cardinality: <strong>${(p.distinctCount || 0).toLocaleString()}</strong> IDs`;
              } else {
                summaryText = `Avg Length: <strong>${p.avgLength || 0}</strong> chars`;
              }

              // Status badge
              let statusClass = 'healthy';
              if (q.status.includes('Constant')) statusClass = 'warning';
              else if (q.status.includes('High Missing')) statusClass = 'danger';
              else if (q.status.includes('Minor Missing')) statusClass = 'warning';

              return `
                <tr>
                  <td style="text-align: center; color: var(--text-muted); font-size: 11px;">${idx + 1}</td>
                  <td class="col-name-cell">${escapeHtml(header)}</td>
                  <td>${getClassificationBadge(type)}</td>
                  <td><strong>${(p.validCount || 0).toLocaleString()}</strong></td>
                  <td>
                    <span>${(q.missingCount || 0).toLocaleString()}</span>
                    <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(${formatPercent(q.missingRate)})</span>
                  </td>
                  <td><strong>${(p.distinctCount !== undefined ? p.distinctCount : '—').toLocaleString()}</strong></td>
                  <td style="font-size: 12px;">${summaryText}</td>
                  <td>
                    <span class="quality-badge ${statusClass}">
                      ${escapeHtml(q.status || 'Healthy')}
                    </span>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  No columns match your filter "${escapeHtml(state.profileSearch)}".
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render Numerical Analysis Deep-Dive Section (Phase 2.1 - Section B)
 */
function renderNumericalAnalysis(profile) {
  const { numericalColumns, columnProfiles } = profile;

  if (!numericalColumns || numericalColumns.length === 0) {
    return `
      <div class="profile-card" id="section-numerical">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Numerical Analysis</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          No non-identifier numerical columns were identified in this dataset.
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-card" id="section-numerical">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Numerical Analysis & Descriptive Moments</h3>
          <p class="profile-card-subtitle">Exhaustive statistical metrics calculated across all identified numerical variables</p>
        </div>
        <span class="tab-badge" style="background-color: var(--accent-orange-light); color: var(--accent-orange-hover);">
          ${numericalColumns.length} Numerical ${numericalColumns.length === 1 ? 'Column' : 'Columns'}
        </span>
      </div>

      <div class="profile-table-wrap">
        <table class="profiling-table">
          <thead>
            <tr>
              <th>Numerical Variable</th>
              <th>Valid Values</th>
              <th>Missing</th>
              <th>Sum</th>
              <th>Mean (&mu;)</th>
              <th>Median</th>
              <th>Min</th>
              <th>Max</th>
              <th>Range (&Delta;)</th>
              <th>Std Dev (&sigma;)</th>
              <th>Variance (&sigma;&sup2;)</th>
            </tr>
          </thead>
          <tbody>
            ${numericalColumns.map(col => {
              const p = columnProfiles[col] || {};
              return `
                <tr>
                  <td class="col-name-cell">${escapeHtml(col)}</td>
                  <td><strong>${(p.validCount || 0).toLocaleString()}</strong></td>
                  <td>
                    <span>${(p.missingCount || 0).toLocaleString()}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">(${formatPercent(p.missingRate)})</span>
                  </td>
                  <td><strong>${formatMetricNumber(p.sum)}</strong></td>
                  <td style="color: var(--accent-orange-hover); font-weight: 600;">${formatMetricNumber(p.mean)}</td>
                  <td><strong>${formatMetricNumber(p.median)}</strong></td>
                  <td>${formatMetricNumber(p.min)}</td>
                  <td>${formatMetricNumber(p.max)}</td>
                  <td>${formatMetricNumber(p.range)}</td>
                  <td>${formatMetricNumber(p.stdDev)}</td>
                  <td style="font-size: 11px; color: var(--text-muted);">${formatMetricNumber(p.variance)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render Categorical Analysis Section (Phase 2.1 - Section C)
 */
function renderCategoricalAnalysis(profile) {
  const { categoricalColumns, columnProfiles } = profile;

  if (!categoricalColumns || categoricalColumns.length === 0) {
    return `
      <div class="profile-card" id="section-categorical">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Categorical Analysis & Frequency Distributions</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          No categorical columns identified in this dataset.
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-card" id="section-categorical">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Categorical Analysis & Frequency Distributions</h3>
          <p class="profile-card-subtitle">Distinct value counts, modal dominance, least frequent segments, and distribution spreads</p>
        </div>
        <span class="tab-badge" style="background-color: #f3e8ff; color: #7e22ce;">
          ${categoricalColumns.length} Categorical ${categoricalColumns.length === 1 ? 'Column' : 'Columns'}
        </span>
      </div>

      <div style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        ${categoricalColumns.map(col => {
          const p = columnProfiles[col] || {};
          const mostFreq = p.mostFrequent;
          const leastFreq = p.leastFrequent;
          const dist = p.distribution || [];

          return `
            <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">${escapeHtml(col)}</h4>
                <span class="column-tag-type" style="background-color: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe;">
                  ${p.distinctCount || 0} Distinct
                </span>
              </div>

              <!-- Metrics Row -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; font-size: 12px;">
                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Most Frequent (Mode)</div>
                  <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;" title="${mostFreq ? escapeHtml(mostFreq.category) : '—'}">
                    ${mostFreq ? escapeHtml(mostFreq.category) : '—'}
                  </div>
                  <div style="color: var(--accent-orange-hover); font-size: 11px; font-weight: 600;">
                    ${mostFreq ? `${mostFreq.count.toLocaleString()} rows (${formatPercent(mostFreq.percentage)})` : '—'}
                  </div>
                </div>

                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Least Frequent</div>
                  <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;" title="${leastFreq ? escapeHtml(leastFreq.category) : '—'}">
                    ${leastFreq ? escapeHtml(leastFreq.category) : '—'}
                  </div>
                  <div style="color: var(--text-muted); font-size: 11px;">
                    ${leastFreq ? `${leastFreq.count.toLocaleString()} rows (${formatPercent(leastFreq.percentage)})` : '—'}
                  </div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                <span>Unique items: <strong>${p.uniqueCount || 0}</strong></span>
                <span>Repeated categories: <strong>${p.repeatedCount || 0}</strong></span>
              </div>

              <!-- Distribution Bars -->
              <div class="cat-dist-container">
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Top Segment Breakdown</div>
                ${dist.slice(0, 5).map(item => `
                  <div class="cat-dist-item">
                    <div class="cat-dist-header">
                      <span class="cat-dist-name" title="${escapeHtml(item.category)}">${escapeHtml(item.category)}</span>
                      <span class="cat-dist-count">${item.count} (${formatPercent(item.percentage)})</span>
                    </div>
                    <div class="cat-bar-bg">
                      <div class="cat-bar-fill" style="width: ${Math.max(4, Math.min(100, item.percentage))}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Descriptive Text & Narrative Analysis Section (Phase 2.1 - Issue 2)
 * High-cardinality descriptive columns allow users to inspect their distinct values,
 * character lengths, and frequencies without generating misleading charts.
 */
function renderTextAnalysis(profile) {
  const { textColumns, columnProfiles } = profile;

  if (!textColumns || textColumns.length === 0) {
    return `
      <div class="profile-card" id="section-text">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Descriptive Text & Narrative Fields</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          No high-cardinality descriptive text columns identified in this dataset.
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-card" id="section-text">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Descriptive Text & Narrative Fields</h3>
          <p class="profile-card-subtitle">Inspection of high-cardinality titles, names, notes, and unstructured narratives with distinct value frequencies</p>
        </div>
        <span class="tab-badge" style="background-color: #f1f5f9; color: #475569;">
          ${textColumns.length} Descriptive ${textColumns.length === 1 ? 'Column' : 'Columns'}
        </span>
      </div>

      <div style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        ${textColumns.map(col => {
          const p = columnProfiles[col] || {};
          const freq = p.frequencies || [];
          const isHigh = p.isHighCardinality;

          return `
            <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">${escapeHtml(col)}</h4>
                <span class="column-tag-type txt" style="background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
                  ${isHigh ? 'High Cardinality Text' : 'Descriptive Text'}
                </span>
              </div>

              <!-- Metrics Grid -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px;">
                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Distinct Entries</div>
                  <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${(p.distinctCount || 0).toLocaleString()}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${formatPercent(p.cardinalityRate)} unique</div>
                </div>

                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Avg Length</div>
                  <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${p.avgLength || 0} chars</div>
                  <div style="font-size: 11px; color: var(--text-muted);">Span: ${p.minLength || 0} - ${p.maxLength || 0}</div>
                </div>

                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Completeness</div>
                  <div style="font-weight: 700; color: #047857; margin-top: 2px;">${formatPercent(100 - (p.missingRate || 0))}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${p.missingCount || 0} missing</div>
                </div>
              </div>

              <!-- Distinct Values & Frequencies Inspector -->
              <div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
                  Distinct Values & Frequencies (${Math.min(freq.length, 15)} of ${freq.length})
                </div>
                <div style="max-height: 180px; overflow-y: auto; background-color: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xs);">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-subtle); color: var(--text-muted); font-size: 11px;">
                        <th style="padding: 6px 10px; text-align: left; font-weight: 600;">Value / Entry</th>
                        <th style="padding: 6px 10px; text-align: right; font-weight: 600; width: 60px;">Freq</th>
                        <th style="padding: 6px 10px; text-align: right; font-weight: 600; width: 60px;">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${freq.slice(0, 15).map(f => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 6px 10px; color: var(--text-main); font-weight: 500; word-break: break-word;" title="${escapeHtml(f.value)}">
                            ${escapeHtml(f.value)}
                          </td>
                          <td style="padding: 6px 10px; text-align: right; font-weight: 600; color: var(--text-secondary);">${f.count}</td>
                          <td style="padding: 6px 10px; text-align: right; color: var(--text-muted); font-size: 11px;">${formatPercent(f.percentage)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Date and Period Analysis Section (Phase 2.1 - Section D)
 */
function renderDateAnalysis(profile) {
  const { dateColumns, columnProfiles } = profile;

  if (!dateColumns || dateColumns.length === 0) {
    return `
      <div class="profile-card" id="section-dates">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Date & Period Temporal Trajectory</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          No date or period columns identified in this dataset.
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-card" id="section-dates">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Date & Period Temporal Trajectory</h3>
          <p class="profile-card-subtitle">Chronological range boundaries and historical record groupings</p>
        </div>
        <span class="tab-badge" style="background-color: #ecfdf5; color: #047857;">
          ${dateColumns.length} Date / Period ${dateColumns.length === 1 ? 'Column' : 'Columns'}
        </span>
      </div>

      <div style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
        ${dateColumns.map(col => {
          const p = columnProfiles[col] || {};
          return `
            <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">${escapeHtml(col)}</h4>
                <span class="column-tag-type date">Temporal Field</span>
              </div>

              <!-- Boundaries -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px;">
                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Earliest Date</div>
                  <div style="font-weight: 700; color: #047857; margin-top: 3px;">${p.earliest || '—'}</div>
                </div>
                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Latest Date</div>
                  <div style="font-weight: 700; color: #047857; margin-top: 3px;">${p.latest || '—'}</div>
                </div>
                <div style="background-color: #ffffff; padding: 10px; border-radius: var(--radius-xs); border: 1px solid var(--border-color);">
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600;">Date Range</div>
                  <div style="font-weight: 700; color: var(--text-main); margin-top: 3px;">${p.rangeDays || 0} days</div>
                </div>
              </div>

              <!-- Temporal Grouping Chips -->
              ${p.byQuarter && p.byQuarter.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Quarterly Grouping</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${p.byQuarter.map(q => `
                      <span style="background-color: #ffffff; border: 1px solid var(--border-color); padding: 3px 8px; border-radius: var(--radius-xs); font-size: 11px;">
                        <strong>${escapeHtml(q.label)}</strong>: ${q.count} rows
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${p.byYear && p.byYear.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Yearly Frequency</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${p.byYear.map(y => `
                      <span style="background-color: #ffffff; border: 1px solid var(--border-color); padding: 3px 8px; border-radius: var(--radius-xs); font-size: 11px;">
                        <strong>${escapeHtml(y.label)}</strong>: ${y.count} rows
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Relationship & Pearson Correlation Analysis Section (Phase 2.1 - Section F)
 */
function renderCorrelationAnalysis(profile) {
  const { correlations, numericalColumns } = profile;

  if (!numericalColumns || numericalColumns.length < 2) {
    return `
      <div class="profile-card" id="section-correlations">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Relationship & Pearson Correlation Analysis</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          At least 2 non-identifier numerical columns are required to evaluate Pearson correlation.
        </div>
      </div>
    `;
  }

  if (!correlations || correlations.length === 0) {
    return `
      <div class="profile-card" id="section-correlations">
        <div class="profile-card-header">
          <h3 class="profile-card-title">Relationship & Pearson Correlation Analysis</h3>
        </div>
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          No valid correlation pairs found (insufficient co-occurring observations or constant numerical values).
        </div>
      </div>
    `;
  }

  return `
    <div class="profile-card" id="section-correlations">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Relationship & Pearson Correlation Analysis</h3>
          <p class="profile-card-subtitle">Pairwise Pearson linear coefficients calculated strictly between non-identifier numerical measures</p>
        </div>
        <span class="tab-badge" style="background-color: var(--accent-orange-light); color: var(--accent-orange-hover);">
          ${correlations.length} Evaluated Pairs
        </span>
      </div>

      <div class="profile-table-wrap">
        <table class="profiling-table">
          <thead>
            <tr>
              <th>Variable 1 (X)</th>
              <th>Variable 2 (Y)</th>
              <th>Pearson r</th>
              <th>Correlation Strength</th>
              <th>Valid Observations</th>
              <th>Magnitude Indicator</th>
            </tr>
          </thead>
          <tbody>
            ${correlations.map(pair => {
              let badgeClass = 'neutral';
              if (pair.strength.includes('Strong Positive')) badgeClass = 'strong-pos';
              else if (pair.strength.includes('Moderate Positive')) badgeClass = 'mod-pos';
              else if (pair.strength.includes('Strong Negative')) badgeClass = 'strong-neg';
              else if (pair.strength.includes('Moderate Negative')) badgeClass = 'mod-neg';

              const barPct = Math.min(100, Math.round(Math.abs(pair.r) * 100));
              const isPos = pair.r >= 0;

              return `
                <tr>
                  <td class="col-name-cell">${escapeHtml(pair.colA)}</td>
                  <td class="col-name-cell">${escapeHtml(pair.colB)}</td>
                  <td style="font-family: var(--font-mono); font-weight: 700; font-size: 14px; color: ${isPos ? '#ea580c' : '#dc2626'};">
                    ${pair.r >= 0 ? '+' : ''}${pair.formattedR}
                  </td>
                  <td>
                    <span class="corr-badge ${badgeClass}">
                      ${escapeHtml(pair.strength)}
                    </span>
                  </td>
                  <td><strong>${pair.observations}</strong> pairs</td>
                  <td style="width: 160px;">
                    <div style="width: 120px; height: 6px; background-color: var(--bg-subtle); border-radius: var(--radius-full); overflow: hidden;">
                      <div style="height: 100%; width: ${barPct}%; background-color: ${isPos ? 'var(--accent-orange)' : '#dc2626'}; border-radius: var(--radius-full);"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render Data Quality & Hygiene Audit Section (Phase 2.1 - Section E)
 */
function renderQualityAudit(profile) {
  const { quality, headers } = profile;
  const anomalies = [];

  headers.forEach(h => {
    const q = quality.columnQuality[h];
    if (q) {
      if (q.isConstant) {
        anomalies.push({ col: h, type: 'Constant Column', desc: 'Contains only 1 unique value across all records.' });
      } else if (q.isNearConstant) {
        anomalies.push({ col: h, type: 'Near-Constant', desc: 'Over 95% of records share the identical value.' });
      } else if (q.missingRate > 25) {
        anomalies.push({ col: h, type: 'High Missing Rate', desc: `${formatPercent(q.missingRate)} of cells are empty.` });
      }
    }
  });

  return `
    <div class="profile-card" id="section-quality">
      <div class="profile-card-header">
        <div>
          <h3 class="profile-card-title">Data Quality & Completeness Audit</h3>
          <p class="profile-card-subtitle">Exhaustive hygiene scanning for cell completeness, duplicate rows, and single-value columns</p>
        </div>
        <span class="quality-badge ${quality.completenessPercentage >= 95 ? 'healthy' : 'warning'}">
          ${formatPercent(quality.completenessPercentage)} Completeness
        </span>
      </div>

      <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          <!-- Completeness -->
          <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
            <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Overall Completeness</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--text-main); margin: 6px 0;">
              ${formatPercent(quality.completenessPercentage)}
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              ${quality.totalMissingCells === 0 ? 'Zero missing cells detected across all attributes.' : `${quality.totalMissingCells.toLocaleString()} missing cells out of ${quality.totalCells.toLocaleString()} total cells.`}
            </div>
          </div>

          <!-- Duplicates -->
          <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
            <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Duplicate Records</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--text-main); margin: 6px 0;">
              ${quality.duplicateCount} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">(${formatPercent(quality.duplicatePercentage)})</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              ${quality.duplicateCount === 0 ? 'All rows are unique and distinct.' : 'Duplicate rows detected in dataset.'}
            </div>
          </div>

          <!-- Total Column Health -->
          <div style="background-color: var(--bg-page); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px;">
            <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Structural Integrity</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--text-main); margin: 6px 0;">
              ${headers.length} Columns
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              ${anomalies.length === 0 ? 'All columns exhibit healthy variation.' : `${anomalies.length} quality warning${anomalies.length === 1 ? '' : 's'} identified.`}
            </div>
          </div>
        </div>

        <!-- Anomaly Warnings -->
        ${anomalies.length > 0 ? `
          <div style="border-top: 1px solid var(--border-color); padding-top: 18px;">
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">Quality & Hygiene Warnings</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${anomalies.map(a => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); font-size: 13px;">
                  <div>
                    <strong>${escapeHtml(a.col)}</strong>: <span style="color: var(--text-secondary);">${escapeHtml(a.desc)}</span>
                  </div>
                  <span class="quality-badge warning">${escapeHtml(a.type)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div style="padding: 12px 16px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-sm); font-size: 13px; color: #047857;">
            &check; No constant columns, near-constant columns, or severe missing rate thresholds detected.
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Main Analysis Tab Renderer: Structured Data Profiling Suite (Phase 2.1)
 */
function renderAnalysisView() {
  const profile = state.dataset ? state.dataset.profile : null;

  if (!state.dataset || !profile) {
    return `
      <div class="profile-card" style="margin-bottom: 24px;">
        <div class="empty-state-panel" style="min-height: 380px;">
          <div class="empty-state-icon">${icons.barChart}</div>
          <h3 class="empty-state-title">No Dataset Loaded for Analysis</h3>
          <p class="empty-state-desc">
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file, or select a sample dataset on the Overview tab to automatically generate complete column profiling, moments, and data quality audits.
          </p>
        </div>
      </div>
    `;
  }

  const subtabs = [
    { id: 'all', label: 'All Profiling Sections' },
    { id: 'table', label: 'Column Summary Table' },
    { id: 'numerical', label: 'Numerical Moments', count: profile.counts.numerical },
    { id: 'categorical', label: 'Categorical Distributions', count: profile.counts.categorical },
    { id: 'text', label: 'Descriptive Text', count: profile.counts.text },
    { id: 'dates', label: 'Date & Timelines', count: profile.counts.date },
    { id: 'correlations', label: 'Pearson Correlations', count: profile.correlations.length },
    { id: 'quality', label: 'Data Quality Audit' }
  ];

  return `
    <div class="profiling-container">
      <!-- Section Header -->
      <div class="section-header" style="margin-bottom: 8px;">
        <div class="section-title-wrap">
          <h2 class="section-title">Automated Data Profiling Engine</h2>
          <p class="section-subtitle">
            Universal profiling computed from ${state.dataset.totalRecords.toLocaleString()} rows and ${state.dataset.totalColumns} columns in "${escapeHtml(state.file ? state.file.name : 'dataset')}"
          </p>
        </div>
      </div>

      <!-- Sub-navigation Pills -->
      <div class="profile-subnav">
        ${subtabs.map(tab => {
          const isActive = state.profilingSubTab === tab.id;
          return `
            <button 
              type="button" 
              class="profile-subnav-btn ${isActive ? 'active' : ''}" 
              data-subtab="${tab.id}"
            >
              <span>${tab.label}</span>
              ${tab.count !== undefined ? `<span class="pill-count">${tab.count}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Sub-sections Rendered According to Active Subnav Tab -->
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'table') ? renderColumnWiseTable(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'numerical') ? renderNumericalAnalysis(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'categorical') ? renderCategoricalAnalysis(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'text') ? renderTextAnalysis(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'dates') ? renderDateAnalysis(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'correlations') ? renderCorrelationAnalysis(profile) : ''}
      ${(state.profilingSubTab === 'all' || state.profilingSubTab === 'quality') ? renderQualityAudit(profile) : ''}
    </div>
  `;
}

/**
 * Custom Chart Builder Helper: Compiles form state into a valid chart object
 */
function buildCustomChartItem(form, headers, rows, columnTypes) {
  const xCol = form.xCol || headers[0];
  const yCol = form.yCol || '__count__';
  const groupCol = (form.groupCol && form.groupCol !== '__none__') ? form.groupCol : null;
  const groupCols = Array.isArray(form.groupCols) ? form.groupCols : (groupCol ? [groupCol] : []);
  const presentation = form.presentation || 'composite';
  const topN = form.topN || 15;
  const method = ['__count__', '__pct__', '__distinct__'].includes(yCol) ? 'count' : (form.method || 'sum');
  const type = form.type || 'bar';

  // Format readable measure label
  let measureLabel = 'Record Count';
  if (yCol === '__count__') measureLabel = 'Record Count';
  else if (yCol === '__pct__') measureLabel = 'Percentage of Records (%)';
  else if (yCol === '__distinct__') measureLabel = `Distinct Categories Count`;
  else {
    const aggNames = { sum: 'Sum', avg: 'Average', min: 'Minimum', max: 'Maximum', median: 'Median', count: 'Count' };
    measureLabel = `${aggNames[method] || method.toUpperCase()} of ${yCol}`;
  }

  // Auto-generate clean title if not provided
  let defaultTitle = '';
  if (groupCols.length > 0) {
    defaultTitle = `${measureLabel} by ${xCol} across ${groupCols.join(' × ')}`;
  } else if (groupCol) {
    defaultTitle = `${measureLabel} by ${xCol} across ${groupCol}`;
  } else {
    defaultTitle = `${measureLabel} by ${xCol}`;
  }
  const title = (form.title && form.title.trim()) ? form.title.trim() : defaultTitle;

  // 1. Histogram & Box Plot (single numerical variable distribution)
  if (type === 'histogram' || type === 'boxplot') {
    const numCols = headers.filter(h => columnTypes[h] === 'NUMBER');
    let targetCol = (yCol !== '__count__' && !['__pct__', '__distinct__'].includes(yCol)) ? yCol : xCol;
    if (columnTypes[targetCol] !== 'NUMBER') {
      targetCol = numCols[0] || headers[0];
    }
    const idx = headers.indexOf(targetCol);
    const vals = rows.map(r => r ? r[idx] : null);
    return {
      id: 'custom-preview',
      title: (form.title && form.title.trim()) ? form.title.trim() : `${targetCol} ${type === 'histogram' ? 'Frequency Histogram' : 'Box Plot'}`,
      subtitle: `Distribution analysis of ${targetCol} across ${rows.length} rows`,
      type,
      activeType: type,
      values: vals,
      metricName: targetCol
    };
  }

  // 2. Scatter Plot (two numerical variables)
  if (type === 'scatter') {
    const numCols = headers.filter(h => columnTypes[h] === 'NUMBER');
    const scX = (columnTypes[xCol] === 'NUMBER') ? xCol : (numCols[0] || headers[0]);
    let scY = (yCol !== '__count__' && !['__pct__', '__distinct__'].includes(yCol) && columnTypes[yCol] === 'NUMBER') ? yCol : (numCols[1] || numCols[0] || headers[1] || headers[0]);
    if (scX === scY && numCols.length > 1) {
      scY = numCols.find(c => c !== scX) || scY;
    }
    return {
      id: 'custom-preview',
      title: (form.title && form.title.trim()) ? form.title.trim() : `${scX} vs ${scY} Scatter Plot`,
      subtitle: `Bivariate scatter relationship with linear trendline`,
      type: 'scatter',
      activeType: 'scatter',
      rows,
      headers,
      xCol: scX,
      yCol: scY
    };
  }

  // 3. Multi-dimensional Analysis (with 1 or more Category / Series columns selected)
  if (groupCols.length > 0) {
    const agg = aggregateDataset({
      rows,
      headers,
      xCol,
      groupCols,
      yCol,
      method,
      presentation,
      topN
    });

    let effectiveType = type;
    if (presentation === 'facets') {
      effectiveType = 'facets';
    } else if (type === 'donut' || type === 'pie' || type === 'hbar') {
      effectiveType = 'grouped';
    }

    return {
      id: 'custom-preview',
      title,
      subtitle: `Multi-dimensional analysis of ${measureLabel} by ${xCol} categorized by ${groupCols.join(' × ')}`,
      type: effectiveType,
      activeType: effectiveType,
      aggregation: agg,
      xCol,
      groupCols,
      groupCol: groupCols[0],
      yCol,
      yLabel: measureLabel,
      presentation
    };
  }

  // 4. Single Dimension Aggregation (Bar, Hbar, Donut, Pie, Line, Area, etc.)
  const agg = aggregateDataset({
    rows,
    headers,
    xCol,
    yCol,
    method
  });

  let effectiveType = type;
  if (['grouped', 'stacked', 'stacked100', 'facets'].includes(type)) {
    effectiveType = 'bar';
  }

  return {
    id: 'custom-preview',
    title,
    subtitle: `${measureLabel} ranked by ${xCol}`,
    type: effectiveType,
    activeType: effectiveType,
    aggregation: agg,
    data: agg.series,
    xCol,
    yCol,
    yLabel: measureLabel
  };
}

/**
 * Render Custom Chart Builder Modal Dialog (Phase 2.2.2 Multi-Field Analytics)
 */
function renderCustomChartModal() {
  if (!state.dataset) return '';
  const { headers, columnTypes, rows } = state.dataset;
  const form = state.customChartForm;

  const numCols = headers.filter(h => columnTypes[h] === 'NUMBER');
  const catCols = headers.filter(h => columnTypes[h] === 'CATEGORICAL' || columnTypes[h] === 'TEXT' || columnTypes[h] === 'PERIOD' || columnTypes[h] === 'DATE');
  const dimCols = headers;

  const selectedCols = Array.isArray(form.groupCols) ? form.groupCols : (form.groupCol && form.groupCol !== '__none__' ? [form.groupCol] : []);
  const previewItem = buildCustomChartItem(form, headers, rows, columnTypes);

  // Search filter query
  const query = (form.fieldSearch || '').trim().toLowerCase();
  const eligibleCols = (form.includeIdentifiers ? headers : headers.filter(h => columnTypes[h] !== 'IDENTIFIER')).filter(h => {
    if (h === form.xCol) return false;
    if (!query) return true;
    return h.toLowerCase().includes(query) || (columnTypes[h] || '').toLowerCase().includes(query);
  });

  return `
    <div class="modal-backdrop" id="custom-chart-modal">
      <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-chart-title" style="max-width: 860px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" id="modal-chart-title">Custom Multi-Dimensional Chart Builder</h3>
            <p class="modal-subtitle">Configure format, dimension, calculated/numerical metrics, and multi-field series breakdowns</p>
          </div>
          <button type="button" class="modal-close-btn" id="close-custom-chart-modal-btn" aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">
          <div class="builder-form-grid">
            <!-- 1. Visualization Format -->
            <div class="form-group">
              <label class="form-label" for="builder-chart-type">1. Visualization Format</label>
              <select class="form-select" id="builder-chart-type">
                <option value="bar" ${form.type === 'bar' ? 'selected' : ''}>Vertical Bar Chart</option>
                <option value="hbar" ${form.type === 'hbar' ? 'selected' : ''}>Horizontal Bar Chart</option>
                <option value="grouped" ${form.type === 'grouped' ? 'selected' : ''}>Grouped Bar Chart</option>
                <option value="stacked" ${form.type === 'stacked' ? 'selected' : ''}>Stacked Bar Chart</option>
                <option value="stacked100" ${form.type === 'stacked100' ? 'selected' : ''}>100% Stacked Bar Chart</option>
                <option value="line" ${form.type === 'line' ? 'selected' : ''}>Line Chart (Trend / Multi-Series)</option>
                <option value="area" ${form.type === 'area' ? 'selected' : ''}>Area Chart</option>
                <option value="donut" ${form.type === 'donut' ? 'selected' : ''}>Donut Chart</option>
                <option value="pie" ${form.type === 'pie' ? 'selected' : ''}>Pie Chart</option>
                <option value="histogram" ${form.type === 'histogram' ? 'selected' : ''}>Histogram (Distribution)</option>
                <option value="scatter" ${form.type === 'scatter' ? 'selected' : ''}>Scatter Plot (Bivariate)</option>
                <option value="heatmap" ${form.type === 'heatmap' ? 'selected' : ''}>Matrix Heatmap (Cross-Tabulation)</option>
                <option value="facets" ${form.type === 'facets' ? 'selected' : ''}>Small Multiples (Faceted Grid)</option>
              </select>
            </div>

            <!-- 2. Dimension (X-Axis) -->
            <div class="form-group">
              <label class="form-label" for="builder-x-col">2. X-Axis (Primary Dimension)</label>
              <select class="form-select" id="builder-x-col">
                ${dimCols.map(h => `
                  <option value="${escapeHtml(h)}" ${form.xCol === h ? 'selected' : ''}>
                    ${escapeHtml(h)} (${columnTypes[h] || 'TEXT'})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- 3. Value / Measure (Y-Axis) -->
            <div class="form-group">
              <label class="form-label" for="builder-y-col">3. Y-Axis (Value / Measure)</label>
              <select class="form-select" id="builder-y-col">
                <optgroup label="GROUP 1: Automatically Calculated Measures">
                  <option value="__count__" ${form.yCol === '__count__' ? 'selected' : ''}>Record Count (Frequency)</option>
                  <option value="__pct__" ${form.yCol === '__pct__' ? 'selected' : ''}>Percentage of Records (%)</option>
                  <option value="__distinct__" ${form.yCol === '__distinct__' ? 'selected' : ''}>Distinct Value Count</option>
                </optgroup>
                ${numCols.length > 0 ? `
                  <optgroup label="GROUP 2: Existing Numerical Columns">
                    ${numCols.map(h => `
                      <option value="${escapeHtml(h)}" ${form.yCol === h ? 'selected' : ''}>
                        ${escapeHtml(h)} (Numerical)
                      </option>
                    `).join('')}
                  </optgroup>
                ` : ''}
              </select>
            </div>

            <!-- Aggregation Method -->
            <div class="form-group">
              <label class="form-label" for="builder-method">Aggregation Function</label>
              <select class="form-select" id="builder-method">
                <option value="count" ${form.method === 'count' ? 'selected' : ''}>Count (Frequency)</option>
                <option value="sum" ${form.method === 'sum' ? 'selected' : ''}>Sum (Total)</option>
                <option value="avg" ${form.method === 'avg' ? 'selected' : ''}>Average (Mean)</option>
                <option value="min" ${form.method === 'min' ? 'selected' : ''}>Minimum</option>
                <option value="max" ${form.method === 'max' ? 'selected' : ''}>Maximum</option>
                <option value="median" ${form.method === 'median' ? 'selected' : ''}>Median</option>
              </select>
            </div>
          </div>

          <!-- 4. PART A: Multi-Select Category / Series Field Component -->
          <div class="field-multi-select-wrap">
            <div class="field-multi-select-header">
              <label class="form-label" style="margin: 0;">
                4. Category / Series (Multi-Dimensional Breakdown)
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="tab-badge" style="background: ${selectedCols.length > 0 ? 'var(--accent-orange-light)' : 'var(--bg-subtle)'}; color: ${selectedCols.length > 0 ? 'var(--accent-orange-hover)' : 'var(--text-muted)'}; font-size: 11px;">
                  ${selectedCols.length} ${selectedCols.length === 1 ? 'dimension' : 'dimensions'} selected
                </span>
                ${selectedCols.length > 0 ? `
                  <div class="presentation-toggle-group">
                    <button type="button" class="presentation-btn ${form.presentation !== 'facets' ? 'active' : ''}" data-pres-set="composite" title="Combine into composite series in single chart">Composite Series</button>
                    <button type="button" class="presentation-btn ${form.presentation === 'facets' ? 'active' : ''}" data-pres-set="facets" title="Split into small multiples faceted charts">Small Multiples</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Removable Chips Tray -->
            <div class="field-chips-tray">
              ${selectedCols.length === 0 ? `
                <span style="font-size: 11px; color: var(--text-muted); padding-left: 4px;">
                  (None - Select one or more categorical, period or text fields below)
                </span>
              ` : selectedCols.map(col => `
                <span class="field-chip">
                  <span>${escapeHtml(col)}</span>
                  <button type="button" class="field-chip-remove" data-remove-dim="${escapeHtml(col)}" title="Remove dimension">&times;</button>
                </span>
              `).join('')}
            </div>

            <!-- Field Search Input -->
            <div style="position: relative;">
              <input type="text" class="field-search-input" id="builder-group-search" value="${escapeHtml(form.fieldSearch || '')}" placeholder="Search eligible categorical and period fields..." />
            </div>

            <!-- Checkbox List of Available Fields -->
            <div class="field-checklist">
              ${eligibleCols.map(h => {
                const isChecked = selectedCols.includes(h);
                const type = columnTypes[h] || 'TEXT';
                const badgeClass = getTypeBadgeClass(type);
                return `
                  <div class="field-check-item ${isChecked ? 'selected' : ''}" data-toggle-dim="${escapeHtml(h)}">
                    <label class="field-check-label">
                      <input type="checkbox" ${isChecked ? 'checked' : ''} data-dim-check="${escapeHtml(h)}" style="accent-color: var(--accent-orange); cursor: pointer;" />
                      <span>${escapeHtml(h)}</span>
                    </label>
                    <span class="field-badge ${badgeClass}">${type}</span>
                  </div>
                `;
              }).join('')}
              ${eligibleCols.length === 0 ? `
                <div style="font-size: 11px; color: var(--text-muted); padding: 8px; text-align: center;">No matching fields found</div>
              ` : ''}
            </div>

            <div class="field-actions-bar">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="builder-include-ids" ${form.includeIdentifiers ? 'checked' : ''} style="accent-color: var(--accent-orange);" />
                <span>Include Identifiers (OBS_ID, Code, etc.)</span>
              </label>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="field-action-btn" id="builder-select-all-dims">Select All Eligible</button>
                <span>&bull;</span>
                <button type="button" class="field-action-btn" id="builder-clear-all-dims">Clear All</button>
              </div>
            </div>
          </div>

          <!-- Chart Title -->
          <div class="form-group" style="margin-top: -6px;">
            <label class="form-label" for="builder-title">Custom Chart Title</label>
            <input type="text" class="form-input" id="builder-title" value="${escapeHtml(form.title)}" placeholder="Auto-generated if left empty" />
          </div>

          <!-- Configuration Status Pill -->
          <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="color: var(--accent-orange);">Active Configuration:</strong>
              <span>X: <strong>${escapeHtml(form.xCol || 'Default')}</strong></span> &bull; 
              <span>Y: <strong>${escapeHtml(form.yCol === '__count__' ? 'Record Count' : (form.yCol === '__pct__' ? 'Percentage of Records' : (form.yCol === '__distinct__' ? 'Distinct Count' : `${form.method.toUpperCase()} ${form.yCol}`)))}</strong></span>
              ${selectedCols.length > 0 ? `&bull; <span>Series: <strong>${escapeHtml(selectedCols.join(' × '))}</strong> (${form.presentation === 'facets' ? 'Faceted' : 'Composite'})</span>` : ''}
            </div>
            <span class="tab-badge" style="background: var(--accent-orange-light); color: var(--accent-orange-hover);">
              ${escapeHtml(previewItem.type.toUpperCase())}
            </span>
          </div>

          <!-- Live Preview Box -->
          <div class="builder-preview-box">
            <div class="builder-preview-header">Live Dynamic Preview</div>
            <div style="background: #ffffff; border-radius: var(--radius-sm); padding: 12px; border: 1px solid var(--border-color); min-height: 280px; display: flex; align-items: center; justify-content: center; overflow-x: auto;">
              ${renderDashboardChart(previewItem)}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-custom-chart-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="save-custom-chart-btn">
            ${icons.sparkles}
            <span>Add Chart to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Comprehensive Relationship Discovery Hub (Phase 2.2.2)
 */
function renderRelationshipAnalysisHub(dataset, profile) {
  if (!dataset || !profile) return '';

  const { headers, rows, columnTypes } = dataset;
  const rels = profile.relationships || {
    categoricalAssociations: [],
    numericalCorrelations: [],
    temporalRelationships: [],
    numericalByCategorical: []
  };

  const catCols = headers.filter(h => columnTypes[h] === 'CATEGORICAL' || columnTypes[h] === 'TEXT' || columnTypes[h] === 'PERIOD');
  const numCols = headers.filter(h => columnTypes[h] === 'NUMBER');
  const dateCols = headers.filter(h => columnTypes[h] === 'DATE' || columnTypes[h] === 'PERIOD');

  // Initialize selections if needed
  if (!state.selectedCatColA || !catCols.includes(state.selectedCatColA)) {
    if (rels.categoricalAssociations && rels.categoricalAssociations.length > 0) {
      state.selectedCatColA = rels.categoricalAssociations[0].colA;
      state.selectedCatColB = rels.categoricalAssociations[0].colB;
    } else {
      state.selectedCatColA = catCols[0] || '';
      state.selectedCatColB = catCols[1] || catCols[0] || '';
    }
  }
  if (!state.selectedCatColB || !catCols.includes(state.selectedCatColB)) {
    state.selectedCatColB = catCols.find(c => c !== state.selectedCatColA) || catCols[0] || '';
  }

  if (!state.selectedNumColA || !numCols.includes(state.selectedNumColA)) {
    if (rels.numericalCorrelations && rels.numericalCorrelations.length > 0) {
      state.selectedNumColA = rels.numericalCorrelations[0].colA;
      state.selectedNumColB = rels.numericalCorrelations[0].colB;
    } else {
      state.selectedNumColA = numCols[0] || '';
      state.selectedNumColB = numCols[1] || numCols[0] || '';
    }
  }
  if (!state.selectedNumColB || !numCols.includes(state.selectedNumColB)) {
    state.selectedNumColB = numCols.find(c => c !== state.selectedNumColA) || numCols[0] || '';
  }

  if (!state.selectedTimeCol || !dateCols.includes(state.selectedTimeCol)) {
    state.selectedTimeCol = dateCols[0] || '';
  }
  if (!state.selectedTimeCatCol || !catCols.includes(state.selectedTimeCatCol)) {
    state.selectedTimeCatCol = catCols[0] || '';
  }

  if (!state.selected3WayX) {
    state.selected3WayX = dateCols[0] || catCols[0] || headers[0];
  }
  if (!state.selected3WayS1) {
    state.selected3WayS1 = catCols.find(c => c !== state.selected3WayX) || catCols[0] || '';
  }
  if (!state.selected3WayS2) {
    state.selected3WayS2 = catCols.find(c => c !== state.selected3WayX && c !== state.selected3WayS1) || catCols[1] || '';
  }
  if (!state.selected3WayMetric) {
    state.selected3WayMetric = '__count__';
  }
  if (!state.selected3WayPres) {
    state.selected3WayPres = 'composite';
  }

  const subTab = state.relationshipTab || 'overview';

  return `
    <div class="viz-section-card" id="viz-sec-relationships">
      <div class="viz-section-header">
        <div class="viz-section-title-wrap">
          <h3>
            <span style="color: #ec4899;">${icons.database}</span>
            <span>5. Relationship Discovery & Multi-Field Analytics Engine</span>
          </h3>
          <p>Multi-dimensional associations, Cramér's V contingency matrices, grouped statistics, and Pearson/Spearman correlations</p>
        </div>
        <span class="tab-badge" style="background-color: #fdf2f8; color: #db2777;">
          ${(rels.categoricalAssociations?.length || 0) + (rels.numericalCorrelations?.length || 0)} Discovered Links
        </span>
      </div>

      <!-- Navigation Sub-Tabs -->
      <div class="rel-tab-bar">
        <button type="button" class="rel-tab-btn ${subTab === 'overview' ? 'active' : ''}" data-rel-tab="overview">
          <span>${icons.table}</span>
          <span>Discovery Overview</span>
        </button>
        <button type="button" class="rel-tab-btn ${subTab === 'categorical' ? 'active' : ''}" data-rel-tab="categorical">
          <span>${icons.pieChart}</span>
          <span>Categorical × Categorical</span>
          ${rels.categoricalAssociations?.length ? `<span class="pill-count" style="font-size:10px;">${rels.categoricalAssociations.length}</span>` : ''}
        </button>
        <button type="button" class="rel-tab-btn ${subTab === 'num_cat' ? 'active' : ''}" data-rel-tab="num_cat">
          <span>${icons.barChart}</span>
          <span>Numerical × Categorical</span>
        </button>
        <button type="button" class="rel-tab-btn ${subTab === 'numerical' ? 'active' : ''}" data-rel-tab="numerical">
          <span>${icons.chart}</span>
          <span>Numerical × Numerical</span>
          ${rels.numericalCorrelations?.length ? `<span class="pill-count" style="font-size:10px;">${rels.numericalCorrelations.length}</span>` : ''}
        </button>
        <button type="button" class="rel-tab-btn ${subTab === 'temporal' ? 'active' : ''}" data-rel-tab="temporal">
          <span>${icons.sparkles}</span>
          <span>Temporal Trends</span>
          ${dateCols.length ? `<span class="pill-count" style="font-size:10px;">${dateCols.length}</span>` : ''}
        </button>
        <button type="button" class="rel-tab-btn ${subTab === 'multidim' ? 'active' : ''}" data-rel-tab="multidim">
          <span>${icons.database}</span>
          <span>3-Way Multi-Dimensional Explorer</span>
        </button>
      </div>

      <!-- Active Sub-Tab View -->
      <div class="rel-content-body">
        ${renderRelationshipTabContent(dataset, profile, subTab, rels, catCols, numCols, dateCols)}
      </div>
    </div>
  `;
}

function renderRelationshipTabContent(dataset, profile, subTab, rels, catCols, numCols, dateCols) {
  const { headers, rows, columnTypes } = dataset;

  if (subTab === 'overview') {
    const topCramer = rels.categoricalAssociations && rels.categoricalAssociations.length > 0 ? rels.categoricalAssociations[0] : null;
    const topCorr = rels.numericalCorrelations && rels.numericalCorrelations.length > 0 ? rels.numericalCorrelations[0] : null;

    const topCramerVal = topCramer ? (typeof topCramer.cramersV === 'number' ? topCramer.cramersV : 0) : null;
    const topCorrVal = topCorr ? (typeof topCorr.pearson === 'number' ? topCorr.pearson : (typeof topCorr.r === 'number' ? topCorr.r : 0)) : null;

    return `
      <!-- KPI Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card" style="border-left: 3px solid #ec4899;">
          <div class="kpi-label">Categorical Associations</div>
          <div class="kpi-value" style="font-size: 22px;">${rels.categoricalAssociations?.length || 0}</div>
          <div class="kpi-subtext">${topCramer && topCramerVal !== null ? `Top: ${escapeHtml(topCramer.colA)} &times; ${escapeHtml(topCramer.colB)} (V=${topCramerVal.toFixed(2)})` : 'None identified'}</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid #8b5cf6;">
          <div class="kpi-label">Numerical Correlations</div>
          <div class="kpi-value" style="font-size: 22px;">${rels.numericalCorrelations?.length || 0}</div>
          <div class="kpi-subtext">${topCorr && topCorrVal !== null ? `Top: ${escapeHtml(topCorr.colA)} &times; ${escapeHtml(topCorr.colB)} (r=${topCorrVal.toFixed(2)})` : 'Requires 2+ numerical cols'}</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid #10b981;">
          <div class="kpi-label">Temporal Dimensions</div>
          <div class="kpi-value" style="font-size: 22px;">${dateCols.length}</div>
          <div class="kpi-subtext">${dateCols.length > 0 ? dateCols.slice(0, 2).join(', ') : 'No date fields detected'}</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid var(--accent-orange);">
          <div class="kpi-label">Categorical Dimensions</div>
          <div class="kpi-value" style="font-size: 22px;">${catCols.length}</div>
          <div class="kpi-subtext">Ready for multi-field cross-tabulation</div>
        </div>
      </div>

      <!-- Discovered Categorical Associations Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0;">Discovered Categorical Associations (Ranked by Cramér's V)</h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Cramér's V measures degree of association between nominal variables from 0 (independence) to 1 (perfect association)</p>
          </div>
        </div>
        ${rels.categoricalAssociations && rels.categoricalAssociations.length > 0 ? `
          <div style="overflow-x: auto;">
            <table class="data-table" style="font-size: 12px; width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left;">Dimension 1</th>
                  <th style="text-align: left;">Dimension 2</th>
                  <th style="text-align: right;">Cramér's V</th>
                  <th style="text-align: right;">Chi-Square (&chi;&sup2;)</th>
                  <th style="text-align: right;">df</th>
                  <th style="text-align: right;">Sample N</th>
                  <th style="text-align: center;">Association Strength</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${rels.categoricalAssociations.map(a => {
                  const cVal = typeof a.cramersV === 'number' ? a.cramersV : 0;
                  const chiVal = typeof a.chiSquare === 'number' ? a.chiSquare : 0;
                  const dfVal = a.df || 1;
                  const sampleVal = a.sampleSize || a.observations || 0;
                  return `
                  <tr>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(a.colA)}</td>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(a.colB)}</td>
                    <td style="text-align: right; font-weight: 700; color: #c2410c;">${cVal.toFixed(3)}</td>
                    <td style="text-align: right;">${chiVal.toFixed(2)}</td>
                    <td style="text-align: right;">${dfVal}</td>
                    <td style="text-align: right;">${sampleVal}</td>
                    <td style="text-align: center;">
                      <span class="rel-stat-pill ${a.strength === 'Very Strong' || a.strength === 'Strong' ? 'corr-badge strong-pos' : (a.strength === 'Moderate' ? 'corr-badge mod-pos' : 'corr-badge neutral')}">
                        ${escapeHtml(a.strength || 'Moderate')}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px;" data-jump-rel-cat="${escapeHtml(a.colA)}|${escapeHtml(a.colB)}">
                        Explore Matrix
                      </button>
                    </td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="chart-empty-state">At least 2 categorical columns are required to compute association matrices.</div>
        `}
      </div>

      <!-- Discovered Numerical Correlations Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0;">Discovered Numerical Correlations (Ranked by Pearson r & Spearman &rho;)</h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Linear (Pearson) and monotonic rank (Spearman) relationships between quantitative measures</p>
          </div>
        </div>
        ${rels.numericalCorrelations && rels.numericalCorrelations.length > 0 ? `
          <div style="overflow-x: auto;">
            <table class="data-table" style="font-size: 12px; width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left;">Variable X</th>
                  <th style="text-align: left;">Variable Y</th>
                  <th style="text-align: right;">Pearson r</th>
                  <th style="text-align: right;">Spearman &rho;</th>
                  <th style="text-align: right;">Valid Pairs</th>
                  <th style="text-align: center;">Relationship</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${rels.numericalCorrelations.map(c => {
                  const pVal = typeof c.pearson === 'number' ? c.pearson : (typeof c.r === 'number' ? c.r : 0);
                  const sVal = typeof c.spearman === 'number' ? c.spearman : (typeof c.rho === 'number' ? c.rho : pVal);
                  const countVal = c.count || c.observations || c.sampleSize || 0;
                  return `
                  <tr>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(c.colA)}</td>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(c.colB)}</td>
                    <td style="text-align: right; font-weight: 700; color: ${pVal >= 0 ? '#15803d' : '#b91c1c'};">${pVal.toFixed(3)}</td>
                    <td style="text-align: right; font-weight: 700; color: ${sVal >= 0 ? '#15803d' : '#b91c1c'};">${sVal.toFixed(3)}</td>
                    <td style="text-align: right;">${countVal}</td>
                    <td style="text-align: center;">
                      <span class="rel-stat-pill ${Math.abs(pVal) >= 0.5 ? 'corr-badge strong-pos' : (Math.abs(pVal) >= 0.25 ? 'corr-badge mod-pos' : 'corr-badge neutral')}">
                        ${escapeHtml(c.strength || 'Moderate')}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px;" data-jump-rel-num="${escapeHtml(c.colA)}|${escapeHtml(c.colB)}">
                        View Scatter & Fit
                      </button>
                    </td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="chart-empty-state">At least 2 numerical columns are required to calculate Pearson/Spearman correlation metrics.</div>
        `}
      </div>
    `;
  }

  if (subTab === 'categorical') {
    const colA = state.selectedCatColA;
    const colB = state.selectedCatColB;

    if (!colA || !colB || colA === colB || catCols.length < 2) {
      return `
        <div class="rel-controls-bar">
          <div class="rel-controls-group">
            <label class="form-label" style="margin:0;">Variable 1 (Rows):</label>
            <select class="form-select" id="rel-cat-var1" style="width: 190px;">
              ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === colA ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <label class="form-label" style="margin:0 0 0 10px;">Variable 2 (Columns):</label>
            <select class="form-select" id="rel-cat-var2" style="width: 190px;">
              ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === colB ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="chart-empty-state">Please select two distinct categorical or period columns to generate the contingency matrix.</div>
      `;
    }

    const idxA = headers.indexOf(colA);
    const idxB = headers.indexOf(colB);
    const valsA = rows.map(r => r[idxA]);
    const valsB = rows.map(r => r[idxB]);
    const ct = calculateContingencyTable(valsA, valsB);

    const mode = state.contingencyMode || 'counts';
    const agg = aggregateDataset(rows, headers, colA, '__count__', [colB], 'count', 15, 'composite');

    return `
      <!-- Selector Toolbar -->
      <div class="rel-controls-bar">
        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">Variable 1 (Rows):</label>
          <select class="form-select" id="rel-cat-var1" style="width: 180px;">
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === colA ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <label class="form-label" style="margin:0 0 0 10px; font-weight:600;">Variable 2 (Columns):</label>
          <select class="form-select" id="rel-cat-var2" style="width: 180px;">
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === colB ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="rel-controls-group">
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Matrix Mode:</span>
          <div class="presentation-toggle-group">
            <button type="button" class="presentation-btn ${mode === 'counts' ? 'active' : ''}" data-contingency-mode="counts">Raw Counts</button>
            <button type="button" class="presentation-btn ${mode === 'rowPct' ? 'active' : ''}" data-contingency-mode="rowPct">Row %</button>
            <button type="button" class="presentation-btn ${mode === 'colPct' ? 'active' : ''}" data-contingency-mode="colPct">Column %</button>
          </div>
        </div>
      </div>

      <!-- Cramér's V Banner Card -->
      <div class="cramer-score-card">
        <div class="cramer-val">${(typeof ct.cramersV === 'number' ? ct.cramersV : 0).toFixed(3)}</div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h4 style="font-size: 14px; font-weight: 700; color: #9a3412; margin: 0;">
              Cramér's V Association: ${escapeHtml(ct.strength || 'Moderate')}
            </h4>
            <span class="rel-stat-pill ${ct.strength === 'Very Strong' || ct.strength === 'Strong' ? 'corr-badge strong-pos' : (ct.strength === 'Moderate' ? 'corr-badge mod-pos' : 'corr-badge neutral')}">
              V = ${(typeof ct.cramersV === 'number' ? ct.cramersV : 0).toFixed(3)}
            </span>
          </div>
          <p style="font-size: 11px; color: #9a3412; margin: 0;">
            Chi-Square (&chi;&sup2;) = <strong>${(typeof ct.chiSquare === 'number' ? ct.chiSquare : 0).toFixed(2)}</strong> &bull; 
            Degrees of Freedom (df) = <strong>${ct.df || 1}</strong> &bull; 
            Sample Size (N) = <strong>${ct.grandTotal || ct.total || 0}</strong> records
          </p>
          ${ct.lowExpectedWarning ? `
            <div class="stat-notice-box" style="margin-top: 6px; background: #fffbeb; border-color: #f59e0b; color: #92400e;">
              <strong>Cochran's Rule Advisory:</strong> Sample size is small or some expected cell frequencies are &lt; 5. Cramér's V provides a directional nominal correlation benchmark, but significance tests should be interpreted with caution.
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 2-Column Responsive: Contingency Table & Native SVG Matrix Heatmap -->
      <div class="rel-grid-2col">
        <!-- Left: Contingency Table -->
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0;">
              Contingency Cross-Tabulation Matrix
            </h4>
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">
              Showing: ${mode === 'counts' ? 'Frequencies' : (mode === 'rowPct' ? 'Row Proportions (%)' : 'Column Proportions (%)')}
            </span>
          </div>
          <div class="contingency-table-wrapper">
            <table class="contingency-table">
              <thead>
                <tr>
                  <th style="background: var(--bg-card);">${escapeHtml(colA)} \\ ${escapeHtml(colB)}</th>
                  ${ct.colCategories.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
                  <th style="background: var(--bg-card); color: var(--accent-orange-hover);">Row Total</th>
                </tr>
              </thead>
              <tbody>
                ${ct.rowCategories.map((rCat, rIdx) => {
                  const rTotal = ct.rowTotals[rIdx] || 0;
                  return `
                    <tr>
                      <td style="font-weight: 600;">${escapeHtml(rCat)}</td>
                      ${ct.colCategories.map((cCat, cIdx) => {
                        const count = ct.matrix[rIdx][cIdx] || 0;
                        const rowP = ct.rowPercentages[rIdx][cIdx] || 0;
                        const colP = ct.colPercentages[rIdx][cIdx] || 0;
                        let displayVal = `${count}`;
                        let subVal = `${rowP.toFixed(1)}% row`;
                        if (mode === 'rowPct') {
                          displayVal = `${rowP.toFixed(1)}%`;
                          subVal = `n = ${count}`;
                        } else if (mode === 'colPct') {
                          displayVal = `${colP.toFixed(1)}%`;
                          subVal = `n = ${count}`;
                        }
                        return `
                          <td>
                            <div class="contingency-cell-inner">
                              <span class="contingency-cell-val" style="color: ${count > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${displayVal}</span>
                              <span class="contingency-cell-sub">${subVal}</span>
                            </div>
                          </td>
                        `;
                      }).join('')}
                      <td style="font-weight: 700; color: var(--accent-orange-hover); background: #fffaf5;">
                        ${mode === 'rowPct' ? '100.0%' : rTotal}
                      </td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td style="font-weight: 700;">Col Total</td>
                  ${ct.colCategories.map((cCat, cIdx) => {
                    const cTotal = ct.colTotals[cIdx] || 0;
                    const colPctOfGrand = ct.grandTotal > 0 ? (cTotal / ct.grandTotal * 100).toFixed(1) : '0.0';
                    return `
                      <td style="font-weight: 700;">
                        ${mode === 'colPct' ? '100.0%' : cTotal}
                        <div class="contingency-cell-sub">${colPctOfGrand}% total</div>
                      </td>
                    `;
                  }).join('')}
                  <td style="font-weight: 800; color: #c2410c; background: #fff7ed;">
                    ${ct.grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: Native SVG Cross-Tab Heatmap -->
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0;">
              Cross-Tabulation Matrix Heatmap
            </h4>
            <span style="font-size: 11px; color: var(--text-muted);">Intensity by count</span>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 280px; overflow-x: auto;">
            ${renderSvgCrossTabHeatmap({
              aggregation: agg,
              metricLabel: 'Observations',
              width: 500,
              height: 290
            })}
          </div>
        </div>
      </div>
    `;
  }

  if (subTab === 'num_cat') {
    const numCol = state.selectedNumColA || numCols[0];
    const catCol = state.selectedCatColA || catCols[0];

    if (!numCol || !catCol || !numCols.length || !catCols.length) {
      return `<div class="chart-empty-state">At least 1 numerical column and 1 categorical column are required.</div>`;
    }

    const groupedStats = calculateNumericalByCategorical(rows, headers, catCol, numCol);
    const agg = aggregateDataset(rows, headers, catCol, numCol, [], 'avg', 15, 'composite');

    return `
      <!-- Selector Toolbar -->
      <div class="rel-controls-bar">
        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">Numerical Measure:</label>
          <select class="form-select" id="rel-num-metric" style="width: 200px;">
            ${numCols.map(c => `<option value="${escapeHtml(c)}" ${c === numCol ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <label class="form-label" style="margin:0 0 0 10px; font-weight:600;">Categorical Grouping:</label>
          <select class="form-select" id="rel-cat-group" style="width: 200px;">
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === catCol ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Grouped Breakdown Table & SVG Comparison Chart -->
      <div class="rel-grid-2col">
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
            Grouped Statistics: ${escapeHtml(numCol)} across ${escapeHtml(catCol)}
          </h4>
          <div style="overflow-x: auto;">
            <table class="data-table" style="font-size: 12px; width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left;">Category</th>
                  <th style="text-align: right;">Count</th>
                  <th style="text-align: right;">Mean</th>
                  <th style="text-align: right;">Median</th>
                  <th style="text-align: right;">Min</th>
                  <th style="text-align: right;">Max</th>
                  <th style="text-align: right;">StdDev</th>
                </tr>
              </thead>
              <tbody>
                ${groupedStats.map(g => `
                  <tr>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(g.category)}</td>
                    <td style="text-align: right;">${g.count}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--accent-orange-hover);">${formatMetricNumber(g.mean)}</td>
                    <td style="text-align: right;">${formatMetricNumber(g.median)}</td>
                    <td style="text-align: right;">${formatMetricNumber(g.min)}</td>
                    <td style="text-align: right;">${formatMetricNumber(g.max)}</td>
                    <td style="text-align: right;">${formatMetricNumber(g.stdDev)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; display: flex; flex-direction: column;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
            Average ${escapeHtml(numCol)} by ${escapeHtml(catCol)}
          </h4>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 280px;">
            ${renderSvgHorizontalBarChart({
              aggregation: agg,
              metricLabel: `Average ${numCol}`,
              width: 500,
              height: 280
            })}
          </div>
        </div>
      </div>
    `;
  }

  if (subTab === 'numerical') {
    const colA = state.selectedNumColA;
    const colB = state.selectedNumColB;

    if (!colA || !colB || colA === colB || numCols.length < 2) {
      return `
        <div class="rel-controls-bar">
          <div class="rel-controls-group">
            <label class="form-label" style="margin:0;">Variable X:</label>
            <select class="form-select" id="rel-num-var1" style="width: 190px;">
              ${numCols.map(c => `<option value="${escapeHtml(c)}" ${c === colA ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <label class="form-label" style="margin:0 0 0 10px;">Variable Y:</label>
            <select class="form-select" id="rel-num-var2" style="width: 190px;">
              ${numCols.map(c => `<option value="${escapeHtml(c)}" ${c === colB ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="chart-empty-state">Please select two distinct numerical columns to analyze linear and monotonic relationships.</div>
      `;
    }

    const idxA = headers.indexOf(colA);
    const idxB = headers.indexOf(colB);
    const pairs = [];
    rows.forEach(r => {
      const vA = parseFloat(r[idxA]);
      const vB = parseFloat(r[idxB]);
      if (!isNaN(vA) && !isNaN(vB)) {
        pairs.push({ x: vA, y: vB });
      }
    });

    const valsA = pairs.map(p => p.x);
    const valsB = pairs.map(p => p.y);
    const spearmanRes = calculateSpearmanCorrelation(valsA, valsB);
    const spearmanRho = (spearmanRes && typeof spearmanRes.rho === 'number' && !isNaN(spearmanRes.rho)) 
      ? spearmanRes.rho 
      : ((typeof spearmanRes === 'number' && !isNaN(spearmanRes)) ? spearmanRes : 0);

    // Pearson r
    let pearson = 0;
    if (pairs.length > 1) {
      const mA = valsA.reduce((s, v) => s + v, 0) / pairs.length;
      const mB = valsB.reduce((s, v) => s + v, 0) / pairs.length;
      let num = 0, denA = 0, denB = 0;
      for (let i = 0; i < pairs.length; i++) {
        const dA = valsA[i] - mA;
        const dB = valsB[i] - mB;
        num += dA * dB;
        denA += dA * dA;
        denB += dB * dB;
      }
      const denom = Math.sqrt(denA * denB);
      pearson = denom > 0 ? (num / denom) : 0;
    }

    const r2 = pearson * pearson;

    return `
      <!-- Selector Toolbar -->
      <div class="rel-controls-bar">
        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">Variable X:</label>
          <select class="form-select" id="rel-num-var1" style="width: 190px;">
            ${numCols.map(c => `<option value="${escapeHtml(c)}" ${c === colA ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <label class="form-label" style="margin:0 0 0 10px; font-weight:600;">Variable Y:</label>
          <select class="form-select" id="rel-num-var2" style="width: 190px;">
            ${numCols.map(c => `<option value="${escapeHtml(c)}" ${c === colB ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px;">
        <div class="kpi-card" style="border-left: 3px solid ${pearson >= 0 ? '#10b981' : '#ef4444'};">
          <div class="kpi-label">Pearson Correlation (r)</div>
          <div class="kpi-value" style="font-size: 22px; color: ${pearson >= 0 ? '#047857' : '#b91c1c'};">${pearson.toFixed(3)}</div>
          <div class="kpi-subtext">Linear Association (${Math.abs(pearson) >= 0.5 ? 'Strong' : (Math.abs(pearson) >= 0.25 ? 'Moderate' : 'Weak')})</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid #8b5cf6;">
          <div class="kpi-label">Spearman Rank (&rho;)</div>
          <div class="kpi-value" style="font-size: 22px; color: #6d28d9;">${spearmanRho.toFixed(3)}</div>
          <div class="kpi-subtext">Monotonic Rank Association</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid var(--accent-orange);">
          <div class="kpi-label">Variance Explained (R&sup2;)</div>
          <div class="kpi-value" style="font-size: 22px; color: var(--accent-orange-hover);">${(r2 * 100).toFixed(1)}%</div>
          <div class="kpi-subtext">Proportion of variance shared</div>
        </div>
        <div class="kpi-card" style="border-left: 3px solid #0284c7;">
          <div class="kpi-label">Valid Paired Records</div>
          <div class="kpi-value" style="font-size: 22px; color: #0369a1;">${pairs.length}</div>
          <div class="kpi-subtext">Non-null numerical observations</div>
        </div>
      </div>

      <!-- Scatter Plot and Correlation Matrix -->
      <div class="rel-grid-2col">
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; display: flex; flex-direction: column;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
            Bivariate Scatter & Linear Trendline
          </h4>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 300px;">
            ${renderSvgScatterPlot({
              xCol: colA,
              yCol: colB,
              xValues: valsA,
              yValues: valsB,
              width: 500,
              height: 300
            })}
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; display: flex; flex-direction: column;">
          <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
            All-Pairs Correlation Matrix Heatmap
          </h4>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 300px;">
            ${renderSvgCorrelationHeatmap(profile.correlations || [], 500, 300)}
          </div>
        </div>
      </div>
    `;
  }

  if (subTab === 'temporal') {
    const timeCol = state.selectedTimeCol || dateCols[0];
    const catCol = state.selectedTimeCatCol || catCols[0];

    if (!timeCol || !catCol || !dateCols.length) {
      return `<div class="chart-empty-state">No date or period columns available in this dataset for temporal trend progression.</div>`;
    }

    const agg = aggregateDataset(rows, headers, timeCol, '__count__', [catCol], 'count', 15, 'composite');

    return `
      <!-- Selector Toolbar -->
      <div class="rel-controls-bar">
        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">Date / Period Field:</label>
          <select class="form-select" id="rel-time-col" style="width: 200px;">
            ${dateCols.map(c => `<option value="${escapeHtml(c)}" ${c === timeCol ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <label class="form-label" style="margin:0 0 0 10px; font-weight:600;">Category Breakdown:</label>
          <select class="form-select" id="rel-time-cat-col" style="width: 200px;">
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === catCol ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px;">
        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
          Timeline Progression: ${escapeHtml(catCol)} volume over ${escapeHtml(timeCol)}
        </h4>
        <div style="min-height: 320px; display: flex; align-items: center; justify-content: center;">
          ${renderSvgLineChart({
            aggregation: agg,
            metricLabel: 'Record Volume',
            isArea: true,
            width: 820,
            height: 320
          })}
        </div>
      </div>
    `;
  }

  if (subTab === 'multidim') {
    const xCol = state.selected3WayX || headers[0];
    const s1 = state.selected3WayS1 || '';
    const s2 = state.selected3WayS2 || '';
    const metric = state.selected3WayMetric || '__count__';
    const pres = state.selected3WayPres || 'composite';

    const groupCols = [s1, s2].filter(Boolean);
    const aggMethod = (metric !== '__count__' && metric !== '__pct__' && metric !== '__distinct__') ? 'sum' : 'count';
    const agg = aggregateDataset(rows, headers, xCol, metric, groupCols, aggMethod, 15, pres);

    const chartItem = {
      id: 'preview-3way',
      type: pres === 'facets' ? 'facets' : (pres === 'stacked100' ? 'stacked100' : 'grouped'),
      title: `${xCol} by ${groupCols.join(' × ')}`,
      xCol,
      yCol: metric,
      groupCols,
      presentation: pres,
      aggregation: agg,
      metricLabel: metric === '__count__' ? 'Record Count' : metric
    };

    return `
      <!-- 3-Way Explorer Toolbar -->
      <div class="rel-controls-bar">
        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">1. Primary X:</label>
          <select class="form-select" id="rel-3way-x" style="width: 150px;">
            ${headers.map(c => `<option value="${escapeHtml(c)}" ${c === xCol ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>

          <label class="form-label" style="margin:0 0 0 6px; font-weight:600;">2. Series 1:</label>
          <select class="form-select" id="rel-3way-s1" style="width: 150px;">
            <option value="">(None)</option>
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === s1 ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>

          <label class="form-label" style="margin:0 0 0 6px; font-weight:600;">3. Series 2:</label>
          <select class="form-select" id="rel-3way-s2" style="width: 150px;">
            <option value="">(None)</option>
            ${catCols.map(c => `<option value="${escapeHtml(c)}" ${c === s2 ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>

          <label class="form-label" style="margin:0 0 0 6px; font-weight:600;">Measure:</label>
          <select class="form-select" id="rel-3way-metric" style="width: 140px;">
            <option value="__count__" ${metric === '__count__' ? 'selected' : ''}>Record Count</option>
            <option value="__pct__" ${metric === '__pct__' ? 'selected' : ''}>Percentage (%)</option>
            ${numCols.map(c => `<option value="${escapeHtml(c)}" ${metric === c ? 'selected' : ''}>${escapeHtml(c)} (Sum)</option>`).join('')}
          </select>
        </div>

        <div class="rel-controls-group">
          <label class="form-label" style="margin:0; font-weight:600;">Format:</label>
          <select class="form-select" id="rel-3way-pres" style="width: 150px;">
            <option value="composite" ${pres === 'composite' ? 'selected' : ''}>Grouped Bars</option>
            <option value="stacked" ${pres === 'stacked' ? 'selected' : ''}>Stacked Bars</option>
            <option value="stacked100" ${pres === 'stacked100' ? 'selected' : ''}>100% Stacked</option>
            <option value="facets" ${pres === 'facets' ? 'selected' : ''}>Small Multiples</option>
          </select>

          <button type="button" class="btn btn-primary btn-sm" id="rel-add-3way-chart">
            ${icons.sparkles}
            <span>Pin to Dashboard</span>
          </button>
        </div>
      </div>

      <!-- Live 3-Way Chart Visualization -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin: 0;">
              3-Way Multi-Dimensional Visualization: ${escapeHtml(xCol)} &times; ${escapeHtml(groupCols.join(' &times; '))}
            </h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">
              Higher-order interaction cross-tabulating ${agg.categories.length} primary groups across ${agg.groups.length} composite sub-dimensions
            </p>
          </div>
          <span class="tab-badge" style="background: var(--accent-orange-light); color: var(--accent-orange-hover);">
            ${groupCols.length} Multi-Dimensions Active
          </span>
        </div>
        <div style="min-height: 340px; display: flex; align-items: center; justify-content: center; overflow-x: auto;">
          ${renderDashboardChart(chartItem)}
        </div>
      </div>

      <!-- 3-Way Cross-Tabulation Matrix Table -->
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px;">
        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin: 0 0 10px 0;">
          3-Way Cross-Tabulation Data Matrix
        </h4>
        <div style="overflow-x: auto;">
          <table class="data-table" style="font-size: 12px; width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left;">${escapeHtml(xCol)}</th>
                ${agg.groups.map(g => `<th style="text-align: right;">${escapeHtml(g)}</th>`).join('')}
                <th style="text-align: right; background: #fffaf5; color: var(--accent-orange-hover);">Total</th>
              </tr>
            </thead>
            <tbody>
              ${agg.categories.map((cat, idx) => {
                const s = agg.series[idx];
                const rowTotal = agg.groups.reduce((acc, g) => acc + (s && s.groupMetrics ? (s.groupMetrics[g] || 0) : 0), 0);
                return `
                  <tr>
                    <td style="font-weight: 600; text-align: left;">${escapeHtml(cat)}</td>
                    ${agg.groups.map(g => {
                      const v = s && s.groupMetrics ? (s.groupMetrics[g] || 0) : 0;
                      return `
                        <td style="text-align: right; color: ${v > 0 ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: ${v > 0 ? '600' : '400'};">
                          ${formatMetricNumber(v)}
                        </td>
                      `;
                    }).join('')}
                    <td style="text-align: right; font-weight: 700; color: var(--accent-orange-hover); background: #fffaf5;">
                      ${formatMetricNumber(rowTotal)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return '';
}

/**
 * Main Visualizations Tab Renderer (Phase 2.2 Suite)
 */
function renderVisualizationsView() {
  if (!state.dataset || !state.charts) {
    return `
      <div class="profile-card" style="margin-bottom: 24px;">
        <div class="empty-state-panel" style="min-height: 380px;">
          <div class="empty-state-icon">${icons.barChart}</div>
          <h3 class="empty-state-title">No Dataset Loaded for Visualizations</h3>
          <p class="empty-state-desc">
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file, or select a sample dataset on the Overview tab to automatically generate complete multi-dimensional SVG visualizations, distribution charts, and interactive custom builders.
          </p>
        </div>
      </div>
    `;
  }

  const { distribution, comparisons, numerical, temporal, relationships } = state.charts;
  const filter = state.visualizationsFilter;

  const showDist = filter === 'all' || filter === 'distribution';
  const showComp = filter === 'all' || filter === 'comparisons';
  const showNum = filter === 'all' || filter === 'numerical';
  const showTemp = filter === 'all' || filter === 'temporal';
  const showRel = filter === 'all' || filter === 'relationships';
  const showCustom = filter === 'all' || filter === 'custom';

  return `
    <div class="viz-container">
      <!-- Section Header -->
      <div class="section-header" style="margin-bottom: 0;">
        <div class="section-title-wrap">
          <h2 class="section-title">Dynamic Data Visualizations & Analytics Suite</h2>
          <p class="section-subtitle">
            Domain-agnostic SVG visualizers generated from ${state.dataset.totalRecords.toLocaleString()} records in "${escapeHtml(state.file ? state.file.name : 'dataset')}"
          </p>
        </div>
      </div>

      <!-- Top Toolbar -->
      <div class="viz-toolbar">
        <div class="viz-filter-pills">
          <button type="button" class="viz-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">
            <span>All Visualizations</span>
          </button>
          <button type="button" class="viz-filter-btn ${filter === 'distribution' ? 'active' : ''}" data-filter="distribution">
            <span>Distribution Analysis</span>
            <span class="pill-count">${distribution.length}</span>
          </button>
          <button type="button" class="viz-filter-btn ${filter === 'comparisons' ? 'active' : ''}" data-filter="comparisons">
            <span>Category Comparisons</span>
            <span class="pill-count">${comparisons.length}</span>
          </button>
          <button type="button" class="viz-filter-btn ${filter === 'numerical' ? 'active' : ''}" data-filter="numerical">
            <span>Numerical Analysis</span>
            <span class="pill-count">${numerical.length}</span>
          </button>
          <button type="button" class="viz-filter-btn ${filter === 'temporal' ? 'active' : ''}" data-filter="temporal">
            <span>Time-Series</span>
            <span class="pill-count">${temporal.length}</span>
          </button>
          <button type="button" class="viz-filter-btn ${filter === 'relationships' ? 'active' : ''}" data-filter="relationships">
            <span>Relationships</span>
            <span class="pill-count">${relationships.length}</span>
          </button>
          ${state.customCharts.length > 0 ? `
            <button type="button" class="viz-filter-btn ${filter === 'custom' ? 'active' : ''}" data-filter="custom">
              <span>Custom Charts</span>
              <span class="pill-count">${state.customCharts.length}</span>
            </button>
          ` : ''}
        </div>

        <button type="button" class="btn btn-primary btn-sm" id="open-custom-chart-modal-btn">
          ${icons.sparkles}
          <span>Create Custom Chart</span>
        </button>
      </div>

      <!-- 1. Distribution Analysis -->
      ${showDist && distribution.length > 0 ? `
        <div class="viz-section-card" id="viz-sec-distribution">
          <div class="viz-section-header">
            <div class="viz-section-title-wrap">
              <h3>
                <span style="color: var(--accent-orange);">${icons.pieChart}</span>
                <span>1. Distribution Analysis</span>
              </h3>
              <p>Categorical compositions, frequency shares, and proportional distributions</p>
            </div>
            <span class="tab-badge" style="background-color: var(--accent-orange-light); color: var(--accent-orange-hover);">
              ${distribution.length} Visualizers
            </span>
          </div>
          <div class="viz-charts-grid">
            ${distribution.map(c => renderChartCard(c)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 2. Category Comparisons -->
      ${showComp && comparisons.length > 0 ? `
        <div class="viz-section-card" id="viz-sec-comparisons">
          <div class="viz-section-header">
            <div class="viz-section-title-wrap">
              <h3>
                <span style="color: #0284c7;">${icons.barChart}</span>
                <span>2. Category Comparisons</span>
              </h3>
              <p>Horizontal category rankings, metric breakdowns, and cross-tabulation groupings</p>
            </div>
            <span class="tab-badge" style="background-color: #f0f9ff; color: #0284c7;">
              ${comparisons.length} Visualizers
            </span>
          </div>
          <div class="viz-charts-grid">
            ${comparisons.map(c => renderChartCard(c)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 3. Numerical Analysis -->
      ${showNum && numerical.length > 0 ? `
        <div class="viz-section-card" id="viz-sec-numerical">
          <div class="viz-section-header">
            <div class="viz-section-title-wrap">
              <h3>
                <span style="color: #8b5cf6;">${icons.chart}</span>
                <span>3. Numerical Analysis</span>
              </h3>
              <p>Frequency histograms with distribution curves, central tendency, and Five-Number summary box plots</p>
            </div>
            <span class="tab-badge" style="background-color: #f5f3ff; color: #7c3aed;">
              ${numerical.length} Visualizers
            </span>
          </div>
          <div class="viz-charts-grid">
            ${numerical.map(c => renderChartCard(c)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 4. Time-Series Analysis -->
      ${showTemp ? `
        <div class="viz-section-card" id="viz-sec-temporal">
          <div class="viz-section-header">
            <div class="viz-section-title-wrap">
              <h3>
                <span style="color: #10b981;">${icons.sparkles}</span>
                <span>4. Time-Series Analysis</span>
              </h3>
              <p>Chronological trends, timeline trajectories, and sequential volume progressions</p>
            </div>
            <span class="tab-badge" style="background-color: #ecfdf5; color: #047857;">
              ${temporal.length} Visualizers
            </span>
          </div>
          <div class="viz-charts-grid">
            ${temporal.length > 0 ? temporal.map(c => renderChartCard(c)).join('') : `
              <div class="chart-empty-state" style="grid-column: 1 / -1;">
                No temporal date or period columns detected in this dataset. To chart chronological trends, upload a dataset with date or period fields (e.g. YYYY-MM-DD, 2026-Q1).
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- 5. Relationship Discovery & Multi-Field Analytics Engine -->
      ${showRel ? renderRelationshipAnalysisHub(state.dataset, state.dataset.profile) : ''}

      <!-- 6. Custom Visualizations -->
      ${(showCustom || state.customCharts.length > 0) ? `
        <div class="viz-section-card" id="viz-sec-custom">
          <div class="viz-section-header">
            <div class="viz-section-title-wrap">
              <h3>
                <span style="color: var(--accent-orange);">${icons.sparkles}</span>
                <span>User-Controlled Custom Charts</span>
              </h3>
              <p>Bespoke visualizers created through the dynamic chart builder</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="add-another-custom-chart-btn">
              + New Custom Chart
            </button>
          </div>
          <div class="viz-charts-grid">
            ${state.customCharts.length > 0 ? state.customCharts.map(c => renderChartCard(c)).join('') : `
              <div class="chart-empty-state" style="grid-column: 1 / -1;">
                No custom charts created yet. Click "Create Custom Chart" above to configure your own dimensions, metrics, and chart types.
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Modal and Tooltip -->
      ${state.isCustomChartModalOpen ? renderCustomChartModal() : ''}
      <div id="chart-tooltip"></div>
    </div>
  `;
}

/**
 * Render Reserved Insights View
 */
function renderInsightsView() {
  return `
    <div class="reserved-view-panel">
      <div class="feature-summary-banner">
        <div class="feature-summary-text">
          <h3>Phase 2 Automated Insights Blueprint</h3>
          <p>
            Executive-ready narrative summaries, trend trajectory evaluations, and actionable strategic takeaways will 
            be generated dynamically based on the verified analytical models in subsequent development phases.
          </p>
        </div>
        <span class="tab-badge pill-reserved" style="font-size: 12px; padding: 6px 12px;">Architecture Planned</span>
      </div>

      <div class="reserved-grid-three">
        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.sparkles}</div>
            <h3 class="analysis-card-title">Automated Key Findings</h3>
          </div>
          <div class="analysis-card-body">
            Synthesized business takeaways highlighting leading performers, top contributing segments, and primary volume drivers.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Executive Summary Engine</span>
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.database}</div>
            <h3 class="analysis-card-title">Data Quality Audit</h3>
          </div>
          <div class="analysis-card-body">
            Completeness scores, null ratio evaluations, cardinality warnings, and format consistency diagnostics.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Executive Summary Engine</span>
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.chart}</div>
            <h3 class="analysis-card-title">Strategic Recommendations</h3>
          </div>
          <div class="analysis-card-body">
            Contextual decision triggers and benchmark comparisons to guide presentation-ready executive reporting.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Executive Summary Engine</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Footer Component
 */
function renderFooter() {
  return `
    <footer class="app-footer">
      <div class="footer-inner">
        <div>
          <strong>Data Analysis Dashboard</strong> &mdash; Production Analytics Interface
        </div>
        <div>
          Architecture: Vanilla JS &bull; HTML5 &bull; CSS3 &bull; Vite &bull; XLSX Parser
        </div>
      </div>
    </footer>
  `;
}

/**
 * Main App Renderer
 */
function renderApp() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  let activeViewContent = '';
  switch (state.activeTab) {
    case 'preview':
      activeViewContent = renderPreviewView();
      break;
    case 'visualizations':
      activeViewContent = renderVisualizationsView();
      break;
    case 'analysis':
      activeViewContent = renderAnalysisView();
      break;
    case 'insights':
      activeViewContent = renderInsightsView();
      break;
    case 'overview':
    default:
      activeViewContent = renderOverviewView();
      break;
  }

  appEl.innerHTML = `
    ${renderHeader()}
    ${renderNavigation()}
    <main class="app-main">
      ${renderAlertBanner()}
      ${activeViewContent}
    </main>
    ${renderFooter()}
  `;

  attachEventListeners();
}

/**
 * Attach Event Listeners
 */
function attachEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = e.currentTarget.getAttribute('data-tab');
      if (tabId && tabId !== state.activeTab) {
        state.activeTab = tabId;
        renderApp();
      }
    });
  });

  // Jump to preview button (on Overview tab)
  const jumpBtn = document.getElementById('jump-to-preview-btn');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      state.activeTab = 'preview';
      renderApp();
    });
  }

  // Dismiss alert banner
  const dismissBtn = document.getElementById('dismiss-alert-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      state.errorMessage = null;
      renderApp();
    });
  }

  // Browse Files Button
  const browseBtn = document.getElementById('browse-files-btn');
  const fileInput = document.getElementById('dataset-file-input');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Replace File Button
  const replaceBtn = document.getElementById('replace-file-btn');
  if (replaceBtn && fileInput) {
    replaceBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Remove File Button
  const removeBtn = document.getElementById('remove-file-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      removeDataset();
    });
  }

  // Load Sample Dataset Buttons
  document.querySelectorAll('.btn-sample-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sampleKey = e.currentTarget.getAttribute('data-sample') || 'sales';
      loadSampleDataset(sampleKey);
    });
  });

  // File Input Change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processDatasetFile(file);
      }
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    });
  }

  // Drag and Drop Handling
  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt && dt.files && dt.files[0];
      if (file) {
        processDatasetFile(file);
      }
    }, false);

    // Clicking anywhere inside dropzone opens picker if clicked outside button
    dropzone.addEventListener('click', (e) => {
      if (e.target !== browseBtn && !browseBtn?.contains(e.target) && fileInput) {
        fileInput.click();
      }
    });
  }

  // Table Search Input
  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.previewSearch = e.target.value;
      state.previewPage = 1;
      // Re-render table section cleanly without losing focus
      renderApp();
      // Refocus search input and place cursor at end
      const updatedSearch = document.getElementById('table-search-input');
      if (updatedSearch) {
        updatedSearch.focus();
        updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
      }
    });
  }

  // Clear Search Button
  const clearSearchBtn = document.getElementById('clear-search-btn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      state.previewSearch = '';
      state.previewPage = 1;
      renderApp();
    });
  }

  // Pagination buttons
  const prevBtn = document.getElementById('prev-page-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.previewPage > 1) {
        state.previewPage--;
        renderApp();
      }
    });
  }

  // Jump to analysis button (on Overview tab)
  const jumpAnalysisBtn = document.getElementById('jump-to-analysis-btn');
  if (jumpAnalysisBtn) {
    jumpAnalysisBtn.addEventListener('click', () => {
      state.activeTab = 'analysis';
      renderApp();
    });
  }

  // Profiling Sub-navigation Buttons
  document.querySelectorAll('.profile-subnav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subtab = e.currentTarget.getAttribute('data-subtab');
      if (subtab && subtab !== state.profilingSubTab) {
        state.profilingSubTab = subtab;
        renderApp();
      }
    });
  });

  // Profiling Column Search Input
  const profileSearchInput = document.getElementById('profile-search-input');
  if (profileSearchInput) {
    profileSearchInput.addEventListener('input', (e) => {
      state.profileSearch = e.target.value;
      renderApp();
      const updatedSearch = document.getElementById('profile-search-input');
      if (updatedSearch) {
        updatedSearch.focus();
        updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
      }
    });
  }

  // Clear Profile Search Button
  const clearProfileSearchBtn = document.getElementById('clear-profile-search-btn');
  if (clearProfileSearchBtn) {
    clearProfileSearchBtn.addEventListener('click', () => {
      state.profileSearch = '';
      renderApp();
    });
  }

  // Jump to Visualizations Button (from Overview tab)
  ['jump-to-visualizations-btn', 'jump-to-visualizations-btn-2'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        state.activeTab = 'visualizations';
        state.visualizationsFilter = 'all';
        renderApp();
      });
    }
  });

  // Visualization Filter Pills
  document.querySelectorAll('.viz-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.currentTarget.getAttribute('data-filter') || 'all';
      if (filter !== state.visualizationsFilter) {
        state.visualizationsFilter = filter;
        renderApp();
      }
    });
  });

  // Chart Toggle Buttons (e.g. Bar <-> Donut, Grouped <-> Stacked)
  document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const chartId = e.currentTarget.getAttribute('data-chart-id');
      if (!chartId) return;

      // Search chart in recommended or custom charts
      let chart = null;
      if (state.charts) {
        const allRec = [
          ...(state.charts.distribution || []),
          ...(state.charts.comparisons || []),
          ...(state.charts.numerical || []),
          ...(state.charts.temporal || []),
          ...(state.charts.relationships || [])
        ];
        chart = allRec.find(c => c.id === chartId);
      }
      if (!chart) {
        chart = state.customCharts.find(c => c.id === chartId);
      }

      if (chart && chart.supportedTypes && chart.supportedTypes.length > 1) {
        const current = state.chartToggles[chartId] || chart.activeType || chart.type;
        const currentIdx = chart.supportedTypes.indexOf(current);
        const nextIdx = (currentIdx + 1) % chart.supportedTypes.length;
        const next = chart.supportedTypes[nextIdx];
        state.chartToggles[chartId] = next;
        renderApp();
      }
    });
  });

  // Export SVG Action (Standalone vector export for business presentations)
  document.querySelectorAll('.chart-export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.chart-card');
      const svg = card ? card.querySelector('svg') : null;
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      const chartId = e.currentTarget.getAttribute('data-export-chart') || 'chart';
      downloadLink.download = `data_analysis_${chartId}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    });
  });

  // Open Custom Chart Modal
  ['open-custom-chart-modal-btn', 'add-another-custom-chart-btn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        if (!state.dataset) return;
        const { headers, columnTypes } = state.dataset;
        // Sensible initial defaults
        state.customChartForm = {
          type: 'bar',
          xCol: headers.find(h => columnTypes[h] === 'CATEGORICAL' || columnTypes[h] === 'DATE' || columnTypes[h] === 'PERIOD') || headers[0],
          yCol: '__count__',
          groupCols: [],
          presentation: 'composite',
          fieldSearch: '',
          includeIdentifiers: false,
          topN: 15,
          method: 'count',
          title: ''
        };
        state.isCustomChartModalOpen = true;
        renderApp();
      });
    }
  });

  // Close Custom Chart Modal
  ['close-custom-chart-modal-btn', 'cancel-custom-chart-btn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        state.isCustomChartModalOpen = false;
        renderApp();
      });
    }
  });

  // Builder Modal Form Input Listeners (Updates live preview)
  const bType = document.getElementById('builder-chart-type');
  const bX = document.getElementById('builder-x-col');
  const bY = document.getElementById('builder-y-col');
  const bMethod = document.getElementById('builder-method');
  const bTitle = document.getElementById('builder-title');

  function updateModalPreview() {
    if (bType) state.customChartForm.type = bType.value;
    if (bX) state.customChartForm.xCol = bX.value;
    if (bY) state.customChartForm.yCol = bY.value;
    if (bMethod) state.customChartForm.method = bMethod.value;
    if (bTitle) state.customChartForm.title = bTitle.value;
    renderApp();
  }

  [bType, bX, bY, bMethod].forEach(el => {
    if (el) el.addEventListener('change', updateModalPreview);
  });

  if (bTitle) {
    bTitle.addEventListener('input', (e) => {
      state.customChartForm.title = e.target.value;
      const previewBox = document.querySelector('.builder-preview-box > div');
      if (previewBox && state.dataset) {
        const item = buildCustomChartItem(state.customChartForm, state.dataset.headers, state.dataset.rows, state.dataset.columnTypes);
        previewBox.innerHTML = renderDashboardChart(item);
      }
    });
  }

  function toggleBuilderDim(dim, forceState) {
    if (!Array.isArray(state.customChartForm.groupCols)) {
      state.customChartForm.groupCols = [];
    }
    const idx = state.customChartForm.groupCols.indexOf(dim);
    if (forceState === true || (forceState === undefined && idx === -1)) {
      if (idx === -1) state.customChartForm.groupCols.push(dim);
    } else if (forceState === false || (forceState === undefined && idx !== -1)) {
      if (idx !== -1) state.customChartForm.groupCols.splice(idx, 1);
    }
    if (state.customChartForm.groupCols.length > 0 && ['bar', 'hbar'].includes(state.customChartForm.type)) {
      state.customChartForm.type = 'grouped';
    } else if (state.customChartForm.groupCols.length === 0 && ['grouped', 'stacked', 'stacked100', 'facets'].includes(state.customChartForm.type)) {
      state.customChartForm.type = 'bar';
    }
    renderApp();
  }

  document.querySelectorAll('[data-toggle-dim]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      const dim = item.getAttribute('data-toggle-dim');
      if (dim) toggleBuilderDim(dim);
    });
  });

  document.querySelectorAll('[data-dim-check]').forEach(input => {
    input.addEventListener('change', (e) => {
      const dim = e.currentTarget.getAttribute('data-dim-check');
      if (dim) toggleBuilderDim(dim, e.currentTarget.checked);
    });
  });

  document.querySelectorAll('[data-remove-dim]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dim = e.currentTarget.getAttribute('data-remove-dim');
      if (dim && state.customChartForm.groupCols) {
        state.customChartForm.groupCols = state.customChartForm.groupCols.filter(c => c !== dim);
        if (state.customChartForm.groupCols.length === 0 && ['grouped', 'stacked', 'stacked100', 'facets'].includes(state.customChartForm.type)) {
          state.customChartForm.type = 'bar';
        }
        renderApp();
      }
    });
  });

  document.querySelectorAll('[data-pres-set]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pres = e.currentTarget.getAttribute('data-pres-set');
      if (pres) {
        state.customChartForm.presentation = pres;
        if (pres === 'facets' && state.customChartForm.type !== 'facets') {
          state.customChartForm.type = 'facets';
        }
        renderApp();
      }
    });
  });

  const selectAllBtn = document.getElementById('builder-select-all-dims');
  if (selectAllBtn && state.dataset) {
    selectAllBtn.addEventListener('click', () => {
      const { headers, columnTypes } = state.dataset;
      const q = (state.customChartForm.fieldSearch || '').trim().toLowerCase();
      const eligible = (state.customChartForm.includeIdentifiers ? headers : headers.filter(h => columnTypes[h] !== 'IDENTIFIER')).filter(h => {
        if (h === state.customChartForm.xCol) return false;
        if (!q) return true;
        return h.toLowerCase().includes(q) || (columnTypes[h] || '').toLowerCase().includes(q);
      });
      state.customChartForm.groupCols = eligible;
      if (state.customChartForm.groupCols.length > 0 && ['bar', 'hbar'].includes(state.customChartForm.type)) {
        state.customChartForm.type = 'grouped';
      }
      renderApp();
    });
  }

  const clearAllBtn = document.getElementById('builder-clear-all-dims');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      state.customChartForm.groupCols = [];
      if (['grouped', 'stacked', 'stacked100', 'facets'].includes(state.customChartForm.type)) {
        state.customChartForm.type = 'bar';
      }
      renderApp();
    });
  }

  const includeIdsCheck = document.getElementById('builder-include-ids');
  if (includeIdsCheck) {
    includeIdsCheck.addEventListener('change', (e) => {
      state.customChartForm.includeIdentifiers = e.target.checked;
      renderApp();
    });
  }

  const builderSearchInput = document.getElementById('builder-group-search');
  if (builderSearchInput) {
    builderSearchInput.addEventListener('input', (e) => {
      state.customChartForm.fieldSearch = e.target.value;
      const listEl = document.querySelector('.field-checklist');
      if (listEl && state.dataset) {
        const { headers, columnTypes } = state.dataset;
        const q = (e.target.value || '').trim().toLowerCase();
        const selectedCols = state.customChartForm.groupCols || [];
        const eligible = (state.customChartForm.includeIdentifiers ? headers : headers.filter(h => columnTypes[h] !== 'IDENTIFIER')).filter(h => {
          if (h === state.customChartForm.xCol) return false;
          if (!q) return true;
          return h.toLowerCase().includes(q) || (columnTypes[h] || '').toLowerCase().includes(q);
        });
        listEl.innerHTML = eligible.map(h => {
          const isChecked = selectedCols.includes(h);
          const type = columnTypes[h] || 'TEXT';
          const badgeClass = getTypeBadgeClass(type);
          return `
            <div class="field-check-item ${isChecked ? 'selected' : ''}" data-toggle-dim="${escapeHtml(h)}">
              <label class="field-check-label">
                <input type="checkbox" ${isChecked ? 'checked' : ''} data-dim-check="${escapeHtml(h)}" style="accent-color: var(--accent-orange); cursor: pointer;" />
                <span>${escapeHtml(h)}</span>
              </label>
              <span class="field-badge ${badgeClass}">${type}</span>
            </div>
          `;
        }).join('') || '<div style="font-size: 11px; color: var(--text-muted); padding: 8px; text-align: center;">No matching fields found</div>';

        listEl.querySelectorAll('[data-toggle-dim]').forEach(item => {
          item.addEventListener('click', (ev) => {
            if (ev.target.tagName.toLowerCase() === 'input') return;
            const d = item.getAttribute('data-toggle-dim');
            toggleBuilderDim(d);
          });
        });
        listEl.querySelectorAll('[data-dim-check]').forEach(inp => {
          inp.addEventListener('change', (ev) => {
            const d = ev.currentTarget.getAttribute('data-dim-check');
            toggleBuilderDim(d, ev.currentTarget.checked);
          });
        });
      }
    });
  }

  // Relationship Hub Sub-Tab navigation
  document.querySelectorAll('.rel-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const t = e.currentTarget.getAttribute('data-rel-tab');
      if (t) {
        state.relationshipTab = t;
        renderApp();
      }
    });
  });

  // Jump from Overview table to Categorical tab
  document.querySelectorAll('[data-jump-rel-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const raw = e.currentTarget.getAttribute('data-jump-rel-cat') || '';
      const [cA, cB] = raw.split('|');
      if (cA && cB) {
        state.selectedCatColA = cA;
        state.selectedCatColB = cB;
      }
      state.relationshipTab = 'categorical';
      renderApp();
    });
  });

  // Jump from Overview table to Numerical tab
  document.querySelectorAll('[data-jump-rel-num]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const raw = e.currentTarget.getAttribute('data-jump-rel-num') || '';
      const [nA, nB] = raw.split('|');
      if (nA && nB) {
        state.selectedNumColA = nA;
        state.selectedNumColB = nB;
      }
      state.relationshipTab = 'numerical';
      renderApp();
    });
  });

  // Categorical selectors & mode
  const relCat1 = document.getElementById('rel-cat-var1');
  const relCat2 = document.getElementById('rel-cat-var2');
  if (relCat1) relCat1.addEventListener('change', (e) => { state.selectedCatColA = e.target.value; renderApp(); });
  if (relCat2) relCat2.addEventListener('change', (e) => { state.selectedCatColB = e.target.value; renderApp(); });

  document.querySelectorAll('[data-contingency-mode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.contingencyMode = e.currentTarget.getAttribute('data-contingency-mode');
      renderApp();
    });
  });

  // Numerical × Categorical selectors
  const relNumMet = document.getElementById('rel-num-metric');
  const relCatGrp = document.getElementById('rel-cat-group');
  if (relNumMet) relNumMet.addEventListener('change', (e) => { state.selectedNumColA = e.target.value; renderApp(); });
  if (relCatGrp) relCatGrp.addEventListener('change', (e) => { state.selectedCatColA = e.target.value; renderApp(); });

  // Numerical × Numerical selectors
  const relNum1 = document.getElementById('rel-num-var1');
  const relNum2 = document.getElementById('rel-num-var2');
  if (relNum1) relNum1.addEventListener('change', (e) => { state.selectedNumColA = e.target.value; renderApp(); });
  if (relNum2) relNum2.addEventListener('change', (e) => { state.selectedNumColB = e.target.value; renderApp(); });

  // Temporal selectors
  const relTimeCol = document.getElementById('rel-time-col');
  const relTimeCat = document.getElementById('rel-time-cat-col');
  if (relTimeCol) relTimeCol.addEventListener('change', (e) => { state.selectedTimeCol = e.target.value; renderApp(); });
  if (relTimeCat) relTimeCat.addEventListener('change', (e) => { state.selectedTimeCatCol = e.target.value; renderApp(); });

  // 3-Way Explorer selectors
  const rel3X = document.getElementById('rel-3way-x');
  const rel3S1 = document.getElementById('rel-3way-s1');
  const rel3S2 = document.getElementById('rel-3way-s2');
  const rel3Met = document.getElementById('rel-3way-metric');
  const rel3Pres = document.getElementById('rel-3way-pres');
  if (rel3X) rel3X.addEventListener('change', (e) => { state.selected3WayX = e.target.value; renderApp(); });
  if (rel3S1) rel3S1.addEventListener('change', (e) => { state.selected3WayS1 = e.target.value; renderApp(); });
  if (rel3S2) rel3S2.addEventListener('change', (e) => { state.selected3WayS2 = e.target.value; renderApp(); });
  if (rel3Met) rel3Met.addEventListener('change', (e) => { state.selected3WayMetric = e.target.value; renderApp(); });
  if (rel3Pres) rel3Pres.addEventListener('change', (e) => { state.selected3WayPres = e.target.value; renderApp(); });

  // Pin 3-way to dashboard button
  const add3WayBtn = document.getElementById('rel-add-3way-chart');
  if (add3WayBtn && state.dataset) {
    add3WayBtn.addEventListener('click', () => {
      const groupCols = [state.selected3WayS1, state.selected3WayS2].filter(Boolean);
      const isNum = state.selected3WayMetric && state.selected3WayMetric !== '__count__' && state.selected3WayMetric !== '__pct__';
      const form = {
        type: state.selected3WayPres === 'facets' ? 'facets' : (state.selected3WayPres === 'stacked100' ? 'stacked100' : 'grouped'),
        xCol: state.selected3WayX,
        yCol: state.selected3WayMetric || '__count__',
        groupCols,
        presentation: state.selected3WayPres || 'composite',
        topN: 15,
        method: isNum ? 'sum' : 'count',
        title: `${state.selected3WayX} by ${groupCols.join(' × ')}`
      };
      const customItem = buildCustomChartItem(form, state.dataset.headers, state.dataset.rows, state.dataset.columnTypes);
      customItem.id = `custom-3way-${Date.now()}`;
      customItem.isCustom = true;
      customItem.supportedTypes = ['grouped', 'stacked', 'stacked100', 'facets', 'heatmap'];
      state.customCharts.push(customItem);
      state.visualizationsFilter = 'custom';
      renderApp();
    });
  }

  // Save Custom Chart Button
  const saveCustomBtn = document.getElementById('save-custom-chart-btn');
  if (saveCustomBtn && state.dataset) {
    saveCustomBtn.addEventListener('click', () => {
      const { headers, rows, columnTypes } = state.dataset;
      const customItem = buildCustomChartItem(state.customChartForm, headers, rows, columnTypes);
      customItem.id = `custom-${Date.now()}`;
      customItem.isCustom = true;

      // Add supported alternative types for user-friendly toggling
      if (customItem.groupCols && customItem.groupCols.length > 0) {
        customItem.supportedTypes = ['grouped', 'stacked', 'stacked100', 'facets', 'heatmap', 'line', 'area'];
      } else if (customItem.aggregation && customItem.groupCol) {
        customItem.supportedTypes = ['grouped', 'stacked', 'stacked100', 'facets', 'line', 'area', 'heatmap'];
      } else if (customItem.type === 'bar') {
        customItem.supportedTypes = ['bar', 'hbar', 'donut', 'pie', 'line', 'area'];
      } else if (customItem.type === 'hbar') {
        customItem.supportedTypes = ['hbar', 'bar', 'donut'];
      } else if (customItem.type === 'donut' || customItem.type === 'pie') {
        customItem.supportedTypes = ['donut', 'pie', 'bar', 'hbar'];
      } else if (customItem.type === 'line' || customItem.type === 'area') {
        customItem.supportedTypes = ['line', 'area', 'bar'];
      } else if (customItem.type === 'histogram' || customItem.type === 'boxplot') {
        customItem.supportedTypes = ['histogram', 'boxplot'];
      } else if (customItem.type === 'scatter') {
        customItem.supportedTypes = ['scatter'];
      } else if (customItem.type === 'heatmap') {
        customItem.supportedTypes = ['heatmap'];
      } else {
        customItem.supportedTypes = [customItem.type];
      }

      state.customCharts.push(customItem);
      state.isCustomChartModalOpen = false;
      state.visualizationsFilter = 'custom';
      renderApp();
    });
  }

  // Remove Custom Chart Button
  document.querySelectorAll('.btn-remove-custom-chart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const customId = e.currentTarget.getAttribute('data-custom-id');
      if (customId) {
        state.customCharts = state.customCharts.filter(c => c.id !== customId);
        renderApp();
      }
    });
  });
}

// Global SVG Hover Tooltip Listeners
document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('[data-tooltip-title]');
  const tooltip = document.getElementById('chart-tooltip');
  if (target && tooltip) {
    const title = target.getAttribute('data-tooltip-title');
    const metric = target.getAttribute('data-tooltip-metric');
    const sub = target.getAttribute('data-tooltip-sub');
    tooltip.innerHTML = `
      ${title ? `<div class="tt-title">${title}</div>` : ''}
      ${metric ? `<div class="tt-metric">${metric}</div>` : ''}
      ${sub ? `<div class="tt-sub">${sub}</div>` : ''}
    `;
    tooltip.style.display = 'block';
  }
});

document.addEventListener('mousemove', (e) => {
  const tooltip = document.getElementById('chart-tooltip');
  if (tooltip && tooltip.style.display === 'block') {
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
  }
});

document.addEventListener('mouseout', (e) => {
  const target = e.target.closest('[data-tooltip-title]');
  const tooltip = document.getElementById('chart-tooltip');
  if (target && tooltip) {
    tooltip.style.display = 'none';
  }
});

/**
 * Simple HTML Escaper
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
