use crate::errors::CardGameError;
use crate::state::game::*;
use anchor_lang::prelude::*;

pub fn play_card(ctx: Context<PlayCard>, pos: u8, card_index: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require_keys_eq!(
        game.current_player(),
        ctx.accounts.player.key(),
        CardGameError::NotPlayersTurn
    );

    game.play_card(pos, card_index)
}

#[derive(Accounts)]
pub struct PlayCard<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}