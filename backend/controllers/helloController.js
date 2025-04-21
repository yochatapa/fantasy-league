import {query} from '../db.js';

export const getHelloMessage = async (req, res) => {
    try {
        const result = await query('SELECT NOW()')
        res.json({ message: 'DB connection success!', time: result.rows[0].now })
    } catch (error) {
        res.status(500).json({ message: 'DB operation failed!', error: error.message })
    }
};