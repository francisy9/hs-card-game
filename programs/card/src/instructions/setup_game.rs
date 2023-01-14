use crate::state::user::*;
use crate::state::game::*;
use crate::state::leaderboard::*;
use crate::errors::CardGameError;
use anchor_lang::prelude::*;

pub fn setup_game(ctx: Context<SetupGame>, p1_hand: Vec<Card>, p2_hand: Vec<Card>) -> Result<()> {
    match ctx.accounts{
        SetupGame {
            game,
            p1,
            p1_stats,
            p2,
            p2_stats,
            leaderboard,
            system_program: _,
        } => {

            if !leaderboard.check_if_created(p1.key()) {
                return Err(CardGameError::UserStatsAccountMissing.into())
            }

            if p1_stats.check_active_game().is_some() {
                return Err(CardGameError::YouHaveAnActiveGame.into())
            }
        
            if !leaderboard.check_if_created(p2.key()) {
                return Err(CardGameError::OpposingStatsAccountMissing.into())
            }
            
            if p2_stats.check_active_game().is_some() {
                return Err(CardGameError::OpponentHasAnActiveGame.into())
            }
        
            p1_stats.set_active_game(game.key());
            p2_stats.set_active_game(game.key());
            
            game.start([p1.key(), p2.key()], p1_hand, p2_hand)
        }
    }

}


#[derive(Accounts)]
pub struct SetupGame<'info> {
    #[account(init, payer = p1, space = 8 + Game::MAXIMUM_SIZE)]
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
    pub leaderboard: Account<'info, Leaderboard>,
    pub system_program: Program<'info, System>
}