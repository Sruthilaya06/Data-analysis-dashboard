import './style.css';
import * as XLSX from 'xlsx';

/**
 * Data Analysis Dashboard - Phase 1 Application Logic
 * Architecture: Vanilla JavaScript (ES6+), HTML5, CSS3
 */

// Application State
const state = {
  activeTab: 'overview', // 'overview' | 'preview' | 'analysis' | 'insights'
  file: null, // { name, size, formattedSize, extension, rawFile }
  dataset: null, // { headers: [], rows: [], totalRecords: 0, totalColumns: 0, columnTypes: {} }
  previewSearch: '',
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
      columnTypes
    };

    state.previewPage = 1;
    state.previewSearch = '';
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
    size: 2450,
    formattedSize: '2.4 KB',
    headers: ['Order_Date', 'Region', 'Product', 'Units_Sold', 'Revenue_INR'],
    rows: [
      ['2026-01-12', 'North America', 'Cloud Analytics Enterprise', 4, 184000],
      ['2026-01-14', 'Europe', 'Precision Edge Server', 2, 92000],
      ['2026-01-15', 'Asia Pacific', 'Systems Integration', 1, 145000],
      ['2026-01-18', 'North America', 'API Gateway Suite', 6, 126000],
      ['2026-01-19', 'Latin America', 'Security Compliance Audit', 1, 88000],
      ['2026-01-22', 'Europe', 'Cloud Analytics Pro', 5, 115000],
      ['2026-01-25', 'Asia Pacific', 'Network Switch Series X', 8, 208000],
      ['2026-01-27', 'North America', 'DevOps Managed Service', 3, 162000]
    ]
  },
  audit: {
    name: 'audit_observations_test_dataset.csv',
    size: 2180,
    formattedSize: '2.1 KB',
    headers: ['Observation_ID', 'Observation_Date', 'Department', 'Risk_Level', 'Status'],
    rows: [
      ['OBS-001', '2026-01-15', 'IT Audit', 'High', 'Open'],
      ['OBS-002', '2026-01-16', 'Finance', 'Medium', 'In Progress'],
      ['OBS-003', '2026-01-18', 'Operations', 'Low', 'Closed'],
      ['OBS-004', '2026-01-20', 'Compliance', 'Critical', 'Under Review'],
      ['OBS-005', '2026-01-22', 'Information Security', 'High', 'Open'],
      ['OBS-006', '2026-01-25', 'Human Resources', 'Low', 'Closed'],
      ['OBS-007', '2026-01-28', 'Supply Chain', 'Medium', 'In Progress']
    ]
  },
  employee: {
    name: 'employee_test_dataset.csv',
    size: 2320,
    formattedSize: '2.3 KB',
    headers: ['Employee_ID', 'Joining_Date', 'Annual_Salary_INR', 'Employment_Status'],
    rows: [
      ['EMP-001', '2025-03-01', 1200000, 'Active'],
      ['EMP-002', '2025-04-15', 1850000, 'Active'],
      ['EMP-003', '2025-06-01', 950000, 'On Leave'],
      ['EMP-004', '2025-08-10', 2400000, 'Probation'],
      ['EMP-005', '2025-10-01', 1600000, 'Active'],
      ['EMP-006', '2025-11-15', 2100000, 'Active']
    ]
  },
  financial: {
    name: 'financial_reporting_test_dataset.csv',
    size: 2260,
    formattedSize: '2.2 KB',
    headers: ['Period', 'Metric', 'Amount_INR', 'Scenario'],
    rows: [
      ['2026-Q1', 'Gross Revenue', 5000000, 'Actual'],
      ['2026-Q2', 'Cost of Goods Sold', 3200000, 'Budget'],
      ['2026-Q3', 'Operating Expense', 1100000, 'Forecast'],
      ['2026-Q4', 'Net Operating Margin', 700000, 'Variance'],
      ['2026-Q1', 'EBITDA', 1400000, 'Actual'],
      ['2026-Q2', 'Capex Investment', 450000, 'Budget']
    ]
  }
};

/**
 * Load built-in sample business dataset for instant preview testing
 */
function loadSampleDataset(key = 'sales') {
  const sample = sampleDatasets[key] || sampleDatasets.sales;
  const columnTypes = detectColumnTypes(sample.headers, sample.rows);

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
    columnTypes
  };

  state.previewPage = 1;
  state.previewSearch = '';
  state.errorMessage = null;
  renderApp();
}

/**
 * Remove dataset and reset to initial state
 */
function removeDataset() {
  state.file = null;
  state.dataset = null;
  state.previewSearch = '';
  state.previewPage = 1;
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
            Phase 1: Ingestion & Interface
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
  const tabs = [
    { id: 'overview', label: 'Overview', icon: icons.database },
    { 
      id: 'preview', 
      label: 'Data Preview', 
      icon: icons.table,
      badge: state.dataset ? `${state.dataset.totalRecords.toLocaleString()} rows` : null 
    },
    { id: 'analysis', label: 'Analysis', icon: icons.barChart, reserved: true },
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
              ${tab.reserved ? `<span class="tab-badge pill-reserved">Phase 2</span>` : ''}
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

      <div class="sample-action-bar" style="flex-direction: column; align-items: flex-start; gap: 8px;">
        <span class="sample-action-text" style="font-weight: 600;">Or load a verified test dataset:</span>
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
 * Render Reserved KPI Section (Phase 2 Blueprint)
 */
function renderReservedKPISection() {
  const isLoaded = Boolean(state.dataset);

  return `
    <section class="reserved-section">
      <div class="section-header">
        <div class="section-title-wrap">
          <span class="reserved-badge-header">Phase 2 Blueprint</span>
          <h2 class="section-title">Key Performance Indicators</h2>
          <p class="section-subtitle">
            ${isLoaded ? 'Dataset loaded. Analytical KPI computation will activate in Phase 2.' : 'Awaiting dataset upload. Metrics will be calculated from uploaded data.'}
          </p>
        </div>
      </div>

      <div class="reserved-cards-grid">
        <div class="reserved-card">
          <span class="reserved-card-label">Primary Metric Volume</span>
          <div class="reserved-placeholder-line"></div>
          <div class="reserved-placeholder-sub"></div>
          <div class="reserved-tag">
            ${icons.info}
            <span>Reserved for Phase 2 Engine</span>
          </div>
        </div>

        <div class="reserved-card">
          <span class="reserved-card-label">Distribution Mean / Average</span>
          <div class="reserved-placeholder-line"></div>
          <div class="reserved-placeholder-sub"></div>
          <div class="reserved-tag">
            ${icons.info}
            <span>Reserved for Phase 2 Engine</span>
          </div>
        </div>

        <div class="reserved-card">
          <span class="reserved-card-label">Categorical Cardinality</span>
          <div class="reserved-placeholder-line"></div>
          <div class="reserved-placeholder-sub"></div>
          <div class="reserved-tag">
            ${icons.info}
            <span>Reserved for Phase 2 Engine</span>
          </div>
        </div>

        <div class="reserved-card">
          <span class="reserved-card-label">Data Completeness Index</span>
          <div class="reserved-placeholder-line"></div>
          <div class="reserved-placeholder-sub"></div>
          <div class="reserved-tag">
            ${icons.info}
            <span>Reserved for Phase 2 Engine</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render Reserved Charts Section (Phase 2 Blueprint)
 */
function renderReservedChartsSection() {
  return `
    <section class="reserved-section">
      <div class="section-header">
        <div class="section-title-wrap">
          <span class="reserved-badge-header">Phase 2 Blueprint</span>
          <h2 class="section-title">Visual Exploration & Distribution Analysis</h2>
          <p class="section-subtitle">Dedicated analytical visualizer slots for multi-dimensional dataset insights</p>
        </div>
      </div>

      <div class="reserved-charts-grid">
        <div class="reserved-chart-box">
          <div class="chart-header">
            <h3 class="chart-title">Primary Variable Distribution & Frequency</h3>
            <span class="tab-badge pill-reserved">Interactive Charting</span>
          </div>
          <div class="chart-blueprint-body">
            <div class="blueprint-info">
              <div class="blueprint-icon">${icons.barChart}</div>
              <h4 class="blueprint-title">Chart Container 01</h4>
              <p class="blueprint-desc">
                Interactive histograms, bar series, and distribution curves will render here in subsequent phases.
              </p>
            </div>
          </div>
        </div>

        <div class="reserved-chart-box">
          <div class="chart-header">
            <h3 class="chart-title">Categorical Composition</h3>
            <span class="tab-badge pill-reserved">Proportional View</span>
          </div>
          <div class="chart-blueprint-body">
            <div class="blueprint-info">
              <div class="blueprint-icon">${icons.pieChart}</div>
              <h4 class="blueprint-title">Chart Container 02</h4>
              <p class="blueprint-desc">
                Segment splits, percentage breakdowns, and correlation rings will render here in subsequent phases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
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

    ${renderReservedKPISection()}

    ${renderReservedChartsSection()}

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
 * Render Reserved Analysis View
 */
function renderAnalysisView() {
  return `
    <div class="reserved-view-panel">
      <div class="feature-summary-banner">
        <div class="feature-summary-text">
          <h3>Phase 2 Analytical Engine Blueprint</h3>
          <p>
            Statistical models, correlation matrices, numerical anomaly detection, and automated variance analysis 
            are scheduled for implementation in Phase 2. The sections below showcase the structured business layout.
          </p>
        </div>
        <span class="tab-badge pill-reserved" style="font-size: 12px; padding: 6px 12px;">Architecture Planned</span>
      </div>

      <div class="reserved-grid-three">
        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.barChart}</div>
            <h3 class="analysis-card-title">Descriptive Statistics</h3>
          </div>
          <div class="analysis-card-body">
            Automated computation of mean, median, standard deviation, quartiles, and skewness across all identified numerical columns in the dataset.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Phase 2 Analytical Core</span>
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.pieChart}</div>
            <h3 class="analysis-card-title">Correlation & Dependency</h3>
          </div>
          <div class="analysis-card-body">
            Pairwise Pearson & Spearman correlation coefficients matrix to uncover key drivers and relationships between business metrics.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Phase 2 Analytical Core</span>
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-card-header">
            <div class="analysis-icon-box">${icons.sparkles}</div>
            <h3 class="analysis-card-title">Outlier & Risk Detection</h3>
          </div>
          <div class="analysis-card-body">
            Z-score and Interquartile Range (IQR) boundary scanning to flag data anomalies, atypical spikes, and data health discrepancies.
          </div>
          <div class="analysis-status-pill">
            ${icons.info}
            <span>Reserved for Phase 2 Analytical Core</span>
          </div>
        </div>
      </div>
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

  const nextBtn = document.getElementById('next-page-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.previewPage++;
      renderApp();
    });
  }
}

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
