// handlers/search/AssetSearchService.js
// Search Content Builder assets via the cookie-only /cloud/fuelapi/ proxy.
// No CSRF token required — session cookies on mc.{stack}.exacttarget.com authorize.
//
// Production-safe shape (verified against a 3.6k-match production query):
//   * pageSize = MAX_RESULTS (single page, no client-side pagination loop)
//   * Wide OR predicate across name / content / description / fileName / subjectline / customerKey
//     so emails are findable by their internal name even when the displayed name doesn't
//     contain the search term (SFMC stores internal-name vs displayed-name separately).
//
// The earlier OOM (HTTP 400 errorcode 30001 "System.OutOfMemoryException") came from
// pageSize=500 × MULTI-PAGE loop, NOT from the wide predicate itself. Single-page
// pageSize=40 with the same predicate runs fine on a 100k-asset prod org and returns
// in under a second.

/**
 * Fetch a rendered thumbnail for an email or template asset. Two endpoint
 * shapes exist, picked by asset type:
 *
 *   - Emails (templatebasedemail / htmlemail / textonlyemail):
 *       /artifacts/thumbnail/html?includeHeaderFooter=true&includeDesignContent=true
 *     Returns { width, height, image } where `image` is raw base64 PNG.
 *
 *   - Templates (template / emailtemplate):
 *       /artifacts/thumbnail/                  ← trailing slash, no /html
 *     Same response shape.
 *
 * The template endpoint 404s when you try the /html suffix and vice versa,
 * so the caller passes `assetTypeName` and we pick the right path.
 *
 * @param {Object} request { assetId, instance, assetTypeName }
 * @param {Function} sendResponse
 */
export async function handleFetchAssetPreview(request, sendResponse) {
    const { assetId, instance, assetTypeName } = request;
    if (!assetId) {
        sendResponse({ success: false, error: 'Missing asset ID' });
        return;
    }
    const stack = (instance || 's51').replace(/^mc\./, '');
    const t = (assetTypeName || '').toLowerCase();
    // 'template' / 'emailtemplate' use the bare /thumbnail/ endpoint.
    // 'templatebasedemail' is an EMAIL (it has /html) — only the literal
    // 'template' family uses the bare variant.
    const isTemplateOnly = (t === 'template') || (t === 'emailtemplate');
    const path = isTemplateOnly
        ? 'thumbnail/'
        : 'thumbnail/html?includeHeaderFooter=true&includeDesignContent=true';
    const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/asset/v1/content/assets/${assetId}/artifacts/${path}`;
    try {
        const resp = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { accept: '*/*' }
        });
        if (!resp.ok) {
            sendResponse({ success: false, error: `HTTP ${resp.status}` });
            return;
        }
        const data = await resp.json();
        sendResponse({ success: true, data });
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}

/**
 * Fetch the full asset category tree for an instance so we can build full
 * folder paths client-side. SFMC's category records are flat (id + name +
 * parentId), so we pull them all once per session and walk the chain in
 * memory to render "Content Builder / Email / Test" rather than just "Email".
 *
 * @param {Object} request { instance }
 * @param {Function} sendResponse
 */
export async function handleFetchAssetCategories(request, sendResponse) {
    const { instance } = request;
    const stack = (instance || 's51').replace(/^mc\./, '');
    const base = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/asset/v1/content/categories`;
    const PAGE_SIZE = 500;
    try {
        // Paginate through ALL categories. A single page of 500 is enough for
        // sandboxes but production orgs have more Content Builder folders than
        // that, so the leaf/ancestor categories for a given asset can sit on a
        // later page — without them the client-side parent-chain walk falls
        // back to the leaf folder name only. Looping also covers servers that
        // cap the page size below what we ask for.
        let all = [];
        let page = 1;
        while (page <= 60) { // safety cap: 60 * 500 = 30k categories
            const url = `${base}?$page=${page}&$pagesize=${PAGE_SIZE}`;
            const resp = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: { accept: 'application/json' }
            });
            if (!resp.ok) {
                // First-page failure is fatal; a later-page failure still lets
                // us return what we have (partial paths beat none).
                if (page === 1) { sendResponse({ success: false, error: `HTTP ${resp.status}` }); return; }
                break;
            }
            const data = await resp.json();
            const items = (data && data.items) || [];
            all = all.concat(items);
            const total = data && typeof data.count === 'number' ? data.count : all.length;
            if (!items.length || all.length >= total) break;
            page++;
        }
        sendResponse({ success: true, data: { items: all, count: all.length } });
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}

export class AssetSearchService {
    static MAX_RESULTS = 40;

    static async search(searchTerm, instance = null) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return { results: [], hint: null };
        }

        try {
            const stack = (instance || 'mc.s51').replace(/^mc\./, '');
            const url = `https://mc.${stack}.exacttarget.com/cloud/fuelapi/asset/v1/content/assets/query?scope=ours`;
            const term = searchTerm.trim();

            // Wide OR across the user-visible fields, ranked by SFMC's boost weights.
            // Mirrors the original Scout query that was working before the OOM-driven
            // narrowing — finds emails by content/subject when the display name doesn't
            // contain the term, which is the common case for templated campaign emails.
            const body = {
                page: { page: 1, pageSize: this.MAX_RESULTS },
                query: {
                    leftOperand: {
                        leftOperand: { property: 'name', simpleOperator: 'contains', value: term, boost: 50 },
                        logicalOperator: 'OR',
                        rightOperand: {
                            leftOperand: { property: 'content', simpleOperator: 'contains', value: term, boost: 5 },
                            logicalOperator: 'OR',
                            rightOperand: {
                                leftOperand: { property: 'description', simpleOperator: 'contains', value: term, boost: 3 },
                                logicalOperator: 'OR',
                                rightOperand: {
                                    leftOperand: { property: 'fileProperties.fileName', simpleOperator: 'contains', value: term, valueType: 'string', boost: 2 },
                                    logicalOperator: 'OR',
                                    rightOperand: {
                                        leftOperand: { property: 'views.subjectline.content', simpleOperator: 'contains', value: term, valueType: 'string', boost: 50 },
                                        logicalOperator: 'OR',
                                        rightOperand: { property: 'customerKey', simpleOperator: 'contains', value: term, valueType: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    logicalOperator: 'AND',
                    rightOperand: {
                        property: 'assetType.id',
                        simpleOperator: 'in',
                        // Full asset type catch-all — the previous narrowed list missed valid types
                        // like CloudPage assets, JSON blocks, etc. that users legitimately search for.
                        values: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,195,196,197,198,199,200,201,203,207,208,209,210,211,212,213,214,216,217,218,219,220,223,224,225,226,227,228,229,230,232,233,234,238,250]
                    }
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'content-type': 'application/json;datekind=local',
                    'x-requested-with': 'XMLHttpRequest',
                    'accept': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                let detail = '';
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.message) detail = ' — ' + errJson.message;
                } catch (_) {}
                return { results: [], hint: `Asset search returned ${response.status}${detail}` };
            }

            const data = await response.json();
            const items = Array.isArray(data) ? (data[4] || []) : (data.items || []);

            return {
                results: items.slice(0, this.MAX_RESULTS).map(item => {
                    const typeName = item.assetType ? (item.assetType.name || item.assetType.displayName || '') : '';
                    const typeId   = item.assetType ? item.assetType.id : null;
                    const lcType   = typeName.toLowerCase();
                    const isEmail  = lcType.includes('email') || lcType.includes('htmlpaste') || lcType.includes('templatebasedemail');
                    const ownerObj = item.createdBy || item.owner || null;
                    const createdBy = ownerObj
                        ? (typeof ownerObj === 'string' ? ownerObj : (ownerObj.name || ownerObj.email || ''))
                        : '';
                    const modifiedBy = item.modifiedBy
                        ? (typeof item.modifiedBy === 'string' ? item.modifiedBy : (item.modifiedBy.name || item.modifiedBy.email || ''))
                        : '';
                    // Surface the fields the detail card needs WITHOUT a second
                    // GET — the bulk search response is the same shape as the
                    // single-asset endpoint, so everything we need is already
                    // here. Adding a per-row /assets/{id} fetch would be wasteful.
                    const fp     = item.fileProperties || null;
                    const legacy = item.data && item.data.email && item.data.email.legacy
                                   ? item.data.email.legacy : null;
                    return {
                        type: isEmail ? 'email' : 'asset',
                        id: item.id,
                        assetId: item.id,
                        name: item.name || '(Unnamed)',
                        description: item.description || '',
                        assetType: item.assetType ? (item.assetType.displayName || item.assetType.name) : 'Asset',
                        assetTypeName: typeName,
                        assetTypeId: typeId,
                        customerKey: item.customerKey || null,
                        objectID: item.objectID || null,
                        status: item.status && item.status.name ? item.status.name : null,
                        path: item.category ? item.category.name : null,
                        categoryId: item.category ? item.category.id : null,
                        categoryParentId: item.category ? item.category.parentId : null,
                        modifiedDate: item.modifiedDate || null,
                        createdDate: item.createdDate || null,
                        createdBy: createdBy || null,
                        modifiedBy: modifiedBy || null,
                        // SFMC's "EmailID" (the integer ID surfaced in classic
                        // Email Studio) lives at data.email.legacy.legacyId.
                        legacyId: legacy ? (legacy.legacyId || null) : null,
                        // fileProperties is populated for uploaded files only —
                        // images, PDFs, font files, etc. publishedURL is the
                        // CDN link suitable for "View File" / image preview.
                        publishedURL: fp ? (fp.publishedURL || null) : null,
                        fileName:     fp ? (fp.fileName     || null) : null,
                        fileSize:     fp ? (fp.fileSize     || null) : null,
                        fileWidth:    fp ? (fp.width        || null) : null,
                        fileHeight:   fp ? (fp.height       || null) : null,
                        fileExtension:fp ? (fp.extension    || null) : null,
                        url: `https://mc.${stack}.exacttarget.com/cloud/#app/Content%20Builder`
                    };
                }),
                hint: null
            };
        } catch (error) {
            return { results: [], hint: 'Asset search failed: ' + error.message };
        }
    }
}
