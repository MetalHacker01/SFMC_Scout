// handlers/de/DEFolderService.js

/**
 * Get or create a folder by path in SFMC Data Extensions.
 * Path format: "Parent/Child/GrandChild"
 * Returns the folder ID as a string.
 *
 * API endpoint proven by DEExportService.js in this project:
 * /contactsmeta/fuelapi/legacy/v1/beta/folder/{id}/children
 */
export async function getOrCreateFolder(folderPath, instance) {
    if (!folderPath || folderPath === '/' || folderPath === 'root' || folderPath === '') {
        return '0';
    }

    const parts = folderPath.split('/').filter(Boolean);
    let parentId = '0';

    for (const part of parts) {
        const children = await getFolderChildren(parentId, instance);
        const existing = children.find(f => f.name?.toLowerCase() === part.toLowerCase());
        if (existing) {
            parentId = String(existing.id);
        } else {
            parentId = await createFolder(part, parentId, instance);
        }
    }

    return parentId;
}

async function getFolderChildren(parentId, instance) {
    const inst = instance || 'mc.s51';
    const url = `https://${inst}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/folder/${parentId}/children` +
        `?$pageSize=500&$page=1&_type=DataExtension`;

    try {
        const resp = await fetch(url, {
            credentials: 'include',
            headers: { accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' }
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.items || data.entry || [];
    } catch (_) {
        return [];
    }
}

async function createFolder(name, parentId, instance) {
    const inst = instance || 'mc.s51';
    const url = `https://${inst}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/folder/`;

    const payload = {
        name,
        parentId: String(parentId),
        _type: 'DataExtension',
        description: ''
    };

    const resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        // If creation fails, fall back to parent folder
        return String(parentId);
    }

    const data = await resp.json();
    return String(data.id || data.Id || parentId);
}
