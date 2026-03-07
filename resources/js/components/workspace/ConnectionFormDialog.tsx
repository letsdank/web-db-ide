import {CreateConnectionPayload} from "../../api/connections";
import {useMemo, useState} from "react";
import {Button, Checkbox, Dialog, Label, Text, TextInput} from "@gravity-ui/uikit";

interface Props {
    open: boolean;
    loading?: boolean;
    error?: string | null;
    onClose: () => void;
    onSubmit: (payload: CreateConnectionPayload) => Promise<void> | void;
}

const INITIAL_FORM: CreateConnectionPayload = {
    name: '',
    driver: 'pgsql',
    host: '127.0.0.1',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
    schema_default: 'public',
    ssl_mode: null,
    color: null,
    is_read_only: false,
};

export function ConnectionFormDialog({
                                         open,
                                         loading = false,
                                         error = null,
                                         onClose,
                                         onSubmit,
                                     }: Props) {
    const [form, setForm] = useState<CreateConnectionPayload>(INITIAL_FORM);

    const canSubmit = useMemo(() => {
        return (
            form.name.trim().length > 0 &&
            form.driver.trim().length > 0 &&
            form.host.trim().length > 0 &&
            String(form.port).trim().length > 0 &&
            form.database_name.trim().length > 0 &&
            form.username.trim().length > 0 &&
            form.password.trim().length > 0
        );
    }, [form]);

    function updateField<K extends keyof CreateConnectionPayload>(
        key: K,
        value: CreateConnectionPayload[K],
    ) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    async function handleSubmit() {
        if (!canSubmit || loading) {
            return;
        }

        await onSubmit({
            ...form,
            name: form.name.trim(),
            host: form.driver.trim(),
            database_name: form.database_name.trim(),
            username: form.username.trim(),
            schema_default: form.schema_default?.trim() || null,
            ssl_mode: form.ssl_mode?.trim() || null,
            color: form.color?.trim() || null,
        });
    }

    function handleClose() {
        if (loading) {
            return;
        }

        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose}>
            <div
                style={{
                    width: 560,
                    maxWidth: 'calc(100vw-32px)',
                    padding: 20,
                    boxSizing: 'border-box',
                }}
            >
                <div style={{marginBottom: 16}}>
                    <Text variant="header-1">New connection</Text>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gap: 12,
                    }}
                >
                    <TextInput
                        value={form.name}
                        onUpdate={(value) => updateField('name', value)}
                        placeholder="Connection name"
                        size="l"
                    />

                    <TextInput
                        value={form.driver}
                        onUpdate={(value) => updateField('driver', value)}
                        placeholder="Driver"
                        size="l"
                    />

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px',
                            gap: 12,
                        }}
                    >
                        <TextInput
                            value={form.host}
                            onUpdate={(value) => updateField('host', value)}
                            placeholder="Host"
                            size="l"
                        />

                        <TextInput
                            value={String(form.port)}
                            onUpdate={(value) =>
                                updateField(
                                    'port',
                                    Number(value.replace(/[^\d]/g, '')) || 0,
                                )
                            }
                            placeholder="Port"
                            size="l"
                        />
                    </div>

                    <TextInput
                        value={form.database_name}
                        onUpdate={(value) => updateField('database_name', value)}
                        placeholder="Database name"
                        size="l"
                    />

                    <TextInput
                        value={form.username}
                        onUpdate={(value) => updateField('username', value)}
                        placeholder="Username"
                        size="l"
                    />

                    <TextInput
                        value={form.password}
                        onUpdate={(value) => updateField('password', value)}
                        placeholder="Password"
                        type="password"
                        size="l"
                    />

                    <TextInput
                        value={form.schema_default ?? ''}
                        onUpdate={(value) => updateField('schema_default', value)}
                        placeholder="Default schema (optional)"
                        size="l"
                    />

                    <Checkbox
                        checked={Boolean(form.is_read_only)}
                        onUpdate={(checked) => updateField('is_read_only', checked)}
                    >
                        Read only
                    </Checkbox>

                    <div>
                        <Label theme="info">MVP tip</Label>
                        <div style={{marginTop: 8}}>
                            <Text variant="body-2" color="secondary">
                                For now use pgsql, and standard PostgreSQL params.
                            </Text>
                        </div>
                    </div>

                    {error ? (
                        <div>
                            <Label theme="danger">Error</Label>
                            <div style={{marginTop: 8}}>
                                <Text variant="body-2">{error}</Text>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 20,
                    }}
                >
                    <Button
                        view="flat"
                        size="l"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>

                    <Button
                        view="action"
                        size="l"
                        onClick={handleSubmit}
                        disabled={!canSubmit || loading}
                    >
                        {loading ? 'Creating...' : 'Create connection'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
