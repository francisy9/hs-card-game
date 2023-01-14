use crate::state::user::*;
use crate::state::game::*;
use crate::errors::CardGameError;
use anchor_lang::prelude::*;

pub fn concede(ctx: Context<Concede>) -> Result<()> {
    match ctx.accounts{
        Concede {
            game,
            p1,
            p1_stats,
            p2,
            p2_stats,
            system_program: _,
        } => {

            if game.match_pubkeys([p1.key(), p2.key()]) {
                p1_stats.decrease_score();
                p1_stats.clear_active();

                p2_stats.increase_score();
                p2_stats.clear_active();
            } else {
                return Err(CardGameError::MismatchPlayerKeys.into())
            }

            Ok(())
        }
    }

}


#[derive(Accounts)]
pub struct Concede<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub p1: Signer<'info>,
    #[account(
        mut, 
        seeds=[b"user-stats", p1.key().as_ref()], bump
    )]
    pub p1_stats: Account<'info, UserStats>,
    #[account(mut)]
    /// CHECK: Only taking p2 pubkey to check that p2_stats belongs to the same player
    pub p2: UncheckedAccount<'info>,
    #[account(
        mut, 
        seeds=[b"user-stats", p2.key().as_ref()], bump
    )]
    pub p2_stats: Account<'info, UserStats>,
    pub system_program: Program<'info, System>
}