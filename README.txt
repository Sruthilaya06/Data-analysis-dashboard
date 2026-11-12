===============================================================================
                    DATA ANALYSIS DASHBOARD - SINGLE-FILE EDITION
             Self-Contained Offline HTML Application for Enterprise Windows
===============================================================================

1. PRODUCT OVERVIEW
-------------------------------------------------------------------------------
DataAnalysisDashboard.html is a completely self-contained, single-file HTML5
application designed for offline Business Intelligence, Data Profiling, and
Multi-Dimensional Chart Visualization on restricted corporate laptops.

Key Features:
  - 100% Self-Contained: All HTML, CSS stylesheets, JavaScript logic, native SVG
    icons, and the SheetJS data engine are bundled inside one single .html file.
  - Zero Local Server: Runs directly through the browser file:// protocol.
  - Zero Launcher Scripts: No .bat batch files, no .ps1 PowerShell scripts,
    and no command prompt windows required.
  - Zero Runtime Dependencies: Requires no Node.js, npm, Python, or installer.
  - Zero Internet Connectivity: Works completely offline with Wi-Fi disconnected.
  - Single-Worksheet Excel Processing: Parses exclusively the first worksheet
    (workbook.SheetNames[0]) of any uploaded Excel workbook (.xlsx, .xls).
  - Protected Identifiers: Automatically detects and preserves account numbers,
    PAN numbers, mobile numbers, and observation IDs as text without corruption.
  - Multi-Dimensional Chart Builder: Native SVG grouped/stacked bar charts,
    histograms, box plots, scatter charts, and multi-category series analysis.
  - 4 Verified Sample Datasets: Built-in sales, audit, employee, and financial
    datasets for instant zero-file exploration.


2. HOW TO RUN THE APPLICATION
-------------------------------------------------------------------------------
Step 1:
  Copy "DataAnalysisDashboard.html" to any folder, Desktop, or USB drive on
  your Windows laptop.

Step 2:
  Double-click "DataAnalysisDashboard.html", OR right-click and select
  "Open with" -> "Microsoft Edge" or "Google Chrome".

Step 3:
  The browser opens the complete dashboard immediately via:
  file:///.../DataAnalysisDashboard.html

Step 4:
  Click "Browse Files" or drag & drop any Excel (.xlsx, .xls) or CSV (.csv)
  dataset, or click any sample dataset chip (Sales, Audit, Employee, Financial).


3. DATA PRIVACY & BROWSER SECURITY ARCHITECTURE
-------------------------------------------------------------------------------
  a) 100% In-Memory Processing:
     File ingestion uses the browser's native HTML5 FileReader API. All data
     parsing, column type detection, statistical calculations, and SVG chart
     generation happen entirely inside the browser's JavaScript memory sandbox.
     Zero bytes are ever transmitted over a network or written to disk.

  b) file:// Protocol & CORS Compatibility:
     Standard Vite production builds use <script type="module"> which can trigger
     CORS restrictions when opened via file:// in certain browser configurations.
     DataAnalysisDashboard.html packages all application JavaScript in standard
     deferred mode (<script defer>), guaranteeing 100% unrestricted execution
     across Chrome, Edge, Firefox, and Safari on file:// paths.

  c) Smart App Control & Windows Defender Compliance:
     Because this distribution is a clean, static HTML5 document rather than an
     executable (.exe), batch file (.bat), or PowerShell script (.ps1), it does
     not trigger Smart App Control blocks, UAC elevation prompts, or SmartScreen
     untrusted publisher warnings.

  d) Known file:// Protocol Considerations:
     - Browser security models intentionally isolate file:// pages from silent
       background filesystem scanning. Uploading datasets requires explicit user
       interaction (clicking "Browse Files" or dragging and dropping files onto
       the dropzone), which complies fully with browser security sandboxes.
     - Web storage (localStorage/sessionStorage) is available within the file's
       origin, but no external files are ever requested.


4. DEVELOPMENT LAPTOP BUILD INSTRUCTIONS
-------------------------------------------------------------------------------
To modify source files and re-generate DataAnalysisDashboard.html:

  1. Prerequisites: Node.js 18+ and npm installed on development laptop.
  2. Install dependencies:
       npm install
  3. Compile and generate single-file distribution:
       npm run package
  4. The output will be generated at:
       ./DataAnalysisDashboard.html
       ./dist/DataAnalysisDashboard.html
       ./README.txt
       ./dist/README.txt
  5. The packaging script automatically measures all output files and enforces
     the strict 2 MB package size ceiling.


5. DISTRIBUTION PACKAGE SPECIFICATIONS
-------------------------------------------------------------------------------
  - Distribution Files: DataAnalysisDashboard.html, README.txt
  - Total Distribution Size: ~590 KB (0.58 MB)
  - Maximum Allowed Limit: 2,097,152 Bytes (2.000 MB)
  - Remaining Headroom: > 1.45 MB
===============================================================================
