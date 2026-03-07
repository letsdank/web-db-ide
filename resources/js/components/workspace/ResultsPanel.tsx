import {ExecuteQueryResponse} from "../../types/queryResult";
import {Card, Label, Text} from "@gravity-ui/uikit";

interface Props {
    result: ExecuteQueryResponse | null;
}

export function ResultsPanel({result}: Props) {
    if (!result) {
        return (
            <Card view="filled" style={{height: '100%', padding: 12}}>
                <Text variant="subheader-2">Results</Text>
                <div style={{marginTop: 12}}>
                    <Text variant="body-2" color="secondary">
                        No results yet.
                    </Text>
                </div>
            </Card>
        );
    }

    if (result.status === 'error') {
        return (
            <Card view="filled" style={{height: '100%', padding: 12}}>
                <Text variant="subheader-2">Results</Text>

                <div style={{marginTop: 12}}>
                    <Label theme="danger">Error</Label>
                </div>

                <div style={{marginTop: 12}}>
                    <Text variant="body-2">{result.error}</Text>
                </div>
            </Card>
        );
    }

    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'auto',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                }}
            >
                <Text variant="subheader-2">Results</Text>
                <Label theme="info">{result.row_count} rows</Label>
                <Label theme="utility">{result.duration_ms} ms</Label>
            </div>

            <div style={{overflow: 'auto'}}>
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 14,
                    }}
                >
                    <thead>
                    <tr>
                        {result.columns.map((column) => (
                            <th
                                key={column.name}
                                style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    borderBottom: '1px solid var(--g-color-line-generic)',
                                    position: 'sticky',
                                    top: 0,
                                    background: 'var(--g-color-base-background)',
                                }}
                            >
                                {column.name}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--g-color-line-generic)',
                                        verticalAlign: 'top',
                                    }}
                                >
                                    {cell === null ? 'NULL' : String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
