import { createClient } from 'urql';
import config from './config.json';
const TransactionQuery = `
    query ($first: Int, $user: String, $orderBy: String, $orderDirection: String) {
        transactionHistories(first: $first, orderBy: $orderBy, orderDirection: $orderDirection, where: {user: $user}) {
            id, user, action, createdAt, amount
        }
}`;

export const getTransactionHistory = async (user, limit) => {
    return new Promise((resolve, reject) => {
        const client = createClient({
            url: config.API_URL_SUBGRAPH
        });
        client
            .query(TransactionQuery, {
                first: limit,
                user,
                orderBy: 'createdAt',
                orderDirection: 'desc'
            })
            .toPromise()
            .then((data) => resolve(data))
            .catch((err) => {
                reject(err);
            });
    });
};
