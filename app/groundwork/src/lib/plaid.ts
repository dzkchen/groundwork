import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const VALID_PLAID_ENVS = ["sandbox", "development", "production"] as const;
type PlaidEnv = (typeof VALID_PLAID_ENVS)[number];

let _client: PlaidApi | undefined;

export function getPlaidClient(): PlaidApi {
  if (!_client) {
    const env = (process.env.PLAID_ENV ?? "sandbox") as PlaidEnv;
    if (!VALID_PLAID_ENVS.includes(env)) {
      throw new Error(
        `Invalid PLAID_ENV "${process.env.PLAID_ENV}". Use one of: ${VALID_PLAID_ENVS.join(", ")}`
      );
    }
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required. Set them in .env.local.");
    }
    _client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env],
        baseOptions: {
          headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SECRET,
          },
        },
      })
    );
  }
  return _client;
}
