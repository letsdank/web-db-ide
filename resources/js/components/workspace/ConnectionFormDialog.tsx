import {useEffect, useMemo, useState} from "react";
import {Button, Checkbox, Dialog, Label, RadioGroup, Select, Text, TextArea, TextInput} from "@gravity-ui/uikit";
import type {
    ConnectionDto,
    CreateConnectionPayload,
    DatabaseDriver,
    TestConnectionResultDto,
    UpdateConnectionPayload
} from "../../types/connection";
import {useI18n} from "../../i18n";
import {getDatabaseDriverDefinition, getDatabaseDriverOptions} from "../../lib/databaseDrivers";

type SshAuthMode = 'password' | 'private_key';
type VisibilityMode = 'private' | 'shared';

interface Props {
    open: boolean;
    loading?: boolean;
    error?: string | null;
    initialConnection?: ConnectionDto | null;
    onClose: () => void;
    onSubmit: (payload: CreateConnectionPayload | UpdateConnectionPayload) => Promise<void> | void;
    onTest: (payload: CreateConnectionPayload | UpdateConnectionPayload) => Promise<TestConnectionResultDto>;
}

interface FormState {
    name: string;
    driver: DatabaseDriver;
    host: string;
    port: string;
    database_name: string;
    username: string;
    password: string;
    schema_default: string;
    ssl_mode: string;
    color: string;
    visibility: VisibilityMode;

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
        schema_default: connection?.schema_default ?? 'public',
        ssl_mode: connection?.ssl_mode ?? '',
        color: connection?.color ?? '',
        visibility: connection?.visibility ?? 'private',

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
                                         onTest,
                                     }: Props) {
    const [form, setForm] = useState<FormState>(() => makeInitialForm(initialConnection));
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResultDto | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

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
        setTestResult(null);
        setTestError(null);
        setIsTestingConnection(false);
    }, [initialConnection, open]);

    const isEditMode = Boolean(initialConnection);
    const dialogTitleId = 'db-connection-dialog-title';
    const {t} = useI18n();
    const driverDefinition = getDatabaseDriverDefinition(form.driver);

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

    function handleDriverChange(nextRawDriver: string) {
        const nextDriver = (nextRawDriver || 'pgsql') as DatabaseDriver;
        const currentDriver = getDatabaseDriverDefinition(form.driver);
        const nextDriverDefinition = getDatabaseDriverDefinition(nextDriver);

        setForm((prev) => ({
            ...prev,
            driver: nextDriver,
            port: !prev.port || prev.port === String(currentDriver.defaultPort)
                ? String(nextDriverDefinition.defaultPort)
                : prev.port,
            schema_default: nextDriverDefinition.supportsSchemaDefault
                ? (prev.schema_default || nextDriverDefinition.defaultSchema || '')
                : '',
            ssl_mode: nextDriver === 'pgsql' ? prev.ssl_mode : '',
        }));
    }

    function buildPayload(): CreateConnectionPayload | UpdateConnectionPayload {
        const payload: CreateConnectionPayload | UpdateConnectionPayload = {
            name: form.name.trim(),
            driver: form.driver,
            host: form.host.trim(),
            port: Number(form.port),
            database_name: form.database_name.trim(),
            username: form.username.trim(),
            schema_default: form.schema_default?.trim() || null,
            ssl_mode: form.ssl_mode?.trim() || null,
            color: form.color?.trim() || null,
            visibility: form.visibility,
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

        return payload;
    }

    async function handleSubmit() {
        if (!canSubmit || loading) {
            return;
        }

        await onSubmit(buildPayload());
    }

    async function handleTestConnection() {
        if (!canSubmit || loading || isTestingConnection) {
            return;
        }

        setIsTestingConnection(true);
        setTestError(null);
        setTestResult(null);

        try {
            const result = await onTest(buildPayload());
            setTestResult(result);
        } catch (error: unknown) {
            const errorLike = typeof error === 'object' && error !== null
                ? error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                }
                : null;

            setTestError(
                errorLike?.response?.data?.message ||
                errorLike?.message ||
                'Failed to test connection.',
            );
        } finally {
            setIsTestingConnection(false);
        }
    }

    if (!open) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={loading ? () => undefined : onClose}
            aria-labelledby={dialogTitleId}
            size="l"
            hasCloseButton={!loading}
        >
            <Dialog.Header
                id={dialogTitleId}
                caption={isEditMode ? t('connections.editConnection') : t('connections.newConnection')}
            />

            <Dialog.Body>
                <div className="connection-dialog__body">
                    <div className="connection-dialog__section-stack">
                        <div className="connection-dialog__section">
                            <Text variant="subheader-3">{t('connections.database')}</Text>

                            <div className="connection-dialog__grid">
                                <TextInput
                                    value={form.name}
                                    placeholder={t('connections.placeholders.connectionName')}
                                    onUpdate={(value) => patch('name', value)}
                                />

                                <Select
                                    width="max"
                                    value={[form.driver]}
                                    onUpdate={(value) => handleDriverChange(value[0] ?? 'pgsql')}
                                    options={getDatabaseDriverOptions()}
                                />

                                <TextInput
                                    value={form.host}
                                    placeholder={t('connections.placeholders.host')}
                                    onUpdate={(value) => patch('host', value)}
                                />

                                <TextInput
                                    value={form.port}
                                    placeholder={t('connections.placeholders.port')}
                                    onUpdate={(value) => patch('port', value)}
                                />

                                <TextInput
                                    value={form.database_name}
                                    placeholder={t('connections.placeholders.database')}
                                    onUpdate={(value) => patch('database_name', value)}
                                />

                                <TextInput
                                    value={form.username}
                                    placeholder={t('connections.placeholders.username')}
                                    onUpdate={(value) => patch('username', value)}
                                />

                                <TextInput
                                    type="password"
                                    value={form.password}
                                    placeholder={isEditMode ? t('connections.placeholders.passwordKeep') : t('connections.placeholders.password')}
                                    onUpdate={(value) => patch('password', value)}
                                />

                                {driverDefinition.supportsSchemaDefault ? (
                                    <TextInput
                                        value={form.schema_default}
                                        placeholder={t('connections.placeholders.defaultSchema')}
                                        onUpdate={(value) => patch('schema_default', value)}
                                    />
                                ) : null}

                                <Select
                                    width="max"
                                    hasClear
                                    placeholder={t('connections.placeholders.sslMode')}
                                    value={form.ssl_mode ? [form.ssl_mode] : []}
                                    onUpdate={(value) => patch('ssl_mode', value[0] ?? "")}
                                    options={[
                                        {value: "disable", content: "disable"},
                                        {value: "allow", content: "allow"},
                                        {value: "prefer", content: "prefer"},
                                        {value: "require", content: "require"},
                                        {value: "verify-ca", content: "verify-ca"},
                                        {value: "verify-full", content: "verify-full"},
                                    ]}
                                />

                                <TextInput
                                    value={form.color}
                                    placeholder={t('connections.placeholders.colorTag')}
                                    onUpdate={(value) => patch('color', value)}
                                />
                            </div>
                        </div>

                        <div className="connection-dialog__auth-mode">
                            <Text variant="body-2">{t('connections.visibility')}</Text>

                            <RadioGroup
                                value={form.visibility}
                                onUpdate={(value) => patch('visibility', value as VisibilityMode)}
                                options={[
                                    {value: 'private', content: t('connections.privateVisibility')},
                                    {value: 'shared', content: t('connections.sharedVisibility')},
                                ]}
                            />
                        </div>

                        <div className="connection-dialog__section">
                            <div className="connection-dialog__section-header">
                                <Text variant="subheader-3">{t('connections.sshTunnel')}</Text>

                                <Checkbox
                                    checked={form.use_ssh_tunnel}
                                    onUpdate={(checked) => patch("use_ssh_tunnel", checked)}
                                >
                                    {t('connections.useSshTunnel')}
                                </Checkbox>
                            </div>

                            {form.use_ssh_tunnel ? (
                                <div className="connection-dialog__section">
                                    <div className="connection-dialog__grid">
                                        <TextInput
                                            value={form.ssh_host}
                                            placeholder={t('connections.placeholders.sshHost')}
                                            onUpdate={(value) => patch('ssh_host', value)}
                                        />

                                        <TextInput
                                            value={form.ssh_port}
                                            placeholder={t('connections.placeholders.sshPort')}
                                            onUpdate={(value) => patch('ssh_port', value)}
                                        />

                                        <TextInput
                                            value={form.ssh_username}
                                            placeholder={t('connections.placeholders.sshUsername')}
                                            onUpdate={(value) => patch('ssh_username', value)}
                                        />

                                        <TextInput
                                            value={form.ssh_known_host_fingerprint}
                                            placeholder={t('connections.placeholders.hostFingerprint')}
                                            onUpdate={(value) => patch('ssh_known_host_fingerprint', value)}
                                        />
                                    </div>

                                    <div className="connection-dialog__auth-mode">
                                        <Text variant="body-2">{t('connections.authentication')}</Text>

                                        <RadioGroup
                                            value={sshAuthMode}
                                            onUpdate={(value) => setSshAuthMode(value as SshAuthMode)}
                                            options={[
                                                {value: "password", content: t('connections.password')},
                                                {value: "private_key", content: t('connections.privateKey')},
                                            ]}
                                        />
                                    </div>

                                    {sshAuthMode === "password" ? (
                                        <div className="connection-dialog__auth-mode">
                                            <div className="connection-dialog__field-header">
                                                <Text variant="body-2">{t('connections.sshPassword')}</Text>

                                                {isEditMode && initialConnection?.has_ssh_password ? (
                                                    <Label theme="success">{t('connections.stored')}</Label>
                                                ) : null}
                                            </div>

                                            <TextInput
                                                type="password"
                                                value={form.ssh_password}
                                                placeholder={
                                                    isEditMode
                                                        ? t('connections.placeholders.sshPasswordKeep')
                                                        : t('connections.placeholders.sshPassword')
                                                }
                                                onUpdate={(value) => patch("ssh_password", value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="connection-dialog__field">
                                            <div className="connection-dialog__field-header">
                                                <Text variant="body-2">{t('connections.sshPrivateKey')}</Text>

                                                {isEditMode && initialConnection?.has_ssh_private_key ? (
                                                    <Label theme="success">{t('connections.stored')}</Label>
                                                ) : null}
                                            </div>

                                            <TextArea
                                                value={form.ssh_private_key}
                                                placeholder={
                                                    isEditMode
                                                        ? t('connections.placeholders.privateKeyKeep')
                                                        : t('connections.placeholders.privateKey')
                                                }
                                                minRows={8}
                                                onUpdate={(value) => patch("ssh_private_key", value)}
                                            />

                                            <div className="connection-dialog__field-header">
                                                <Text variant="body-2">{t('connections.sshKeyPassphrase')}</Text>

                                                {isEditMode && initialConnection?.has_ssh_passphrase ? (
                                                    <Label theme="success">{t('connections.stored')}</Label>
                                                ) : null}
                                            </div>

                                            <TextInput
                                                type="password"
                                                value={form.ssh_passphrase}
                                                placeholder={
                                                    isEditMode
                                                        ? t('connections.placeholders.passphraseKeep')
                                                        : t('connections.placeholders.passphrase')
                                                }
                                                onUpdate={(value) => patch("ssh_passphrase", value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {error ? (
                            <div className="connection-dialog__field">
                                <Label theme="danger">{t('workspace.connectionFailed')}</Label>
                                <Text variant="body-2" color="danger">
                                    {error}
                                </Text>
                            </div>
                        ) : null}

                        {testError ? (
                            <div className="connection-dialog__field">
                                <Label theme="danger">{t('workspace.connectionTestFailed')}</Label>
                                <Text variant="body-2" color="danger">
                                    {testError}
                                </Text>
                            </div>
                        ) : null}

                        {testResult ? (
                            <div className="connection-dialog__field">
                                <Label theme="success">{t('workspace.connectionSuccessful')}</Label>
                                <Text variant="body-2" color="secondary">
                                    {t('connections.connectedTo', {
                                        database: testResult.database_name,
                                        user: testResult.user_name,
                                        duration: testResult.duration_ms,
                                    })}
                                </Text>
                            </div>
                        ) : null}

                        <Dialog.Footer
                            textButtonApply={isEditMode ? t('connections.saveChanges') : t('connections.createConnection')}
                            textButtonCancel={t('common.cancel')}
                            propsButtonApply={{
                                view: "action",
                                loading,
                                disabled: !canSubmit || isTestingConnection,
                            }}
                            propsButtonCancel={{
                                disabled: loading || isTestingConnection,
                            }}
                            onClickButtonApply={handleSubmit}
                            onClickButtonCancel={onClose}
                            className="connection-dialog__footer"
                        >
                            <Button
                                view="outlined"
                                loading={isTestingConnection}
                                disabled={!canSubmit || loading}
                                onClick={handleTestConnection}
                            >
                                {t('common.testConnection')}
                            </Button>
                        </Dialog.Footer>
                    </div>
                </div>
            </Dialog.Body>
        </Dialog>
    );
}
