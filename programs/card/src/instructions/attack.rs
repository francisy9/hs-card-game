use crate::errors::CardGameError;
use crate::state::game::*;
use anchor_lang::prelude::*;

pub fn attack(ctx: Context<Attack>, bot_pos: u8, top_pos: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require_keys_eq!(
        game.current_player(),
        ctx.accounts.player.key(),
        CardGameError::NotPlayersTurn
    );

    game.attack(bot_pos, top_pos)
}

#[derive(Accounts)]
pub struct Attack<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}