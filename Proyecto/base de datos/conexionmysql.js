import {createPool} from 'mysql2/promise';

export const pool = createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'usuarios',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    port: 3306
});