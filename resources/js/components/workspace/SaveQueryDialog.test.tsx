import React from 'react';
import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {SaveQueryDialog} from "./SaveQueryDialog";

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
                         }: any) => (
                    <div>
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
        TextInput: ({value, placeholder, onUpdate}: any) => (
            <input
                value={value}
                placeholder={placeholder}
                onChange={(event) => onUpdate(event.target.value)}
            />
        ),
        TextArea: ({value, disabled}: any) => (
            <textarea value={value} disabled={disabled} readOnly/>
        ),
        RadioGroup: ({value, onUpdate, options}: any) => (
            <div>
                {options.map((option: any) => (
                    <label key={option.value}>
                        <input
                            type="radio"
                            name="radio-group"
                            checked={value === option.value}
                            onChange={() => onUpdate(option.value)}
                        />
                        {option.content}
                    </label>
                ))}
            </div>
        ),
    };
});

describe('SaveQueryDialog', () => {
    it('submits title, folder and visibility payload', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(
            <SaveQueryDialog
                open
                initialTitle="Users query"
                initialFolder="General"
                initialVisibility="private"
                sqlText="select * from users;"
                onClose={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        const titleInput = screen.getByPlaceholderText('Enter query title');
        const folderInput = screen.getByPlaceholderText('Enter folder name');

        fireEvent.change(titleInput, {
            target: {value: 'Team users query'},
        });

        fireEvent.change(folderInput, {
            target: {value: 'Team'},
        });

        fireEvent.click(screen.getByLabelText('Shared'));
        fireEvent.click(screen.getByText('Save'));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({
            title: 'Team users query',
            folder: 'Team',
            visibility: 'shared',
        });
    });

    it('normalizes blank folder to null', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);

        render(
            <SaveQueryDialog
                open
                initialTitle="Users query"
                initialFolder="General"
                initialVisibility="private"
                sqlText="select * from users;"
                onClose={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        const folderInput = screen.getByPlaceholderText('Enter folder name');

        fireEvent.change(folderInput, {
            target: {value: '   '},
        });

        fireEvent.click(screen.getByText('Save'));

        expect(onSubmit).toHaveBeenCalledWith({
            title: 'Users query',
            folder: null,
            visibility: 'private',
        });
    });

    it('disables save button when title is empty', () => {

        render(
            <SaveQueryDialog
                open
                initialTitle=""
                initialFolder={null}
                initialVisibility="private"
                sqlText="select * from users;"
                onClose={() => undefined}
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.getByText('Save').hasAttribute('disabled')).toBe(true);
    });

    it('shows sql preview text in disabled textarea', () => {
        render(
            <SaveQueryDialog
                open
                initialTitle="Users query"
                initialFolder="General"
                initialVisibility="private"
                sqlText="select * from users where active = true;"
                onClose={() => undefined}
                onSubmit={vi.fn()}
            />,
        );

        expect(
            screen.getByDisplayValue('select * from users where active = true;').hasAttribute('disabled'),
        ).toBe(true);
    });
});
