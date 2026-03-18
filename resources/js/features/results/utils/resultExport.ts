export function escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    if (
        stringValue.includes('"') ||
        stringValue.includes(',') ||
        stringValue.includes('\n')
    ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

export function buildCsv(
    columns: { name: string; native_type?: string | null }[],
    rows: unknown[][],
): string {
    const header = columns.map((column) => escapeCsvValue(column.name)).join(',');
    const dataRows = rows.map((row) =>
        row.map((cell) => escapeCsvValue(cell)).join(',')
    );

    return [header, ...dataRows].join('\n');
}

export function buildTsv(
    columns: { name: string, native_type?: string | null }[],
    rows: unknown[][],
): string {
    const header = columns.map((column) => column.name).join('\t');
    const dataRows = rows.map((row) =>
        row.map((cell) => (cell === null ? 'NULL' : String(cell))).join('\t')
    );

    return [header, ...dataRows].join('\n');
}

export function buildRowTsv(row: unknown[]): string {
    return row.map((cell) => (cell === null ? 'NULL' : String(cell))).join('\t');
}

export function buildRowJson(row: unknown[], columnNames: string[]): string {
    const payload = Object.fromEntries(
        columnNames.map((columnName, index) => [columnName, row[index] ?? null]),
    );

    return JSON.stringify(payload, null, 2);
}

export function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error(error);
    }
}
