use crate::errors::CardGameError;
use crate::state::user::*;
use crate::state::leaderboard::*;
use anchor_lang::prelude::*;

pub fn create_user_stats(ctx: Context<CreateUserStats>, name: String) -> Result<()> {
    if name.as_bytes().len() > 20 {
        return Err(CardGameError::NameTooLong.into())
    }
    let bump = *ctx.bumps.get("user_stats").unwrap();
    ctx.accounts.user_stats.initialize(name, bump);
    ctx.accounts.leaderboard.add_new_player(ctx.accounts.user.key())
}


#[derive(Accounts)]
pub struct CreateUserStats<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + UserStats::MAX_ACC_SIZE, seeds = [b"user-stats", user.key().as_ref()], bump)]
    pub user_stats: Account<'info, UserStats>,
    #[account(
        mut,
        seeds = [b"leaderboard"], bump = leaderboard.bump)]
    pub leaderboard: Account<'info, Leaderboard>,
    pub system_program: Program<'info, System>
}
