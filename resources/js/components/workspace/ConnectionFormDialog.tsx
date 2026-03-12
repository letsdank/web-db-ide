import {useEffect, useMemo, useState} from "react";
import {Button, Card, Checkbox, Dialog, Label, RadioGroup, Select, Text, TextArea, TextInput} from "@gravity-ui/uikit";
import {ConnectionDto, CreateConnectionPayload} from "../../types/connection";

type SshAuthMode = 'password' | 'private_key';

interface Props {
    open: boolean;
    loading?: boolean;
    error?: string | null;
    initialConnection?: ConnectionDto | null;
    onClose: () => void;
    onSubmit: (payload: CreateConnectionPayload) => Promise<void> | void;
}

interface FormState {
    name: string;
    driver: string;
    host: string;
    port: string;
    database_name: string;
    username: string;
    password: string;
    schema_default: string;
    ssl_mode: string;
    color: string;

    use_ssh_tunnel: boolean;
    ssh_host: string;
    ssh_port: string;
    ssh_username: string;
    ssh_password: string;
    ssh_private_key: string;
    ssh_passphrase: string;
    ssh_known_host_fingerprint: string;
}

function makeInitialForm(connection?: ConnectionDto | null): FormState {
    return {
        name: connection?.name ?? '',
        driver: connection?.driver ?? 'pgsql',
        host: connection?.host ?? '',
        port: String(connection?.port ?? 5432),
        database_name: connection?.database_name ?? '',
        username: connection?.username ?? '',
        password: '',
        schema_default: connection?.schema_default ?? '',
        ssl_mode: connection?.ssl_mode ?? '',
        color: connection?.color ?? '',

        use_ssh_tunnel: Boolean(connection?.use_ssh_tunnel),
        ssh_host: connection?.ssh_host ?? '',
        ssh_port: String(connection?.ssh_port ?? 22),
        ssh_username: connection?.ssh_username ?? '',
        ssh_password: '',
        ssh_private_key: '',
        ssh_passphrase: '',
        ssh_known_host_fingerprint: connection?.ssh_known_host_fingerprint ?? '',
    };
}

export function ConnectionFormDialog({
                                         open,
                                         loading = false,
                                         error = null,
                                         initialConnection = null,
                                         onClose,
                                         onSubmit,
                                     }: Props) {
    const [form, setForm] = useState<FormState>(() => makeInitialForm(initialConnection));

    const [sshAuthMode, setSshAuthMode] = useState<SshAuthMode>(() => {
        if (initialConnection?.has_ssh_private_key) {
            return 'private_key';
        }

        return 'password';
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        setForm(makeInitialForm(initialConnection));
        setSshAuthMode(initialConnection?.has_ssh_private_key ? 'private_key' : 'password');
    }, [initialConnection, open]);

    const isEditMode = Boolean(initialConnection);

    const canSubmit = useMemo(() => {
        if (!form.name.trim()) return false;
        if (!form.driver.trim()) return false;
        if (!form.host.trim()) return false;
        if (!form.port.trim()) return false;
        if (!form.database_name.trim()) return false;
        if (!form.username.trim()) return false;

        if (!isEditMode && !form.password.trim()) {
            return false;
        }

        if (form.use_ssh_tunnel) {
            if (!form.ssh_host.trim()) return false;
            if (!form.ssh_username.trim()) return false;

            if (!isEditMode) {
                if (sshAuthMode === 'password' && !form.ssh_password.trim()) {
                    return false;
                }

                if (sshAuthMode === 'private_key' && !form.ssh_private_key.trim()) {
                    return false;
                }
            }
        }

        return true;
    }, [form, isEditMode, sshAuthMode]);

    function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    async function handleSubmit() {
        if (!canSubmit || loading) {
            return;
        }

        const payload: CreateConnectionPayload = {
            name: form.name.trim(),
            driver: form.driver.trim(),
            host: form.host.trim(),
            port: Number(form.port),
            database_name: form.database_name.trim(),
            username: form.username.trim(),
            password: form.password,
            schema_default: form.schema_default?.trim() || null,
            ssl_mode: form.ssl_mode?.trim() || null,
            color: form.color?.trim() || null,

            use_ssh_tunnel: form.use_ssh_tunnel,
            ssh_host: form.use_ssh_tunnel ? form.ssh_host.trim() || null : null,
            ssh_port: form.use_ssh_tunnel ? Number(form.ssh_port || 22) : null,
            ssh_username: form.use_ssh_tunnel ? form.ssh_username.trim() || null : null,
            ssh_known_host_fingerprint: form.use_ssh_tunnel
                ? form.ssh_known_host_fingerprint.trim() || null
                : null,
        };

        if (!isEditMode || form.password.trim()) {
            payload.password = form.password;
        }

        if (form.use_ssh_tunnel) {
            if (sshAuthMode === 'password') {
                if (!isEditMode || form.ssh_password.trim()) {
                    payload.ssh_password = form.ssh_password;
                }

                payload.ssh_private_key = null;
                payload.ssh_passphrase = null;
            }

            if (sshAuthMode === 'private_key') {
                if (!isEditMode || form.ssh_private_key.trim()) {
                    payload.ssh_private_key = form.ssh_private_key;
                }

                if (!isEditMode || form.ssh_passphrase.trim()) {
                    payload.ssh_passphrase = form.ssh_passphrase;
                }

                payload.ssh_password = null;
            }
        } else {
            payload.ssh_password = null;
            payload.ssh_private_key = null;
            payload.ssh_passphrase = null;
        }

        await onSubmit(payload);
    }

    if (!open) {
        return null;
    }

    return (
        <div className="connection-form-dialog">
            <div className="connection-form-dialog__backdrop" onClick={loading ? undefined : onClose}/>

            <Card view="filled" className="connection-form-dialog__card">
                <div className="connection-form-dialog__header">
                    <Text variant="header-1">
                        {isEditMode ? 'Edit connection' : 'New connection'}
                    </Text>

                    <Button view='flat-secondary' onClick={onClose} disabled={loading}>
                        Close
                    </Button>
                </div>

                <div className="connection-form-dialog__body">
                    <div className="connection-form-dialog__section">
                        <Text variant="subheader-2">Database</Text>

                        <div className="connection-form-dialog__grid">
                            <TextInput
                                value={form.name}
                                placeholder="Connection name"
                                onUpdate={(value) => patch('name', value)}
                            />

                            <Select
                                width="max"
                                value={[form.driver]}
                                onUpdate={(value) => patch('driver', value[0] ?? 'pgsql')}
                                options={[
                                    {value: 'pgsql', content: 'PostgreSQL'},
                                ]}
                            />

                            <TextInput
                                value={form.host}
                                placeholder="Host"
                                onUpdate={(value) => patch('host', value)}
                            />

                            <TextInput
                                value={form.port}
                                placeholder="Port"
                                onUpdate={(value) => patch('port', value)}
                            />

                            <TextInput
                                value={form.database_name}
                                placeholder="Database"
                                onUpdate={(value) => patch('database_name', value)}
                            />

                            <TextInput
                                value={form.username}
                                placeholder="Username"
                                onUpdate={(value) => patch('username', value)}
                            />

                            <TextInput
                                type="password"
                                value={form.password}
                                placeholder={isEditMode ? 'Password (leave empty to keep current)' : 'Password'}
                                onUpdate={(value) => patch('password', value)}
                            />

                            <TextInput
                                value={form.schema_default}
                                placeholder="Default schema (optional)"
                                onUpdate={(value) => patch('schema_default', value)}
                            />

                            <TextInput
                                value={form.ssl_mode}
                                placeholder="SSL mode (optional)"
                                onUpdate={(value) => patch('ssl_mode', value)}
                            />

                            <TextInput
                                value={form.color}
                                placeholder="Color (optional)"
                                onUpdate={(value) => patch('color', value)}
                            />
                        </div>
                    </div>

                    <div className="connection-form-dialog__section">
                        <div className="connection-form-dialog__section-title">
                            <Text variant="subheader-2">SSH tunnel</Text>

                            <Checkbox
                                checked={form.use_ssh_tunnel}
                                onUpdate={(checked) => patch('use_ssh_tunnel', checked)}
                            >
                                Use SSH Tunnel
                            </Checkbox>
                        </div>

                        {form.use_ssh_tunnel ? (
                            <div className="connection-form-dialog__ssh">
                                <div className="connection-form-dialog__grid">
                                    <TextInput
                                        value={form.ssh_host}
                                        placeholder="SSH host"
                                        onUpdate={(value) => patch('ssh_host', value)}
                                    />

                                    <TextInput
                                        value={form.ssh_port}
                                        placeholder="SSH port"
                                        onUpdate={(value) => patch('ssh_port', value)}
                                    />

                                    <TextInput
                                        value={form.ssh_username}
                                        placeholder="SSH username"
                                        onUpdate={(value) => patch('ssh_username', value)}
                                    />

                                    <TextInput
                                        value={form.ssh_known_host_fingerprint}
                                        placeholder="Host fingerprint (optional)"
                                        onUpdate={(value) => patch('ssh_known_host_fingerprint', value)}
                                    />
                                </div>

                                <div className="connection-form-dialog__auth-mode">
                                    <Text variant="body-2">Authentication</Text>

                                    <RadioGroup
                                        value={sshAuthMode}
                                        onUpdate={(value) => setSshAuthMode(value as SshAuthMode)}
                                        options={[
                                            {value: 'password', content: 'Password'},
                                            {value: 'private_key', content: 'Private key'},
                                        ]}
                                    />
                                </div>

                                {sshAuthMode === 'password' ? (
                                    <div className="connection-form-dialog__stack">
                                        <div className="connection-form-dialog__secret-label">
                                            <Text variant="body-2">SSH password</Text>

                                            {isEditMode && initialConnection?.has_ssh_password ? (
                                                <Label theme="success">Stored</Label>
                                            ) : null}
                                        </div>

                                        <TextInput
                                            type="password"
                                            value={form.ssh_password}
                                            placeholder={
                                                isEditMode
                                                    ? 'SSH password (leave empty to keep current)'
                                                    : 'SSH password'
                                            }
                                            onUpdate={(value) => patch('ssh_password', value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="connection-form-dialog__stack">
                                        <div className="connection-form-dialog__secret-label">
                                            <Text variant="body-2">SSH private key</Text>

                                            {isEditMode && initialConnection?.has_ssh_private_key ? (
                                                <Label theme="success">Stored</Label>
                                            ) : null}
                                        </div>

                                        <TextArea
                                            value={form.ssh_private_key}
                                            placeholder={
                                                isEditMode
                                                    ? 'Private key (leave empty to keep current)'
                                                    : 'Paste private key'
                                            }
                                            minRows={8}
                                            onUpdate={(value) => patch('ssh_private_key', value)}
                                        />

                                        <div className="connection-form-dialog__secret-label">
                                            <Text variant="body-2">SSH key passphrase</Text>

                                            {isEditMode && initialConnection?.has_ssh_passphrase ? (
                                                <Label theme="success">Stored</Label>
                                            ) : null}
                                        </div>

                                        <TextInput
                                            type="password"
                                            value={form.ssh_passphrase}
                                            placeholder={
                                                isEditMode
                                                    ? 'Passphrase (leave empty to keep current)'
                                                    : 'Passphrase (optional)'
                                            }
                                            onUpdate={(value) => patch('ssh_passphrase', value)}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {error ? (
                        <div className="connection-form-dialog__error">
                            <Text variant="body-2">{error}</Text>
                        </div>
                    ) : null}
                </div>

                <div className="connection-form-dialog__footer">
                    <Button view="flat-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>

                    <Button view="action" onClick={handleSubmit} disabled={!canSubmit || loading}>
                        {loading ? 'Saving...' : isEditMode ? 'Save connection' : 'Create connection'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
