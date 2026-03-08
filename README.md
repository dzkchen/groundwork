
# Ground Work

Ground Work is a decentralized application (dApp) designed to incentivize users to actively contribute to their First Home Savings Account (FHSA). By leveraging the speed and low fees of the Solana blockchain, users stake USDC in a shared pool alongside a group of peers. 

Created for the Hack Canada hackathon, this project aims to solve real problems Canadians face by transforming how they approach saving for their first property.

**This project is depreciated as we are transitioning to a different idea for the hackathon.**


![Ground Work Logo](./ground_work_logo.png)

## Demo

To be Made

## Reasoning

**[Read the Full Reasoning with Research Here](https://docs.google.com/document/d/1VG-J6QwvoY2zg7ZvgT0_N1CUokQC5miK8h0hsxOwrTE/edit?usp=sharing)**

TLDR; Housing affordability in Canada remains a massive hurdle. Therefore, the Canadian government introduced the First Home Savings Account (FHSA), allowing contributions with tax-deductible deposits and tax-free withdrawals.

Despite this being one of the most powerful financial tools available to young Canadians, the follow-through is shockingly low:
* **Awareness is lacking:** [A BMO investment survey](https://newsroom.bmo.com/2023-12-07-BMO-Investment-Survey-Over-Half-of-Canadian-First-Time-Homebuyers-Likely-to-Use-First-Home-Savings-Accounts,-but-Many-Unaware-of-its-Features-and-Benefits) revealed that 2/3rds of Canadians lack knowledge about the FHSA. 
* **Adoption is slow:** While roughly a million Canadians have opened an account, this represents a very small fraction of the estimated 4.5 million renters in the country.
* **Contributions are falling drastically short:** Even among those who open an account, the average FHSA balance sits at just $3,899 as of late 2025. Meaning most are missing out on thousands of dollars in tax-deductible contribution room each year.

**The Solution:** Ground Work bridges the gap between the *intention* to save and the action of saving by turning your FHSA contributions into a financially binding, socially accountable habit.
## How It Works

The mechanism is simple: make your real-world FHSA contribution within the designated timeframe to secure your stake and earn a share of the forfeited funds from those who miss the deadline. It turns personal finance into a socially accountable, high-reward system.

1. **Wallet Connection:** Users connects their wallet of choosing (only supporting phantom wallet as of now), this allows us to use the Solana block chain as a middle man to hold each user's stake securely and safely
2. **Onboarding:** The user is put into an onboarding process where we provide suggestions on monthly contributions based on monthly income and expenses. A minimum contribution of $50 is required to prevent misuse.
3. **Matchmaking:** The user can choose to either participate on ground work against either friends or randoms (based on monthly contribution). As of now, this part is not in effect and needs updates/fixes.
4. **Connection:** Now the user is almost there! Ground Work securely connects to traditional financial institutions via Bank APIs (Plaid) to verify the real-world FHSA contribution receipt or transaction data. A $50 USDC stake is required. USDC is used here due to it's relative stability within the realm of cryptocurrency.
5. **The Race to Save:** Participants are now need to make a qualifying fiat contribution to their actual FHSA.
6. **Settlement:** ***Success:** Users who successfully verify their FHSA contribution receive their original USDC stake back, plus a proportional share of the forfeited funds from users who failed to contribute. ***Failure:** Users who miss the deadline forfeit their staked USDC, which is automatically distributed to the successful savers in their pool.

## Tech Stack

* **Frontend:** Next.js, TypeScript, Tailwind CSS
* **Backend & Services:** Firebase, Rust
* **Blockchain:** Solana
* **Identity & Verification:** Plaid

## Authors

- [Aryan Vasudevan](https://github.com/aryan-vasudevan)
- [Sohum Padhye](https://github.com/padhyeSohum)
- [David Chen](https://github.com/dzkchen)

