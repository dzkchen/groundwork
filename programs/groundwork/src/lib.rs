use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
    token_interface::{mint_to, MintTo, Mint as InterfaceMint, TokenAccount as InterfaceTokenAccount, TokenInterface},
};

declare_id!("3y5dGx98G2jZ7STFqHoaxzsX9PRYPFdfTPBqnVanXJL3");

const AUTHORITY_PUBKEY: Pubkey = Pubkey::new_from_array([
    6, 5, 27, 147, 157, 238, 108, 216, 95, 122, 148, 143, 20, 89, 29, 105, 117, 83, 2, 94, 242,
    207, 234, 208, 52, 122, 236, 171, 152, 17, 160, 149,
]);

#[program]
pub mod groundwork {
    use super::*;

    pub fn deposit_stake(mut ctx: Context<DepositStake>, amount: u64) -> Result<()> {
        require!(amount > 0, GroundworkError::InvalidAmount);
        require!(
            !ctx.accounts.user_account.is_active,
            GroundworkError::AlreadyActive
        );

        let accs = &mut ctx.accounts;
        accs.user_account.wallet = accs.user.key();
        accs.user_account.stake_amount = amount;
        accs.user_account.verified = false;
        accs.user_account.is_active = true;
        accs.user_account.has_claimed = false;
        accs.user_account.month_start = Clock::get()?.unix_timestamp;

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

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        ctx.accounts.pool_state.commit_mint = ctx.accounts.commit_mint.key();
        ctx.accounts.pool_state.verified_users_this_month = 0;
        Ok(())
    }

    pub fn release_stake(ctx: Context<ReleaseStake>) -> Result<()> {
        let stake_amount = ctx.accounts.user_account.stake_amount;
        let user_key = ctx.accounts.user.key();
        let bump = ctx.bumps.user_account;

        ctx.accounts.user_account.verified = true;
        ctx.accounts.user_account.is_active = false;
        ctx.accounts.user_account.streak += 1;
        ctx.accounts.pool_state.verified_users_this_month += 1;

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

    pub fn forfeit_stake(ctx: Context<ForfeitStake>) -> Result<()> {
        let amount = ctx.accounts.vault.amount;
        require!(amount > 0, GroundworkError::VaultEmpty);

        ctx.accounts.user_account.streak = 0;
        ctx.accounts.user_account.is_active = false;

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

    pub fn mint_commit(
        ctx: Context<MintCommit>,
        _user_pubkey: Pubkey,
        streak: u32,
    ) -> Result<()> {
        let tokens: u64 = match streak {
            1..=2 => 100,
            3..=5 => 150,
            6..=11 => 200,
            12..=23 => 300,
            _ => 400,
        };

        let bump = ctx.bumps.pool_state;
        let seeds: &[&[u8]] = &[b"pool_state", &[bump]];
        let signer = &[seeds];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_2022_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.commit_mint.to_account_info(),
                    to: ctx.accounts.user_commit_ata.to_account_info(),
                    authority: ctx.accounts.pool_state.to_account_info(),
                },
                signer,
            ),
            tokens,
        )?;

        Ok(())
    }

    pub fn claim_pool_share(ctx: Context<ClaimPoolShare>) -> Result<()> {
        require!(
            !ctx.accounts.user_account.has_claimed,
            GroundworkError::AlreadyClaimed
        );
        require!(
            ctx.accounts.user_account.verified,
            GroundworkError::NotVerified
        );

        let verified = ctx.accounts.pool_state.verified_users_this_month;
        require!(verified > 0, GroundworkError::NoVerifiedUsers);

        let pool_balance = ctx.accounts.pool.amount;
        require!(pool_balance > 0, GroundworkError::EmptyPool);

        let share = pool_balance / verified as u64;
        require!(share > 0, GroundworkError::EmptyPool);

        let pool_bump = ctx.bumps.pool;
        let seeds: &[&[u8]] = &[b"pool", &[pool_bump]];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool.to_account_info(),
                    to: ctx.accounts.user_usdc_ata.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            share,
        )?;

        ctx.accounts.user_account.has_claimed = true;

        Ok(())
    }

    pub fn reset_month(ctx: Context<ResetMonth>) -> Result<()> {
        ctx.accounts.pool_state.verified_users_this_month = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init_if_needed,
        payer = user,
        token::mint = usdc_mint,
        token::authority = user_account,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut, address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = pool,
        seeds = [b"pool"],
        bump,
    )]
    pub pool: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [b"pool_state"],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    pub commit_mint: InterfaceAccount<'info, InterfaceMint>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseStake<'info> {
    #[account(address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

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

    #[account(mut)]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ForfeitStake<'info> {
    #[account(address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

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

    #[account(
        mut,
        seeds = [b"pool"],
        bump,
    )]
    pub pool: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintCommit<'info> {
    #[account(mut, address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(
        mut,
        address = pool_state.commit_mint,
    )]
    pub commit_mint: InterfaceAccount<'info, InterfaceMint>,

    pub user: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = commit_mint,
        associated_token::authority = user,
        associated_token::token_program = token_2022_program,
    )]
    pub user_commit_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_2022_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPoolShare<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"pool"],
        bump,
    )]
    pub pool: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"pool_state"],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(mut)]
    pub user_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResetMonth<'info> {
    #[account(address = AUTHORITY_PUBKEY @ GroundworkError::Unauthorized)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub wallet: Pubkey,
    pub stake_amount: u64,
    pub verified: bool,
    pub streak: u32,
    pub month_start: i64,
    pub is_active: bool,
    pub has_claimed: bool,
}

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    pub commit_mint: Pubkey,
    pub verified_users_this_month: u32,
}

#[error_code]
pub enum GroundworkError {
    #[msg("Stake amount must be greater than zero")]
    InvalidAmount,
    #[msg("Caller is not the program authority")]
    Unauthorized,
    #[msg("Vault is empty — nothing to forfeit")]
    VaultEmpty,
    #[msg("User already has an active deposit this month")]
    AlreadyActive,
    #[msg("User has not been verified this month")]
    NotVerified,
    #[msg("No verified users this month — cannot distribute")]
    NoVerifiedUsers,
    #[msg("Pool is empty — nothing to claim")]
    EmptyPool,
    #[msg("User has already claimed their pool share this month")]
    AlreadyClaimed,
}
