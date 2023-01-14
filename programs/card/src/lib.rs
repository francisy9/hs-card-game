use anchor_lang::prelude::*;
use instructions::*;
use state::game::*;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("ACYSdixSJLAewjEtKG17p4FsHVoEj1ptpB1UNv7vh4EJ");

#[program]
pub mod card {
    use super::*;

    pub fn setup_game(ctx: Context<SetupGame>, p1_hand: Vec<Card>, p2_hand: Vec<Card>) -> Result<()> {
        instructions::setup_game::setup_game(ctx, p1_hand, p2_hand)
    }

    pub fn play_card(ctx: Context<PlayCard>, pos: u8, card_index: u8) -> Result<()> {
        instructions::play_card::play_card(ctx, pos, card_index)
    }

    pub fn end_turn(ctx: Context<EndTurn>) -> Result<()> {
        instructions::end_turn::end_turn(ctx)
    }
    
    pub fn attack(ctx: Context<Attack>, ally_pos: u8, enemy_pos: u8) -> Result<()> {
        instructions::attack::attack(ctx, ally_pos, enemy_pos)
    }

    pub fn init_leaderboard(ctx: Context<InitLeaderboard>, bump: u8) -> Result<()> {
        instructions::init_leaderboard::init_leaderboard(ctx, bump)
    }

    pub fn create_user_stats(ctx: Context<CreateUserStats>, name: String) -> Result<()> {
        instructions::create_acc::create_user_stats(ctx, name)
    }

    pub fn set_scores(ctx: Context<SetScores>) -> Result<()> {
        instructions::set_scores::set_score(ctx)
    }
    
    pub fn concede(ctx: Context<Concede>) -> Result<()> {
        instructions::concede::concede(ctx)
    }
}



