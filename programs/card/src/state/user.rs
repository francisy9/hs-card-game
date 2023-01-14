use anchor_lang::prelude::*;

#[account]
pub struct UserStats {
    score: u16, // 2
    name: String, // 4 for length + 20 for name
    pub bump: u8, // 1
    active_game: Option<Pubkey>, // 1 + 32
}

impl UserStats {
    pub const MAX_ACC_SIZE: usize = 2 + (4 + 20) + 1 + (1 + 32);

    pub fn check_active_game(&self) -> Option<Pubkey> {
        return self.active_game;
    }

    
    pub fn set_active_game(&mut self, game_pk: Pubkey) {
        self.active_game = Some(game_pk);
    }

    pub fn clear_active(&mut self) {
        self.active_game = None;
    }

    pub fn initialize(&mut self, name: String, bump: u8) {
        self.score = 0;
        self.name = name;
        self.bump = bump;
        
    }


    pub fn increase_score(&mut self) {
        // Prevent overflow
        if self.score <= 65530 {
            self.score += 5;
        }
    }

    pub fn decrease_score(&mut self) {
        // Prevent overflow
        if self.score >= 5 {
            self.score -= 5;
        }
    }
}