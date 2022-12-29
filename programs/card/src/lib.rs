use anchor_lang::prelude::*;
use instructions::*;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("ACYSdixSJLAewjEtKG17p4FsHVoEj1ptpB1UNv7vh4EJ");

#[program]
pub mod card {
    use super::*;

    pub fn setup_game(ctx: Context<SetupGame>, player_two: Pubkey) -> Result<()> {
        instructions::setup_game::setup_game(ctx, player_two)
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
}



