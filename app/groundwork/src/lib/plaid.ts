import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

let _client: PlaidApi | undefined;

export function getPlaidClient(): PlaidApi {
  if (!_client) {
    _client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[process.env.PLAID_ENV ?? "sandbox"],
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
