use crate::errors::CardGameError;
use crate::state::game::*;
use anchor_lang::prelude::*;

pub fn end_turn(ctx: Context<EndTurn>) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require_keys_eq!(
        game.current_player(),
        ctx.accounts.player.key(),
        CardGameError::NotPlayersTurn
    );

    game.end_turn()
}

#[derive(Accounts)]
pub struct EndTurn<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}