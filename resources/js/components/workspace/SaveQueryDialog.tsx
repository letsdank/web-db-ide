import {useI18n} from "../../i18n";
import {useEffect, useMemo, useState} from "react";
import {Dialog, RadioGroup, Text, TextArea, TextInput} from "@gravity-ui/uikit";

export type SaveQueryVisibility = 'private' | 'shared';

export interface SaveQueryDialogSubmitPayload {
    title: string;
    folder: string | null;
    visibility: SaveQueryVisibility;
}

interface Props {
    open: boolean;
    loading?: boolean;
    error?: string | null;
    initialTitle: string;
    initialFolder?: string | null;
    initialVisibility?: SaveQueryVisibility;
    sqlText: string;
    onClose: () => void;
    onSubmit: (payload: SaveQueryDialogSubmitPayload) => Promise<void> | void;
}

export function SaveQueryDialog({
                                    open,
                                    loading = false,
                                    error = null,
                                    initialTitle,
                                    initialFolder = null,
                                    initialVisibility = 'private',
                                    sqlText,
                                    onClose,
                                    onSubmit,
                                }: Props) {
    const {t} = useI18n();

    const [title, setTitle] = useState(initialTitle);
    const [folder, setFolder] = useState(initialFolder ?? '');
    const [visibility, setVisibility] = useState<SaveQueryVisibility>(initialVisibility);

    useEffect(() => {
        if (!open) {
            return;
        }

        setTitle(initialTitle);
        setFolder(initialFolder ?? '');
        setVisibility(initialVisibility);
    }, [open, initialTitle, initialFolder, initialVisibility]);

    const canSubmit = useMemo(() => {
        return title.trim().length > 0;
    }, [title]);

    async function handleSubmit() {
        if (!canSubmit || loading) {
            return;
        }

        await onSubmit({
            title: title.trim(),
            folder: folder.trim() || null,
            visibility,
        });
    }

    if (!open) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={loading ? () => undefined : onClose}
            size="m"
            hasCloseButton={!loading}
        >
            <Dialog.Header caption={t('workspace.saveQueryDialogTitle')}/>

            <Dialog.Body>
                <div className="save-query-dialog">
                    <div className="save-query-dialog__field">
                        <Text variant="body-2">{t('workspace.queryTitle')}</Text>

                        <TextInput
                            value={title}
                            placeholder={t('workspace.queryTitlePlaceholder')}
                            onUpdate={setTitle}
                        />
                    </div>
                    <div className="save-query-dialog__field">
                        <Text variant="body-2">{t('workspace.folder')}</Text>

                        <TextInput
                            value={folder}
                            placeholder={t('workspace.folderPlaceholder')}
                            onUpdate={setFolder}
                        />
                    </div>
                    <div className="save-query-dialog__field">
                        <Text variant="body-2">{t('connections.visibility')}</Text>

                        <RadioGroup
                            value={visibility}
                            onUpdate={(value) => setVisibility(value as SaveQueryVisibility)}
                            options={[
                                {value: 'private', content: t('workspace.privateVisibility')},
                                {value: 'shared', content: t('workspace.sharedVisibility')},
                            ]}
                        />
                    </div>

                    <div className="save-query-dialog__field">
                        <Text variant="body-2">{t('workspace.queryPreview')}</Text>

                        <TextArea
                            value={sqlText}
                            minRows={8}
                            disabled
                        />
                    </div>

                    {error ? (
                        <div className="save-query-dialog__field">
                            <Text variant="body-2" color="danger">
                                {error}
                            </Text>
                        </div>
                    ) : null}
                </div>
            </Dialog.Body>

            <Dialog.Footer
                textButtonApply={t('common.save')}
                textButtonCancel={t('common.cancel')}
                propsButtonApply={{
                    view: 'action',
                    loading,
                    disabled: !canSubmit,
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
