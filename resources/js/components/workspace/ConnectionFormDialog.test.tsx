import {beforeEach, describe, expect, it, vi} from "vitest";
import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {ConnectionFormDialog} from "./ConnectionFormDialog";
import {ConnectionDto} from "../../types/connection";

vi.mock('@gravity-ui/uikit', () => {
    return {
        Dialog: Object.assign(
            ({open, children}: any) => (open ? <div>{children}</div> : null),
            {
                Header: ({caption}: any) => <div>{caption}</div>,
                Body: ({children}: any) => <div>{children}</div>,
                Footer: ({
                             textButtonApply,
                             textButtonCancel,
                             onClickButtonApply,
                             onClickButtonCancel,
                             propsButtonApply,
                             children,
                         }: any) => (
                    <div>
                        {children}
                        <button
                            onClick={onClickButtonApply}
                            disabled={Boolean(propsButtonApply?.disabled)}
                        >
                            {textButtonApply}
                        </button>

                        <button onClick={onClickButtonCancel}>
                            {textButtonCancel}
                        </button>
                    </div>
                ),
            },
        ),
        Text: ({children}: any) => <div>{children}</div>,
        Label: ({children}: any) => <div>{children}</div>,
        Button: ({children, onClick, disabled}: any) => (
            <button onClick={onClick} disabled={disabled}>
                {children}
            </button>
        ),
        Checkbox: ({checked, onUpdate, children}: any) => (
            <label>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onUpdate(event.target.checked)}
                />
                {children}
            </label>
        ),
        TextInput: ({value, placeholder, onUpdate, type = 'text'}: any) => (
            <input
                value={value}
                type={type}
                placeholder={placeholder}
                onChange={(event) => onUpdate(event.target.value)}
            />
        ),
        TextArea: ({value, placeholder, onUpdate}: any) => (
            <textarea
                value={value}
                placeholder={placeholder}
                onChange={(event) => onUpdate(event.target.value)}
            />
        ),
        RadioGroup: ({value, onUpdate, options}: any) => (
            <div>
                {options.map((option: any) => (
                    <label key={option.value}>
                        <input
                            type="radio"
                            name={`radio-${options.map((item: any) => item.value).join('-')}`}
                            checked={value === option.value}
                            onChange={() => onUpdate(option.value)}
                        />
                        {option.content}
                    </label>
                ))}
            </div>
        ),
        Select: ({value, options, onUpdate, placeholder}: any) => (
            <select
                aria-label={placeholder || 'select'}
                value={value?.[0] ?? ''}
                onChange={(event) => onUpdate(event.target.value ? [event.target.value] : [])}
            >
                <option value="">{placeholder || 'Select'}</option>
                {options.map((option: any) => (
                    <option key={option.value} value={option.value}>
                        {option.content}
                    </option>
                ))}
            </select>
        ),
    };
});

function fillBaseConnectionFields() {
    fireEvent.change(screen.getByPlaceholderText('Connection name'), {
        target: {value: 'Analytics DB'},
    });
    fireEvent.change(screen.getByPlaceholderText('Host'), {
        target: {value: '127.0.0.1'},
    });
    fireEvent.change(screen.getByPlaceholderText('Port'), {
        target: {value: '5432'},
    });
    fireEvent.change(screen.getByPlaceholderText('Database'), {
        target: {value: 'analytics'},
    });
    fireEvent.change(screen.getByPlaceholderText('Username'), {
        target: {value: 'postgres'},
    });
}

describe('ConnectionFormDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('submits create payload with password and shared visibility', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(
            <ConnectionFormDialog
                open
                onClose={() => undefined}
                onSubmit={onSubmit}
                onTest={vi.fn()}
            />,
        );

        fillBaseConnectionFields();

        fireEvent.change(screen.getByPlaceholderText('Password'), {
            target: {value: 'super-secret'},
        });

        fireEvent.click(screen.getByLabelText('Shared'));
        fireEvent.click(screen.getByText('Create connection'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Analytics DB',
                host: '127.0.0.1',
                port: 5432,
                database_name: 'analytics',
                username: 'postgres',
                password: 'super-secret',
                visibility: 'shared',
                use_ssh_tunnel: false,
            }),
        );
    });

    it('does not submit create form without password', () => {
        const onSubmit = vi.fn();

        render(
            <ConnectionFormDialog
                open
                onClose={() => undefined}
                onSubmit={onSubmit}
                onTest={vi.fn()}
            />,
        );

        fillBaseConnectionFields();

        const applyButton = screen.getByText('Create connection');

        expect(applyButton.hasAttribute('disabled')).toBe(true);
    });

    it('does not send empty passwrd in edit mode', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        const initialConnection: ConnectionDto = {
            id: 10,
            user_id: 1,
            name: 'Analytics DB',
            driver: 'pgsql',
            host: '127.0.0.1',
            port: 5432,
            database_name: 'analytics',
            username: 'postgres',
            schema_default: 'public',
            ssl_mode: 'prefer',
            color: 'purple',
            visibility: 'private',
            is_favorite: false,
            is_read_only: false,
            use_ssh_tunnel: false,
            ssh_host: null,
            ssh_port: null,
            ssh_username: null,
            ssh_known_host_fingerprint: null,
            has_ssh_password: false,
            has_ssh_private_key: false,
            has_ssh_passphrase: false,
            last_used_at: null,
        };

        render(
            <ConnectionFormDialog
                open
                initialConnection={initialConnection}
                onClose={() => undefined}
                onSubmit={onSubmit}
                onTest={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText('Save changes'));

        expect(onSubmit).toHaveBeenCalledTimes(1);

        const payload = onSubmit.mock.calls[0][0];

        expect(payload.visibility).toBe('private');
        expect(payload.password).toBe('');
    });

    it('builds ssh password payload in test connection flow', async () => {
        const onTest = vi.fn().mockResolvedValue({
            database_name: 'analytics',
            user_name: 'postgres',
            duration_ms: 15,
        });

        render(
            <ConnectionFormDialog
                open
                onClose={() => undefined}
                onSubmit={vi.fn()}
                onTest={onTest}
            />,
        );

        fillBaseConnectionFields();

        fireEvent.change(screen.getByPlaceholderText('Password'), {
            target: {value: 'super-secret'},
        });

        fireEvent.click(screen.getByLabelText('Use SSH tunnel'));

        fireEvent.change(screen.getByPlaceholderText('SSH host'), {
            target: {value: '10.0.0.10'},
        });
        fireEvent.change(screen.getByPlaceholderText('SSH port'), {
            target: {value: '22'},
        });
        fireEvent.change(screen.getByPlaceholderText('SSH username'), {
            target: {value: 'root'},
        });
        fireEvent.change(screen.getByPlaceholderText('SSH password'), {
            target: {value: 'ssh-secret'},
        });

        fireEvent.click(screen.getByText('Test connection'));

        await waitFor(() => {
            expect(onTest).toHaveBeenCalledTimes(1);
        });

        expect(onTest).toHaveBeenCalledWith(
            expect.objectContaining({
                use_ssh_tunnel: true,
                ssh_host: '10.0.0.10',
                ssh_port: 22,
                ssh_username: 'root',
                ssh_password: 'ssh-secret',
                ssh_private_key: null,
                ssh_passphrase: null,
            }),
        );
    });

    it('builds ssh private key payload when auth mode is switched', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(
            <ConnectionFormDialog
                open
                onClose={() => undefined}
                onSubmit={onSubmit}
                onTest={vi.fn()}
            />,
        );

        fillBaseConnectionFields();

        fireEvent.change(screen.getByPlaceholderText('Password'), {
            target: {value: 'super-secret'},
        });

        fireEvent.click(screen.getByLabelText('Use SSH tunnel'));

        fireEvent.change(screen.getByPlaceholderText('SSH host'), {
            target: {value: '10.0.0.10'},
        });
        fireEvent.change(screen.getByPlaceholderText('SSH port'), {
            target: {value: '22'},
        });
        fireEvent.change(screen.getByPlaceholderText('SSH username'), {
            target: {value: 'root'},
        });

        fireEvent.click(screen.getByLabelText('Private key'));

        fireEvent.change(screen.getByPlaceholderText('Paste private key'), {
            target: {value: '---PRIVATE KEY---'},
        });
        fireEvent.change(screen.getByPlaceholderText('Passphrase'), {
            target: {value: 'phrase'},
        });

        fireEvent.click(screen.getByText('Create connection'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                use_ssh_tunnel: true,
                ssh_host: '10.0.0.10',
                ssh_port: 22,
                ssh_username: 'root',
                ssh_password: null,
                ssh_private_key: '---PRIVATE KEY---',
                ssh_passphrase: 'phrase',
            }),
        );
    });
});
