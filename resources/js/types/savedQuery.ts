import {ConnectionDto} from "./connection";

export interface SavedQueryDto {
    id: number;
    user_id: number;
    db_connection_id: number | null;
    title: string;
    description: string | null;
    sql_text: string;
    folder: string | null;
    created_at: string | null;
    updated_at: string | null;
    connection: ConnectionDto | null;
}
