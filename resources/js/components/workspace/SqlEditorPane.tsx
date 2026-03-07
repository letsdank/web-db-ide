import {Card, TextArea} from "@gravity-ui/uikit";

interface Props {
    value: string;
    onChange: (value: string) => void;
}

export function SqlEditorPane({value, onChange}: Props) {
    return (
        <Card
            view="filled"
            style={{
                height: '100%',
                padding: 12,
                overflow: 'hidden',
            }}
        >
            <div style={{height: '100%'}}>
                <TextArea
                    value={value}
                    onUpdate={onChange}
                    size="xl"
                    pin="round-round"
                    rows={20}
                    style={{
                        width: '100%',
                        height: '100%',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                />
            </div>
        </Card>
    );
}
