import './style.css';
import * as XLSX from 'xlsx';
import { 
  profileDataset, 
  formatMetricNumber, 
  formatPercent 
} from './profiling.js';

/**
 * Data Analysis Dashboard - Phase 2.1 Application Logic
 * Automated Data Profiling & Tabular Analytics Engine
 * Architecture: Vanilla JavaScript (ES6+), HTML5, CSS3, Vite
 */

// Application State
const state = {
  activeTab: 'overview', // 'overview' | 'preview' | 'analysis' | 'insights'
  profilingSubTab: 'all', // 'all' | 'table' | 'numerical' | 'categorical' | 'dates' | 'correlations' | 'quality'
  file: null, // { name, size, formattedSize, extension, rawFile }
  dataset: null, // { headers: [], rows: [], totalRecords: 0, totalColumns: 0, columnTypes: {}, profile: {} }
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
    headers: ['Order_ID', 'Order_Date', 'Customer_Name', 'Region', 'Sales_Rep', 'Product', 'Category', 'Units_Sold', 'Unit_Price_INR', 'Revenue_INR', 'Profit_INR'],
    rows: [
      ['ORD-1001', '2026-01-08', 'Apex Systems', 'North America', 'Sarah Jenkins', 'Cloud Analytics Enterprise', 'Software', 4, 45000, 180000, 54000],
      ['ORD-1002', '2026-01-12', 'Global Tech Solutions', 'Europe', 'Elena Rostova', 'Precision Edge Server', 'Hardware', 2, 92000, 184000, 36800],
      ['ORD-1003', '2026-01-15', 'Zenith Enterprises', 'Asia Pacific', 'David Chen', 'Systems Integration', 'Services', 1, 145000, 145000, 43500],
      ['ORD-1004', '2026-01-19', 'Vanguard Logistics', 'North America', 'Sarah Jenkins', 'API Gateway Suite', 'Software', 6, 21000, 126000, 37800],
      ['ORD-1005', '2026-01-23', 'Horizon Retail', 'Latin America', 'Alex Rivera', 'Security Compliance Suite', 'Software', 1, 88000, 88000, 26400],
      ['ORD-1006', '2026-01-28', 'Nexus Health', 'Europe', 'Elena Rostova', 'Cloud Analytics Pro', 'Software', 5, 28000, 140000, 42000],
      ['ORD-1007', '2026-02-02', 'Starlight Media', 'Asia Pacific', 'David Chen', 'Network Switch Series X', 'Hardware', 8, 26000, 208000, 41600],
      ['ORD-1008', '2026-02-07', 'Titan Industrial', 'North America', 'Marcus Vance', 'DevOps Managed Service', 'Services', 3, 54000, 162000, 48600],
      ['ORD-1009', '2026-02-12', 'Pioneer Software', 'Europe', 'Elena Rostova', 'Precision Edge Server', 'Hardware', 3, 92000, 276000, 55200],
      ['ORD-1010', '2026-02-17', 'Silverline Financial', 'North America', 'Sarah Jenkins', 'Cloud Analytics Enterprise', 'Software', 7, 45000, 315000, 94500],
      ['ORD-1011', '2026-02-22', 'Echo Networks', 'Asia Pacific', 'David Chen', 'API Gateway Suite', 'Software', 4, 21000, 84000, 25200],
      ['ORD-1012', '2026-02-27', 'Beacon Energy', 'Latin America', 'Alex Rivera', 'Systems Integration', 'Services', 2, 145000, 290000, 87000],
      ['ORD-1013', '2026-03-05', 'Solaria Technologies', 'North America', 'Marcus Vance', 'Security Compliance Suite', 'Software', 3, 88000, 264000, 79200],
      ['ORD-1014', '2026-03-12', 'Quantum Dynamics', 'Europe', 'Elena Rostova', 'DevOps Managed Service', 'Services', 2, 54000, 108000, 32400],
      ['ORD-1015', '2026-03-20', 'Acme Corporation', 'Asia Pacific', 'David Chen', 'Cloud Analytics Pro', 'Software', 6, 28000, 168000, 50400]
    ]
  },
  audit: {
    name: 'audit_observations_test_dataset.csv',
    size: 2740,
    formattedSize: '2.7 KB',
    headers: ['Observation_ID', 'Observation_Date', 'Department', 'Location', 'Risk_Level', 'Status', 'Observation_Title', 'Observation_Details', 'Financial_Impact_INR'],
    rows: [
      ['OBS-001', '2026-01-10', 'IT Audit', 'Bengaluru', 'High', 'Open', 'Unrestricted DB Admin Access', 'Administrative credentials shared across engineering teams without audit trail logging', 850000],
      ['OBS-002', '2026-01-14', 'Finance', 'Mumbai', 'Medium', 'In Progress', 'ERP Segregation of Duties Conflict', 'Accounts payable approval threshold lacks secondary sign-off above INR 500000', 320000],
      ['OBS-003', '2026-01-18', 'Operations', 'Delhi', 'Low', 'Closed', 'Delayed Inventory Physical Verification', 'Quarterly warehouse asset count delayed by two weeks across central depot', 0],
      ['OBS-004', '2026-01-22', 'Compliance', 'Hyderabad', 'Critical', 'Under Review', 'Statutory Tax Filing Delay', 'Withholding tax documentation reconciliation discrepancy pending regulatory review', 1500000],
      ['OBS-005', '2026-01-27', 'Information Security', 'Bengaluru', 'High', 'Open', 'Unpatched Perimeter Firewall Firmware', 'Critical CVE patch pending deployment on primary DMZ ingress firewalls', 1200000],
      ['OBS-006', '2026-02-02', 'Human Resources', 'Mumbai', 'Low', 'Closed', 'Incomplete Background Verification Records', 'Contractor personnel onboarding checklist missing third-party address verification', 0],
      ['OBS-007', '2026-02-06', 'Supply Chain', 'Chennai', 'Medium', 'In Progress', 'Single Source Vendor Dependency', 'Sole-source supplier contract active for essential server hardware components', 650000],
      ['OBS-008', '2026-02-11', 'IT Audit', 'Hyderabad', 'Critical', 'Open', 'Disaster Recovery Backup Failure', 'Secondary cold site snapshot replication failed integrity test during quarterly drill', 2400000],
      ['OBS-009', '2026-02-15', 'Finance', 'Delhi', 'High', 'Under Review', 'Unreconciled Intercompany Balances', 'Variance identified between subsidiary ledger and parent holding accounts', 950000],
      ['OBS-010', '2026-02-19', 'Operations', 'Mumbai', 'Medium', 'Closed', 'Overtime Hours Authorization Gap', 'Production plant shift overtime logs missing supervisor countersignature', 140000],
      ['OBS-011', '2026-02-24', 'Information Security', 'Bengaluru', 'Critical', 'Open', 'Exposed API Key in Client Bundle', 'Production API gateway access token embedded in public staging web application', 3100000],
      ['OBS-012', '2026-03-01', 'Compliance', 'Chennai', 'Medium', 'In Progress', 'Data Protection Policy Training Gap', 'Annual GDPR and DPDP compliance refresher training overdue for 35 percent staff', 250000],
      ['OBS-013', '2026-03-07', 'Supply Chain', 'Delhi', 'Low', 'Closed', 'Purchase Order Retrospective Approval', 'Five purchase requisitions issued post-invoice receipt by regional branch', 90000],
      ['OBS-014', '2026-03-14', 'Finance', 'Bengaluru', 'High', 'Open', 'Uncollected Customer Receivables Over 180 Days', 'Aged trade receivables exceeding 180 days lack documented provisioning', 1800000],
      ['OBS-015', '2026-03-21', 'Operations', 'Hyderabad', 'Low', 'Under Review', 'Logistics Transit Temperature Excursion', 'Cold chain temperature monitors registered intermittent calibration drift', 180000]
    ]
  },
  employee: {
    name: 'employee_test_dataset.csv',
    size: 2450,
    formattedSize: '2.5 KB',
    headers: ['Employee_ID', 'Employee_Name', 'Department', 'Location', 'Designation', 'Employment_Status', 'Joining_Date', 'Annual_Salary_INR', 'Performance_Score'],
    rows: [
      ['EMP-101', 'Aarav Sharma', 'Engineering', 'Bengaluru', 'Senior Software Engineer', 'Active', '2022-04-15', 1850000, 4.6],
      ['EMP-102', 'Diya Patel', 'Sales', 'Mumbai', 'Account Executive', 'Active', '2022-07-01', 1400000, 4.2],
      ['EMP-103', 'Rohan Mehta', 'Human Resources', 'Delhi', 'HR Specialist', 'Active', '2023-01-10', 980000, 3.9],
      ['EMP-104', 'Ananya Iyer', 'Finance', 'Bengaluru', 'Financial Analyst', 'Active', '2023-03-20', 1250000, 4.4],
      ['EMP-105', 'Vikram Malhotra', 'Engineering', 'Hyderabad', 'DevOps Lead', 'Active', '2023-06-15', 2200000, 4.8],
      ['EMP-106', 'Neha Verma', 'Marketing', 'Pune', 'Marketing Manager', 'Active', '2023-09-01', 1650000, 4.1],
      ['EMP-107', 'Kabir Joshi', 'Operations', 'Mumbai', 'Operations Lead', 'Active', '2023-11-15', 1350000, 4.0],
      ['EMP-108', 'Pooja Nair', 'Engineering', 'Bengaluru', 'Frontend Engineer', 'On Leave', '2024-02-01', 1500000, 4.3],
      ['EMP-109', 'Aditya Rao', 'Sales', 'Hyderabad', 'Regional Sales Lead', 'Active', '2024-04-10', 2100000, 4.7],
      ['EMP-110', 'Sneha Kulkarni', 'Finance', 'Pune', 'Senior Accountant', 'Active', '2024-06-25', 1450000, 4.1],
      ['EMP-111', 'Arjun Kapoor', 'Engineering', 'Bengaluru', 'Principal Architect', 'Active', '2024-09-01', 2800000, 4.9],
      ['EMP-112', 'Priyanka Sen', 'Marketing', 'Delhi', 'Content Strategist', 'Probation', '2025-01-15', 1050000, 3.8],
      ['EMP-113', 'Rahul Saxena', 'Operations', 'Hyderabad', 'Logistics Coordinator', 'Probation', '2025-03-01', 920000, 3.9],
      ['EMP-114', 'Kavita Reddy', 'Human Resources', 'Bengaluru', 'Talent Acquisition Partner', 'Active', '2025-05-10', 1180000, 4.2],
      ['EMP-115', 'Siddharth Jain', 'Engineering', 'Pune', 'Backend Engineer', 'Active', '2025-08-01', 1600000, 4.5]
    ]
  },
  financial: {
    name: 'financial_reporting_test_dataset.csv',
    size: 2180,
    formattedSize: '2.2 KB',
    headers: ['Period', 'Department', 'Metric', 'Scenario', 'Amount_INR'],
    rows: [
      ['2025-Q1', 'Enterprise Sales', 'Gross Revenue', 'Actual', 6200000],
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
  state.previewSearch = '';
  state.profileSearch = '';
  state.previewPage = 1;
  state.profilingSubTab = 'all';
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
            Phase 2.1: Automated Data Profiling
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

    ${renderOverviewKPISection()}

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
