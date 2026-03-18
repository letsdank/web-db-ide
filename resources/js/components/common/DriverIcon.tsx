import {Icon} from "@gravity-ui/uikit";
import {CircleInfo, Database} from "@gravity-ui/icons";

interface Props {
    driver: string;
    size?: number;
    className?: string;
}

function PostgresGlyph({size = 16, className}: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <rect x="1.5" y="1.6" width="13" height="13" rx="3" stroke="currentColor"/>
            <path
                d="M5.2 9.8V6.7c0-1.1.9-2 2-2h1.8c1.1 0 2 .9 2 2v1.1c0 1.1-.9 2-2 2H7.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.1 11.3V4.8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function MySqlGlyph({size = 16, className}: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <rect x="1.5" y="1.6" width="13" height="13" rx="3" stroke="currentColor"/>
            <path
                d="M4.7 11.2V5.1l2.2 3 2.2-3v6.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10.7 11.2V5.1l1.9 6.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function getDriverAccentClassName(driver: string): string {
    switch (driver) {
        case 'pgsql':
            return 'driver-accent driver-accent--pgsql';
        case 'mysql':
            return 'driver-accent driver-accent--mysql';
        default:
            return 'driver-accent driver-accent--default';
    }
}

export function DriverIcon({driver, size = 16, className}: Props) {
    const accentClassName = [getDriverAccentClassName(driver),className]
        .filter(Boolean)
        .join(' ');

    switch (driver) {
        case 'pgsql':
            return <PostgresGlyph size={size} className={accentClassName}/>;

        case 'mysql':
            return <MySqlGlyph size={size} className={accentClassName}/>;

        default:
            return <Icon data={Database} size={size} className={accentClassName}/>;
    }
}

export function DriverFallbackBadge({driver}: { driver: string }) {
    if (driver === 'pgsql' || driver === 'mysql') {
        return null;
    }

    return <Icon data={CircleInfo} size={14}/>;
}

