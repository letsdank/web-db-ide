import type {ConnectionDto, ExportConnectionDumpPayload} from "../../types/connection";
import {useI18n} from "../../i18n";
import {useEffect, useMemo, useState} from "react";
import {Checkbox, Dialog, Select, Text} from "@gravity-ui/uikit";
import {supportsDumpExport} from "../../lib/databaseDrivers";

export interface ExportDumpTarget {
    connection: ConnectionDto;
    scope: 'database' | 'schema' | 'table';
    schema?: string | null;
    table?: string | null;
}

interface Props {
    open: boolean;
    loading?: boolean;
    error?: string | null;
    target: ExportDumpTarget | null;
    onClose: () => void;
    onSubmit: (payload: ExportConnectionDumpPayload) => Promise<void> | void;
}

interface FormState {
    format: 'plain' | 'custom';
    section: 'full' | 'schema' | 'data';
    clean: boolean;
    if_exists: boolean;
    no_owner: boolean;
    no_privileges: boolean;
    include_blobs: boolean;
}

function makeInitialForm(): FormState {
    return {
        format: 'plain',
        section: 'full',
        clean: false,
        if_exists: false,
        no_owner: true,
        no_privileges: true,
        include_blobs: false,
    };
}

export function ExportDumpDialog({
                                     open,
                                     loading = false,
                                     error = null,
                                     target,
                                     onClose,
                                     onSubmit,
                                 }: Props) {
    const {t} = useI18n();
    const [form, setForm] = useState<FormState>(makeInitialForm);

    useEffect(() => {
        if (!open) {
            return;
        }

        setForm(makeInitialForm());
    }, [open, target]);

    const isSupported = supportsDumpExport(target?.connection.driver);

    const targetLabel = useMemo(() => {
        if (!target) {
            return '';
        }

        if (target.scope === 'database') {
            return `${t('workspace.dumpTargetDatabase')}: ${target.connection.database_name}`;
        }

        if (target.scope === 'schema') {
            return `${t('workspace.dumpTargetSchema')}: ${target.schema}`;
        }

        return `${t('workspace.dumpTargetTable')}: ${target.schema}.${target.table}`;
    }, [target, t]);

    function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    async function handleSubmit() {
        if (!target || !isSupported || loading) {
            return;
        }

        await onSubmit({
            format: form.format,
            scope: target.scope,
            schema: target.schema ?? null,
            table: target.table ?? null,
            section: form.section,
            clean: form.clean,
            if_exists: form.clean && form.if_exists,
            no_owner: form.no_owner,
            no_privileges: form.no_privileges,
            include_blobs: form.include_blobs,
        });
    }

    if (!open || !target) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={loading ? () => undefined : onClose}
            size="m"
            hasCloseButton={!loading}
        >
            <Dialog.Header
                caption={t('workspace.exportDump')}
            />

            <Dialog.Body>
                <div className="dump-export-dialog">
                    <div className="dump-export-dialog__field">
                        <Text variant="subheader-3">{target.connection.name}</Text>

                        <Text variant="body-2" color="secondary">
                            {target.connection.database_name} · {target.connection.host}:{target.connection.port} · {target.connection.driver}
                        </Text>

                        <Text variant="body-2">{targetLabel}</Text>
                    </div>

                    {!isSupported ? (
                        <div className="dump-export-dialog__error">
                            <Text variant="body-2">
                                {t('workspace.dumpExportOnlyPostgres')}
                            </Text>
                        </div>
                    ) : null}

                    <div className="dump-export-dialog__grid">
                        <div className="dump-export-dialog__field">
                            <Text variant="body-2">{t('workspace.dumpFormat')}</Text>

                            <Select
                                width="max"
                                value={[form.format]}
                                onUpdate={(value) => patch('format', (value[0] ?? 'plain') as FormState['format'])}
                                options={[
                                    {value: 'plain', content: t('workspace.dumpFormatPlain')},
                                    {value: 'custom', content: t('workspace.dumpFormatCustom')},
                                ]}
                            />
                        </div>

                        <div className="dump-export-dialog__field">
                            <Text variant="body-2">{t('workspace.dumpSection')}</Text>

                            <Select
                                width="max"
                                value={[form.section]}
                                onUpdate={(value) => patch('section', (value[0] ?? 'full') as FormState['section'])}
                                options={[
                                    {value: 'full', content: t('workspace.dumpSectionFull')},
                                    {value: 'schema', content: t('workspace.dumpSectionSchema')},
                                    {value: 'data', content: t('workspace.dumpSectionData')},
                                ]}
                            />
                        </div>
                    </div>

                    <div className="dump-export-dialog__options">
                        <Checkbox
                            checked={form.clean}
                            onUpdate={(checked) => patch('clean', checked)}
                        >
                            {t('workspace.dumpClean')}
                        </Checkbox>

                        <Checkbox
                            checked={form.if_exists}
                            disabled={!form.clean}
                            onUpdate={(checked) => patch('if_exists', checked)}
                        >
                            {t('workspace.dumpIfExists')}
                        </Checkbox>

                        <Checkbox
                            checked={form.no_owner}
                            onUpdate={(checked) => patch('no_owner', checked)}
                        >
                            {t('workspace.dumpNoOwner')}
                        </Checkbox>

                        <Checkbox
                            checked={form.no_privileges}
                            onUpdate={(checked) => patch('no_privileges', checked)}
                        >
                            {t('workspace.dumpNoPrivileges')}
                        </Checkbox>

                        <Checkbox
                            checked={form.include_blobs}
                            onUpdate={(checked) => patch('include_blobs', checked)}
                        >
                            {t('workspace.dumpIncludeBlobs')}
                        </Checkbox>
                    </div>

                    {error ? (
                        <div className="dump-export-dialog__error">
                            <Text variant="body-2">{error}</Text>
                        </div>
                    ) : null}
                </div>
            </Dialog.Body>

            <Dialog.Footer
                textButtonApply={loading ? t('workspace.exportingDump') : t('workspace.exportDump')}
                textButtonCancel={t('common.cancel')}
                propsButtonApply={{
                    view: 'action',
                    loading,
                    disabled: !isSupported || loading,
                }}
                propsButtonCancel={{
                    disabled: loading,
                }}
                onClickButtonApply={handleSubmit}
                onClickButtonCancel={onClose}
            />
        </Dialog>
    );
}
