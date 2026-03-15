export function isEditableElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();

    if (target.isContentEditable) {
        return true;
    }

    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        Boolean(target.closest('[contenteditable="true"]')) ||
        Boolean(target.closest('.monaco-editor'))
    );
}

export function isModKey(event: KeyboardEvent): boolean {
    return event.ctrlKey || event.metaKey;
}
