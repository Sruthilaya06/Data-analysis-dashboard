===============================================================================
                     DATA ANALYSIS DASHBOARD - PORTABLE EDITION
                 Offline Enterprise Analytics & Visualization Suite
===============================================================================

1. PRODUCT OVERVIEW
-------------------------------------------------------------------------------
The Data Analysis Dashboard is a self-contained, offline-compatible Business
Intelligence and Data Profiling application for Windows.

Key Capabilities:
  - Comprehensive single-sheet Excel (.xlsx, .xls) and CSV (.csv) analysis.
  - Automatic column data typing (Numerical, Categorical, Date/Period, Identifier).
  - Protected identifier/reference formatting (PAN, Mobile, Account, Observation IDs).
  - Categorical distribution analysis with frequency tables and Pareto metrics.
  - Numerical summary statistics, quartiles, IQR, variance, and standard deviation.
  - Multi-dimensional custom chart builder with multiple categorical series.
  - Native SVG charts (Grouped/Stacked Bar, Donut, Pie, Histogram, Box Plot, Scatter).
  - Built-in verified sample datasets for instant preview testing.


2. ZERO-DEPENDENCY OFFLINE ARCHITECTURE
-------------------------------------------------------------------------------
This portable distribution has been specifically engineered to run in restricted
corporate enterprise environments without administrative privileges:

  [x] NO Internet access required (100% offline).
  [x] NO Node.js or npm installation required.
  [x] NO Python installation required.
  [x] NO installer or registry modifications required.
  [x] NO external CDN stylesheets, fonts, or scripts (all embedded locally).
  [x] NO cloud telemetry, tracking, or remote API calls.
  [x] Strict loopback binding: Listens exclusively on 127.0.0.1 (Localhost).
      Never exposed to the office local area network (LAN) or public internet.


3. SYSTEM REQUIREMENTS
-------------------------------------------------------------------------------
  - Operating System: Windows 10, Windows 11, Windows 8.1, or Windows 7.
  - Runtime: Windows PowerShell 5.1 (built into Windows by default).
  - Web Browser: Microsoft Edge, Google Chrome, Mozilla Firefox, or Brave.
  - Hardware: Any standard office desktop or laptop.
  - Package Size: Total distribution size is below 2 MB (~600 KB total).


4. HOW TO LAUNCH THE APPLICATION
-------------------------------------------------------------------------------
Method A (Recommended):
  1. Extract the "DataAnalysisDashboard" folder to any local folder, Desktop,
     or portable USB drive.
  2. Double-click "Launch_Dashboard.bat".
  3. A console window will initialize the local server and automatically open
     your default web browser to:
     http://127.0.0.1:8080/
  4. Upload your Excel or CSV dataset, or click any of the built-in sample
     dataset buttons (Sales, Audit, Employee, Financial) to begin analysis.

Method B (Manual PowerShell execution):
  If batch files (.bat) are restricted by policy, you can open PowerShell in
  the folder and run:
     powershell -ExecutionPolicy Bypass -File .\server.ps1


5. HOW TO STOP THE APPLICATION
-------------------------------------------------------------------------------
  - Simply press CTRL + C in the running server console window, OR
  - Close the command prompt / PowerShell console window.
  - The local server will cleanly terminate and release the local port.


6. CORPORATE IT SECURITY & POLICY COMPLIANCE
-------------------------------------------------------------------------------
This application was engineered with strict security compliance for corporate
and bank-grade IT environments:

  a) Localhost Loopback Isolation (127.0.0.1):
     The server binds strictly to the loopback adapter (127.0.0.1). It does not
     listen on 0.0.0.0 or any network adapter. Other computers on the office
     network cannot access the port.

  b) Non-Privileged Execution:
     No administrator credentials or UAC elevation are requested or needed.
     The server binds to standard unprivileged high ports (8080 by default, with
     automatic fallback to 8081-8099 if 8080 is in use).

  c) Dual-Engine Fallback Architecture:
     - Primary Engine: System.Net.HttpListener.
     - Fallback Engine: Built-in user-mode System.Net.Sockets.TcpListener.
     If corporate group policy blocks http.sys URL registrations for non-admin
     accounts, server.ps1 automatically switches to a user-mode TCP socket
     server with zero permissions required.

  d) Directory Traversal Protection:
     All incoming HTTP request paths are canonicalized using Path.GetFullPath.
     Requests attempting directory traversal (e.g., ../) are immediately blocked
     with HTTP 403 Forbidden.

  e) PowerShell Execution Policy:
     "Launch_Dashboard.bat" passes the flag "-ExecutionPolicy Bypass" solely to
     its own child process. This does NOT alter the machine-wide or user-level
     PowerShell execution policy in the Windows Registry.

     If your organization's Group Policy enforces "ExecutionPolicy: AllSigned"
     or blocks .ps1 scripts entirely:
       You can paste the contents of server.ps1 into an interactive PowerShell
       window, or contact your IT helpdesk to whitelist the local script.


7. DATA PRIVACY & LOCAL PROCESSING GUARANTEE
-------------------------------------------------------------------------------
  - All dataset parsing (Excel .xlsx and CSV .csv) is performed client-side
    within the web browser using the compiled SheetJS engine.
  - No row, column, header, or cell value is ever sent across a network or saved
    to any external server.
  - The local HTTP server only serves the static HTML, JavaScript, CSS, and SVG
    application files from the folder to your browser.


8. PACKAGE CONTENTS
-------------------------------------------------------------------------------
  DataAnalysisDashboard/
    |-- Launch_Dashboard.bat   Windows launcher script
    |-- server.ps1             Localhost HTTP server (PowerShell 5.1)
    |-- README.txt             Documentation and operational instructions
    |-- index.html             Application HTML5 entry point (relative asset paths)
    |-- favicon.svg            Local dashboard vector icon
    |-- assets/
         |-- index-*.js        Compiled application bundle (UI, Profiling, Charts, SheetJS)
         |-- index-*.css       Application styling and typography
===============================================================================
