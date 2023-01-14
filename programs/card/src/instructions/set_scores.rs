use crate::errors::CardGameError;
use crate::state::user::*;
use crate::state::game::*;
use anchor_lang::prelude::*;

pub fn set_score(ctx: Context<SetScores>) -> Result<()> {
    match ctx.accounts{
        SetScores {
                p1,
                p1_stats,
                p2,
                p2_stats,
                game,
                system_program: _,
            } => {
                let p1_key = p1.key();
                let p2_key = p2.key();
                match game.get_game_state() {
                    GameState::Active => Err(CardGameError::GameStillActive.into()),
                    GameState::Tie => {
                        if game.match_pubkeys([p1_key, p2_key]) {
                            p1_stats.clear_active();
                            p2_stats.clear_active();
                            Ok(())
                        } else {
                            return Err(CardGameError::MismatchPlayerKeys.into())
                        }
                    }
                    GameState::Won { winner } => {
                        if !game.match_pubkeys([p1_key, p2_key]) {
                            return Err(CardGameError::MismatchPlayerKeys.into())
                        }
                        if winner == p1_key {
                            p1_stats.increase_score();
                            p1_stats.clear_active();
                            p2_stats.decrease_score();
                            p2_stats.clear_active();
                            Ok(())
                        } else {
                            p2_stats.increase_score();
                            p2_stats.clear_active();
                            p1_stats.decrease_score();
                            p1_stats.clear_active();
                            Ok(())
                            
                        }
                    }
                }
            }

    }    

}


#[derive(Accounts)]
pub struct SetScores<'info> {
    /// CHECK: Passing in pubkey for pda seeds
    pub p1: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"user-stats", p1.key().as_ref()], bump=p1_stats.bump)]
    pub p1_stats: Account<'info, UserStats>,
    /// CHECK: Passing in pubkey for pda seeds
    pub p2: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"user-stats", p2.key().as_ref()], bump=p2_stats.bump)]
    pub p2_stats: Account<'info, UserStats>,
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>
}
