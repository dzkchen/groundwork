# Ground Work

Ground Work is a decentralized application (dApp) designed to incentivize users to actively contribute to their First Home Savings Account (FHSA). By leveraging the speed and low fees of the Solana blockchain, users stake USDC in a shared pool alongside a group of peers. 

Created for the Hack Canada hackathon, this project aims to solve real problems Canadians face by transforming how they approach saving for their first property.

**Note: This project is depreciated as we are transitioning to a different idea for the hackathon.**

![Ground Work Logo](./ground_work_logo.png)

## Demo

[Watch the Site Demonstration Demo Here!](https://drive.google.com/file/d/1P_9YvxYcF9iGzqnLOwDzYXYAx8A5CJnD/view?usp=sharing)

## Inspiration

Housing affordability in Canada remains a massive hurdle. To help, the Canadian government introduced the First Home Savings Account (FHSA), allowing contributions with tax-deductible deposits and tax-free withdrawals. Despite this being one of the most powerful financial tools available to young Canadians, follow-through is shockingly low:
* **Awareness is lacking:** A BMO investment survey revealed that 2/3rds of Canadians lack knowledge about the FHSA. 
* **Adoption is slow:** While roughly a million Canadians have opened an account, this represents a very small fraction of the estimated 4.5 million renters.
* **Contributions are falling short:** Even among those who open an account, the average FHSA balance sits at just $3,899 as of late 2025, meaning most are missing out on thousands of dollars in tax-deductible contribution room.

We wanted to bridge the gap between the *intention* to save and the *action* of saving by turning FHSA contributions into a financially binding, socially accountable habit.

## What it does

Ground Work turns personal finance into a socially accountable, high-reward system. The mechanism is simple: make your real-world FHSA contribution within a designated timeframe to secure your stake and earn a share of the forfeited funds from peers who miss the deadline.

1. **Wallet Connection:** Users connect their Phantom wallet, allowing us to use the Solana blockchain to hold each user's stake securely.
2. **Onboarding:** We provide suggestions on monthly contributions based on income and expenses (minimum $50 contribution required).
3. **Matchmaking:** Users can choose to participate against friends or randoms based on their monthly contribution tier.
4. **Connection:** Ground Work securely connects to traditional financial institutions via Plaid to verify the real-world FHSA contribution. A $50 USDC stake is required to join the pool.
5. **The Race to Save:** Participants must make a qualifying fiat contribution to their actual FHSA.
6. **Settlement:** * **Success:** Users who verify their FHSA contribution receive their original USDC stake back, plus a proportional share of the forfeited funds.
   * **Failure:** Users who miss the deadline forfeit their staked USDC, which is distributed to the successful savers.

## How we built it

We built the frontend using **Next.js**, **TypeScript**, and **Tailwind CSS** to create a seamless and responsive user experience. For our backend services and database management, we utilized **Firebase**. 

The core Web3 functionality was built on the **Solana** blockchain, with smart contracts written in **Rust**. To bridge the gap between decentralized staking and traditional banking, we integrated **Plaid** to securely verify real-world fiat transactions and identity.

## Challenges we ran into

* **Testing Constraints:** Not having immediate access to testnet crypto (SOL, USDC) made deploying and testing our smart contracts difficult.
* **New Technologies:** Learning and implementing Rust for the first time to write Solana programs was a steep learning curve.
* **Complex Logic:** Building the matchmaking algorithm to pair users based on contribution tiers proved highly complex and is still not fully functional.

## Accomplishments we are proud of

* **Bridging Web2 and Web3:** We successfully connected traditional financial systems via Plaid with a Web3 wallet ecosystem.
* **Smart Contracts:** We built out and deployed our own Solana smart contracts from scratch.

## What we learned

* **Solana & Phantom:** We dove deep into the Solana ecosystem and learned how to properly manage state and transactions with the Phantom wallet.
* **Financial APIs:** We gained hands-on experience working with complex traditional financial APIs like Plaid to verify fiat transactions.
* **Rust:** We tackled the steep learning curve of writing programs in Rust for the very first time.

## What's next for this project

While Ground Work is depreciated for this specific hackathon, the concept remains strong. I may continue developing this out of personal interest at a later date. 

**Future Roadmap:**
1. **Algorithm Fixes:** Finalize and debug the matchmaking algorithm to accurately pair users based on their contribution tiers.
2. **Expanded Wallet Support:** Integrate additional Solana wallets beyond Phantom.
3. **Enhanced Bank Support:** Expand the Plaid integration to ensure seamless connections with a wider variety of Canadian financial institutions.
4. **Mainnet Launch:** Conduct thorough smart contract security audits and officially launch on the Solana mainnet.

## Built With

* Next.js
* TypeScript
* Tailwind CSS
* Firebase
* Rust
* Solana
* Plaid

## Authors

* [Aryan Vasudevan](https://github.com/aryan-vasudevan)
* [Sohum Padhye](https://github.com/padhyeSohum)
* [David Chen](https://github.com/dzkchen)
