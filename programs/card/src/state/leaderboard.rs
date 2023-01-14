use anchor_lang::prelude::*;
use crate::errors::CardGameError;

#[account] 
pub struct Leaderboard {
    pub players: Vec<Pubkey>,
    pub bump: u8,
}

impl Leaderboard {
    pub fn initialize(&mut self, acc_bump: u8) -> Result<()> {
        self.players = Vec::new();
        self.bump = acc_bump;
        Ok(())
    }
    

    pub fn add_new_player(&mut self, new_player: Pubkey) -> Result<()> {
        if self.players.contains(&new_player) {
            return Err(CardGameError::UserAlreadyExists.into())
        }

        self.players.push(new_player);
        Ok(())
    }

    pub fn check_if_created(&self, player: Pubkey) -> bool {
        if self.players.contains(&player) {
            return true
        }
        return false
    }
}