/**
 * DE Report Service
 * Shared service for generating Data Extension reports
 * Extracted from popup/assets/data-report.js for reuse
 * 
 * Copyright (c) 2025 Aldorino Rrushi
 */

import { InstanceService } from '../utils/InstanceService.js';
import { CSRFService } from '../utils/CSRFService.js';

/**
 * Fetch all Data Extensions with pagination and full path
 * @param {string} instance - SFMC instance (e.g., 'mc.s50')
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Array>} Array of all Data Extensions
 */
export async function fetchAllDeData(instance, progressCallback = null) {
    let allDes = [];
    let currentPage = 1;
    const pageSize = 1000;
    let totalCount = 0;
    let fetchedCount = 0;
    let hasMorePages = true;

    const API_BASE_URL = InstanceService.getApiBaseUrl(instance);

    // Generic API Fetch function
    const sfmcApiFetch = async (endpoint, options = {}) => {
        const url = `${API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        const fetchOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } };

        try {
            const response = await fetch(url, fetchOptions);
            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                return null;
            }

            if (!response.ok) {
                let errorMsg = `API Error ${response.status}: ${response.statusText}`;
                if (responseData) {
                    if (responseData.message) {
                        errorMsg = responseData.message;
                    } else if (responseData.error) {
                        errorMsg = responseData.error;
                    }
                }
                throw new Error(errorMsg);
            }
            return responseData;
        } catch (error) {
            throw error;
        }
    };

    if (progressCallback) progressCallback(`Fetching DE list (page ${currentPage})...`);

    while (hasMorePages) {
        try {
            const endpoint = `/data-internal/v1/customobjects/category/0?retrievalType=1&includeFullPath=true&$page=${currentPage}&$pagesize=${pageSize}`;
            const data = await sfmcApiFetch(endpoint);

            if (data && data.items) {
                allDes = allDes.concat(data.items);
                fetchedCount += data.items.length;

                if (currentPage === 1 && data.count) {
                    totalCount = data.count;
                    if (progressCallback) progressCallback(`Found ${totalCount} DEs. Fetching page ${currentPage}...`);
                }

                const progressMsg = totalCount > 0 ? `Fetched ${fetchedCount} of ${totalCount} DEs...` : `Fetched ${fetchedCount} DEs...`;
                if (progressCallback) progressCallback(progressMsg + ` (Page ${currentPage})`);

                if ((totalCount > 0 && fetchedCount >= totalCount) || data.items.length < pageSize) {
                    hasMorePages = false;
                } else {
                    currentPage++;
                }
            } else {
                hasMorePages = false;
            }

            // Safety break
            if (currentPage > 500) {
                hasMorePages = false;
                if (progressCallback) progressCallback("Reached fetch limit. Report might be incomplete.");
            }
        } catch (error) {
            throw new Error(`Failed to fetch DE data (page ${currentPage}): ${error.message}`);
        }
    }
    // Also fetch shared DEs (retrievalType=2) and merge, deduplicating by id
    try {
        const sharedEndpoint = `/data-internal/v1/customobjects/category/0?retrievalType=2&includeFullPath=true&$page=1&$pagesize=1000`;
        if (progressCallback) progressCallback('Fetching shared DEs...');
        const sharedData = await sfmcApiFetch(sharedEndpoint);
        if (sharedData && sharedData.items && sharedData.items.length > 0) {
            const existingIds = new Set(allDes.map(d => d.id));
            const newShared = sharedData.items.filter(d => !existingIds.has(d.id));
            allDes = allDes.concat(newShared);
            if (progressCallback) progressCallback(`Added ${newShared.length} shared DEs. Total: ${allDes.length}`);
        }
    } catch (_) { /* shared DEs unavailable — skip silently */ }

    return allDes;
}

/**
 * Generate HTML report from Data Extension data
 * @param {Array} allDeData - Array of Data Extension objects
 * @param {string} instance - SFMC instance (e.g., 'mc.s50')
 * @returns {string} HTML string
 */
export function generateReportHtml(allDeData, instance) {
    const reportDate = new Date().toLocaleString();
    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    let tableRows = '';
    if (allDeData && allDeData.length > 0) {
        allDeData.sort((a, b) => {
            const pathA = a.categoryFullPath || '';
            const pathB = b.categoryFullPath || '';
            const nameA = a.name || '';
            const nameB = b.name || '';
            const normPathA = pathA.replace(/\\/g, '/').toLowerCase();
            const normPathB = pathB.replace(/\\/g, '/').toLowerCase();

            if (normPathA < normPathB) return -1;
            if (normPathA > normPathB) return 1;
            if (nameA.toLowerCase() < nameB.toLowerCase()) return -1;
            if (nameA.toLowerCase() > nameB.toLowerCase()) return 1;
            return 0;
        });

        // Icons for the report
        const ICONS = {
            folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11V4.6C2 4.26863 2.26863 4 2.6 4H8.77805C8.92069 4 9.05679 4.05679 9.15751 4.15751L11.8425 6.84249C11.9432 6.94321 12.0793 7 12.2219 7H21.4C21.7314 7 22 7.26863 22 7.6V11M2 11V19.4C2 19.7314 2.26863 20 2.6 20H21.4C21.7314 20 22 19.7314 22 19.4V11M2 11H22"/></svg>',
            hashtag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L6 21"/><path d="M18 3L14 21"/><path d="M4 8H21"/><path d="M3 16H20"/></svg>',
            externalLink: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L15 3M21 3L12 12M21 3V9"/><path d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11"/></svg>',
            checkCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12.5L10 15.5L17 8.5"/><circle cx="12" cy="12" r="10"/></svg>',
            xCircle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9L9 15"/><path d="M9 9L15 15"/></svg>',
            calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 4V6M15 4H10.5M3 10V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V10H3Z"/><path d="M3 10V6C3 4.89543 3.89543 4 5 4H7"/><path d="M7 2V6"/><path d="M21 10V6C21 4.89543 20.1046 4 19 4H18.5"/></svg>',
            user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"/><circle cx="12" cy="7" r="4"/></svg>'
        };

        tableRows = allDeData.map(de => {
            const created = de.createdDate ? new Date(de.createdDate).toLocaleString() : 'N/A';
            const modified = de.modifiedDate ? new Date(de.modifiedDate).toLocaleString() : 'N/A';
            const sendableText = de.isSendable ?
                `<div class="de-sendable-cell"><span class="de-badge de-badge-success">${ICONS.checkCircle} Yes</span><span class="de-sendable-details">${escapeHtml(de.sendableCustomObjectField || '?')} → ${escapeHtml(de.sendableSubscriberField || '?')}</span></div>` :
                `<span class="de-badge de-badge-error">${ICONS.xCircle} No</span>`;
            const folderPath = de.categoryFullPath ? de.categoryFullPath.replace(/\\/g, '/') : 'Data Extensions';
            const createdBy = de.ownerName || 'N/A';
            const modifiedBy = de.modifiedByName || de.ownerName || 'N/A';
            const keyText = escapeHtml(de.key || 'N/A');
            const deUrl = `https://${instance}.marketingcloudapps.com/contactsmeta/admin.html#admin/data-extension/${de.id}/properties/`;

            return `
                <tr>
                    <td>
                        <a href="${deUrl}" target="_blank" rel="noopener noreferrer" class="de-name-link">
                            ${escapeHtml(de.name)} ${ICONS.externalLink}
                        </a>
                    </td>
                    <td>
                        <span class="de-folder-path">${ICONS.folder} ${escapeHtml(folderPath)}</span>
                    </td>
                    <td>
                        <span class="de-id" data-action="copy" data-id="${escapeHtml(de.id || 'N/A')}" title="Click to copy">
                            ${ICONS.hashtag} ${escapeHtml(de.id || 'N/A')}
                        </span>
                    </td>
                    <td>
                        <span class="de-key">${escapeHtml(keyText)}</span>
                    </td>
                    <td class="de-number">${de.rowCount != null ? de.rowCount.toLocaleString() : 'N/A'}</td>
                    <td class="de-number">${de.fieldCount != null ? de.fieldCount : 'N/A'}</td>
                    <td>${sendableText}</td>
                    <td>
                        <span class="de-date">${ICONS.calendar} ${created}</span>
                    </td>
                    <td>
                        <span class="de-user">${ICONS.user} ${escapeHtml(createdBy)}</span>
                    </td>
                    <td>
                        <span class="de-date">${ICONS.calendar} ${modified}</span>
                    </td>
                    <td>
                        <span class="de-user">${ICONS.user} ${escapeHtml(modifiedBy)}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SFMC Scout — DE Report (${instance})</title>
            <style>
                :root {
                    --bg:       #0F172A;
                    --bg2:      #0D1F35;
                    --surface:  #1E2D42;
                    --surf2:    #243451;
                    --border:   rgba(255,255,255,0.08);
                    --border2:  rgba(255,255,255,0.12);
                    --text:     #F8FAFC;
                    --text2:    #94A3B8;
                    --text3:    #64748B;
                    --accent:   #4F8EF7;
                    --success:  #34D399;
                    --error:    #F87171;
                    --mono:     'JetBrains Mono','Fira Code','Cascadia Code',monospace;
                }
                * { box-sizing: border-box; }
                html, body { height: 100%; overflow: hidden; }
                body {
                    font-family: 'Space Grotesk','DM Sans',system-ui,-apple-system,sans-serif;
                    font-size: 13px;
                    margin: 0;
                    padding: 0;
                    background: var(--bg);
                    color: var(--text);
                    line-height: 1.5;
                    -webkit-font-smoothing: antialiased;
                    display: flex;
                    flex-direction: column;
                }
                .report-header {
                    background: var(--bg2);
                    border-bottom: 1px solid var(--border2);
                    padding: 16px 24px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .report-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text);
                    margin: 0;
                }
                .report-title span { color: var(--accent); }
                .report-meta {
                    font-size: 12px;
                    color: var(--text3);
                    font-family: var(--mono);
                    margin-left: auto;
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .report-meta strong { color: var(--text2); }
                .report-body { padding: 20px 24px; flex: 1; overflow-y: auto; }
                .search-wrap {
                    display: flex;
                    align-items: center;
                    background: var(--surface);
                    border: 1px solid var(--border2);
                    border-radius: 8px;
                    padding: 0 14px;
                    gap: 10px;
                    max-width: 400px;
                    margin-bottom: 16px;
                }
                .search-wrap svg { color: var(--text3); flex-shrink: 0; }
                #search-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 13px;
                    font-family: inherit;
                    color: var(--text);
                    height: 40px;
                    flex: 1;
                }
                #search-input::placeholder { color: var(--text3); }
                .table-container {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    overflow-x: auto;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    min-width: 1200px;
                    font-size: 12px;
                }
                thead { position: sticky; top: 0; z-index: 10; }
                th {
                    background: var(--bg2);
                    padding: 12px 10px;
                    text-align: left;
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--text3);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    border-bottom: 1px solid var(--border2);
                    white-space: nowrap;
                    user-select: none;
                    cursor: pointer;
                    transition: color 0.15s;
                }
                th:hover { color: var(--text2); }
                th.sort-asc::after  { content: ' ▲'; opacity: 0.6; }
                th.sort-desc::after { content: ' ▼'; opacity: 0.6; }
                td {
                    padding: 10px;
                    border-bottom: 1px solid var(--border);
                    color: var(--text);
                    vertical-align: top;
                }
                tbody tr:hover td { background: var(--surf2); }
                tbody tr:last-child td { border-bottom: none; }
                a {
                    color: var(--accent);
                    text-decoration: none;
                    transition: opacity 0.15s;
                }
                a:hover { opacity: 0.8; text-decoration: underline; }
                .de-name-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    color: var(--accent);
                    font-weight: 500;
                }
                .de-name-link svg { width: 12px; height: 12px; opacity: 0.6; flex-shrink: 0; }
                .de-folder-path {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    color: var(--text3);
                    font-size: 11px;
                    max-width: 260px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .de-folder-path svg { width: 12px; height: 12px; color: var(--accent); flex-shrink: 0; }
                .de-id {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-family: var(--mono);
                    font-size: 11px;
                    color: var(--text2);
                    cursor: pointer;
                    transition: color 0.15s;
                }
                .de-id:hover { color: var(--accent); }
                .de-key { font-family: var(--mono); font-size: 11px; color: var(--text2); }
                .de-number { text-align: right; font-variant-numeric: tabular-nums; color: var(--text); font-weight: 500; }
                .de-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 3px 8px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .de-badge svg { width: 12px; height: 12px; flex-shrink: 0; }
                .de-badge-success { background: rgba(52,211,153,0.12); color: #34D399; border: 1px solid rgba(52,211,153,0.25); }
                .de-badge-error   { background: rgba(248,113,113,0.12); color: #F87171; border: 1px solid rgba(248,113,113,0.25); }
                .de-sendable-cell { display: flex; flex-direction: column; gap: 3px; }
                .de-sendable-details { font-size: 10px; color: var(--text3); font-family: var(--mono); }
                .de-date, .de-user {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    color: var(--text2);
                    font-size: 11px;
                }
                .de-date svg, .de-user svg { width: 12px; height: 12px; flex-shrink: 0; opacity: 0.6; }
                .hidden-row { display: none; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--surf2); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: var(--border2); }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1 class="report-title">SFMC Scout <span>DE Report</span></h1>
                <div class="report-meta">
                    <span><strong>Instance:</strong> ${escapeHtml(instance)}</span>
                    <span><strong>Generated:</strong> ${reportDate}</span>
                    <span><strong>Total:</strong> ${allDeData ? allDeData.length : 0} DEs</span>
                </div>
            </div>
            <div class="report-body">
            <div class="search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17"/></svg>
                <input type="text" id="search-input" placeholder="Filter by name, key, folder…">
            </div>
            <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th data-col="0">Name</th>
                        <th data-col="1">Folder Path</th>
                        <th data-col="2">ID</th>
                        <th data-col="3">Key</th>
                        <th data-col="4" style="text-align:right">Rows</th>
                        <th data-col="5" style="text-align:right">Fields</th>
                        <th data-col="6">Sendable</th>
                        <th data-col="7">Created</th>
                        <th data-col="8">Created By</th>
                        <th data-col="9">Modified</th>
                        <th data-col="10">Modified By</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="11" style="text-align:center;padding:40px;color:#64748B;">No Data Extensions found.</td></tr>'}
                </tbody>
            </table>
            </div>
            <script>
                // Copy DE ID on click
                document.addEventListener('click', function(e) {
                    const deId = e.target.closest('.de-id');
                    if (deId && deId.dataset.action === 'copy') {
                        navigator.clipboard.writeText(deId.dataset.id).then(() => {
                            const orig = deId.innerHTML;
                            deId.innerHTML = 'Copied!';
                            deId.style.color = '#34D399';
                            setTimeout(() => { deId.innerHTML = orig; deId.style.color = ''; }, 2000);
                        }).catch(() => {});
                    }
                });
                // Live search filter
                document.getElementById('search-input').addEventListener('input', function() {
                    const q = this.value.trim().toLowerCase();
                    document.querySelectorAll('tbody tr').forEach(tr => {
                        tr.classList.toggle('hidden-row', q ? !tr.textContent.toLowerCase().includes(q) : false);
                    });
                });
                // Column sort
                document.querySelectorAll('thead th[data-col]').forEach(th => {
                    th.addEventListener('click', function() {
                        const col = parseInt(this.dataset.col);
                        const asc = !this.classList.contains('sort-asc');
                        document.querySelectorAll('thead th').forEach(t => t.classList.remove('sort-asc','sort-desc'));
                        this.classList.add(asc ? 'sort-asc' : 'sort-desc');
                        const tbody = document.querySelector('tbody');
                        const rows = Array.from(tbody.querySelectorAll('tr'));
                        rows.sort((a,b) => {
                            const at = a.cells[col]?.textContent.trim() || '';
                            const bt = b.cells[col]?.textContent.trim() || '';
                            const n1 = parseFloat(at.replace(/,/g,'')), n2 = parseFloat(bt.replace(/,/g,''));
                            if (!isNaN(n1) && !isNaN(n2)) return asc ? n1-n2 : n2-n1;
                            return asc ? at.localeCompare(bt) : bt.localeCompare(at);
                        });
                        rows.forEach(r => tbody.appendChild(r));
                    });
                });
            </script>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate CSV report from Data Extension data
 * @param {Array} allDeData - Array of Data Extension objects
 * @returns {string} CSV string (UTF-8 with BOM for Excel compatibility)
 */
export function generateReportCsv(allDeData) {
    const escapeCsv = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };

    const headers = [
        'Name', 'Customer Key', 'ID', 'Folder Path',
        'Fields', 'Rows', 'Sendable', 'Sendable Field', 'Subscriber Field',
        'Owner', 'Created', 'Modified'
    ];

    const sorted = [...allDeData].sort((a, b) => {
        const pa = (a.categoryFullPath || '').replace(/\\/g, '/').toLowerCase();
        const pb = (b.categoryFullPath || '').replace(/\\/g, '/').toLowerCase();
        if (pa < pb) return -1;
        if (pa > pb) return 1;
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });

    const rows = sorted.map(de => [
        escapeCsv(de.name),
        escapeCsv(de.key || de.customerKey || ''),
        escapeCsv(de.id || ''),
        escapeCsv(de.categoryFullPath ? de.categoryFullPath.replace(/\\/g, '/') : 'Data Extensions'),
        escapeCsv(de.fieldCount != null ? de.fieldCount : ''),
        escapeCsv(de.rowCount != null ? de.rowCount : ''),
        escapeCsv(de.isSendable ? 'Yes' : 'No'),
        escapeCsv(de.sendableCustomObjectField || ''),
        escapeCsv(de.sendableSubscriberField || ''),
        escapeCsv(de.ownerName || ''),
        escapeCsv(de.createdDate ? new Date(de.createdDate).toLocaleString() : ''),
        escapeCsv(de.modifiedDate ? new Date(de.modifiedDate).toLocaleString() : '')
    ].join(','));

    // UTF-8 BOM + header + rows
    return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
}

