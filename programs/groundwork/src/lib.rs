use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("3y5dGx98G2jZ7STFqHoaxzsX9PRYPFdfTPBqnVanXJL3");

/// Hardcoded program authority — only this key can call release_stake.
/// Generated deterministically from seed "groundwork-authority" for local testing.
/// Replace with your real authority pubkey before mainnet deployment.
const AUTHORITY_PUBKEY: Pubkey = Pubkey::new_from_array([
    6, 5, 27, 147, 157, 238, 108, 216, 95, 122, 148, 143, 20, 89, 29, 105, 117, 83, 2, 94, 242,
    207, 234, 208, 52, 122, 236, 171, 152, 17, 160, 149,
]);

#[program]
pub mod groundwork {
    use super::*;

    /// Transfers `amount` of USDC from the user's ATA into a PDA vault and
    /// initialises a UserAccount recording the deposit.
    pub fn deposit_stake(mut ctx: Context<DepositStake>, amount: u64) -> Result<()> {
        let accs = &mut ctx.accounts;

        accs.user_account.wallet = accs.user.key();
        accs.user_account.stake_amount = amount;
        accs.user_account.verified = false;

        token::transfer(
            CpiContext::new(
                accs.token_program.to_account_info(),
                Transfer {
                    from: accs.user_usdc_ata.to_account_info(),
                    to: accs.vault.to_account_info(),
                    authority: accs.user.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    /// Creates the shared pool token account. Must be called once by the
    /// authority before any forfeit_stake calls.
    pub fn initialize_pool(_ctx: Context<InitializePool>) -> Result<()> {
        Ok(())
    }

    /// Callable only by AUTHORITY_PUBKEY. Marks the stake as verified and
    /// returns the USDC from the vault back to the user's ATA.
    pub fn release_stake(ctx: Context<ReleaseStake>) -> Result<()> {
        let stake_amount = ctx.accounts.user_account.stake_amount;
        let user_key = ctx.accounts.user.key();
        let bump = ctx.bumps.user_account;

        ctx.accounts.user_account.verified = true;

        // Sign the CPI with the user_account PDA (which is the vault's authority).
        let seeds: &[&[u8]] = &[b"user_account", user_key.as_ref(), &[bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_usdc_ata.to_account_info(),
                    authority: ctx.accounts.user_account.to_account_info(),
                },
                signer,
            ),
            stake_amount,
        )?;

        Ok(())
    }

    /// Callable only by AUTHORITY_PUBKEY. Transfers the vault balance to the
    /// shared pool instead of returning it to the user (missed contribution).
    pub fn forfeit_stake(ctx: Context<ForfeitStake>) -> Result<()> {
        let amount = ctx.accounts.vault.amount;
        require!(amount > 0, GroundworkError::VaultEmpty);

        let user_key = ctx.accounts.user.key();
        let bump = ctx.bumps.user_account;
        let seeds: &[&[u8]] = &[b"user_account", user_key.as_ref(), &[bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.pool.to_account_info(),
                    authority: ctx.accounts.user_account.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// PDA that records the user's stake state.
    #[account(
        init,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// PDA token account that holds the staked USDC.
    /// Owned by user_account so only the program can move tokens out.
    #[account(
        init,
        payer = user,
        token::mint = usdc_mint,
        token::authority = user_account,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// User's USDC associated token account (source of funds).
    #[account(mut)]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseStake<'info> {
    /// Must match AUTHORITY_PUBKEY — enforced by the `address` constraint.
    #[account(address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    /// CHECK: used only for PDA seed derivation; not read or written.
    pub user: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// User's USDC ATA — receives the returned tokens.
    #[account(mut)]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut, address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    /// Shared pool token account. The pool PDA is its own token authority so
    /// the program can sign future withdrawals with seeds [b"pool", bump].
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = pool,
        seeds = [b"pool"],
        bump,
    )]
    pub pool: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ForfeitStake<'info> {
    #[account(address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    /// CHECK: used only for PDA seed derivation; not read or written.
    pub user: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Shared pool — receives forfeited funds.
    #[account(
        mut,
        seeds = [b"pool"],
        bump,
    )]
    pub pool: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub wallet: Pubkey,
    pub stake_amount: u64,
    pub verified: bool,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum GroundworkError {
    #[msg("Caller is not the program authority")]
    Unauthorized,
    #[msg("Vault is empty — nothing to forfeit")]
    VaultEmpty,
}
