use crate::state::leaderboard::*;
use anchor_lang::prelude::*;

pub fn init_leaderboard(ctx: Context<InitLeaderboard>, acc_bump: u8) -> Result<()> {
    ctx.accounts.leaderboard.initialize(acc_bump)
}


#[derive(Accounts)]
pub struct InitLeaderboard<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 9000, seeds = [b"leaderboard".as_ref()], bump)]
    pub leaderboard: Account<'info, Leaderboard>,
    pub system_program: Program<'info, System>
}